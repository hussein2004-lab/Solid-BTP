"use client";

// Facturation. Saisie d'une facture (type, n° auto-incrémenté, articles, client,
// totaux HT/taxe/TTC) + liste, export Excel et impression. La création tient
// automatiquement le compte client pour les factures à crédit (Facr) et d'avoir (Faa).

import { useCallback, useEffect, useMemo, useState } from "react";
import { INVOICE_TYPES, invoiceTypeLabel, invoiceType } from "@/lib/erp";
import { formatCFA, formatDateFR, toDateInput } from "@/lib/format";
import type { Article, Invoice } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ExportButton, ModuleHeader, Spinner } from "../ui";

interface Line {
  articleId: string | null;
  label: string;
  quantity: string;
  unitPrice: string;
}

const emptyLine: Line = { articleId: null, label: "", quantity: "1", unitPrice: "" };

export default function InvoicesModule() {
  const { activeStoreId, stores, flash, isSuper } = useAdmin();
  const [view, setView] = useState<"list" | "new">("list");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Champs du formulaire
  const [formStore, setFormStore] = useState(activeStoreId || stores[0]?.id || "");
  const [type, setType] = useState("FAN");
  const [date, setDate] = useState(toDateInput());
  const [number, setNumber] = useState("…");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [tax, setTax] = useState("0");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const exportHref = `/api/invoices/export${activeStoreId ? `?storeId=${activeStoreId}` : ""}`;

  const load = useCallback(() => {
    setLoading(true);
    const qs = activeStoreId ? `?storeId=${activeStoreId}` : "";
    Promise.all([
      fetch(`/api/invoices${qs}`).then((r) => r.json()).catch(() => ({})),
      fetch("/api/articles").then((r) => r.json()).catch(() => ({})),
    ]).then(([inv, art]) => {
      setInvoices(inv.invoices ?? []);
      setArticles(art.articles ?? []);
      setLoading(false);
    });
  }, [activeStoreId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setFormStore(activeStoreId || stores[0]?.id || "");
  }, [activeStoreId, stores]);

  // Aperçu du prochain numéro à chaque changement de type / magasin.
  useEffect(() => {
    if (view !== "new" || !formStore) return;
    let alive = true;
    setNumber("…");
    fetch(`/api/invoices/next-number?type=${type}&storeId=${formStore}`)
      .then((r) => r.json())
      .then((d) => alive && setNumber(d.number ?? "—"))
      .catch(() => alive && setNumber("—"));
    return () => {
      alive = false;
    };
  }, [view, type, formStore]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0),
    [lines],
  );
  const total = subtotal + (Number(tax) || 0);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function pickArticle(i: number, articleId: string) {
    const a = articles.find((x) => x.id === articleId);
    if (!a) return setLine(i, { articleId: null });
    setLine(i, { articleId: a.id, label: a.name, unitPrice: String(a.price) });
  }
  function addLine() {
    setLines((ls) => [...ls, { ...emptyLine }]);
  }
  function removeLine(i: number) {
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)));
  }

  function resetForm() {
    setType("FAN");
    setDate(toDateInput());
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setLines([{ ...emptyLine }]);
    setTax("0");
    setNote("");
  }

  async function save() {
    if (!formStore) return flash("Choisissez un magasin.");
    const items = lines
      .filter((l) => l.label.trim() && Number(l.quantity) > 0)
      .map((l) => ({ articleId: l.articleId, label: l.label.trim(), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) || 0 }));
    if (items.length === 0) return flash("Ajoutez au moins une ligne.");

    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: formStore, type, date, customerName, customerPhone, customerAddress, items, tax: Number(tax) || 0, note }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      flash(`Facture ${d.invoice.number} enregistrée`);
      resetForm();
      setView("list");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.error || "Échec de l'enregistrement");
    }
  }

  const typeMeta = invoiceType(type);

  return (
    <div>
      <ModuleHeader
        title="Factures"
        subtitle="Saisie, numérotation automatique, impression et export."
        actions={
          view === "list" ? (
            <>
              <ExportButton href={exportHref} />
              <button onClick={() => { resetForm(); setView("new"); }} className="btn-primary px-4 py-2 text-sm">
                + Nouvelle facture
              </button>
            </>
          ) : (
            <button onClick={() => setView("list")} className="btn-ghost">← Retour à la liste</button>
          )
        }
      />

      {view === "new" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Colonne principale : entête + lignes */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Type de facture</label>
                  <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
                    {INVOICE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label} ({t.prefix})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">N° de facture (auto)</label>
                  <input className="field bg-mist/60 font-mono" value={number} readOnly />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                {(isSuper || stores.length > 1) && (
                  <div>
                    <label className="label">Magasin</label>
                    <select className="field" value={formStore} onChange={(e) => setFormStore(e.target.value)}>
                      {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {typeMeta?.tracksCustomer && (
                <p className="mt-3 rounded-lg border border-violet/30 bg-violet/5 px-3 py-2 font-mono text-[11px] text-violet">
                  ⓘ Cette facture {typeMeta.effect === "debit" ? "ajoute au crédit" : "crée un avoir pour"} le compte client (créé/mis à jour automatiquement).
                </p>
              )}
            </div>

            <div className="card p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-ink">Articles</h3>
                <button onClick={addLine} className="rounded-full border-2 border-line px-3 py-1 font-mono text-xs hover:border-amber hover:text-amber-deep">+ Ligne</button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_110px_36px] items-end gap-2">
                    <div>
                      {i === 0 && <label className="label">Désignation</label>}
                      <input
                        className="field"
                        list="catalogue-articles"
                        value={l.label}
                        placeholder="Article ou libellé libre"
                        onChange={(e) => {
                          const match = articles.find((a) => a.name === e.target.value);
                          if (match) pickArticle(i, match.id);
                          else setLine(i, { label: e.target.value, articleId: null });
                        }}
                      />
                    </div>
                    <div>
                      {i === 0 && <label className="label">Qté</label>}
                      <input type="text" inputMode="numeric" min="0" className="field" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                    </div>
                    <div>
                      {i === 0 && <label className="label">P.U. (F CFA)</label>}
                      <input type="text" inputMode="numeric" min="0" className="field" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                    </div>
                    <button onClick={() => removeLine(i)} className="mb-1 grid h-9 w-9 place-items-center rounded-lg border border-line text-amber-deep hover:bg-amber-deep hover:text-paper" title="Retirer">×</button>
                  </div>
                ))}
              </div>
              <datalist id="catalogue-articles">
                {articles.map((a) => <option key={a.id} value={a.name} />)}
              </datalist>
            </div>
          </div>

          {/* Colonne latérale : client + totaux + enregistrer */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="mb-3 font-display text-base font-bold text-ink">Client</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Nom du client</label>
                  <input className="field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Contact</label>
                  <input className="field" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label">Adresse (facultatif)</label>
                  <input className="field" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between"><span className="text-ink/60">Total HT</span><span className="font-bold text-ink">{formatCFA(subtotal)}</span></div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink/60">Taxe</span>
                  <input type="text" inputMode="numeric" min="0" className="field w-32 text-right" value={tax} onChange={(e) => setTax(e.target.value)} />
                </div>
                <div className="flex justify-between border-t border-line pt-2 text-base"><span className="font-bold text-ink">Total TTC</span><span className="font-extrabold text-amber-deep">{formatCFA(total)}</span></div>
              </div>
              <div className="mt-3">
                <label className="label">Note (facultatif)</label>
                <textarea rows={2} className="field resize-none" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <button onClick={save} disabled={saving} className="btn-primary mt-4 w-full disabled:opacity-60">
                {saving ? "Enregistrement…" : "Enregistrer la facture"}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="space-y-2">
          {loading && <Spinner label="Chargement…" />}
          {!loading && invoices.length === 0 && <EmptyState>Aucune facture pour l'instant.</EmptyState>}
          {!loading &&
            invoices.map((inv) => (
              <div key={inv.id} className="card flex flex-wrap items-center gap-4 p-4 hover:-translate-y-0.5">
                <span className="rounded-lg bg-gradient-to-br from-amber/15 to-violet/15 px-3 py-1.5 font-mono text-sm font-bold text-ink">{inv.number}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-bold text-ink">{inv.customerName || "Client comptant"}</span>
                    <span className="rounded-md bg-mist px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{invoiceTypeLabel(inv.type)}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-steel">{formatDateFR(inv.date)}{inv.customerPhone ? ` · ${inv.customerPhone}` : ""}</p>
                </div>
                <span className="font-display font-extrabold text-amber-deep">{formatCFA(inv.total)}</span>
                <a href={`/admin/invoices/${inv.id}/print`} target="_blank" rel="noopener" className="border border-violet/40 px-3 py-1.5 font-mono text-[11px] text-violet hover:bg-violet hover:text-snow">
                  Imprimer
                </a>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
