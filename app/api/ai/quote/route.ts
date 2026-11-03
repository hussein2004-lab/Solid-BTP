import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geminiJSON, catalogueContextWithIds, aiError } from "@/lib/gemini";
import { enforceAiRateLimit } from "@/lib/rate-limit";
import { requireAdmin, errorResponse, AccessError } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Schéma de sortie : un devis chiffré (lignes éditables) à partir d'un message libre.
const QUOTE_SCHEMA = {
  type: "OBJECT",
  properties: {
    note: { type: "STRING", description: "résumé/conseil court en français" },
    customerName: { type: "STRING", description: "nom du client si déduisible, sinon vide" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          articleId: { type: "STRING", description: "id d'un article du catalogue si correspondance, sinon vide" },
          label: { type: "STRING", description: "désignation de l'article en français" },
          quantity: { type: "INTEGER", description: "quantité (≥ 1)" },
          unitPrice: { type: "INTEGER", description: "prix unitaire indicatif en F CFA" },
        },
        required: ["label", "quantity", "unitPrice"],
      },
    },
  },
  required: ["items"],
} as const;

interface RawItem {
  articleId?: string;
  label?: string;
  quantity?: number;
  unitPrice?: number;
}

/**
 * POST /api/ai/quote — transforme un devis en ligne (message libre, toute langue)
 * en lignes de facture devis (Fad) chiffrées, éditables avant enregistrement.
 * Body : { orderId } ou { message }.
 */
export async function POST(req: Request) {
  const limited = await enforceAiRateLimit(req);
  if (limited) return limited;

  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));

    let message = String(body?.message ?? "").trim();
    let customerName = "";
    let customerPhone = "";
    let customerAddress = "";

    if (!message && body?.orderId) {
      const order = await prisma.order.findUnique({ where: { id: String(body.orderId) } });
      if (!order) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
      message = order.message || "";
      customerName = order.name;
      customerPhone = order.phone;
    }
    if (!message) return NextResponse.json({ error: "Message du devis manquant." }, { status: 400 });

    const rows = await prisma.article.findMany({ orderBy: { createdAt: "desc" } });
    const articles = rows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
    const byId = new Map(articles.map((a) => [a.id, a]));

    const prompt = [
      "Tu assistes une quincaillerie de bâtiment à Daloa (Côte d'Ivoire), Solid-BTP.",
      "Transforme la DEMANDE DE DEVIS du client (rédigée dans une langue quelconque)",
      "en lignes de devis en FRANÇAIS : pour chaque besoin, une désignation claire,",
      "une quantité et un prix unitaire indicatif réaliste en F CFA.",
      "Quand un article du CATALOGUE correspond, reprends son `id` (articleId) et un",
      "prix cohérent avec celui du catalogue. Sinon, laisse articleId vide.",
      "Réponds uniquement avec le devis structuré.",
      "",
      "CATALOGUE (référence) :",
      catalogueContextWithIds(articles),
      "",
      `DEMANDE DU CLIENT : ${message}`,
    ].join("\n");

    const out = await geminiJSON<{ note?: string; customerName?: string; items: RawItem[] }>(
      [{ text: prompt }],
      QUOTE_SCHEMA,
    );

    // Assainit les lignes ; re-fiabilise le prix depuis le catalogue si articleId valide.
    const items = (Array.isArray(out.items) ? out.items : [])
      .map((it) => {
        const articleId = it.articleId && byId.has(it.articleId) ? it.articleId : null;
        const fallbackPrice = articleId ? byId.get(articleId)!.price : 0;
        const label = String(it.label ?? (articleId ? byId.get(articleId)!.name : "")).trim();
        return {
          articleId,
          label,
          quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
          unitPrice: Math.max(0, Math.round(Number(it.unitPrice) || fallbackPrice)),
        };
      })
      .filter((it) => it.label);

    return NextResponse.json({
      note: out.note ?? "",
      customerName: customerName || String(out.customerName ?? "").trim(),
      customerPhone,
      customerAddress,
      items,
    });
  } catch (e) {
    if (e instanceof AccessError) return errorResponse(e);
    return aiError(e, {
      config: "Clé API Gemini absente.",
      unavailable: "Service IA momentanément indisponible.",
      unexpected: "Erreur inattendue de l'IA.",
    });
  }
}
