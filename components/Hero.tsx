"use client";

import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";
import { useAmbiance, type Ambiance } from "@/components/Ambiance";
import { HERO_IMAGE } from "@/lib/constants";

const ease = [0.22, 1, 0.36, 1] as const;

/** Page-base colour per ambiance, as an `r,g,b` triple. Drives the legibility
 *  light-well on the left and the bottom seat so the photo reads on any mood. */
const BASE_RGB: Record<Ambiance, string> = {
  atelier: "255,253,248",
  ivoire: "252,248,239",
  gris: "246,248,252",
  minuit: "7,11,30",
};

/** The brand photo — confined to the hero so it scrolls away with this section.
 *  Stays at full strength in every ambiance (the requirement is that it remains
 *  clearly visible whatever background is chosen); legibility for the headline
 *  comes from a *localised* light-well on the left rather than a full-width wash. */
function HeroPhoto({ ambiance }: { ambiance: Ambiance }) {
  const base = BASE_RGB[ambiance];
  const dark = ambiance === "minuit";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full scale-[1.04] object-cover object-[50%_36%] [animation:float_26s_ease-in-out_infinite]"
        style={{ opacity: dark ? 0.94 : 1 }}
      />

      {/* Mood tint — keeps the photo fully visible, only colours the air. */}
      {dark && <div className="absolute inset-0 bg-[#070B1E]/22" />}

      {/* Left light-well: solid enough behind the lockup, gone by ~58% so the
          scene breathes on the right. One gradient, tuned per ambiance. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(100deg, rgba(${base},${dark ? 0.9 : 0.86}) 0%, rgba(${base},${dark ? 0.6 : 0.48}) 30%, rgba(${base},0) 58%)`,
        }}
      />
      {/* Bottom seat — grounds the marquee band without hiding the photo. */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to top, rgba(${base},${dark ? 0.7 : 0.55}) 0%, rgba(${base},0) 24%)` }}
      />
      {/* Mobile-only top wash — the lockup stacks vertically on phones, so the
          light-well there runs top→bottom instead of left→right. */}
      <div
        className="absolute inset-0 lg:hidden"
        style={{ background: `linear-gradient(to bottom, rgba(${base},${dark ? 0.82 : 0.74}) 0%, rgba(${base},${dark ? 0.5 : 0.4}) 42%, rgba(${base},0) 70%)` }}
      />

      {/* Cool accent breath over the scene (right side) — futuristic, faint. */}
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          background:
            "radial-gradient(40% 42% at 86% 14%, rgba(124,92,255,0.28) 0%, transparent 70%), radial-gradient(40% 44% at 82% 88%, rgba(34,211,238,0.26) 0%, transparent 72%)",
        }}
      />
    </div>
  );
}

/** Holographic blueprint HUD framing the scene — the hero's signature. A thin
 *  inset frame with animated corner brackets turns the photo into an operator
 *  console; the only label is real telemetry (Daloa's coordinates). */
function HeroFrame() {
  return (
    <div
      className="bp-corners pointer-events-none absolute inset-x-3 bottom-3 top-[4.5rem] z-[1] rounded-[1.75rem] border border-white/20 sm:inset-x-5 sm:bottom-5"
      aria-hidden
    >
      {/* faint inner scan glow along the top edge */}
      <div className="absolute inset-x-10 top-px h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
    </div>
  );
}

export default function Hero() {
  const t = useTranslations("hero");
  const f = useFormatter();
  const { ambiance } = useAmbiance();

  // Stat figures are formatted via the locale (Arabic-Indic digits for `ar`).
  const stats = [
    { value: f.number(8), label: t("stats.rayonsLabel") },
    { value: `${f.number(500)}+`, label: t("stats.referencesLabel") },
    { value: t("stats.openValue"), label: t("stats.openLabel") },
  ];

  const marquee = t.raw("marquee") as string[];

  return (
    <section id="top" className="relative min-h-screen overflow-hidden">
      {/* Brand photo — lives here only, so it stays in the hero and scrolls away */}
      <HeroPhoto ambiance={ambiance} />
      <HeroFrame />

      {/* Drifting aurora blobs — depth over the photo (kept to the end side so the
          headline at the start stays crisp) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <span className="blob right-4 top-24 h-80 w-80 bg-cyan/25 sm:right-24" />
        <span className="blob right-1/4 top-1/2 h-72 w-72 bg-violet/25" style={{ animationDelay: "-6s" }} />
        <span className="blob bottom-32 left-1/3 h-72 w-72 bg-amber/15" style={{ animationDelay: "-11s" }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 pb-36 pt-32 lg:px-8">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="glass inline-flex items-center gap-2.5 rounded-full px-4 py-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-deep">
              {t("badge")}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
            className="mt-6 font-display text-6xl font-extrabold leading-[0.88] tracking-tight text-ink sm:text-7xl lg:text-[8.5rem]"
          >
            Solid<span className="text-holo">-BTP</span>
          </motion.h1>

          {/* Holographic filament under the lockup — ties the type to the frame. */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.18, ease }}
            className="accent-line mt-5 h-px w-44 origin-left sm:w-56"
          />

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease }}
            className="mt-5 max-w-xl font-display text-2xl font-bold text-ink sm:text-3xl"
          >
            {t("tagline")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease }}
            className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg"
          >
            {t("description")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32, ease }}
            className="mt-9 flex flex-wrap items-center gap-3.5"
          >
            <a href="#catalogue" className="btn-primary">
              {t("exploreCatalogue")}
              <span aria-hidden className="rtl-flip">→</span>
            </a>
            <a href="#conseil" className="btn-ghost">
              {t("findMaterial")}
            </a>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.42, ease }}
            className="mt-12 grid max-w-xl grid-cols-3 gap-3 sm:gap-4"
          >
            {stats.map((s) => (
              <div key={s.label} className="glass-card rounded-2xl px-4 py-5 hover:-translate-y-1">
                <dt className="bg-gradient-to-br from-amber to-violet bg-clip-text font-display text-3xl font-extrabold text-transparent sm:text-4xl">
                  {s.value}
                </dt>
                <dd className="mt-1 text-xs text-ink-soft">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </div>

      {/* Telemetry tag (desktop) — real Daloa coordinates, balances the rating
          card on the right. Reads as the HUD's locator. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease }}
        className="glass absolute bottom-28 start-8 z-10 hidden items-center gap-2.5 rounded-full px-4 py-2 lg:inline-flex"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink/70">
          6.88°N · 6.45°O
        </span>
      </motion.div>

      {/* Floating glass info card over the photo (desktop) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.55, ease }}
        className="absolute bottom-28 end-8 z-10 hidden lg:block"
      >
        <div className="glass-card animate-float flex items-center gap-4 px-5 py-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber to-amber-deep font-display font-extrabold text-snow shadow-glow">
            S
          </span>
          <div>
            <div className="flex gap-0.5 text-yellow" aria-hidden>
              {"★★★★★".split("").map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
            <div className="mt-0.5 font-display text-sm font-bold text-ink">{t("hours")}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{t("location")}</div>
          </div>
        </div>
      </motion.div>

      {/* Scroll cue */}
      <a
        href="#conseil"
        aria-label={t("scrollAria")}
        className="absolute bottom-16 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-muted transition-colors hover:text-amber-deep lg:flex"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">{t("scroll")}</span>
        <svg className="h-5 w-5 animate-nudge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </a>

      {/* Bottom marquee — luminous azure band. Deep ocean glass with a cyan glow
          hairline, neon diamonds, and edge masks so the words dissolve at both ends. */}
      <div className="absolute inset-x-0 bottom-0 z-[2] overflow-hidden border-t border-cyan/40 bg-gradient-to-r from-[#06203Aef] via-[#0B3F63e6] to-[#06203Aef] backdrop-blur-xl">
        {/* glowing top edge */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent" />
        <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-cyan/20 to-transparent blur-md" />
        <div
          className="flex overflow-hidden py-4"
          style={{
            maskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
          }}
        >
          <div className="flex shrink-0 animate-marquee gap-12 whitespace-nowrap pe-12">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="flex gap-12">
                {marquee.map((w, j) => (
                  <span key={`${i}-${j}`} className="font-mono text-[12px] uppercase tracking-[0.3em] text-[#CFEBF7]">
                    <span className="text-cyan drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]">◆</span> {w}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
