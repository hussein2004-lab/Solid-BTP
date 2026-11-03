import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { requireSuper, errorResponse } from "@/lib/access";

// Magasins auxquels un sous-admin a accès. Réservé à l'administrateur principal.

// GET : liste des ids de magasins accordés à cet admin.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuper();
    const { id } = await params;
    const links = await prisma.adminStore.findMany({ where: { adminId: id }, select: { storeId: true } });
    return NextResponse.json({ storeIds: links.map((l) => l.storeId) });
  } catch (e) {
    return errorResponse(e);
  }
}

// PUT : remplace l'ensemble des accès de cet admin par la liste fournie.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuper();
    const { id } = await params;

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    if (target.role === "super") {
      return NextResponse.json({ error: "L'administrateur principal a déjà accès à tout." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const requested: string[] = Array.isArray(body.storeIds) ? body.storeIds.map(String) : [];

    // Ne garder que des magasins réellement existants.
    const valid = await prisma.store.findMany({
      where: { id: { in: requested } },
      select: { id: true },
    });
    const validIds = valid.map((s) => s.id);

    await prisma.$transaction([
      prisma.adminStore.deleteMany({ where: { adminId: id } }),
      prisma.adminStore.createMany({
        data: validIds.map((storeId) => ({ id: newId(), adminId: id, storeId })),
      }),
    ]);

    return NextResponse.json({ storeIds: validIds });
  } catch (e) {
    return errorResponse(e);
  }
}
