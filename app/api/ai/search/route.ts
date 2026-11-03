import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  geminiJSON,
  catalogueContext,
  catalogueContextWithIds,
  categoryGuide,
  sanitizeProposals,
  hydrateMatches,
  PROPOSALS_SCHEMA,
  MATCHES_SCHEMA,
  aiError,
} from "@/lib/gemini";
import { enforceAiRateLimit } from "@/lib/rate-limit";
import { getApiT } from "@/lib/api-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/search  — recherche d'article en langage naturel.
 * Body: { query: string, mode?: "match" | "propose" }
 *
 * - mode "match"  (public, défaut côté catalogue) : Gemini retrouve les articles
 *   EXISTANTS du catalogue ; on les ré-hydrate depuis la base → données réelles.
 *   Réponse: { query, mode, note, results: MatchedArticle[] }
 * - mode "propose" (admin, défaut) : Gemini propose de NOUVEAUX articles à créer.
 *   Réponse: { query, mode, note, results: ProposedArticle[] }
 */
export async function POST(req: Request) {
  const limited = await enforceAiRateLimit(req);
  if (limited) return limited;

  const t = await getApiT();
  const aiMsgs = {
    config: t("aiConfig"),
    unavailable: t("aiUnavailable"),
    unexpected: t("aiUnexpected"),
  };

  const body = await req.json().catch(() => ({}));
  const query = String(body?.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: t("aiDescribe") }, { status: 400 });
  }
  const mode = body?.mode === "match" ? "match" : "propose";

  const rows = await prisma.article.findMany({ orderBy: { createdAt: "desc" } });
  const articles = rows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));

  if (mode === "match") {
    const prompt = [
      "Tu es le conseiller d'une quincaillerie de bâtiment à Daloa (Côte d'Ivoire), Solid-BTP.",
      "À partir du besoin du client, sélectionne dans le CATALOGUE ci-dessous les",
      "articles les plus utiles (max 8), du plus pertinent au moins pertinent.",
      "N'utilise QUE les `id` listés ; n'invente jamais d'article. Réponds en français.",
      "Si rien ne correspond, renvoie une liste vide et explique-le dans `note`.",
      "",
      "CATALOGUE :",
      catalogueContextWithIds(articles),
      "",
      `BESOIN DU CLIENT : ${query}`,
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: {
        note: { type: "STRING", description: "conseil/résumé court en français" },
        results: MATCHES_SCHEMA,
      },
      required: ["results"],
    };

    try {
      const out = await geminiJSON<{ note?: string; results: unknown }>([{ text: prompt }], schema);
      return NextResponse.json({
        query,
        mode,
        note: out.note ?? "",
        results: hydrateMatches(articles, out.results),
      });
    } catch (e) {
      return aiError(e, aiMsgs);
    }
  }

  // mode "propose" (admin)
  const prompt = [
    "Tu es le conseiller d'une quincaillerie de bâtiment à Daloa (Côte d'Ivoire), Solid-BTP.",
    "À partir du besoin du client, propose les articles à mettre au catalogue qui",
    "répondent le mieux (max 6), classés du plus pertinent au moins pertinent.",
    "Donne un nom commercial clair, une description d'une phrase, un rayon et un",
    "prix indicatif réaliste en F CFA. Réponds en français.",
    "",
    `RAYONS AUTORISÉS (utilise l'id exact) : ${categoryGuide()}`,
    "",
    "CATALOGUE EXISTANT (référence de style, rayons et ordre de prix) :",
    catalogueContext(articles),
    "",
    `BESOIN DU CLIENT : ${query}`,
  ].join("\n");

  const schema = {
    type: "OBJECT",
    properties: {
      note: { type: "STRING", description: "conseil/résumé court en français" },
      results: PROPOSALS_SCHEMA,
    },
    required: ["results"],
  };

  try {
    const out = await geminiJSON<{ note?: string; results: unknown }>([{ text: prompt }], schema);
    return NextResponse.json({
      query,
      mode,
      note: out.note ?? "",
      results: sanitizeProposals(out.results),
    });
  } catch (e) {
    return aiError(e, aiMsgs);
  }
}
