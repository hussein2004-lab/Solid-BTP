"use client";

// Gestion des sous-administrateurs (gérants). Réservé à l'administrateur principal.
// Création / suppression + attribution des magasins auxquels chaque gérant accède.

import { useEffect, useState } from "react";
import type { PublicAdmin } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ModuleHeader, Spinner } from "../ui";

export default function TeamModule() {
  const { me, stores, flash } = useAdmin();
  const [admins, setAdmins] = useState<PublicAdmin[]>([]);
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    const d = await fetch("/api/admins").then((r) => r.json());
    setAdmins(d.admins ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      flash("Gérant créé");
      setForm({ username: "", password: "" });
      load();
      setOpenId(d.admin?.id ?? null); // ouvre directement l'attribution des magasins
    } else {
      setErr(d.error || "Échec de la création");
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce compte gérant ?")) return;
    const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      flash("Compte supprimé");
      load();
    } else {
      flash(d.error || "Échec");
    }
  }

  return (
    <div>
      <ModuleHeader title="Sous-admins" subtitle="Les gérants accèdent uniquement aux magasins que vous leur attribuez." />
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <form onSubmit={create} className="card h-fit p-6">
          <h3 className="font-display text-lg font-extrabold text-ink">Nouveau gérant</h3>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label">Nom d'utilisateur</label>
              <input required className="field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="label">Mot de passe (min. 6)</label>
              <input required type="text" className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {err && <p className="text-sm text-amber-deep">{err}</p>}
            <button type="submit" className="btn-primary w-full">Créer le compte</button>
          </div>
        </form>

        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-center gap-4">
                <span className={`grid h-10 w-10 place-items-center rounded-xl font-display font-bold text-snow ${a.role === "super" ? "bg-gradient-to-br from-amber to-amber-deep" : "bg-gradient-to-br from-violet to-cyan"}`}>
                  {a.username.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex-1">
                  <div className="font-display font-bold text-ink">{a.username}</div>
                  <div className="font-mono text-[11px] uppercase tracking-wide text-steel">
                    {a.role === "super" ? "Administrateur principal" : "Gérant"}
                    {a.id === me.id && " · vous"}
                  </div>
                </div>
                {a.role === "super" ? (
                  <span className="font-mono text-[11px] text-steel/60">protégé · accès total</span>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="border border-violet/40 px-3 py-1.5 font-mono text-[11px] text-violet hover:bg-violet hover:text-snow">
                      Magasins
                    </button>
                    <button onClick={() => remove(a.id)} className="border border-amber-deep/40 px-3 py-1.5 font-mono text-[11px] text-amber-deep hover:bg-amber-deep hover:text-paper">
                      Suppr.
                    </button>
                  </div>
                )}
              </div>
              {openId === a.id && a.role !== "super" && (
                <StoreAccessEditor adminId={a.id} stores={stores.map((s) => ({ id: s.id, name: s.name }))} onSaved={() => flash("Accès enregistrés")} />
              )}
            </div>
          ))}
          {admins.length === 0 && <EmptyState>Aucun compte.</EmptyState>}
        </div>
      </div>
    </div>
  );
}

function StoreAccessEditor({
  adminId,
  stores,
  onSaved,
}: {
  adminId: string;
  stores: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admins/${adminId}/stores`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setSelected(new Set<string>(d.storeIds ?? []));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [adminId]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/admins/${adminId}/stores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeIds: [...selected] }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-snow/60 p-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Magasins accessibles</div>
      {loading ? (
        <Spinner label="Chargement…" />
      ) : stores.length === 0 ? (
        <p className="text-sm text-ink/55">Aucun magasin à attribuer.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {stores.map((s) => (
            <label key={s.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${selected.has(s.id) ? "border-violet bg-violet/10 text-violet" : "border-line text-ink hover:border-ink/40"}`}>
              <input type="checkbox" className="h-3.5 w-3.5 accent-violet" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      )}
      <button onClick={save} disabled={saving || loading} className="btn-primary mt-3 px-4 py-2 text-sm disabled:opacity-50">
        {saving ? "Enregistrement…" : "Enregistrer les accès"}
      </button>
    </div>
  );
}
