import { prisma } from "@/lib/prisma";
import { requireAdmin, accessibleStoreIds, assertStoreAccess, errorResponse } from "@/lib/access";
import { toCsv, csvResponse } from "@/lib/csv";

// Export Excel (CSV) des clients et de leurs soldes. ?storeId.
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

    const customers = await prisma.customer.findMany({ where, orderBy: { name: "asc" } });
    const stores = await prisma.store.findMany({ select: { id: true, name: true } });
    const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? "";

    const rows = customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      address: c.address,
      store: storeName(c.storeId),
      balance: c.balance,
    }));
    const csv = toCsv(rows, [
      ["name", "Client"],
      ["phone", "Téléphone"],
      ["address", "Adresse"],
      ["store", "Magasin"],
      ["balance", "Solde (F CFA)"],
    ]);
    return csvResponse(csv, "clients.csv");
  } catch (e) {
    return errorResponse(e);
  }
}
