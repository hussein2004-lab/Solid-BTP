"use client";

// Petits éléments d'UI réutilisés par tous les modules de l'administration ERP.
// Style « Atelier Néo » : verre dépoli, accents holographiques, mono pour les
// annotations techniques.

import { formatCFA } from "@/lib/format";

/** Spinner inline. */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink/60">
      <svg className="h-4 w-4 animate-spin text-amber-deep" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
      </svg>
      {label && <span className="font-mono text-xs">{label}</span>}
    </span>
  );
}

/** En-tête de module : titre + sous-titre + zone d'actions (boutons à droite). */
export function ModuleHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink/55">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Bloc « module en préparation » pour les phases pas encore livrées. */
export function ModulePlaceholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div>
      <ModuleHeader title={title} />
      <div className="glass-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber/20 to-violet/20 text-2xl">
          🛠️
        </span>
        <p className="font-display text-lg font-bold text-ink">Module en préparation</p>
        <p className="max-w-md text-sm text-ink/55">
          « {title} » sera disponible à la <span className="font-mono text-amber-deep">{phase}</span> du
          déploiement de la nouvelle administration.
        </p>
      </div>
    </div>
  );
}

/** État vide d'une liste. */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-ink/20 bg-snow/70 p-8 text-center text-ink/55">
      {children}
    </p>
  );
}

/** Carte de statistique (KPI) avec icône colorée. */
export function KpiCard({
  icon,
  value,
  label,
  color = "#FF6A1A",
}: {
  icon: string;
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div className="glass-card relative flex items-center gap-3.5 overflow-hidden p-4 transition-transform hover:-translate-y-0.5">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
        style={{ backgroundColor: `${color}1a`, boxShadow: `inset 0 0 0 1px ${color}33` }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-display text-[15px] font-extrabold leading-tight text-ink tabular-nums">{value}</div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">{label}</div>
      </div>
    </div>
  );
}

/** Affiche un montant F CFA, coloré selon le signe (crédit/débit). */
export function Money({ value, signed = false }: { value: number; signed?: boolean }) {
  const tone = value > 0 ? "text-green" : value < 0 ? "text-amber-deep" : "text-ink";
  return (
    <span className={`font-display font-extrabold ${signed ? tone : "text-ink"}`}>
      {signed && value > 0 ? "+" : ""}
      {formatCFA(value)}
    </span>
  );
}

/** Bouton « Exporter Excel » (déclenche le téléchargement d'une URL CSV). */
export function ExportButton({ href, label = "Exporter Excel" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-line px-3.5 py-1.5 font-mono text-xs text-ink transition-colors hover:border-green hover:text-green"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
      {label}
    </a>
  );
}

/** Bouton « Imprimer ». */
export function PrintButton({ onClick, label = "Imprimer" }: { onClick?: () => void; label?: string }) {
  return (
    <button
      onClick={onClick ?? (() => window.print())}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-line px-3.5 py-1.5 font-mono text-xs text-ink transition-colors hover:border-violet hover:text-violet"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
      {label}
    </button>
  );
}
