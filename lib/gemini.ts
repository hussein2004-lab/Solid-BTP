// Thin wrapper around the Gemini REST API (no SDK dependency, consistent with
// the project's "zéro dépendance superflue" philosophy — we just use `fetch`).
//
// Both AI routes (texte + image) ask Gemini to PROPOSE catalogue articles
// (nom, description, rayon, prix F CFA) from a natural-language need or a photo.
// The live catalogue is sent as *reference* so the AI mirrors our categories,
// naming style and price ranges. Proposals are then sanitised server-side
// (rayon forcé à un id valide, prix entier ≥ 0) before reaching the client,
// which can save the confirmed ones via POST /api/articles.

import { NextResponse } from "next/server";
import type { Article, ProposedArticle, MatchedArticle } from "./types";
import { CATEGORIES, categoryLabel } from "./constants";

export type { ProposedArticle, MatchedArticle };

export const GEMINI_MODEL = "gemini-2.5-flash-lite";

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const VALID_CATEGORIES = new Set(CATEGORIES.map((c) => c.id));
const FALLBACK_CATEGORY = "quincaillerie";

/** A part of a Gemini "content" turn: plain text or inline (base64) image data. */
export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/** Raised when the API key is absent — surfaced as a 500 by the routes. */
export class GeminiConfigError extends Error {}
/** Raised when the upstream Gemini call fails — surfaced as a 502. */
export class GeminiCallError extends Error {}

/**
 * Low-level call: send `parts` to Gemini, forcing a JSON answer that matches
 * `responseSchema`. Returns the already-parsed object.
 */
export async function geminiJSON<T = unknown>(
  parts: GeminiPart[],
  responseSchema: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError("Clé API Gemini absente (GEMINI_API_KEY).");
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT(GEMINI_MODEL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    });
  } catch (e) {
    throw new GeminiCallError(`Appel Gemini impossible : ${(e as Error).message}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiCallError(`Gemini a répondu ${res.status} : ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ||
    undefined;

  if (!text) throw new GeminiCallError("Réponse Gemini vide.");

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiCallError("Réponse Gemini non-JSON.");
  }
}

/** Compact, token-cheap rendering of the catalogue, used as prompt reference. */
export function catalogueContext(articles: Article[]): string {
  if (articles.length === 0) return "(catalogue vide)";
  return articles
    .slice(0, 60)
    .map((a) => `- ${a.name} | rayon:${categoryLabel(a.category)} (${a.category}) | ${a.price} F CFA`)
    .join("\n");
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Validate/normalise raw Gemini proposals into savable articles:
 * - drop entries without a name,
 * - force `category` onto a known rayon id (fallback: quincaillerie),
 * - coerce `price` to a non-negative integer, `confidence` to 0→1.
 */
export function sanitizeProposals(raw: unknown): ProposedArticle[] {
  if (!Array.isArray(raw)) return [];
  const out: ProposedArticle[] = [];
  for (const p of raw) {
    const name = String(p?.name ?? "").trim();
    if (!name) continue;
    const cat = String(p?.category ?? "");
    out.push({
      name,
      description: String(p?.description ?? "").trim(),
      category: VALID_CATEGORIES.has(cat) ? cat : FALLBACK_CATEGORY,
      price: Math.max(0, Math.round(Number(p?.price) || 0)),
      reason: String(p?.reason ?? "").trim(),
      confidence: clamp01(Number(p?.confidence)),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mode "match" (public) : retrouver des articles EXISTANTS du catalogue.
// ---------------------------------------------------------------------------

/** Catalogue rendering WITH ids, for the public "match" mode prompt. */
export function catalogueContextWithIds(articles: Article[]): string {
  if (articles.length === 0) return "(catalogue vide)";
  return articles
    .map(
      (a) =>
        `- id:${a.id} | ${a.name} | rayon:${categoryLabel(a.category)} | ${a.price} F CFA | ${a.description}`,
    )
    .join("\n");
}

/** A pick returned by Gemini in match mode: an existing id + why + score. */
interface ArticleMatch {
  id: string;
  reason: string;
  score: number;
}

/**
 * Turn Gemini's id-based picks into full Article rows from the catalogue.
 * Unknown ids (hallucinations) are silently dropped; order is preserved.
 */
export function hydrateMatches(articles: Article[], raw: unknown): MatchedArticle[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(articles.map((a) => [a.id, a]));
  const out: MatchedArticle[] = [];
  for (const pick of raw as ArticleMatch[]) {
    const article = byId.get(String(pick?.id ?? ""));
    if (!article) continue;
    out.push({
      ...article,
      reason: String(pick?.reason ?? "").trim(),
      score: clamp01(Number(pick?.score)),
    });
  }
  return out;
}

/** Shared JSON-schema fragment: an array of catalogue matches (structured output). */
export const MATCHES_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "STRING", description: "id exact d'un article du catalogue fourni" },
      reason: { type: "STRING", description: "courte justification en français" },
      score: { type: "NUMBER", description: "pertinence de 0 à 1" },
    },
    required: ["id", "reason", "score"],
  },
} as const;

/** Localized error strings passed in by the route (see `lib/api-i18n`). */
export interface AiErrorMessages {
  config: string;
  unavailable: string;
  unexpected: string;
}

/** Map Gemini errors to clean, localized HTTP responses (shared by both AI routes). */
export function aiError(e: unknown, messages: AiErrorMessages) {
  if (e instanceof GeminiConfigError) {
    return NextResponse.json({ error: messages.config }, { status: 500 });
  }
  if (e instanceof GeminiCallError) {
    return NextResponse.json({ error: messages.unavailable }, { status: 502 });
  }
  return NextResponse.json({ error: messages.unexpected }, { status: 500 });
}

/** Shared JSON-schema fragment: an array of proposed articles (structured output). */
export const PROPOSALS_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      name: { type: "STRING", description: "nom commercial court de l'article" },
      description: { type: "STRING", description: "1 phrase de description en français" },
      category: {
        type: "STRING",
        enum: CATEGORIES.map((c) => c.id),
        description: "id de rayon parmi la liste imposée",
      },
      price: { type: "INTEGER", description: "prix indicatif en F CFA (Daloa, Côte d'Ivoire)" },
      reason: { type: "STRING", description: "courte justification en français" },
      confidence: { type: "NUMBER", description: "confiance de 0 à 1" },
    },
    required: ["name", "category", "price"],
  },
} as const;

/** Human-readable list of valid rayons, injected into prompts. */
export function categoryGuide(): string {
  return CATEGORIES.map((c) => `${c.id} = ${c.label}`).join(", ");
}

// ---------------------------------------------------------------------------
// Traduction du contenu catalogue (public) : le nom/description des articles
// sont stockés en français ; on les traduit à la volée pour l'affichage client.
// ---------------------------------------------------------------------------

/** English language names so the prompt names the target language unambiguously. */
const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  en: "English",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  ru: "Russian",
  ja: "Japanese",
  es: "Spanish",
  de: "German",
  pt: "Portuguese",
  sw: "Swahili",
};

export function languageName(loc: string): string {
  return LANGUAGE_NAMES[loc] ?? loc;
}

/** Structured output: a flat array of translated strings (same order as input). */
export const TRANSLATIONS_SCHEMA = {
  type: "ARRAY",
  items: { type: "STRING" },
} as const;

/**
 * Translate a batch of French catalogue strings (product names / one-line
 * descriptions) into `target`. The result is the SAME length and order as the
 * input; any missing/blank item falls back to the original French.
 */
export async function translateBatch(texts: string[], target: string): Promise<string[]> {
  if (texts.length === 0) return [];
  const prompt = [
    `Translate each item of this JSON array from French into ${languageName(target)}.`,
    "Context: a building-hardware store catalogue (construction/quincaillerie).",
    "Keep brand/product names, units, dimensions and numbers (e.g. Ø100, 20L, 2.5mm², 60x60) unchanged.",
    "Return ONLY a JSON array of the SAME length and order, each element the translated string.",
    "",
    JSON.stringify(texts),
  ].join("\n");

  const out = await geminiJSON<unknown>([{ text: prompt }], TRANSLATIONS_SCHEMA);
  if (!Array.isArray(out)) return texts;
  return texts.map((src, i) => {
    const v = out[i];
    return typeof v === "string" && v.trim() ? v : src;
  });
}
