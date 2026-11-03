import { prisma } from "@/lib/prisma";
import { requireAdmin, accessibleStoreIds, assertStoreAccess, errorResponse } from "@/lib/access";
import { dayBookKindLabel, dayBookSign, expenseCategoryLabel } from "@/lib/erp";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatDateFR } from "@/lib/format";

// Export Excel (CSV) du cahier de jour. ?storeId, ?date, ?kind, ?category.
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
    const stores = await prisma.store.findMany({ select: { id: true, name: true } });
    const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? "";

    const rows = entries.map((e) => ({
      date: formatDateFR(e.date),
      store: storeName(e.storeId),
      kind: dayBookKindLabel(e.kind),
      category: e.kind === "expense" ? expenseCategoryLabel(e.category) : "",
      label: e.label,
      signed: dayBookSign(e.kind) * e.amount,
    }));

    const csv = toCsv(rows, [
      ["date", "Date"],
      ["store", "Magasin"],
      ["kind", "Nature"],
      ["category", "Catégorie"],
      ["label", "Libellé"],
      ["signed", "Montant (signé)"],
    ]);
    return csvResponse(csv, "cahier-de-jour.csv");
  } catch (e) {
    return errorResponse(e);
  }
}
