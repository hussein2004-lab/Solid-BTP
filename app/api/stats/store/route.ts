import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, resolveStoreId, errorResponse } from "@/lib/access";
import { EXPENSE_CATEGORIES } from "@/lib/erp";

// Agrégats d'un magasin pour les diagrammes du tableau de bord.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const storeId = await resolveStoreId(admin, searchParams.get("storeId"));

    const [invoices, customers, employees, expenses] = await Promise.all([
      prisma.invoice.findMany({ where: { storeId }, select: { type: true, total: true, date: true } }),
      prisma.customer.findMany({ where: { storeId }, select: { name: true, balance: true } }),
      prisma.employee.findMany({ where: { storeId }, select: { name: true, balance: true } }),
      prisma.dayBookEntry.findMany({ where: { storeId, kind: "expense" }, select: { category: true, amount: true } }),
    ]);

    const sumBy = (types: string[]) =>
      invoices.filter((i) => types.includes(i.type)).reduce((s, i) => s + i.total, 0);
    const salesTotal = sumBy(["FAN", "FACR"]);
    const returnsTotal = sumBy(["FAA", "FAR"]);
    const netRevenue = salesTotal - returnsTotal;

    const creditsOutstanding = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);
    const advancesOutstanding = employees.reduce((s, e) => s + Math.max(0, e.balance), 0);
    const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

    // Revenus nets des 6 derniers mois (clé YYYY-MM).
    const now = new Date();
    const months: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: d.toLocaleDateString("fr-FR", { month: "short" }), value: 0 });
    }
    for (const inv of invoices) {
      if (!["FAN", "FACR", "FAA", "FAR"].includes(inv.type)) continue;
      const d = new Date(inv.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.value += ["FAA", "FAR"].includes(inv.type) ? -inv.total : inv.total;
    }

    // Dépenses par catégorie (camembert).
    const expensesByCategory = EXPENSE_CATEGORIES.map((c) => ({
      label: c.label,
      value: expenses.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0),
    })).filter((c) => c.value > 0);

    // Top employés par avance et top clients par crédit (barres).
    const topAdvances = [...employees]
      .filter((e) => e.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 6)
      .map((e) => ({ label: e.name, value: e.balance }));
    const topCredits = [...customers]
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 6)
      .map((c) => ({ label: c.name, value: c.balance }));

    return NextResponse.json({
      kpis: { netRevenue, creditsOutstanding, advancesOutstanding, expensesTotal, invoiceCount: invoices.length },
      revenueByMonth: months,
      expensesByCategory,
      topAdvances,
      topCredits,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
