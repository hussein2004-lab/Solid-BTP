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
  type GeminiPart,
} from "@/lib/gemini";
import { enforceAiRateLimit } from "@/lib/rate-limit";
import { getApiT } from "@/lib/api-i18n";
import { getCurrentAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * POST /api/ai/identify  — reconnaissance d'articles par photo.
 *
 * Entrée : `multipart/form-data` (champ `image`, + champ texte `mode` optionnel)
 *   ou JSON `{ imageBase64, mimeType, mode }`.
 *
 * - mode "match"  (public) : Gemini retrouve les articles EXISTANTS du catalogue
 *   correspondant à la photo → ré-hydratés depuis la base (données réelles).
 *   Réponse: { mode, note, results: MatchedArticle[] }
 * - mode "propose" (admin, défaut) : Gemini identifie TOUS les articles visibles
 *   et les propose au format catalogue (création).
 *   Réponse: { mode, note, results: ProposedArticle[] }
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

  let image: GeminiPart | null = null;
  let mode: "match" | "propose" = "propose";

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("mode") === "match") mode = "match";
      const file = form.get("image");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: t("imageMissing") }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: t("imageTooLarge") }, { status: 400 });
      }
      const mimeType = file.type || "image/jpeg";
      if (!ALLOWED.includes(mimeType)) {
        return NextResponse.json({ error: t("imageFormat") }, { status: 400 });
      }
      const data = Buffer.from(await file.arrayBuffer()).toString("base64");
      image = { inlineData: { mimeType, data } };
    } else {
      const body = await req.json().catch(() => ({}));
      if (body?.mode === "match") mode = "match";
      const data = String(body?.imageBase64 ?? "").replace(/^data:[^;]+;base64,/, "");
      const mimeType = String(body?.mimeType ?? "image/jpeg");
      if (!data) {
        return NextResponse.json({ error: t("imageNone") }, { status: 400 });
      }
      if (Math.floor((data.length * 3) / 4) > MAX_BYTES) {
        return NextResponse.json({ error: t("imageTooLarge") }, { status: 400 });
      }
      if (!ALLOWED.includes(mimeType)) {
        return NextResponse.json({ error: t("imageFormat") }, { status: 400 });
      }
      image = { inlineData: { mimeType, data } };
    }
  } catch {
    return NextResponse.json({ error: t("imageUnreadable") }, { status: 400 });
  }

  if (!image) {
    return NextResponse.json({ error: t("imageNone") }, { status: 400 });
  }
  // Le mode "propose" (création d'articles) est réservé aux admins connectés.
  if (mode !== "match" && !(await getCurrentAdmin())) {
    return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  }

  const rows = await prisma.article.findMany({ orderBy: { createdAt: "desc" } });
  const articles = rows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));

  if (mode === "match") {
    const prompt = [
      "Tu es le conseiller d'une quincaillerie de bâtiment à Daloa (Côte d'Ivoire), Solid-BTP.",
      "Observe la photo, identifie les articles de quincaillerie / bâtiment visibles,",
      "puis sélectionne dans le CATALOGUE ci-dessous les articles correspondants ou",
      "équivalents (max 8), du plus pertinent au moins pertinent.",
      "N'utilise QUE les `id` listés ; n'invente jamais d'article. Réponds en français.",
      "Si rien ne correspond, renvoie une liste vide et explique-le dans `note`.",
      "",
      "CATALOGUE :",
      catalogueContextWithIds(articles),
    ].join("\n");

    const schema = {
      type: "OBJECT",
      properties: {
        note: { type: "STRING", description: "résumé court en français (ce qui est vu)" },
        results: MATCHES_SCHEMA,
      },
      required: ["results"],
    };

    try {
      const out = await geminiJSON<{ note?: string; results: unknown }>(
        [{ text: prompt }, image],
        schema,
      );
      return NextResponse.json({
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
    "Observe la photo et identifie TOUS les articles de quincaillerie / bâtiment",
    "visibles (outils, matériaux, équipements). Pour chacun, propose une entrée",
    "catalogue : nom commercial court, description d'une phrase, rayon et prix",
    "indicatif réaliste en F CFA. Réponds en français.",
    "Ignore le décor non pertinent (mains, sol, mur). Si aucun article n'est",
    "reconnaissable, renvoie une liste vide et explique-le dans `note`.",
    "",
    `RAYONS AUTORISÉS (utilise l'id exact) : ${categoryGuide()}`,
    "",
    "CATALOGUE EXISTANT (référence de style, rayons et ordre de prix) :",
    catalogueContext(articles),
  ].join("\n");

  const schema = {
    type: "OBJECT",
    properties: {
      note: { type: "STRING", description: "résumé court en français (ce qui est vu)" },
      results: PROPOSALS_SCHEMA,
    },
    required: ["results"],
  };

  try {
    const out = await geminiJSON<{ note?: string; results: unknown }>(
      [{ text: prompt }, image],
      schema,
    );
    return NextResponse.json({
      mode,
      note: out.note ?? "",
      results: sanitizeProposals(out.results),
    });
  } catch (e) {
    return aiError(e, aiMsgs);
  }
}
