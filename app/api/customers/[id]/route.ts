import { NextResponse } from "next/server";
import type { Admin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, canAccessStore, errorResponse } from "@/lib/access";

async function loadOwned(admin: Admin, id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return { error: NextResponse.json({ error: "Client introuvable." }, { status: 404 }) };
  if (!(await canAccessStore(admin, customer.storeId))) {
    return { error: NextResponse.json({ error: "Accès refusé." }, { status: 403 }) };
  }
  return { customer };
}

// Fiche client + son historique de factures.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { customer, error } = await loadOwned(admin, id);
    if (error) return error;
    const invoices = await prisma.invoice.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ customer, invoices });
  } catch (e) {
    return errorResponse(e);
  }
}

// Édition manuelle (nom, contact, adresse, e-mail, solde).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { customer, error } = await loadOwned(admin, id);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.phone !== undefined) data.phone = String(body.phone).trim();
    if (body.address !== undefined) data.address = String(body.address).trim();
    if (body.email !== undefined) data.email = String(body.email).trim();
    if (body.balance !== undefined) data.balance = Math.round(Number(body.balance) || 0);

    const updated = await prisma.customer.update({ where: { id: customer!.id }, data });
    return NextResponse.json({ customer: updated });
  } catch (e) {
    return errorResponse(e);
  }
}
