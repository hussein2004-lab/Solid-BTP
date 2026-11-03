"use client";

// Cahier de jour. Le gérant saisit les éléments d'une journée : versements
// clients (+), dépenses catégorisées (−), avances (−) et versements Solid-BTP (−,
// ex. dépôt en banque). Totaux, filtres, export Excel et impression.

import { useCallback, useEffect, useMemo, useState } from "react";
import { DAYBOOK_KINDS, EXPENSE_CATEGORIES, dayBookKindLabel, dayBookSign, expenseCategoryLabel } from "@/lib/erp";
import { formatCFA, formatDateFR, toDateInput } from "@/lib/format";
import type { DayBookEntry } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ExportButton, ModuleHeader, PrintButton, Spinner } from "../ui";

export default function DayBookModule() {
  const { activeStoreId, stores, storeName, flash, isSuper } = useAdmin();
  const [entries, setEntries] = useState<DayBookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [date, setDate] = useState(toDateInput());
  const [kindFilter, setKindFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");

  // Magasin d'opération (saisie). Pour le super en mode « Tous », pas de saisie.
  const opStore = activeStoreId || (stores.length === 1 ? stores[0].id : "");

  // Saisie
  const [kind, setKind] = useState("payment");
  const [category, setCategory] = useState("gazoil");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(toDateInput());

  const buildQs = useCallback(() => {
    const p = new URLSearchParams();
    if (activeStoreId) p.set("storeId", activeStoreId);
    if (date) p.set("date", date);
    if (kindFilter) p.set("kind", kindFilter);
    if (catFilter) p.set("category", catFilter);
    return p.toString();
  }, [activeStoreId, date, kindFilter, catFilter]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/daybook?${buildQs()}`).then((r) => r.json()).then((d) => setEntries(d.entries ?? [])).finally(() => setLoading(false));
  }, [buildQs]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!opStore) return flash("Sélectionnez un magasin pour saisir.");
    if (!(Number(amount) > 0)) return flash("Montant invalide.");
    const res = await fetch("/api/daybook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: opStore, kind, category, label, amount: Number(amount), date: entryDate }),
    });
    if (res.ok) {
      flash("Ligne ajoutée au cahier");
      setLabel("");
      setAmount("");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.error || "Échec");
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette ligne ?")) return;
    const res = await fetch(`/api/daybook?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      flash("Ligne supprimée");
      load();
    }
  }

  // Totaux par nature.
  const totals = useMemo(() => {
    const t = { payment: 0, expense: 0, advance: 0, deposit: 0 };
    for (const e of entries) t[e.kind as keyof typeof t] = (t[e.kind as keyof typeof t] ?? 0) + e.amount;
    const net = t.payment - t.expense - t.advance - t.deposit;
    return { ...t, net };
  }, [entries]);

  const exportHref = `/api/daybook/export?${buildQs()}`;

  return (
    <div>
      <ModuleHeader
        title="Cahier de jour"
        subtitle="Versements, dépenses, avances et versements Solid-BTP."
        actions={
          <>
            <ExportButton href={exportHref} />
            <PrintButton />
          </>
        }
      />

      {/* Résumé */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Versements" value={totals.payment} tone="green" />
        <SummaryCard label="Dépenses" value={-totals.expense} tone="amber" />
        <SummaryCard label="Avances" value={-totals.advance} tone="amber" />
        <SummaryCard label="Versements Solid-BTP" value={-totals.deposit} tone="amber" />
        <SummaryCard label="Solde net" value={totals.net} tone="violet" emphasize />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Saisie */}
        <form onSubmit={add} className="card h-fit p-6 no-print">
          <h3 className="font-display text-lg font-extrabold text-ink">Ajouter une ligne</h3>
          {!opStore ? (
            <p className="mt-4 rounded-xl border border-dashed border-ink/20 bg-mist p-4 text-sm text-ink/55">
              Choisissez un magasin précis (sélecteur en haut) pour saisir des lignes.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nature</label>
                <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
                  {DAYBOOK_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label} ({k.sign > 0 ? "+" : "−"})</option>)}
                </select>
              </div>
              {kind === "expense" && (
                <div>
                  <label className="label">Catégorie de dépense</label>
                  <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Libellé</label>
                <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. nom du client, détail…" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Montant</label>
                  <input type="text" inputMode="numeric" min="0" className="field" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="field" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">Ajouter</button>
            </div>
          )}
        </form>

        {/* Filtres + liste */}
        <div>
          <div className="mb-3 flex flex-wrap items-end gap-3 no-print">
            <div>
              <label className="label">Jour</label>
              <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Nature</label>
              <select className="field" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
                <option value="">Toutes</option>
                {DAYBOOK_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Dépense</label>
              <select className="field" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">Toutes</option>
                {EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <button onClick={() => { setKindFilter(""); setCatFilter(""); }} className="rounded-full border-2 border-line px-3 py-2 font-mono text-xs hover:border-ink">Réinitialiser</button>
          </div>

          <div className="space-y-1.5">
            {loading && <Spinner label="Chargement…" />}
            {!loading && entries.length === 0 && <EmptyState>Aucune ligne pour ces critères.</EmptyState>}
            {!loading &&
              entries.map((e) => {
                const signed = dayBookSign(e.kind) * e.amount;
                return (
                  <div key={e.id} className="card flex items-center gap-3 p-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${signed >= 0 ? "bg-green" : "bg-amber-deep"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-ink">{dayBookKindLabel(e.kind)}</span>
                        {e.kind === "expense" && <span className="rounded bg-mist px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted">{expenseCategoryLabel(e.category)}</span>}
                        {e.label && <span className="truncate text-sm text-ink/60">· {e.label}</span>}
                      </div>
                      <div className="font-mono text-[10px] text-steel">{formatDateFR(e.date)}{isSuper && ` · ${storeName(e.storeId)}`}</div>
                    </div>
                    <span className={`font-display font-extrabold ${signed >= 0 ? "text-green" : "text-amber-deep"}`}>
                      {signed >= 0 ? "+" : "−"}{formatCFA(Math.abs(signed))}
                    </span>
                    <button onClick={() => remove(e.id)} className="no-print grid h-7 w-7 place-items-center rounded-lg border border-line text-amber-deep hover:bg-amber-deep hover:text-paper" title="Supprimer">×</button>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone, emphasize }: { label: string; value: number; tone: "green" | "amber" | "violet"; emphasize?: boolean }) {
  const color = tone === "green" ? "#16A34A" : tone === "violet" ? "#7C5CFF" : "#FF6A1A";
  return (
    <div className={`glass-card p-4 ${emphasize ? "ring-1 ring-violet/30" : ""}`}>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 font-display text-lg font-extrabold" style={{ color }}>
        {value >= 0 ? "" : "−"}{formatCFA(Math.abs(value))}
      </div>
    </div>
  );
}
