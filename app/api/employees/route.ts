import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { requireAdmin, accessibleStoreIds, resolveStoreId, assertStoreAccess, errorResponse } from "@/lib/access";

// Liste des employés (scopée). ?storeId & ?status (active|terminated).
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status");

    const ids = await accessibleStoreIds(admin);
    const where: Record<string, unknown> = { storeId: { in: ids } };
    if (storeId) {
      await assertStoreAccess(admin, storeId);
      where.storeId = storeId;
    }
    if (status) where.status = status;

    const employees = await prisma.employee.findMany({ where, orderBy: [{ status: "asc" }, { name: "asc" }] });
    return NextResponse.json({ employees });
  } catch (e) {
    return errorResponse(e);
  }
}

// Embauche d'un employé.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const storeId = await resolveStoreId(admin, body.storeId);
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nom de l'employé requis." }, { status: 400 });

    const employee = await prisma.employee.create({
      data: {
        id: newId(),
        storeId,
        name,
        position: String(body.position ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        baseSalary: Math.max(0, Math.round(Number(body.baseSalary) || 0)),
        status: "active",
      },
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
