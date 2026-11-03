import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin, accessibleStoreIds, assertStoreAccess, errorResponse } from "@/lib/access";
import { invoiceTypeLabel } from "@/lib/erp";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatDateFR } from "@/lib/format";

// Export Excel (CSV) des factures, borné aux magasins accessibles. ?storeId & ?type.
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

    const invoices = await prisma.invoice.findMany({ where, orderBy: { createdAt: "desc" } });
    const stores = await prisma.store.findMany({ select: { id: true, name: true } });
    const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? "";

    const rows = invoices.map((i) => ({
      number: i.number,
      type: invoiceTypeLabel(i.type),
      date: formatDateFR(i.date),
      store: storeName(i.storeId),
      customer: i.customerName,
      phone: i.customerPhone,
      subtotal: i.subtotal,
      tax: i.tax,
      total: i.total,
    }));

    const csv = toCsv(rows, [
      ["number", "N° Facture"],
      ["type", "Type"],
      ["date", "Date"],
      ["store", "Magasin"],
      ["customer", "Client"],
      ["phone", "Téléphone"],
      ["subtotal", "Total HT"],
      ["tax", "Taxe"],
      ["total", "Total TTC"],
    ]);

    return csvResponse(csv, "factures.csv");
  } catch (e) {
    return errorResponse(e);
  }
}
