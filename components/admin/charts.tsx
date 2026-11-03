"use client";

// Graphiques maison (SVG, sans dépendance) au style « Atelier Néo », avec
// infobulles au survol. Patterns issus du skill dashboard-creator, portés en
// composants React alimentés en direct par /api/stats/*.
//
// Types disponibles : Histogram, AreaChart, BarChart, PieChart, RadarChart,
// LineChart, RankBars. Chaque élément (barre, point, secteur, sommet) affiche
// ses données au survol via une infobulle positionnée sur le curseur.

import { useRef, useState } from "react";
import { formatCFA } from "@/lib/format";

const PALETTE = ["#FF6A1A", "#7C5CFF", "#22D3EE", "#16A34A", "#E8487A", "#FFC233", "#3B82F6", "#06B6D4"];

export interface Point {
  label: string;
  value: number;
}

/** Montant compact pour les axes : 1 250 000 → « 1,3 M », 213 000 → « 213 k ». */
export function compactCFA(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000) return `${Math.round(n / 1000).toLocaleString("fr-FR")} k`;
  return String(n);
}

export function ChartCard({ title, children, hint, action }: { title: string; children: React.ReactNode; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
        {action ?? (hint && <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{hint}</span>)}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Infobulle partagée : un conteneur relatif + une bulle positionnée au curseur.
// ---------------------------------------------------------------------------
interface Tip {
  x: number;
  y: number;
  label: string;
  value: string;
  color?: string;
}

function useTip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  function show(e: React.MouseEvent, label: string, value: string, color?: string) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, label, value, color });
  }
  const hide = () => setTip(null);
  const node = tip ? (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 shadow-lift"
      style={{ left: tip.x, top: Math.max(0, tip.y - 52) }}
    >
      <div className="flex items-center gap-1.5">
        {tip.color && <span className="h-2 w-2 rounded-sm" style={{ background: tip.color }} />}
        <span className="font-display text-xs font-bold text-snow">{tip.label}</span>
      </div>
      <div className="font-mono text-[11px] text-snow/80">{tip.value}</div>
    </div>
  ) : null;
  return { ref, show, hide, node };
}

function Frame({ tipRef, hide, node, children }: { tipRef: React.RefObject<HTMLDivElement | null>; hide: () => void; node: React.ReactNode; children: React.ReactNode }) {
  return (
    <div ref={tipRef} onMouseLeave={hide} className="relative w-full">
      {children}
      {node}
    </div>
  );
}

function Empty() {
  return <p className="py-8 text-center text-sm text-ink/45">Aucune donnée à afficher.</p>;
}

// ---------------------------------------------------------------------------
// 1) HISTOGRAMME — barres jointives (distribution), survol = valeur.
// ---------------------------------------------------------------------------
export function Histogram({ data, color = "#7C5CFF", format = compactCFA }: { data: Point[]; color?: string; format?: (n: number) => string }) {
  const { ref, show, hide, node } = useTip();
  if (data.length === 0) return <Empty />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 360, H = 180, pad = 26, bw = (W - pad * 2) / data.length;
  return (
    <Frame tipRef={ref} hide={hide} node={node}>
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full">
        <line x1={pad} y1={H} x2={W - pad} y2={H} stroke="currentColor" className="text-line" strokeWidth="1" />
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (H - 10));
          const x = pad + i * bw;
          return (
            <g key={i} onMouseMove={(e) => show(e, d.label, format(d.value), color)} className="cursor-pointer">
              <rect x={x} y={0} width={bw} height={H} fill="transparent" />
              <rect x={x + 1} y={H - h} width={bw - 2} height={h} fill={color} opacity={0.85} className="transition-opacity hover:opacity-100" />
              <text x={x + bw / 2} y={H + 16} textAnchor="middle" className="fill-current text-muted" style={{ fontSize: 9 }}>{d.label}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 2) AIRE — courbe remplie, survol des points = valeur.
// ---------------------------------------------------------------------------
export function AreaChart({ data, color = "#16A34A", format = compactCFA }: { data: Point[]; color?: string; format?: (n: number) => string }) {
  const { ref, show, hide, node } = useTip();
  if (data.length === 0) return <Empty />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const W = 360, H = 170, pad = 26;
  const span = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
    const y = H - 10 - ((d.value - min) / span) * (H - 30);
    return { x, y, d };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  return (
    <Frame tipRef={ref} hide={hide} node={node}>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
        <defs>
          <linearGradient id={`area-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#area-${color.slice(1)})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i} onMouseMove={(e) => show(e, p.d.label, format(p.d.value), color)} className="cursor-pointer">
            <circle cx={p.x} cy={p.y} r="9" fill="transparent" />
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} className="transition-all hover:r-5" />
            <text x={p.x} y={H + 16} textAnchor="middle" className="fill-current text-muted" style={{ fontSize: 9 }}>{p.d.label}</text>
          </g>
        ))}
      </svg>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 3) BARRES — barres espacées, survol = valeur.
// ---------------------------------------------------------------------------
export function BarChart({ data, color = "#FF6A1A", format = compactCFA }: { data: Point[]; color?: string; format?: (n: number) => string }) {
  const { ref, show, hide, node } = useTip();
  if (data.length === 0) return <Empty />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 360, H = 180, pad = 24, bw = (W - pad * 2) / data.length;
  return (
    <Frame tipRef={ref} hide={hide} node={node}>
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full">
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * H);
          const x = pad + i * bw;
          return (
            <g key={i} onMouseMove={(e) => show(e, d.label, format(d.value), color)} className="cursor-pointer">
              <rect x={x} y={0} width={bw} height={H} fill="transparent" />
              <rect x={x + bw * 0.15} y={H - h + 4} width={bw * 0.7} height={h} rx="4" fill={color} opacity={0.85} className="transition-opacity hover:opacity-100" />
              <text x={x + bw / 2} y={H + 18} textAnchor="middle" className="fill-current text-muted" style={{ fontSize: 9 }}>{d.label}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 4) CAMEMBERT (donut) — survol des secteurs = valeur + part.
// ---------------------------------------------------------------------------
export function PieChart({ data }: { data: Point[] }) {
  const { ref, show, hide, node } = useTip();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <Empty />;
  const R = 70, r = 42, C = 90;
  let acc = 0;
  const arcs = data.map((d, i) => {
    const frac = d.value / total;
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const a1 = acc * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
    const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
    const xi0 = C + r * Math.cos(a1), yi0 = C + r * Math.sin(a1);
    const xi1 = C + r * Math.cos(a0), yi1 = C + r * Math.sin(a0);
    return { path: `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${xi0},${yi0} A${r},${r} 0 ${large} 0 ${xi1},${yi1} Z`, color: PALETTE[i % PALETTE.length], d, frac };
  });
  return (
    <Frame tipRef={ref} hide={hide} node={node}>
      <div className="flex flex-wrap items-center gap-4">
        <svg viewBox="0 0 180 180" className="h-40 w-40 shrink-0">
          {arcs.map((a, i) => (
            <path
              key={i}
              d={a.path}
              fill={a.color}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseMove={(e) => show(e, a.d.label, `${formatCFA(a.d.value)} · ${Math.round(a.frac * 100)}%`, a.color)}
            />
          ))}
          <text x="90" y="86" textAnchor="middle" className="fill-ink" style={{ fontSize: 11, fontFamily: "monospace" }}>Total</text>
          <text x="90" y="100" textAnchor="middle" className="fill-ink" style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{compactCFA(total)}</text>
        </svg>
        <div className="space-y-1.5">
          {arcs.map((a, i) => (
            <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: a.color }} />
              <span className="text-ink">{a.d.label}</span>
              <span className="text-muted">{formatCFA(a.d.value)} · {Math.round(a.frac * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// 5) RADAR — comparaison multi-axes ; survol d'un sommet = série/axe/valeur.
// ---------------------------------------------------------------------------
export interface RadarSeries {
  name: string;
  color: string;
  raw: number[]; // une valeur par axe
}
export function RadarChart({ axes, series, format = compactCFA }: { axes: string[]; series: RadarSeries[]; format?: (n: number) => string }) {
  const { ref, show, hide, node } = useTip();
  if (axes.length < 3 || series.length === 0) return <Empty />;
  const C = 130, R = 96, n = axes.length;
  // Normalisation par axe (max sur l'ensemble des séries) pour une lecture relative.
  const axisMax = axes.map((_, ax) => Math.max(1, ...series.map((s) => Math.abs(s.raw[ax] ?? 0))));
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (ax: number, frac: number) => ({ x: C + R * frac * Math.cos(angle(ax)), y: C + R * frac * Math.sin(angle(ax)) });

  return (
    <Frame tipRef={ref} hide={hide} node={node}>
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 260 260" className="w-full max-w-[300px]">
          {/* anneaux */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <polygon
              key={f}
              points={axes.map((_, i) => { const p = pt(i, f); return `${p.x},${p.y}`; }).join(" ")}
              fill="none"
              stroke="currentColor"
              className="text-line"
              strokeWidth="1"
            />
          ))}
          {/* axes + labels */}
          {axes.map((label, i) => {
            const edge = pt(i, 1);
            const lab = pt(i, 1.16);
            return (
              <g key={i}>
                <line x1={C} y1={C} x2={edge.x} y2={edge.y} stroke="currentColor" className="text-line" strokeWidth="1" />
                <text x={lab.x} y={lab.y} textAnchor="middle" dominantBaseline="middle" className="fill-current text-muted" style={{ fontSize: 9 }}>{label}</text>
              </g>
            );
          })}
          {/* séries */}
          {series.map((s, si) => {
            const poly = axes.map((_, i) => pt(i, (Math.abs(s.raw[i] ?? 0)) / axisMax[i]));
            return (
              <g key={si}>
                <polygon points={poly.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill={s.color} fillOpacity={0.14} stroke={s.color} strokeWidth="2" />
                {poly.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="6"
                    fill={s.color}
                    fillOpacity={0.001}
                    stroke={s.color}
                    strokeOpacity={0.9}
                    className="cursor-pointer"
                    onMouseMove={(e) => show(e, `${s.name} · ${axes[i]}`, format(s.raw[i] ?? 0), s.color)}
                  />
                ))}
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap justify-center gap-3">
          {series.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5 font-mono text-[11px] text-ink">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Courbe simple (sans remplissage) — conservée pour le tableau de bord magasin.
// ---------------------------------------------------------------------------
export function LineChart({ data, color = "#7C5CFF" }: { data: Point[]; color?: string }) {
  return <AreaChart data={data} color={color} />;
}

// ---------------------------------------------------------------------------
// Classement : barres horizontales proportionnelles, survol = valeur.
// ---------------------------------------------------------------------------
export function RankBars({ data, color = "#FF6A1A" }: { data: Point[]; color?: string }) {
  const { ref, show, hide, node } = useTip();
  if (data.length === 0) return <Empty />;
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <Frame tipRef={ref} hide={hide} node={node}>
      <div className="space-y-2.5">
        {data.map((d, i) => (
          <div key={i} onMouseMove={(e) => show(e, d.label, formatCFA(d.value), color)} className="cursor-pointer">
            <div className="mb-1 flex items-baseline justify-between font-mono text-[11px]">
              <span className="font-semibold text-ink">{i + 1}. {d.label}</span>
              <span className="text-ink/70">{formatCFA(d.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, (Math.abs(d.value) / max) * 100)}%`, background: `linear-gradient(90deg, ${color}, ${PALETTE[(i + 1) % PALETTE.length]})` }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}
