import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { requireAdmin, accessibleStoreIds, resolveStoreId, assertStoreAccess, errorResponse } from "@/lib/access";

// Liste des clients (scopée). ?storeId pour filtrer ; ?q pour rechercher.
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
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({ where, orderBy: { name: "asc" } });
    return NextResponse.json({ customers });
  } catch (e) {
    return errorResponse(e);
  }
}

// Création manuelle d'un client.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const storeId = await resolveStoreId(admin, body.storeId);
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nom du client requis." }, { status: 400 });

    const customer = await prisma.customer.create({
      data: {
        id: newId(),
        storeId,
        name,
        phone: String(body.phone ?? "").trim(),
        address: String(body.address ?? "").trim(),
        email: String(body.email ?? "").trim(),
        balance: Math.round(Number(body.balance) || 0),
      },
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
