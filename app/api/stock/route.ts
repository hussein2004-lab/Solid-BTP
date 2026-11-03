import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { requireAdmin, resolveStoreId, assertStoreAccess, errorResponse } from "@/lib/access";

// Stock d'un magasin (avec infos article). ?storeId obligatoire (ou unique magasin).
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const storeId = await resolveStoreId(admin, searchParams.get("storeId"));

    const items = await prisma.stockItem.findMany({
      where: { storeId },
      include: { article: { select: { id: true, name: true, category: true, imageUrl: true } } },
      orderBy: { article: { name: "asc" } },
    });
    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}

// Crée ou met à jour le stock d'un article dans un magasin (clé storeId+articleId).
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const storeId = await resolveStoreId(admin, body.storeId);
    await assertStoreAccess(admin, storeId);

    const articleId = String(body.articleId ?? "");
    if (!articleId) return NextResponse.json({ error: "Article requis." }, { status: 400 });
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });

    const data = {
      quantity: Math.max(0, Math.round(Number(body.quantity) || 0)),
      purchasePrice: Math.max(0, Math.round(Number(body.purchasePrice) || 0)),
      salePrice: Math.max(0, Math.round(Number(body.salePrice) || 0)),
    };

    const item = await prisma.stockItem.upsert({
      where: { storeId_articleId: { storeId, articleId } },
      update: data,
      create: { id: newId(), storeId, articleId, ...data },
      include: { article: { select: { id: true, name: true, category: true, imageUrl: true } } },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
