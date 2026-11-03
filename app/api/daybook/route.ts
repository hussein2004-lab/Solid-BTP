import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { requireAdmin, accessibleStoreIds, resolveStoreId, assertStoreAccess, errorResponse } from "@/lib/access";
import { dayBookKind, EXPENSE_CATEGORIES } from "@/lib/erp";

const EXPENSE_IDS = new Set(EXPENSE_CATEGORIES.map((c) => c.id));

// Liste des lignes du cahier de jour (scopée). Filtres : ?storeId, ?date (YYYY-MM-DD),
// ?kind, ?category.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const date = searchParams.get("date");
    const kind = searchParams.get("kind");
    const category = searchParams.get("category");

    const ids = await accessibleStoreIds(admin);
    const where: Record<string, unknown> = { storeId: { in: ids } };
    if (storeId) {
      await assertStoreAccess(admin, storeId);
      where.storeId = storeId;
    }
    if (kind) where.kind = kind;
    if (category) where.category = category;
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      if (!Number.isNaN(start.getTime())) where.date = { gte: start, lte: end };
    }

    const entries = await prisma.dayBookEntry.findMany({ where, orderBy: { date: "desc" } });
    return NextResponse.json({ entries });
  } catch (e) {
    return errorResponse(e);
  }
}

// Création d'une ligne du cahier de jour.
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const storeId = await resolveStoreId(admin, body.storeId);

    const kindMeta = dayBookKind(String(body.kind ?? ""));
    if (!kindMeta) return NextResponse.json({ error: "Nature de ligne invalide." }, { status: 400 });

    const amount = Math.max(0, Math.round(Number(body.amount) || 0));
    if (amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });

    let category = "";
    if (kindMeta.id === "expense") {
      category = String(body.category ?? "autre");
      if (!EXPENSE_IDS.has(category)) category = "autre";
    }

    const date = body.date ? new Date(`${body.date}T12:00:00`) : new Date();

    const entry = await prisma.dayBookEntry.create({
      data: {
        id: newId(),
        storeId,
        date: Number.isNaN(date.getTime()) ? new Date() : date,
        kind: kindMeta.id,
        category,
        label: String(body.label ?? "").trim(),
        amount,
        createdById: admin.id,
      },
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

// Suppression d'une ligne (corriger une saisie).
export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? "";
    const entry = await prisma.dayBookEntry.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });
    await assertStoreAccess(admin, entry.storeId);
    await prisma.dayBookEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
