import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { requireAdmin, accessibleStoreIds, resolveStoreId, assertStoreAccess, errorResponse } from "@/lib/access";

// Liste des fournisseurs (scopée). ?storeId & ?q.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const q = (searchParams.get("q") ?? "").trim();

    const ids = await accessibleStoreIds(admin);
    const where: Record<string, unknown> = { storeId: { in: ids } };
    if (storeId) {
      await assertStoreAccess(admin, storeId);
      where.storeId = storeId;
    }
    if (q) where.name = { contains: q, mode: "insensitive" };

    const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: "asc" } });
    return NextResponse.json({ suppliers });
  } catch (e) {
    return errorResponse(e);
  }
}

// Création d'un fournisseur.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const storeId = await resolveStoreId(admin, body.storeId);
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nom du fournisseur requis." }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: {
        id: newId(),
        storeId,
        name,
        phone: String(body.phone ?? "").trim(),
        email: String(body.email ?? "").trim(),
        address: String(body.address ?? "").trim(),
        balance: Math.round(Number(body.balance) || 0),
        note: String(body.note ?? "").trim(),
      },
    });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
