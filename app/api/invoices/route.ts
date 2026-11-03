import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { requireAdmin, accessibleStoreIds, resolveStoreId, assertStoreAccess, errorResponse } from "@/lib/access";
import { INVOICE_TYPE_IDS } from "@/lib/erp";
import { nextInvoiceSeq, formatInvoiceNumber, applyCustomerEffect } from "@/lib/invoicing";

// Liste des factures, bornée aux magasins accessibles. Filtres : ?storeId & ?type.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const type = searchParams.get("type");

    const ids = await accessibleStoreIds(admin);
    const where: Record<string, unknown> = { storeId: { in: ids } };
    if (storeId) {
      await assertStoreAccess(admin, storeId);
      where.storeId = storeId;
    }
    if (type) where.type = type;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ invoices });
  } catch (e) {
    return errorResponse(e);
  }
}

interface ItemInput {
  articleId?: string | null;
  label: string;
  quantity: number;
  unitPrice: number;
}

// Création d'une facture : numéro auto-incrémenté (par magasin + type),
// totaux recalculés serveur, et tenue automatique du compte client (FACR/FAA).
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));

    const storeId = await resolveStoreId(admin, body.storeId);
    const type = String(body.type ?? "");
    if (!INVOICE_TYPE_IDS.includes(type)) {
      return NextResponse.json({ error: "Type de facture invalide." }, { status: 400 });
    }

    const rawItems: ItemInput[] = Array.isArray(body.items) ? body.items : [];
    const items = rawItems
      .map((it) => ({
        articleId: it.articleId ? String(it.articleId) : null,
        label: String(it.label ?? "").trim(),
        quantity: Math.max(0, Math.round(Number(it.quantity) || 0)),
        unitPrice: Math.max(0, Math.round(Number(it.unitPrice) || 0)),
      }))
      .filter((it) => it.label && it.quantity > 0);

    if (items.length === 0) {
      return NextResponse.json({ error: "Ajoutez au moins une ligne d'article." }, { status: 400 });
    }

    const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const tax = Math.max(0, Math.round(Number(body.tax) || 0));
    const total = subtotal + tax;

    const customerName = String(body.customerName ?? "").trim();
    const customerPhone = String(body.customerPhone ?? "").trim();
    const customerAddress = String(body.customerAddress ?? "").trim();
    const date = body.date ? new Date(body.date) : new Date();
    const note = String(body.note ?? "").trim();

    const invoice = await prisma.$transaction(async (tx) => {
      const seq = await nextInvoiceSeq(tx, storeId, type);
      const number = formatInvoiceNumber(type, seq);

      const customerId = await applyCustomerEffect(tx, {
        storeId,
        type,
        customerId: body.customerId,
        customerName,
        customerPhone,
        customerAddress,
        total,
      });

      return tx.invoice.create({
        data: {
          id: newId(),
          storeId,
          type,
          number,
          seq,
          date: Number.isNaN(date.getTime()) ? new Date() : date,
          customerId,
          customerName,
          customerPhone,
          customerAddress,
          subtotal,
          tax,
          total,
          note,
          createdById: admin.id,
          items: {
            create: items.map((it) => ({
              id: newId(),
              articleId: it.articleId,
              label: it.label,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              lineTotal: it.quantity * it.unitPrice,
            })),
          },
        },
        include: { items: true },
      });
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
