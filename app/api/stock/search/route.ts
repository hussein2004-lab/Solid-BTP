import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, errorResponse } from "@/lib/access";

// Recherche cross-magasin : pour un terme, renvoie les articles correspondants et,
// pour chacun, la disponibilité dans TOUS les magasins du réseau (lecture seule).
// Permet à un gérant de savoir quels autres magasins ont un produit.
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json({ results: [] });

    const articles = await prisma.article.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 20,
      orderBy: { name: "asc" },
    });

    const articleIds = articles.map((a) => a.id);
    const stocks = await prisma.stockItem.findMany({
      where: { articleId: { in: articleIds } },
      include: { store: { select: { id: true, name: true, city: true } } },
    });

    const results = articles.map((a) => ({
      article: { id: a.id, name: a.name, category: a.category },
      stores: stocks
        .filter((s) => s.articleId === a.id)
        .map((s) => ({
          storeId: s.storeId,
          storeName: s.store.name,
          city: s.store.city,
          quantity: s.quantity,
          salePrice: s.salePrice,
        })),
    }));

    return NextResponse.json({ results });
  } catch (e) {
    return errorResponse(e);
  }
}
