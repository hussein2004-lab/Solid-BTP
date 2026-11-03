import { NextResponse } from "next/server";
import type { Admin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, canAccessStore, errorResponse } from "@/lib/access";

async function loadOwned(admin: Admin, id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return { error: NextResponse.json({ error: "Employé introuvable." }, { status: 404 }) };
  if (!(await canAccessStore(admin, employee.storeId))) {
    return { error: NextResponse.json({ error: "Accès refusé." }, { status: 403 }) };
  }
  return { employee };
}

// Fiche employé + ses mouvements (salaires, avances).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { employee, error } = await loadOwned(admin, id);
    if (error) return error;
    const transactions = await prisma.employeeTx.findMany({ where: { employeeId: id }, orderBy: { date: "desc" } });
    return NextResponse.json({ employee, transactions });
  } catch (e) {
    return errorResponse(e);
  }
}

// Édition (poste, contact, salaire de base, statut = embauché/renvoyé).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { employee, error } = await loadOwned(admin, id);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    for (const k of ["name", "position", "phone"] as const) {
      if (body[k] !== undefined) data[k] = String(body[k]).trim();
    }
    if (body.baseSalary !== undefined) data.baseSalary = Math.max(0, Math.round(Number(body.baseSalary) || 0));
    if (body.status !== undefined && ["active", "terminated"].includes(body.status)) data.status = body.status;

    const updated = await prisma.employee.update({ where: { id: employee!.id }, data });
    return NextResponse.json({ employee: updated });
  } catch (e) {
    return errorResponse(e);
  }
}
