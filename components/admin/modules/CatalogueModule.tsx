"use client";

// Catalogue (référentiel produits global). Quatre onglets :
//  - Articles : CRUD manuel.
//  - Ajout rapide : 35 articles courants en un clic.
//  - Recherche IA : décrire un besoin → Gemini propose des articles à publier.
//  - Photo IA : photo → Gemini identifie tous les articles visibles → publication groupée.
// Les prix/quantités par magasin sont gérés dans le module « Stock ».

import { useEffect, useState } from "react";
import { CATEGORIES, QUICK_ARTICLES, categoryImage, categoryLabel } from "@/lib/constants";
import { formatCFA } from "@/lib/format";
import type { Article, ProposedArticle } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ModuleHeader, Spinner } from "../ui";

type Tab = "list" | "quick" | "ai-text" | "ai-photo";

const emptyForm = { name: "", description: "", category: CATEGORIES[0].id, price: "", imageUrl: "" };

const TABS: { id: Tab; label: string }[] = [
  { id: "list", label: "Articles" },
  { id: "quick", label: "Ajout rapide" },
  { id: "ai-text", label: "✨ Recherche IA" },
  { id: "ai-photo", label: "📷 Photo IA" },
];

export default function CatalogueModule() {
  const { flash } = useAdmin();
  const [articles, setArticles] = useState<Article[]>([]);
  const [tab, setTab] = useState<Tab>("list");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgErr, setImgErr] = useState("");

  // ----- IA : recherche texte -----
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [aiResults, setAiResults] = useState<ProposedArticle[]>([]);
  const [aiSaved, setAiSaved] = useState<Set<number>>(new Set());

  // ----- IA : photo -----
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [photoResults, setPhotoResults] = useState<ProposedArticle[]>([]);
  const [photoPicked, setPhotoPicked] = useState<Set<number>>(new Set());
  const [photoSaved, setPhotoSaved] = useState<Set<number>>(new Set());

  async function load() {
    const d = await fetch("/api/articles").then((r) => r.json());
    setArticles(d.articles ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  // ---- CRUD manuel ----
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price) || 0 };
    const url = editingId ? `/api/articles/${editingId}` : "/api/articles";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      flash(editingId ? "Article mis à jour" : "Article ajouté");
      setForm(emptyForm);
      setEditingId(null);
      load();
    } else {
      flash("Échec de l'enregistrement");
    }
  }

  async function uploadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setImgErr("Image trop lourde (max 5 Mo).");
      return;
    }
    setImgErr("");
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Échec de l'envoi");
      setForm((f) => ({ ...f, imageUrl: d.url }));
    } catch (err) {
      setImgErr(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setImgUploading(false);
    }
  }

  function edit(a: Article) {
    setEditingId(a.id);
    setForm({ name: a.name, description: a.description, category: a.category, price: String(a.price), imageUrl: a.imageUrl });
    setTab("list");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet article du catalogue ?")) return;
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (res.ok) {
      flash("Article supprimé");
      load();
    }
  }

  async function quickAdd(q: (typeof QUICK_ARTICLES)[number]) {
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...q, imageUrl: "" }),
    });
    if (res.ok) {
      flash(`« ${q.name} » ajouté`);
      load();
    }
  }

  // ---- IA : enregistrer une proposition ----
  async function saveProposal(p: ProposedArticle): Promise<boolean> {
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: p.name, description: p.description, category: p.category, price: p.price, imageUrl: "" }),
    });
    return res.ok;
  }

  // ---- IA : recherche texte ----
  async function runTextSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = aiQuery.trim();
    if (!query || aiLoading) return;
    setAiLoading(true);
    setAiErr("");
    setAiNote("");
    setAiResults([]);
    setAiSaved(new Set());
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }), // mode "propose" par défaut (admin)
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "La recherche IA a échoué.");
      setAiNote(d.note ?? "");
      setAiResults(d.results ?? []);
      if ((d.results ?? []).length === 0) setAiErr("Aucune proposition. Reformulez le besoin.");
    } catch (err) {
      setAiErr(err instanceof Error ? err.message : "Service IA indisponible.");
    } finally {
      setAiLoading(false);
    }
  }

  async function addAiResult(p: ProposedArticle, idx: number) {
    if (await saveProposal(p)) {
      setAiSaved((s) => new Set(s).add(idx));
      flash(`« ${p.name} » ajouté`);
      load();
    } else flash("Échec de l'enregistrement");
  }

  // ---- IA : photo ----
  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoErr("");
    setPhotoNote("");
    setPhotoResults([]);
    setPhotoPicked(new Set());
    setPhotoSaved(new Set());
    if (file.size > 5 * 1024 * 1024) {
      setPhotoErr("Image trop lourde (max 5 Mo).");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function runPhotoIdentify() {
    if (!photoFile || photoLoading) return;
    setPhotoLoading(true);
    setPhotoErr("");
    setPhotoNote("");
    setPhotoResults([]);
    setPhotoPicked(new Set());
    setPhotoSaved(new Set());
    try {
      const fd = new FormData();
      fd.append("image", photoFile); // mode "propose" par défaut
      const res = await fetch("/api/ai/identify", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "L'analyse de la photo a échoué.");
      setPhotoNote(d.note ?? "");
      const results: ProposedArticle[] = d.results ?? [];
      setPhotoResults(results);
      setPhotoPicked(new Set(results.map((_, i) => i)));
      if (results.length === 0) setPhotoErr("Aucun article reconnu sur la photo.");
    } catch (err) {
      setPhotoErr(err instanceof Error ? err.message : "Service IA indisponible.");
    } finally {
      setPhotoLoading(false);
    }
  }

  function togglePhotoPick(idx: number) {
    setPhotoPicked((s) => {
      const n = new Set(s);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  }

  async function addPhotoSelection() {
    const toAdd = photoResults.map((p, i) => ({ p, i })).filter(({ i }) => photoPicked.has(i) && !photoSaved.has(i));
    if (toAdd.length === 0) return;
    let ok = 0;
    const saved = new Set(photoSaved);
    for (const { p, i } of toAdd) {
      if (await saveProposal(p)) {
        saved.add(i);
        ok++;
      }
    }
    setPhotoSaved(saved);
    load();
    flash(ok > 0 ? `${ok} article(s) ajouté(s)` : "Échec de l'enregistrement");
  }

  function resetPhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoResults([]);
    setPhotoPicked(new Set());
    setPhotoSaved(new Set());
    setPhotoErr("");
    setPhotoNote("");
  }

  return (
    <div>
      <ModuleHeader
        title="Catalogue"
        subtitle="Référentiel produits global, commun à tous les magasins."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`rounded-full px-3.5 py-2 font-display text-sm font-semibold transition-all ${
                  tab === tb.id ? "bg-gradient-to-r from-amber to-violet text-snow shadow-glow" : "glass text-ink hover:text-amber-deep"
                }`}
              >
                {tb.label}
                {tb.id === "list" && ` (${articles.length})`}
              </button>
            ))}
          </div>
        }
      />

      {/* ---------- ARTICLES (CRUD) ---------- */}
      {tab === "list" && (
        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <form onSubmit={save} className="card h-fit p-6">
            <h3 className="font-display text-lg font-extrabold text-ink">{editingId ? "Modifier l'article" : "Nouvel article"}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nom</label>
                <input required className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea rows={3} className="field resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Rayon</label>
                <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Prix public indicatif (F CFA)</label>
                <input type="text" inputMode="numeric" min="0" className="field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="label">Photo</label>
                {form.imageUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl} alt="" className="h-40 w-full object-cover" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))} className="absolute bottom-2 right-2 rounded-lg bg-snow/90 px-3 py-1.5 font-mono text-[11px] font-semibold text-amber-deep">Retirer</button>
                  </div>
                ) : (
                  <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-mist/60 px-4 py-6 text-center ${imgUploading ? "pointer-events-none opacity-60" : ""}`}>
                    {imgUploading ? <Spinner label="Envoi…" /> : <span className="font-display text-sm font-semibold text-ink">Choisir une image</span>}
                    <input type="file" accept="image/*" className="hidden" disabled={imgUploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadImage(f); }} />
                  </label>
                )}
                {imgErr && <p className="mt-2 text-xs text-amber-deep">{imgErr}</p>}
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="submit" className="btn-primary flex-1">{editingId ? "Enregistrer" : "Créer"}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="btn-ghost">Annuler</button>}
            </div>
          </form>

          <div className="space-y-2">
            {articles.length === 0 && <EmptyState>Aucun article au catalogue pour l'instant.</EmptyState>}
            {articles.map((a) => (
              <div key={a.id} className="card flex items-center gap-4 p-3 hover:-translate-y-0.5">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-mist">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.imageUrl || categoryImage(a.category)} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display font-bold text-ink">{a.name}</span>
                    <span className="shrink-0 rounded-md bg-mist px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{categoryLabel(a.category)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-ink/55">{a.description}</p>
                </div>
                <span className="shrink-0 font-display font-extrabold text-amber-deep">{formatCFA(a.price)}</span>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => edit(a)} className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] hover:border-ink">Modifier</button>
                  <button onClick={() => remove(a.id)} className="border border-amber-deep/40 px-3 py-1.5 font-mono text-[11px] text-amber-deep hover:bg-amber-deep hover:text-paper">Suppr.</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- AJOUT RAPIDE ---------- */}
      {tab === "quick" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ARTICLES.map((q) => (
            <div key={q.name} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-display font-bold text-ink">{q.name}</span>
                <span className="shrink-0 rounded-md bg-mist px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{categoryLabel(q.category)}</span>
              </div>
              <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink/55">{q.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display font-extrabold text-amber-deep">{formatCFA(q.price)}</span>
                <button onClick={() => quickAdd(q)} className="btn-primary px-4 py-2 text-sm">Ajouter</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- RECHERCHE IA ---------- */}
      {tab === "ai-text" && (
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm text-ink/55">Décrivez un besoin → Gemini propose des articles à publier au catalogue.</p>
          <form onSubmit={runTextSearch} className="card p-5">
            <label className="label">Besoin du client / du magasin</label>
            <textarea rows={3} className="field resize-none" placeholder="Ex. de quoi équiper une salle de bain complète" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} />
            <div className="mt-3 flex items-center gap-3">
              <button type="submit" disabled={aiLoading || !aiQuery.trim()} className="btn-primary disabled:opacity-50">{aiLoading ? "Recherche…" : "Demander à l'IA"}</button>
              {aiLoading && <Spinner label="Gemini réfléchit…" />}
            </div>
          </form>
          {aiErr && <div className="mt-4 rounded-xl border border-amber-deep/30 bg-amber-deep/5 p-4 text-sm text-amber-deep">{aiErr}</div>}
          {aiNote && !aiLoading && <p className="mt-4 rounded-xl border border-line bg-snow p-4 text-sm text-ink/70">💡 {aiNote}</p>}
          {aiResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {aiResults.map((p, i) => (
                <div key={i} className="card flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-ink">{p.name}</span>
                      <span className="rounded-md bg-mist px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{categoryLabel(p.category)}</span>
                    </div>
                    {p.description && <p className="mt-0.5 text-sm text-ink/55">{p.description}</p>}
                    {p.reason && <p className="mt-1 font-mono text-[11px] text-steel">↳ {p.reason}</p>}
                  </div>
                  <span className="shrink-0 font-display font-extrabold text-amber-deep">{formatCFA(p.price)}</span>
                  <button onClick={() => addAiResult(p, i)} disabled={aiSaved.has(i)} className="btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-50">
                    {aiSaved.has(i) ? "Ajouté ✓" : "Ajouter"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- PHOTO IA ---------- */}
      {tab === "ai-photo" && (
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm text-ink/55">Envoyez une photo → Gemini identifie tous les articles visibles pour publication groupée.</p>
          <div className="card p-5">
            <label className="label">Photo des articles</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhotoChange}
              className="block w-full text-sm text-ink/70 file:me-3 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2 file:font-display file:text-sm file:font-semibold file:text-snow hover:file:bg-ink/90"
            />
            {photoPreview && (
              <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="" className="h-40 w-40 rounded-xl border border-line object-cover" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={runPhotoIdentify} disabled={photoLoading} className="btn-primary disabled:opacity-50">{photoLoading ? "Analyse…" : "Analyser la photo"}</button>
                  <button onClick={resetPhoto} disabled={photoLoading} className="btn-ghost disabled:opacity-50">Réinitialiser</button>
                </div>
              </div>
            )}
            {photoLoading && <div className="mt-4"><Spinner label="Gemini analyse l'image…" /></div>}
          </div>
          {photoErr && <div className="mt-4 rounded-xl border border-amber-deep/30 bg-amber-deep/5 p-4 text-sm text-amber-deep">{photoErr}</div>}
          {photoNote && !photoLoading && <p className="mt-4 rounded-xl border border-line bg-snow p-4 text-sm text-ink/70">💡 {photoNote}</p>}
          {photoResults.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-wide text-steel">{photoResults.length} article(s) détecté(s)</p>
                <button onClick={addPhotoSelection} disabled={photoPicked.size === 0} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  Ajouter la sélection ({[...photoPicked].filter((i) => !photoSaved.has(i)).length})
                </button>
              </div>
              <div className="space-y-2">
                {photoResults.map((p, i) => (
                  <label key={i} className={`card flex cursor-pointer items-center gap-3 p-4 ${photoSaved.has(i) ? "opacity-60" : ""}`}>
                    <input type="checkbox" className="h-4 w-4 accent-amber-deep" checked={photoPicked.has(i)} disabled={photoSaved.has(i)} onChange={() => togglePhotoPick(i)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold text-ink">{p.name}</span>
                        <span className="rounded-md bg-mist px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{categoryLabel(p.category)}</span>
                        {photoSaved.has(i) && <span className="font-mono text-[11px] text-steel">ajouté ✓</span>}
                      </div>
                      {p.description && <p className="mt-0.5 text-sm text-ink/55">{p.description}</p>}
                    </div>
                    <span className="shrink-0 font-display font-extrabold text-amber-deep">{formatCFA(p.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
