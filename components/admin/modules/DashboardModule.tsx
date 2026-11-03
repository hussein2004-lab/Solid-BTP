"use client";

// Tableau de bord. Deux cas :
//  - Gérant (ou super ayant choisi un magasin) → tableau de bord du magasin.
//  - Admin principal en mode « Tous » → VUE GLOBALE : un seul écran qui rassemble
//    tous les tableaux de bord du réseau, dynamiques, avec des STYLES VARIÉS par
//    section (bandeau dégradé, panneaux teintés, types de graphiques différents)
//    + un classement interactif. Alimenté en direct par /api/stats/*.

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCFA } from "@/lib/format";
import type { Store } from "@/lib/types";
import { useAdmin } from "../AdminContext";
import { KpiCard, ModuleHeader, Spinner } from "../ui";
import { AreaChart, BarChart, ChartCard, Histogram, LineChart, PieChart, RadarChart, RankBars, compactCFA, type Point, type RadarSeries } from "../charts";

interface StoreStats {
  kpis: { netRevenue: number; creditsOutstanding: number; advancesOutstanding: number; expensesTotal: number; invoiceCount: number };
  revenueByMonth: Point[];
  expensesByCategory: Point[];
  topAdvances: Point[];
  topCredits: Point[];
}

interface Row {
  storeId: string;
  storeName: string;
  revenue: number;
  sales: number;
  creditIssued: number;
  credits: number;
  avoir: number;
  returns: number;
  advances: number;
  expenses: number;
  payments: number;
  invoices: number;
  performance: number;
}

interface Network {
  expensesByCategory: Point[];
  revenueByMonth: Point[];
  invoiceByType: Point[];
  topCustomers: Point[];
  topEmployees: Point[];
}

export default function DashboardModule() {
  const { me, isSuper, activeStore, activeStoreId, stores } = useAdmin();
  const opStore = activeStoreId || (stores.length === 1 ? stores[0].id : "");

  if (isSuper && !opStore) return <GlobalDashboard username={me.username} allStores={stores} />;
  return <StoreDashboard storeId={opStore} title={`Bonjour, ${me.username}`} scope={activeStore?.name ?? stores[0]?.name ?? "—"} isSuper={isSuper} />;
}

/* ======================================================================
   VUE GLOBALE — admin principal (tout en un, styles variés, dynamique)
   ====================================================================== */

const METRICS = [
  { id: "revenue", label: "Revenus", color: "#16A34A" },
  { id: "creditIssued", label: "Crédits accordés", color: "#FF6A1A" },
  { id: "credits", label: "Dettes clients", color: "#E8487A" },
  { id: "advances", label: "Avances", color: "#7C5CFF" },
  { id: "expenses", label: "Dépenses", color: "#22D3EE" },
  { id: "performance", label: "Performance", color: "#16A34A" },
] as const;
type Metric = (typeof METRICS)[number]["id"];

const RADAR_COLORS = ["#FF6A1A", "#7C5CFF", "#22D3EE", "#16A34A", "#E8487A", "#FFC233"];

// Classe un sous-ensemble de lignes par métrique (desc.) en points {label, value}.
const rankOf = (subset: Row[], k: keyof Row): Point[] =>
  [...subset].sort((a, b) => Number(b[k]) - Number(a[k])).map((r) => ({ label: r.storeName, value: Number(r[k]) }));
const sumOf = (subset: Row[], k: keyof Row) => subset.reduce((a, r) => a + Number(r[k]), 0);

/* ----------------------------------------------------------------------
   Filtre magasins PAR GRAPHIQUE : chaque graphique possède son propre
   sélecteur (menu déroulant multi-choix) indépendant des autres.
   ---------------------------------------------------------------------- */
function StorePicker({ stores, selected, onToggle, onAll }: { stores: Store[]; selected: Set<string>; onToggle: (id: string) => void; onAll: () => void }) {
  const [open, setOpen] = useState(false);
  const label =
    selected.size === 0 ? "Tous les magasins" : selected.size === 1 ? stores.find((s) => selected.has(s.id))?.name ?? "1 magasin" : `${selected.size} magasins`;
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[11px] font-semibold transition-colors ${
          selected.size ? "border-violet/60 bg-violet/5 text-violet" : "border-line text-ink hover:border-violet/50 hover:text-violet"
        }`}
        title="Filtrer les magasins de ce graphique"
      >
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
        <span className="truncate">{label}</span>
        <svg className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-label="Fermer" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-40 mt-1.5 max-h-64 w-56 overflow-auto rounded-xl border border-line bg-snow p-1.5 shadow-lift">
            <button
              onClick={onAll}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-mist ${selected.size === 0 ? "font-semibold text-violet" : "text-ink"}`}
            >
              <span className={`grid h-4 w-4 place-items-center rounded border ${selected.size === 0 ? "border-violet bg-violet text-snow" : "border-line"}`}>
                {selected.size === 0 && <span className="text-[10px] leading-none">✓</span>}
              </span>
              Tous les magasins
            </button>
            <div className="my-1 h-px bg-line" />
            {stores.map((s) => {
              const on = selected.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => onToggle(s.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-mist"
                >
                  <span className={`grid h-4 w-4 place-items-center rounded border ${on ? "border-violet bg-violet text-snow" : "border-line"}`}>
                    {on && <span className="text-[10px] leading-none">✓</span>}
                  </span>
                  {s.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Hook : état + UI + helper de filtrage pour un sélecteur de magasins de graphique.
function useStorePicker(stores: Store[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const onToggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const onAll = () => setSelected(new Set());
  const node = <StorePicker stores={stores} selected={selected} onToggle={onToggle} onAll={onAll} />;
  const apply = (rs: Row[]) => (selected.size ? rs.filter((r) => selected.has(r.storeId)) : rs);
  return { node, apply };
}

// Étiquette de section avec sélecteur de magasins optionnel à droite.
function SectionPicker({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 flex items-center justify-end">{children}</div>;
}

function GlobalDashboard({ username, allStores }: { username: string; allStores: Store[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [net, setNet] = useState<Network | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>("revenue");

  // Un sélecteur de magasins indépendant par graphique « par magasin ».
  const revBar = useStorePicker(allStores);
  const radarPick = useStorePicker(allStores);
  const creditRank = useStorePicker(allStores);
  const dettesPie = useStorePicker(allStores);
  const avoirsTable = useStorePicker(allStores);
  const advanceRank = useStorePicker(allStores);
  const expenseBar = useStorePicker(allStores);
  const classement = useStorePicker(allStores);

  // Données chargées une seule fois (réseau complet) ; le filtrage est client, par graphique.
  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/stats/global")
      .then((r) => r.json())
      .then((d) => {
        setRows(d.stores ?? []);
        setNet(d.network ?? null);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const activeMetric = METRICS.find((m) => m.id === metric)!;
  const ranked = useMemo(() => rankOf(classement.apply(rows), metric), [rows, metric, classement]);

  // Profil radar : une série par magasin (6 max) sur 5 axes, selon le filtre du graphique.
  const radar: RadarSeries[] = radarPick.apply(rows).slice(0, 6).map((r, i) => ({
    name: r.storeName,
    color: RADAR_COLORS[i % RADAR_COLORS.length],
    raw: [r.revenue, r.creditIssued, r.credits, r.advances, r.expenses],
  }));

  const avoirsRows = avoirsTable.apply(rows);

  if (!net) {
    return (
      <div>
        <ModuleHeader title={`Bonjour, ${username}`} subtitle="Supervision du réseau · Tous les magasins" />
        <Spinner label="Calcul des indicateurs…" />
      </div>
    );
  }

  return (
    <div>
      <ModuleHeader
        title={`Bonjour, ${username}`}
        subtitle="Supervision du réseau · Tous les magasins · chaque graphique a son propre filtre"
        actions={
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border-2 border-line px-3.5 py-1.5 font-mono text-xs text-ink transition-colors hover:border-violet hover:text-violet">
            {loading ? <Spinner /> : "↻ Actualiser"}
          </button>
        }
      />

      {/* ===== STYLE 1 — Bandeau héro en dégradé (KPIs réseau) ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber via-violet to-cyan p-6 text-snow shadow-glow">
        <div className="dots absolute inset-0 opacity-20" aria-hidden />
        <div className="relative">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-snow/80">Réseau · {rows.length} magasins</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Revenus nets", value: sumOf(rows, "revenue") },
              { label: "Crédits accordés", value: sumOf(rows, "creditIssued") },
              { label: "Dettes clients", value: sumOf(rows, "credits") },
              { label: "Dépenses", value: sumOf(rows, "expenses") },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm ring-1 ring-white/20">
                <div className="font-display text-2xl font-extrabold tabular-nums">{compactCFA(k.value)}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-snow/85">{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STYLE 2 — Ventes : aire (6 mois) + histogramme + barres ===== */}
      <SectionTitle icon="💰" title="Ventes & revenus" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenus du réseau (6 mois)" hint="aire · survol">
          <AreaChart data={net.revenueByMonth} color="#16A34A" />
        </ChartCard>
        <ChartCard title="Factures par type" hint="histogramme · nombre">
          <Histogram data={net.invoiceByType} color="#7C5CFF" format={(n) => String(n)} />
        </ChartCard>
        <ChartCard title="Revenus par magasin" action={revBar.node}>
          <BarChart data={rankOf(revBar.apply(rows), "revenue")} color="#16A34A" />
        </ChartCard>
        <ChartCard title="Profil comparé des magasins" action={radarPick.node}>
          <RadarChart axes={["Revenus", "Crédits", "Dettes", "Avances", "Dépenses"]} series={radar} />
        </ChartCard>
      </div>

      {/* ===== STYLE 3 — Crédits & dettes : panneau teinté rose, donut + classement ===== */}
      <SectionTitle icon="💳" title="Crédits & dettes clients" />
      <div className="rounded-2xl border border-berry/25 bg-berry/[0.04] p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-berry">Qui accorde le plus de crédits ? (Facr)</p>
              {creditRank.node}
            </div>
            <RankBars data={rankOf(creditRank.apply(rows), "creditIssued")} color="#FF6A1A" />
            <p className="mb-2 mt-5 font-mono text-[10px] uppercase tracking-widest text-berry">Top clients débiteurs (réseau)</p>
            <RankBars data={net.topCustomers} color="#E8487A" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-berry">Part des dettes par magasin</p>
              {dettesPie.node}
            </div>
            <PieChart data={rankOf(dettesPie.apply(rows), "credits")} />
          </div>
        </div>
      </div>

      {/* ===== STYLE 4 — Avoirs & retours : tableau minimaliste bordé ===== */}
      <SectionTitle icon="↩️" title="Avoirs (Faa) & retours (Far)" />
      <SectionPicker>{avoirsTable.node}</SectionPicker>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line bg-mist/40 text-left font-mono text-[10px] uppercase tracking-widest text-muted">
              <th className="px-4 py-2">Magasin</th>
              <th className="px-4 py-2 text-right">Avoirs (Faa)</th>
              <th className="px-4 py-2 text-right">Retours (Far)</th>
              <th className="px-4 py-2 text-right">Crédits accordés</th>
              <th className="px-4 py-2 text-right">Dettes en cours</th>
            </tr>
          </thead>
          <tbody>
            {avoirsRows.map((r) => (
              <tr key={r.storeId} className="border-b border-line/60">
                <td className="px-4 py-2 font-display font-bold text-ink">{r.storeName}</td>
                <td className="px-4 py-2 text-right font-mono text-cyan-deep">{formatCFA(r.avoir)}</td>
                <td className="px-4 py-2 text-right font-mono text-violet">{formatCFA(r.returns)}</td>
                <td className="px-4 py-2 text-right font-mono text-amber-deep">{formatCFA(r.creditIssued)}</td>
                <td className="px-4 py-2 text-right font-mono text-berry">{formatCFA(r.credits)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-mist/40 font-display font-bold text-ink">
              <td className="px-4 py-2">{avoirsRows.length === rows.length ? "Réseau" : "Périmètre"}</td>
              <td className="px-4 py-2 text-right">{formatCFA(sumOf(avoirsRows, "avoir"))}</td>
              <td className="px-4 py-2 text-right">{formatCFA(sumOf(avoirsRows, "returns"))}</td>
              <td className="px-4 py-2 text-right">{formatCFA(sumOf(avoirsRows, "creditIssued"))}</td>
              <td className="px-4 py-2 text-right">{formatCFA(sumOf(avoirsRows, "credits"))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ===== STYLE 5 — Personnel : panneau teinté violet, classements ===== */}
      <SectionTitle icon="👷" title="Personnel & avances" />
      <div className="rounded-2xl border border-violet/25 bg-violet/[0.04] p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-violet">Avances par magasin</p>
              {advanceRank.node}
            </div>
            <RankBars data={rankOf(advanceRank.apply(rows), "advances")} color="#7C5CFF" />
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-violet">Top employés en avance (réseau)</p>
            <RankBars data={net.topEmployees} color="#FF6A1A" />
          </div>
        </div>
      </div>

      {/* ===== STYLE 6 — Dépenses : panneau teinté cyan, camembert + barres ===== */}
      <SectionTitle icon="💸" title="Dépenses" />
      <div className="rounded-2xl border border-cyan/25 bg-cyan/[0.04] p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cyan-deep">Par catégorie (réseau)</p>
            <PieChart data={net.expensesByCategory} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-deep">Par magasin</p>
              {expenseBar.node}
            </div>
            <BarChart data={rankOf(expenseBar.apply(rows), "expenses")} color="#22D3EE" />
          </div>
        </div>
      </div>

      {/* ===== STYLE 7 — Classement interactif (toggle métrique + filtre magasins) ===== */}
      <SectionTitle icon="🏆" title="Classement interactif des magasins" />
      <div className="glass-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`rounded-full px-3 py-1.5 font-display text-xs font-semibold transition-all ${
                  metric === m.id ? "bg-gradient-to-r from-amber to-violet text-snow shadow-glow" : "border border-line text-ink hover:border-ink/40"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {classement.node}
        </div>
        <RankBars data={ranked} color={activeMetric.color} />
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="mb-3 mt-7 flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">{title}</h3>
      <span className="accent-line ml-2 h-px flex-1" aria-hidden />
    </div>
  );
}

/* ======================================================================
   TABLEAU DE BORD D'UN MAGASIN — gérant (ou super avec magasin choisi)
   ====================================================================== */

function StoreDashboard({ storeId, title, scope, isSuper }: { storeId: string; title: string; scope: string; isSuper: boolean }) {
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    fetch(`/api/stats/store?storeId=${storeId}`).then((r) => r.json()).then(setStats).finally(() => setLoading(false));
  }, [storeId]);

  return (
    <div>
      <ModuleHeader title={title} subtitle={`${isSuper ? "Supervision" : "Gestion du magasin"} · ${scope}`} />
      {loading || !stats ? (
        <Spinner label="Chargement des indicateurs…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon="💰" value={formatCFA(stats.kpis.netRevenue)} label="Revenus nets" color="#16A34A" />
            <KpiCard icon="💳" value={formatCFA(stats.kpis.creditsOutstanding)} label="Crédits clients" color="#FF6A1A" />
            <KpiCard icon="🧍" value={formatCFA(stats.kpis.advancesOutstanding)} label="Avances employés" color="#7C5CFF" />
            <KpiCard icon="💸" value={formatCFA(stats.kpis.expensesTotal)} label="Dépenses cumulées" color="#22D3EE" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Revenus (6 mois)" hint="net F CFA">
              <LineChart data={stats.revenueByMonth} color="#7C5CFF" />
            </ChartCard>
            <ChartCard title="Dépenses par catégorie">
              <PieChart data={stats.expensesByCategory} />
            </ChartCard>
            <ChartCard title="Avances des employés" hint="solde dû">
              <BarChart data={stats.topAdvances} color="#FF6A1A" />
            </ChartCard>
            <ChartCard title="Crédits clients" hint="top clients">
              <RankBars data={stats.topCredits} color="#16A34A" />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
