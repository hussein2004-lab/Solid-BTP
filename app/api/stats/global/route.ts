import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, accessibleStoreIds, errorResponse } from "@/lib/access";
import { EXPENSE_CATEGORIES, INVOICE_TYPES } from "@/lib/erp";

// Agrégats réseau pour les tableaux de bord de l'admin principal :
//  - une ligne riche par magasin (ventes, crédits accordés, crédits dus, avances,
//    dépenses, versements, performance) ;
//  - des répartitions réseau (dépenses par catégorie, revenus par mois, factures
//    par type, top clients débiteurs, top employés en avance).
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);

    // Filtre magasins (sous-ensemble parmi les accessibles).
    let ids = await accessibleStoreIds(admin);
    const storesParam = searchParams.get("stores");
    if (storesParam) {
      const wanted = new Set(storesParam.split(",").filter(Boolean));
      const filtered = ids.filter((id) => wanted.has(id));
      if (filtered.length) ids = filtered;
    }

    // Filtre période (sur les données datées : factures + cahier de jour).
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) {
      const d = new Date(`${from}T00:00:00`);
      if (!Number.isNaN(d.getTime())) dateFilter.gte = d;
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999`);
      if (!Number.isNaN(d.getTime())) dateFilter.lte = d;
    }
    const dateWhere = dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {};

    const [stores, invoices, customers, employees, expenses, payments] = await Promise.all([
      prisma.store.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      prisma.invoice.findMany({ where: { storeId: { in: ids }, ...dateWhere }, select: { storeId: true, type: true, total: true, date: true } }),
      prisma.customer.findMany({ where: { storeId: { in: ids } }, select: { storeId: true, name: true, balance: true } }),
      prisma.employee.findMany({ where: { storeId: { in: ids } }, select: { storeId: true, name: true, balance: true } }),
      prisma.dayBookEntry.findMany({ where: { storeId: { in: ids }, kind: "expense", ...dateWhere }, select: { storeId: true, category: true, amount: true } }),
      prisma.dayBookEntry.findMany({ where: { storeId: { in: ids }, kind: "payment", ...dateWhere }, select: { storeId: true, amount: true } }),
    ]);

    const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? "—";

    // ---- Lignes par magasin ----
    const rows = stores.map((s) => {
      const inv = invoices.filter((i) => i.storeId === s.id);
      const sales = inv.filter((i) => ["FAN", "FACR"].includes(i.type)).reduce((a, i) => a + i.total, 0);
      const returns = inv.filter((i) => ["FAA", "FAR"].includes(i.type)).reduce((a, i) => a + i.total, 0);
      const revenue = sales - returns;
      const creditIssued = inv.filter((i) => i.type === "FACR").reduce((a, i) => a + i.total, 0);
      const avoir = inv.filter((i) => i.type === "FAA").reduce((a, i) => a + i.total, 0);
      const returnsFar = inv.filter((i) => i.type === "FAR").reduce((a, i) => a + i.total, 0);
      const credits = customers.filter((c) => c.storeId === s.id).reduce((a, c) => a + Math.max(0, c.balance), 0);
      const advances = employees.filter((e) => e.storeId === s.id).reduce((a, e) => a + Math.max(0, e.balance), 0);
      const exp = expenses.filter((e) => e.storeId === s.id).reduce((a, e) => a + e.amount, 0);
      const pay = payments.filter((p) => p.storeId === s.id).reduce((a, p) => a + p.amount, 0);
      return {
        storeId: s.id,
        storeName: s.name,
        revenue,
        sales,
        creditIssued,
        credits, // crédits clients en cours (solde dû)
        avoir,
        returns: returnsFar,
        advances,
        expenses: exp,
        payments: pay,
        invoices: inv.length,
        performance: revenue - exp,
      };
    });

    // ---- Répartitions réseau ----
    const expensesByCategory = EXPENSE_CATEGORIES.map((c) => ({
      label: c.label,
      value: expenses.filter((e) => e.category === c.id).reduce((a, e) => a + e.amount, 0),
    })).filter((c) => c.value > 0);

    const now = new Date();
    const months: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("fr-FR", { month: "short" }), value: 0 });
    }
    for (const inv of invoices) {
      if (!["FAN", "FACR", "FAA", "FAR"].includes(inv.type)) continue;
      const d = new Date(inv.date);
      const bucket = months.find((m) => m.key === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      if (bucket) bucket.value += ["FAA", "FAR"].includes(inv.type) ? -inv.total : inv.total;
    }

    const invoiceByType = INVOICE_TYPES.map((t) => ({
      label: t.short,
      value: invoices.filter((i) => i.type === t.id).length,
    })).filter((t) => t.value > 0);

    const topCustomers = [...customers]
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 8)
      .map((c) => ({ label: `${c.name} · ${storeName(c.storeId)}`, value: c.balance }));

    const topEmployees = [...employees]
      .filter((e) => e.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 8)
      .map((e) => ({ label: `${e.name} · ${storeName(e.storeId)}`, value: e.balance }));

    return NextResponse.json({
      stores: rows,
      network: { expensesByCategory, revenueByMonth: months, invoiceByType, topCustomers, topEmployees },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
