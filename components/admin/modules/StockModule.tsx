"use client";

// Stock par magasin : quantité, prix d'achat et prix de vente, éditables ligne
// par ligne (upsert). Plus une recherche cross-magasin pour savoir quels autres
// magasins ont un produit donné.

import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryLabel } from "@/lib/constants";
import { formatCFA } from "@/lib/format";
import type { Article } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { EmptyState, ModuleHeader, Spinner } from "../ui";

interface Row {
  articleId: string;
  name: string;
  category: string;
  quantity: string;
  purchasePrice: string;
  salePrice: string;
  inStock: boolean;
  dirty: boolean;
}

interface SearchResult {
  article: { id: string; name: string; category: string };
  stores: { storeId: string; storeName: string; city: string; quantity: number; salePrice: number }[];
}

export default function StockModule() {
  const { activeStoreId, stores, flash, isSuper } = useAdmin();
  const [storeId, setStoreId] = useState(activeStoreId || stores[0]?.id || "");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // Recherche cross-magasin
  const [xq, setXq] = useState("");
  const [xResults, setXResults] = useState<SearchResult[]>([]);
  const [xLoading, setXLoading] = useState(false);

  useEffect(() => setStoreId(activeStoreId || stores[0]?.id || ""), [activeStoreId, stores]);

  const load = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/stock?storeId=${storeId}`).then((r) => r.json()).catch(() => ({})),
      fetch("/api/articles").then((r) => r.json()).catch(() => ({})),
    ]).then(([stk, art]) => {
      const items = stk.items ?? [];
      const byArticle = new Map(items.map((it: { articleId: string }) => [it.articleId, it]));
      const articles: Article[] = art.articles ?? [];
      setRows(
        articles.map((a) => {
          const it = byArticle.get(a.id) as { quantity: number; purchasePrice: number; salePrice: number } | undefined;
          return {
            articleId: a.id,
            name: a.name,
            category: a.category,
            quantity: String(it?.quantity ?? 0),
            purchasePrice: String(it?.purchasePrice ?? 0),
            salePrice: String(it?.salePrice ?? a.price),
            inStock: Boolean(it),
            dirty: false,
          };
        }),
      );
      setLoading(false);
    });
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  function setCell(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch, dirty: true } : r)));
  }

  async function saveRow(i: number) {
    const r = rows[i];
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        articleId: r.articleId,
        quantity: Number(r.quantity) || 0,
        purchasePrice: Number(r.purchasePrice) || 0,
        salePrice: Number(r.salePrice) || 0,
      }),
    });
    if (res.ok) {
      flash(`Stock « ${r.name} » enregistré`);
      setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, inStock: true, dirty: false } : x)));
    } else {
      flash("Échec de l'enregistrement");
    }
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!xq.trim()) return;
    setXLoading(true);
    const d = await fetch(`/api/stock/search?q=${encodeURIComponent(xq.trim())}`).then((r) => r.json()).catch(() => ({}));
    setXResults(d.results ?? []);
    setXLoading(false);
  }

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase())),
    [rows, filter],
  );
  const stockValue = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.purchasePrice) || 0), 0);

  return (
    <div>
      <ModuleHeader
        title="Stock"
        subtitle="Quantités et prix d'achat/vente de votre magasin."
        actions={
          (isSuper || stores.length > 1) && (
            <select className="field max-w-[200px]" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )
        }
      />

      {/* Recherche cross-magasin */}
      <form onSubmit={runSearch} className="glass-card mb-5 p-4">
        <label className="label">Disponibilité dans les autres magasins</label>
        <div className="flex gap-2">
          <input className="field" placeholder="Nom d'un produit (ex. Ciment)…" value={xq} onChange={(e) => setXq(e.target.value)} />
          <button type="submit" className="btn-primary px-5">Chercher</button>
        </div>
        {xLoading && <div className="mt-3"><Spinner label="Recherche…" /></div>}
        {!xLoading && xResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {xResults.map((r) => (
              <div key={r.article.id} className="rounded-xl border border-line bg-snow/60 p-3">
                <div className="font-display font-bold text-ink">{r.article.name} <span className="font-mono text-[10px] uppercase text-muted">{categoryLabel(r.article.category)}</span></div>
                {r.stores.length === 0 ? (
                  <p className="text-sm text-ink/55">Aucun magasin n'a ce produit en stock.</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {r.stores.map((s) => (
                      <span key={s.storeId} className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] ${s.quantity > 0 ? "border-green/40 text-green" : "border-line text-muted"}`}>
                        {s.storeName} · {s.quantity} u · {formatCFA(s.salePrice)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input className="field max-w-xs" placeholder="Filtrer le catalogue…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="rounded-full border border-line bg-snow/70 px-3 py-1.5 font-mono text-xs text-ink-soft">
          Valeur du stock (achat) : <span className="font-bold text-violet">{formatCFA(stockValue)}</span>
        </span>
      </div>

      {loading ? (
        <Spinner label="Chargement…" />
      ) : filtered.length === 0 ? (
        <EmptyState>Aucun article.</EmptyState>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_90px_120px_120px_90px] gap-2 border-b border-line bg-mist/50 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            <span>Article</span><span>Qté</span><span>Prix achat</span><span>Prix vente</span><span></span>
          </div>
          {filtered.map((r) => {
            const i = rows.indexOf(r);
            return (
              <div key={r.articleId} className="grid grid-cols-[1fr_90px_120px_120px_90px] items-center gap-2 border-b border-line/60 px-4 py-2">
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-bold text-ink">{r.name}</div>
                  <div className="font-mono text-[10px] uppercase text-muted">{categoryLabel(r.category)}{!r.inStock && " · hors stock"}</div>
                </div>
                <input type="text" inputMode="numeric" min="0" className="field py-1.5" value={r.quantity} onChange={(e) => setCell(i, { quantity: e.target.value })} />
                <input type="text" inputMode="numeric" min="0" className="field py-1.5" value={r.purchasePrice} onChange={(e) => setCell(i, { purchasePrice: e.target.value })} />
                <input type="text" inputMode="numeric" min="0" className="field py-1.5" value={r.salePrice} onChange={(e) => setCell(i, { salePrice: e.target.value })} />
                <button
                  onClick={() => saveRow(i)}
                  disabled={!r.dirty}
                  className={`rounded-lg px-2 py-1.5 font-mono text-[11px] ${r.dirty ? "bg-gradient-to-r from-amber to-violet text-snow" : "border border-line text-muted"}`}
                >
                  {r.dirty ? "Enreg." : "OK"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
