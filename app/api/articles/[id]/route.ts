import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getApiT();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const current = await prisma.article.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: t("articleNotFound") }, { status: 404 });

  const article = await prisma.article.update({
    where: { id },
    data: {
      name: body.name !== undefined ? String(body.name).trim() : current.name,
      description: body.description !== undefined ? String(body.description).trim() : current.description,
      category: body.category !== undefined ? String(body.category) : current.category,
      price: body.price !== undefined ? Number(body.price) || 0 : current.price,
      imageUrl: body.imageUrl !== undefined ? String(body.imageUrl).trim() : current.imageUrl,
    },
  });
  return NextResponse.json({ article });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getApiT();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });

  const { id } = await params;
  const { count } = await prisma.article.deleteMany({ where: { id } });
  if (count === 0) {
    return NextResponse.json({ error: t("articleNotFound") }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
