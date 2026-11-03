"use client";

// Devis reçus depuis le site public. Bouton « Convertir en facture devis (IA) » :
// Gemini transforme le message (toute langue) en lignes chiffrées que le gérant
// peut modifier avant d'enregistrer une facture devis (Fad).

import { useEffect, useMemo, useState } from "react";
import { formatCFA, formatDateTimeFR } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ModuleHeader, Spinner } from "../ui";

interface DraftLine {
  articleId: string | null;
  label: string;
  quantity: number;
  unitPrice: number;
}

export default function OnlineQuotesModule() {
  const { storeName } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then((d) => setOrders(d.orders ?? [])).catch(() => setOrders([]));
  }, []);

  return (
    <div>
      <ModuleHeader title="Devis en ligne" subtitle="Demandes du site, converties en facture devis par l'IA." />
      <div className="space-y-2">
        {orders.length === 0 && <EmptyState>Aucune demande de devis pour l'instant.</EmptyState>}
        {orders.map((o) => (
          <div key={o.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display font-bold text-ink">{o.name}</span>
              <span className="font-mono text-[11px] text-steel">{formatDateTimeFR(o.createdAt)}</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-deep">
              Magasin : {o.storeId ? storeName(o.storeId) : "non précisé"}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-ink/60">
              <span>✉ {o.email}</span>
              <span>☎ {o.phone}</span>
              {o.dateNeeded && <span>📅 {o.dateNeeded}</span>}
            </div>
            {o.message && <p className="mt-3 text-sm text-ink/75">{o.message}</p>}
            <div className="mt-3">
              <button
                onClick={() => setOpenId(openId === o.id ? null : o.id)}
                className="rounded-full bg-gradient-to-r from-violet to-cyan px-4 py-2 font-display text-sm font-semibold text-snow shadow-glow"
              >
                {openId === o.id ? "Fermer" : "✨ Convertir en facture devis (IA)"}
              </button>
            </div>
            {openId === o.id && <QuoteConverter order={o} onSaved={() => setOpenId(null)} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteConverter({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const { stores, activeStoreId, flash } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [customerName, setCustomerName] = useState(order.name);
  const [customerPhone, setCustomerPhone] = useState(order.phone);
  const [saving, setSaving] = useState(false);

  const defaultStore =
    activeStoreId ||
    (stores.some((s) => s.id === order.storeId) ? order.storeId : "") ||
    stores[0]?.id ||
    "";
  const [storeId, setStoreId] = useState(defaultStore);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/ai/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (!ok) {
          setErr(d.error || "Échec de la conversion IA.");
        } else {
          setNote(d.note ?? "");
          setLines((d.items ?? []).map((it: DraftLine) => ({ ...it })));
          if (d.customerName) setCustomerName(d.customerName);
        }
      })
      .catch(() => alive && setErr("Service IA indisponible."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [order.id]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0), [lines]);

  function setLine(i: number, patch: Partial<DraftLine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  async function saveAsQuote() {
    if (!storeId) return flash("Choisissez un magasin.");
    if (lines.length === 0) return flash("Aucune ligne à enregistrer.");
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        type: "FAD",
        customerName,
        customerPhone,
        items: lines.map((l) => ({ articleId: l.articleId, label: l.label, quantity: l.quantity, unitPrice: l.unitPrice })),
        tax: 0,
        note: "Devis généré depuis une demande en ligne",
      }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      flash(`Devis ${d.invoice.number} créé`);
      onSaved();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.error || "Échec");
    }
  }

  if (loading) {
    return (
      <div className="mt-4 border-t border-line pt-4">
        <Spinner label="L'IA prépare le devis…" />
      </div>
    );
  }
  if (err) {
    return <div className="mt-4 rounded-xl border border-amber-deep/30 bg-amber-deep/5 p-3 text-sm text-amber-deep">{err}</div>;
  }

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      {note && <p className="rounded-lg border border-violet/20 bg-violet/5 px-3 py-2 text-sm text-ink/75">💡 {note}</p>}

      <div className="grid gap-2 sm:grid-cols-3">
        <input className="field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Client" />
        <input className="field" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Contact" />
        {stores.length > 1 && (
          <select className="field" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      <div className="space-y-1.5">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_64px_110px_32px] items-center gap-2">
            <input className="field py-1.5" value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} />
            <input type="text" inputMode="numeric" min="1" className="field py-1.5" value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) || 1 })} />
            <input type="text" inputMode="numeric" min="0" className="field py-1.5" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) || 0 })} />
            <button onClick={() => removeLine(i)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-amber-deep hover:bg-amber-deep hover:text-paper">×</button>
          </div>
        ))}
        {lines.length === 0 && <p className="text-sm text-ink/55">L'IA n'a proposé aucune ligne — ajustez manuellement si besoin.</p>}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="font-display font-bold text-ink">Total : <span className="text-amber-deep">{formatCFA(total)}</span></span>
        <button onClick={saveAsQuote} disabled={saving} className="btn-primary px-5 disabled:opacity-60">
          {saving ? "Enregistrement…" : "Enregistrer le devis (Fad)"}
        </button>
      </div>
    </div>
  );
}
