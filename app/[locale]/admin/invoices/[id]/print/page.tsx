import { getLocale } from "next-intl/server";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccessStore } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { formatCFA, formatDateFR } from "@/lib/format";
import { invoiceTypeLabel } from "@/lib/erp";
import InvoicePrintActions from "@/components/admin/InvoicePrintActions";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    const locale = await getLocale();
    redirect({ href: "/admin/login", locale });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!invoice || !(await canAccessStore(admin!, invoice.storeId))) {
    return (
      <main className="mx-auto max-w-2xl p-10 text-center font-sans">
        <p className="text-lg font-bold">Facture introuvable ou accès refusé.</p>
      </main>
    );
  }
  const store = await prisma.store.findUnique({ where: { id: invoice.storeId } });

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-[#1a1a1a] sm:p-12">
      <InvoicePrintActions />

      {/* En-tête */}
      <div className="flex items-start justify-between border-b-2 border-[#FF6A1A] pb-6">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{store?.name ?? "Solid-BTP"}</div>
          <div className="mt-1 text-sm text-[#555]">{store?.address}</div>
          <div className="text-sm text-[#555]">
            {store?.phone}
            {store?.email ? ` · ${store.email}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-[#888]">{invoiceTypeLabel(invoice.type)}</div>
          <div className="font-mono text-xl font-bold">{invoice.number}</div>
          <div className="mt-1 text-sm text-[#555]">{formatDateFR(invoice.date)}</div>
        </div>
      </div>

      {/* Client */}
      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-[#888]">Client</div>
        <div className="text-lg font-bold">{invoice.customerName || "Client comptant"}</div>
        {invoice.customerPhone && <div className="text-sm text-[#555]">{invoice.customerPhone}</div>}
        {invoice.customerAddress && <div className="text-sm text-[#555]">{invoice.customerAddress}</div>}
      </div>

      {/* Lignes */}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#ddd] text-left text-[#888]">
            <th className="py-2">Désignation</th>
            <th className="py-2 text-right">Qté</th>
            <th className="py-2 text-right">P.U.</th>
            <th className="py-2 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items ?? []).map((it) => (
            <tr key={it.id} className="border-b border-[#eee]">
              <td className="py-2">{it.label}</td>
              <td className="py-2 text-right">{it.quantity}</td>
              <td className="py-2 text-right">{formatCFA(it.unitPrice)}</td>
              <td className="py-2 text-right font-medium">{formatCFA(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="mt-4 flex justify-end">
        <table className="text-sm">
          <tbody>
            <tr>
              <td className="py-1 pr-8 text-[#555]">Total HT</td>
              <td className="py-1 text-right font-medium">{formatCFA(invoice.subtotal)}</td>
            </tr>
            <tr>
              <td className="py-1 pr-8 text-[#555]">Taxe</td>
              <td className="py-1 text-right font-medium">{formatCFA(invoice.tax)}</td>
            </tr>
            <tr className="border-t-2 border-[#1a1a1a]">
              <td className="py-2 pr-8 text-base font-bold">Total TTC</td>
              <td className="py-2 text-right text-base font-extrabold text-[#FF6A1A]">{formatCFA(invoice.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {invoice.note && (
        <div className="mt-6 border-t border-[#eee] pt-4 text-sm text-[#555]">
          <span className="font-semibold">Note :</span> {invoice.note}
        </div>
      )}

      <div className="mt-10 text-center text-xs text-[#aaa]">
        Solid-BTP — Super Quincaillerie · Tout pour le Bâtiment
      </div>
    </main>
  );
}
