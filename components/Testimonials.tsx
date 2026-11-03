"use client";

import { motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";

/** Presentational data (avatar initials + accent colour) kept in code, zipped by
 *  index with the translated review text. */
const META = [
  { initials: "KA", color: "#FF6A1A" },
  { initials: "MT", color: "#E8487A" },
  { initials: "JN", color: "#2BA8CC" },
];

/** Star-rating distribution shown in the summary (share of the verified reviews). */
const DISTRIBUTION = [
  { stars: 5, pct: 92 },
  { stars: 4, pct: 6 },
  { stars: 3, pct: 1 },
  { stars: 2, pct: 1 },
  { stars: 1, pct: 0 },
];

const RATING = 4.9;
const REVIEW_COUNT = 218;

export default function Testimonials() {
  const t = useTranslations("testimonials");
  const f = useFormatter();
  const ratingText = f.number(RATING, "oneDecimal");
  const reviews = t.raw("reviews") as { name: string; role: string; quote: string }[];

  return (
    <section id="avis" className="veil relative overflow-hidden py-24 lg:py-32">
      <div className="absolute inset-0 dots opacity-30" aria-hidden />
      <div className="blob -left-32 top-10 h-96 w-96 bg-violet/12" aria-hidden />
      <div className="blob -right-24 bottom-0 h-80 w-80 bg-cyan/12 [animation-delay:-7s]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <span className="tag justify-center">{t("tag")}</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h2>
          <div className="holo-rule mx-auto mt-4" />
          <p className="mt-4 text-ink/55">{t("subtitle")}</p>
        </div>

        {/* Rating summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card bp-corners mx-auto mt-12 grid max-w-4xl gap-8 p-7 sm:grid-cols-[auto_1fr] sm:items-center sm:p-9"
        >
          <div className="text-center sm:border-e sm:border-line sm:pe-9 sm:text-start">
            <div className="font-display text-6xl font-extrabold leading-none text-ink">
              <span className="text-holo">{ratingText}</span><span className="text-2xl text-muted">/5</span>
            </div>
            <div className="mt-2 flex justify-center gap-0.5 text-lg text-yellow sm:justify-start" aria-label={t("ratingAria", { rating: ratingText })}>
              {"★★★★★".split("").map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
            <div className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-muted">
              {t("verifiedCount", { count: REVIEW_COUNT })}
            </div>
          </div>

          <div className="space-y-2">
            {DISTRIBUTION.map(({ stars, pct }) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="w-9 shrink-0 font-mono text-xs text-muted">{f.number(stars)}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber to-yellow"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                  />
                </div>
                <span className="w-9 shrink-0 text-end font-mono text-xs text-ink/55">{f.number(pct / 100, "percent")}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Review cards */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.figure
              key={r.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
              className="glass-card relative flex flex-col overflow-hidden p-7 hover:-translate-y-1 hover:shadow-glass-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5 text-yellow" aria-label={t("fiveStarsAria")}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <span key={s}>★</span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-green-deep">
                  <span aria-hidden>✓</span> {t("verified")}
                </span>
              </div>
              <svg className="mt-4 h-7 w-7 text-violet/25" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9.5 7C6.5 7 4 9.5 4 12.5V19h7v-7H7c0-1.7 1.3-3 3-3V7zm10 0c-3 0-5.5 2.5-5.5 5.5V19h7v-7h-4c0-1.7 1.3-3 3-3V7z" />
              </svg>
              <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">
                {r.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl font-display font-bold text-snow shadow-soft"
                  style={{ background: `linear-gradient(135deg, ${META[i]?.color ?? "#FF6A1A"}, #7C5CFF)` }}
                >
                  {META[i]?.initials ?? ""}
                </span>
                <div>
                  <div className="font-display font-bold text-ink">{r.name}</div>
                  <div className="font-mono text-xs text-muted">{r.role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-ink/55">
          {t.rich("footer", {
            link: (chunks) => (
              <a href="#contact" className="font-semibold text-amber-deep underline-offset-2 hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </section>
  );
}
