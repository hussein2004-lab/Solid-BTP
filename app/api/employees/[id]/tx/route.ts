import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { requireAdmin, canAccessStore, errorResponse } from "@/lib/access";
import { employeeTxType } from "@/lib/erp";

// Enregistre un mouvement (salaire versé, avance, régularisation) et met à jour
// le solde de l'employé selon le signe du type.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return NextResponse.json({ error: "Employé introuvable." }, { status: 404 });
    if (!(await canAccessStore(admin, employee.storeId))) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const meta = employeeTxType(String(body.type ?? ""));
    if (!meta) return NextResponse.json({ error: "Type de mouvement invalide." }, { status: 400 });
    const amount = Math.max(0, Math.round(Number(body.amount) || 0));
    if (amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });

    const date = body.date ? new Date(body.date) : new Date();

    const [tx, updated] = await prisma.$transaction([
      prisma.employeeTx.create({
        data: {
          id: newId(),
          employeeId: id,
          type: meta.id,
          amount,
          date: Number.isNaN(date.getTime()) ? new Date() : date,
          note: String(body.note ?? "").trim(),
        },
      }),
      prisma.employee.update({
        where: { id },
        data: { balance: { increment: meta.sign * amount } },
      }),
    ]);

    return NextResponse.json({ tx, employee: updated }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
