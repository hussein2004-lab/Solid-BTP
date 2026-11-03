"use client";

// Gestion des magasins (réservé à l'administrateur principal). Création, édition,
// suppression. Les accès des gérants se règlent dans le module « Sous-admins ».

import { useEffect, useState } from "react";
import type { Store } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ModuleHeader, Spinner } from "../ui";

const empty = { name: "", city: "", address: "", phone: "", email: "", hours: "", lat: "", lon: "", note: "", imageUrl: "" };

export default function StoresModule() {
  const { flash } = useAdmin();
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);

  async function load() {
    const d = await fetch("/api/stores").then((r) => r.json());
    setStores(d.stores ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function uploadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) return flash("Image trop lourde (max 5 Mo).");
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      setForm((f) => ({ ...f, imageUrl: d.url }));
    } catch {
      flash("Échec de l'envoi de l'image");
    } finally {
      setImgUploading(false);
    }
  }

  function reset() {
    setEditingId(null);
    setForm(empty);
  }

  function edit(s: Store) {
    setEditingId(s.id);
    setForm({ name: s.name, city: s.city, address: s.address, phone: s.phone, email: s.email, hours: s.hours, lat: s.lat, lon: s.lon, note: s.note, imageUrl: s.imageUrl });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(editingId ? `/api/stores/${editingId}` : "/api/stores", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      flash(editingId ? "Magasin mis à jour" : "Magasin créé");
      reset();
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.error || "Échec");
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce magasin et toutes ses données ?")) return;
    const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
    if (res.ok) {
      flash("Magasin supprimé");
      if (editingId === id) reset();
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.error || "Échec");
    }
  }

  const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label">{label}</label>
      <input className="field" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <div>
      <ModuleHeader title="Magasins" subtitle="Créez et gérez les points de vente du réseau Solid-BTP." />
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <form onSubmit={save} className="card h-fit p-6">
          <h3 className="font-display text-lg font-extrabold text-ink">{editingId ? "Modifier le magasin" : "Nouveau magasin"}</h3>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {field("name", "Nom", { required: true })}
              {field("city", "Ville", { required: true })}
            </div>
            {field("address", "Adresse")}
            <div className="grid grid-cols-2 gap-3">
              {field("phone", "Téléphone")}
              {field("email", "E-mail")}
            </div>
            {field("hours", "Horaires")}
            <div className="grid grid-cols-2 gap-3">
              {field("lat", "Latitude", { inputMode: "decimal" })}
              {field("lon", "Longitude", { inputMode: "decimal" })}
            </div>
            <div>
              <label className="label">Note</label>
              <textarea rows={2} className="field resize-none" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div>
              <label className="label">Photo</label>
              {form.imageUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.imageUrl} alt="" className="h-36 w-full object-cover" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))} className="absolute bottom-2 right-2 rounded-lg bg-snow/90 px-3 py-1.5 font-mono text-[11px] font-semibold text-amber-deep">
                    Retirer
                  </button>
                </div>
              ) : (
                <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-mist/60 px-4 py-5 text-center ${imgUploading ? "pointer-events-none opacity-60" : ""}`}>
                  {imgUploading ? <Spinner label="Envoi…" /> : <span className="font-display text-sm font-semibold text-ink">Choisir une image</span>}
                  <input type="file" accept="image/*" className="hidden" disabled={imgUploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadImage(f); }} />
                </label>
              )}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="submit" className="btn-primary flex-1">{editingId ? "Enregistrer" : "Créer"}</button>
            {editingId && <button type="button" onClick={reset} className="btn-ghost">Annuler</button>}
          </div>
        </form>

        <div className="space-y-2">
          {stores.length === 0 && <EmptyState>Aucun magasin. Créez-en un pour démarrer.</EmptyState>}
          {stores.map((s) => (
            <div key={s.id} className="card flex items-center gap-4 p-3 hover:-translate-y-0.5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-mist">
                {s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl">🏬</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display font-bold text-ink">{s.name}</span>
                  <span className="shrink-0 rounded-md bg-mist px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{s.city}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-ink/55">{s.address}</p>
                <p className="mt-0.5 font-mono text-[11px] text-steel">{s.phone}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => edit(s)} className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] hover:border-ink">Modifier</button>
                <button onClick={() => remove(s.id)} className="border border-amber-deep/40 px-3 py-1.5 font-mono text-[11px] text-amber-deep hover:bg-amber-deep hover:text-paper">Suppr.</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
