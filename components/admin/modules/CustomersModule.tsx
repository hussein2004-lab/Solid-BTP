"use client";

// Clients. Liste avec solde (crédit/avoir), recherche, fiche éditable et
// historique des factures. Les comptes sont créés automatiquement par les
// factures à crédit/avoir, mais restent modifiables à la main.

import { useCallback, useEffect, useState } from "react";
import { formatCFA, formatDateFR } from "@/lib/format";
import { invoiceTypeLabel } from "@/lib/erp";
import type { Customer, Invoice } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ExportButton, ModuleHeader, Money, Spinner } from "../ui";

export default function CustomersModule() {
  const { activeStoreId, stores, flash, isSuper } = useAdmin();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeStoreId) params.set("storeId", activeStoreId);
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/customers?${params}`)
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .finally(() => setLoading(false));
  }, [activeStoreId, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const totalCredit = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);

  return (
    <div>
      <ModuleHeader
        title="Clients"
        subtitle="Comptes clients et soldes. Crédit en vert positif, avoir en orange."
        actions={<ExportButton href={`/api/customers/export${activeStoreId ? `?storeId=${activeStoreId}` : ""}`} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="field max-w-xs"
          placeholder="Rechercher un client (nom, téléphone)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="rounded-full border border-line bg-snow/70 px-3 py-1.5 font-mono text-xs text-ink-soft">
          Crédit total dû : <span className="font-bold text-green">{formatCFA(totalCredit)}</span>
        </span>
      </div>

      <div className="space-y-2">
        {loading && <Spinner label="Chargement…" />}
        {!loading && customers.length === 0 && <EmptyState>Aucun client. Les comptes apparaissent dès la première facture à crédit ou d'avoir.</EmptyState>}
        {!loading &&
          customers.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan to-violet font-display font-bold text-snow">
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-ink">{c.name}</div>
                  <div className="font-mono text-[11px] text-steel">
                    {c.phone || "—"}
                    {isSuper && ` · ${stores.find((s) => s.id === c.storeId)?.name ?? ""}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Solde</div>
                  <Money value={c.balance} signed />
                </div>
                <button
                  onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] hover:border-ink"
                >
                  {openId === c.id ? "Fermer" : "Ouvrir"}
                </button>
              </div>
              {openId === c.id && <CustomerDetail customer={c} onSaved={() => { flash("Client mis à jour"); load(); }} />}
            </div>
          ))}
      </div>
    </div>
  );
}

function CustomerDetail({ customer, onSaved }: { customer: Customer; onSaved: () => void }) {
  const [form, setForm] = useState({ name: customer.name, phone: customer.phone, address: customer.address, email: customer.email, balance: String(customer.balance) });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${customer.id}`)
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .catch(() => setInvoices([]));
  }, [customer.id]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, balance: Number(form.balance) || 0 }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  }

  return (
    <div className="mt-4 grid gap-5 border-t border-line pt-4 lg:grid-cols-2">
      <div className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Fiche</div>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="field" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <input className="field" placeholder="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="field" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div>
          <label className="label">Solde (F CFA, signé)</label>
          <input type="text" inputMode="numeric" className="field" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
        </div>
        <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Historique des factures</div>
        <div className="mt-2 space-y-1.5">
          {invoices.length === 0 && <p className="text-sm text-ink/55">Aucune facture rattachée.</p>}
          {invoices.map((inv) => (
            <a key={inv.id} href={`/admin/invoices/${inv.id}/print`} target="_blank" rel="noopener" className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5 hover:border-amber">
              <span className="font-mono text-xs font-bold text-ink">{inv.number}</span>
              <span className="font-mono text-[11px] text-steel">{invoiceTypeLabel(inv.type)} · {formatDateFR(inv.date)}</span>
              <span className="font-display text-sm font-bold text-amber-deep">{formatCFA(inv.total)}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
