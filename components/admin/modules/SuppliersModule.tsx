"use client";

// Fournisseurs. Liste avec solde dû, création/édition, recherche. Le solde
// représente ce que le magasin doit encore au fournisseur.

import { useCallback, useEffect, useState } from "react";
import { formatCFA } from "@/lib/format";
import type { Supplier } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ExportButton, ModuleHeader, Spinner } from "../ui";

const empty = { name: "", phone: "", email: "", address: "", balance: "", note: "" };

export default function SuppliersModule() {
  const { activeStoreId, stores, flash, isSuper } = useAdmin();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStore, setFormStore] = useState(activeStoreId || stores[0]?.id || "");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeStoreId) params.set("storeId", activeStoreId);
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/suppliers?${params}`).then((r) => r.json()).then((d) => setSuppliers(d.suppliers ?? [])).finally(() => setLoading(false));
  }, [activeStoreId, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => setFormStore(activeStoreId || stores[0]?.id || ""), [activeStoreId, stores]);

  function reset() {
    setEditingId(null);
    setForm(empty);
  }
  function edit(s: Supplier) {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone, email: s.email, address: s.address, balance: String(s.balance), note: s.note });
    setFormStore(s.storeId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, balance: Number(form.balance) || 0, storeId: formStore };
    const res = await fetch(editingId ? `/api/suppliers/${editingId}` : "/api/suppliers", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      flash(editingId ? "Fournisseur mis à jour" : "Fournisseur ajouté");
      reset();
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.error || "Échec");
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    if (res.ok) {
      flash("Fournisseur supprimé");
      if (editingId === id) reset();
      load();
    }
  }

  const totalDue = suppliers.reduce((s, x) => s + Math.max(0, x.balance), 0);

  return (
    <div>
      <ModuleHeader
        title="Fournisseurs"
        subtitle="Contacts et soldes dus par le magasin."
        actions={<ExportButton href={`/api/suppliers/export${activeStoreId ? `?storeId=${activeStoreId}` : ""}`} />}
      />
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <form onSubmit={save} className="card h-fit p-6">
          <h3 className="font-display text-lg font-extrabold text-ink">{editingId ? "Modifier" : "Nouveau fournisseur"}</h3>
          <div className="mt-4 space-y-3">
            {(isSuper || stores.length > 1) && !editingId && (
              <div>
                <label className="label">Magasin</label>
                <select className="field" value={formStore} onChange={(e) => setFormStore(e.target.value)}>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Nom</label>
              <input required className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Téléphone</label>
                <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Adresse</label>
              <input className="field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Solde dû (F CFA)</label>
              <input type="text" inputMode="numeric" className="field" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
            </div>
            <div>
              <label className="label">Note</label>
              <textarea rows={2} className="field resize-none" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="submit" className="btn-primary flex-1">{editingId ? "Enregistrer" : "Ajouter"}</button>
            {editingId && <button type="button" onClick={reset} className="btn-ghost">Annuler</button>}
          </div>
        </form>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input className="field max-w-xs" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="rounded-full border border-line bg-snow/70 px-3 py-1.5 font-mono text-xs text-ink-soft">
              Total dû : <span className="font-bold text-amber-deep">{formatCFA(totalDue)}</span>
            </span>
          </div>
          <div className="space-y-2">
            {loading && <Spinner label="Chargement…" />}
            {!loading && suppliers.length === 0 && <EmptyState>Aucun fournisseur.</EmptyState>}
            {!loading &&
              suppliers.map((s) => (
                <div key={s.id} className="card flex flex-wrap items-center gap-4 p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber to-amber-deep font-display font-bold text-snow">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-ink">{s.name}</div>
                    <div className="font-mono text-[11px] text-steel">{s.phone || "—"}{isSuper && ` · ${stores.find((x) => x.id === s.storeId)?.name ?? ""}`}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Solde dû</div>
                    <div className="font-display font-extrabold text-amber-deep">{formatCFA(s.balance)}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => edit(s)} className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] hover:border-ink">Modifier</button>
                    <button onClick={() => remove(s.id)} className="border border-amber-deep/40 px-3 py-1.5 font-mono text-[11px] text-amber-deep hover:bg-amber-deep hover:text-paper">Suppr.</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
