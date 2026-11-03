import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

// Public: list all articles (the catalogue), newest first.
export async function GET() {
  const articles = await prisma.article.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ articles });
}

// Protected: create an article (any authenticated admin).
export async function POST(req: Request) {
  const t = await getApiT();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, description, category, price, imageUrl } = body;
  if (!name || !category) {
    return NextResponse.json({ error: t("articleFields") }, { status: 400 });
  }

  const article = await prisma.article.create({
    data: {
      id: newId(),
      name: String(name).trim(),
      description: String(description ?? "").trim(),
      category: String(category),
      price: Number(price) || 0,
      imageUrl: String(imageUrl ?? "").trim(),
    },
  });
  return NextResponse.json({ article }, { status: 201 });
}
