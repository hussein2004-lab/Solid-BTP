"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type Ambiance = "atelier" | "minuit" | "ivoire" | "gris";

/** Ids + swatches kept in code; the label/hint come from the message catalog. */
export const AMBIANCES: { id: Ambiance; swatch: string }[] = [
  { id: "atelier", swatch: "linear-gradient(135deg,#FF6A1A,#7C5CFF)" },
  { id: "minuit", swatch: "linear-gradient(135deg,#0B1030 42%,#22D3EE)" },
  { id: "ivoire", swatch: "linear-gradient(135deg,#FFFDF8,#E9DEC6)" },
  { id: "gris", swatch: "linear-gradient(135deg,#F4F6FA,#D3DAE6)" },
];

const KEY = "sld-ambiance";

type Ctx = { ambiance: Ambiance; setAmbiance: (a: Ambiance) => void };
const AmbianceContext = createContext<Ctx>({ ambiance: "atelier", setAmbiance: () => {} });
export const useAmbiance = () => useContext(AmbianceContext);

export function AmbianceProvider({ children }: { children: React.ReactNode }) {
  const [ambiance, setAmb] = useState<Ambiance>("atelier");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Ambiance | null;
    if (saved && AMBIANCES.some((a) => a.id === saved)) setAmb(saved);
  }, []);

  function setAmbiance(a: Ambiance) {
    setAmb(a);
    localStorage.setItem(KEY, a);
  }

  return (
    <AmbianceContext.Provider value={{ ambiance, setAmbiance }}>
      <div data-ambiance={ambiance} className="relative">
        <PageBackdrop ambiance={ambiance} />
        {children}
      </div>
    </AmbianceContext.Provider>
  );
}

/** Fixed, page-wide background. The brand photo now lives only in the hero; here
 *  we paint a luminous **aurora + blueprint** field per ambiance so every section
 *  below the fold sits on a designed surface (seen through the frosted `.veil`s).
 *  Layers crossfade when the ambiance changes. */
function PageBackdrop({ ambiance }: { ambiance: Ambiance }) {
  const layer = (on: boolean) =>
    `absolute inset-0 transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Atelier — warm aurora drifting over a faint blueprint grid (default) */}
      <div className={layer(ambiance === "atelier")}>
        <div className="absolute inset-0 bg-sun" />
        <div className="blueprint absolute inset-0 opacity-[0.35]" />
        <div className="mesh absolute inset-0 opacity-70" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(60% 45% at 50% -8%, rgba(255,176,120,0.32) 0%, transparent 72%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(42% 40% at 92% 102%, rgba(34,211,238,0.18) 0%, transparent 70%)" }}
        />
      </div>

      {/* Minuit — futuristic midnight blue, neon blueprint grid */}
      <div className={layer(ambiance === "minuit")}>
        <div className="absolute inset-0 bg-[#070B1E]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(52% 52% at 82% 4%, rgba(124,92,255,0.34) 0%, transparent 68%), radial-gradient(52% 56% at 8% 96%, rgba(34,211,238,0.24) 0%, transparent 70%), radial-gradient(46% 46% at 50% 50%, rgba(255,106,26,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="grid-neon absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B1E]/40 via-transparent to-[#05081A]" />
      </div>

      {/* Ivoire — warm ivory field */}
      <div className={layer(ambiance === "ivoire")}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#FCF8EF] via-[#F6EFDF] to-[#ECE0C9]" />
        <div className="blueprint absolute inset-0 opacity-30" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(55% 48% at 85% 2%, rgba(255,176,120,0.22) 0%, transparent 72%)" }}
        />
      </div>

      {/* Gris clair — cool grey field */}
      <div className={layer(ambiance === "gris")}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#F6F8FC] via-[#EBEFF6] to-[#DFE5EF]" />
        <div className="blueprint absolute inset-0 opacity-30" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(55% 48% at 85% 2%, rgba(124,92,255,0.12) 0%, transparent 72%)" }}
        />
      </div>
    </div>
  );
}

/** Compact ambiance picker for the navbar. Swatch button → dropdown of options. */
export function AmbianceSwitcher() {
  const t = useTranslations("ambiance");
  const { ambiance, setAmbiance } = useAmbiance();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = AMBIANCES.find((a) => a.id === ambiance) ?? AMBIANCES[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("changeAria", { name: t(`${current.id}.label` as Parameters<typeof t>[0]) })}
        className="glass inline-flex items-center gap-2 rounded-full py-1.5 ps-2 pe-3 transition-all hover:-translate-y-0.5"
      >
        <span className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ backgroundImage: current.swatch }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/70">{t("label")}</span>
        <svg className={`h-3 w-3 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="glass-card absolute end-0 top-full z-50 mt-2 w-56 overflow-hidden p-1.5">
          <p className="px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted">{t("background")}</p>
          {AMBIANCES.map((a) => {
            const on = a.id === ambiance;
            return (
              <button
                key={a.id}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  setAmbiance(a.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition-colors ${
                  on ? "bg-amber/10" : "hover:bg-ink/5"
                }`}
              >
                <span className="h-7 w-7 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundImage: a.swatch }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-bold text-ink">{t(`${a.id}.label` as Parameters<typeof t>[0])}</span>
                  <span className="block font-mono text-[10px] text-muted">{t(`${a.id}.hint` as Parameters<typeof t>[0])}</span>
                </span>
                {on && <span className="text-amber-deep" aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
