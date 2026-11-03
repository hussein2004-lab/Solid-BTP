import { prisma } from "@/lib/prisma";
import { requireAdmin, accessibleStoreIds, assertStoreAccess, errorResponse } from "@/lib/access";
import { toCsv, csvResponse } from "@/lib/csv";

// Export Excel (CSV) des fournisseurs et soldes dus. ?storeId.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    const ids = await accessibleStoreIds(admin);
    const where: Record<string, unknown> = { storeId: { in: ids } };
    if (storeId) {
      await assertStoreAccess(admin, storeId);
      where.storeId = storeId;
    }

    const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: "asc" } });
    const stores = await prisma.store.findMany({ select: { id: true, name: true } });
    const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? "";

    const rows = suppliers.map((s) => ({
      name: s.name,
      phone: s.phone,
      email: s.email,
      store: storeName(s.storeId),
      balance: s.balance,
    }));
    const csv = toCsv(rows, [
      ["name", "Fournisseur"],
      ["phone", "Téléphone"],
      ["email", "E-mail"],
      ["store", "Magasin"],
      ["balance", "Solde dû (F CFA)"],
    ]);
    return csvResponse(csv, "fournisseurs.csv");
  } catch (e) {
    return errorResponse(e);
  }
}
