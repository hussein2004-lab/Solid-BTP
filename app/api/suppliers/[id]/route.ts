import { NextResponse } from "next/server";
import type { Admin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, canAccessStore, errorResponse } from "@/lib/access";

async function loadOwned(admin: Admin, id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return { error: NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 }) };
  if (!(await canAccessStore(admin, supplier.storeId))) {
    return { error: NextResponse.json({ error: "Accès refusé." }, { status: 403 }) };
  }
  return { supplier };
}

// Édition d'un fournisseur (dont son solde dû).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { supplier, error } = await loadOwned(admin, id);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    for (const k of ["name", "phone", "email", "address", "note"] as const) {
      if (body[k] !== undefined) data[k] = String(body[k]).trim();
    }
    if (body.balance !== undefined) data.balance = Math.round(Number(body.balance) || 0);

    const updated = await prisma.supplier.update({ where: { id: supplier!.id }, data });
    return NextResponse.json({ supplier: updated });
  } catch (e) {
    return errorResponse(e);
  }
}

// Suppression d'un fournisseur.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { supplier, error } = await loadOwned(admin, id);
    if (error) return error;
    await prisma.supplier.delete({ where: { id: supplier!.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
