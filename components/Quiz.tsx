"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";

type Answers = { projet: string; besoin: string; budget: string };

/** Questions carry stable option IDs (used for logic + translation lookup) and
 *  an emoji. Labels/titles/hints come from the message catalog. */
const QUESTIONS = [
  {
    key: "projet" as const,
    index: "01",
    options: [
      { id: "construction", emoji: "🏗️" },
      { id: "renovation", emoji: "🛠️" },
      { id: "plomberie", emoji: "🚰" },
      { id: "electricite", emoji: "⚡" },
      { id: "decoration", emoji: "🎨" },
      { id: "bricolage", emoji: "🔩" },
    ],
  },
  {
    key: "besoin" as const,
    index: "02",
    options: [
      { id: "outillage", emoji: "🧰" },
      { id: "materiaux", emoji: "🧱" },
      { id: "electromenager", emoji: "❄️" },
      { id: "sanitaire", emoji: "🚿" },
      { id: "quincaillerie", emoji: "🔧" },
      { id: "surprise", emoji: "🎲" },
    ],
  },
  {
    key: "budget" as const,
    index: "03",
    options: [
      { id: "low", emoji: "🪙" },
      { id: "mid", emoji: "💵" },
      { id: "high", emoji: "💰" },
      { id: "premium", emoji: "🏦" },
    ],
  },
];

/** Pack contents are real catalogue products → kept as domain data (the kit name
 *  and tagline are translated). Estimate drives the budget figure. */
const PACKS: Record<string, { items: string[]; estimate: number }> = {
  construction: { items: ["Ciment CPA 50kg", "Fer à béton 12mm", "Sable & gravier", "Brouette 100L", "Truelle & taloche"], estimate: 150000 },
  renovation: { items: ["Enduit de lissage", "Carrelage grès 60x60", "Colle à carrelage", "Peinture acrylique 20L", "Outillage de pose"], estimate: 95000 },
  plomberie: { items: ["Tuyaux PVC & raccords", "Mitigeur lavabo", "Chauffe-eau 100L", "Joints & téflon", "Clé à molette"], estimate: 130000 },
  electricite: { items: ["Câble 2.5mm² 100m", "Disjoncteurs modulaires", "Interrupteurs & prises", "Ampoules LED", "Tableau électrique"], estimate: 80000 },
  decoration: { items: ["Peinture acrylique 20L", "Rouleau anti-goutte", "Pinceaux assortis", "Bâche & ruban de masquage", "Enduit de rebouchage"], estimate: 55000 },
  bricolage: { items: ["Perceuse-visseuse 18V", "Jeu de tournevis", "Marteau & clous", "Mètre & niveau", "Cadenas & visserie"], estimate: 75000 },
};

function packId(a: Answers): string {
  return PACKS[a.projet] ? a.projet : "bricolage";
}

const ease = [0.22, 1, 0.36, 1] as const;

export default function Quiz() {
  const t = useTranslations("quiz");
  const f = useFormatter();
  const [step, setStep] = useState(0); // 0..2 questions, 3 = result
  const [answers, setAnswers] = useState<Answers>({ projet: "", besoin: "", budget: "" });
  const [dir, setDir] = useState(1);

  const total = QUESTIONS.length;
  const isResult = step >= total;

  function choose(value: string) {
    const q = QUESTIONS[step];
    setAnswers((a) => ({ ...a, [q.key]: value }));
    setDir(1);
    setTimeout(() => setStep((s) => s + 1), 160);
  }

  function back() {
    if (step === 0) return;
    setDir(-1);
    setStep((s) => s - 1);
  }

  function restart() {
    setDir(-1);
    setAnswers({ projet: "", besoin: "", budget: "" });
    setStep(0);
  }

  const id = isResult ? packId(answers) : "";
  const pack = isResult ? PACKS[id] : null;
  const surprise = answers.besoin === "surprise";
  const progress = isResult ? 100 : Math.round((step / total) * 100);

  return (
    <section id="conseil" className="veil relative overflow-hidden py-24 lg:py-32">
      <div className="absolute inset-0 dots opacity-30" aria-hidden />
      <div className="blob -right-24 top-20 h-80 w-80 bg-violet/14" aria-hidden />
      <div className="blob -left-20 bottom-10 h-72 w-72 bg-cyan/14 [animation-delay:-9s]" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-5 lg:px-8">
        <div className="mb-10 text-center">
          <span className="tag">{t("badge")}</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h2>
          <div className="holo-rule mx-auto mt-4" />
          <p className="mx-auto mt-4 max-w-xl text-ink/60">{t("subtitle")}</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber via-violet to-cyan"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease }}
            />
          </div>
          <span className="font-mono text-xs text-muted">
            {isResult
              ? f.number(1, { style: "percent" })
              : t("step", { current: f.number(step + 1), total: f.number(total) })}
          </span>
        </div>

        <div className="glass-card bp-corners relative min-h-[420px] overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            {!isResult ? (
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir > 0 ? 48 : -48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir > 0 ? -48 : 48 }}
                transition={{ duration: 0.45, ease }}
                className="p-8 sm:p-12"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-amber">{QUESTIONS[step].index}</span>
                  <span className="h-px w-8 bg-ink/20" />
                  <span className="tag">{t("questionTag")}</span>
                </div>
                <h3 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">
                  {t(`questions.${QUESTIONS[step].key}.title` as Parameters<typeof t>[0])}
                </h3>
                <p className="mt-2 text-ink/55">{t(`questions.${QUESTIONS[step].key}.hint` as Parameters<typeof t>[0])}</p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {QUESTIONS[step].options.map((opt, i) => {
                    const active = answers[QUESTIONS[step].key] === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        onClick={() => choose(opt.id)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i, duration: 0.3, ease }}
                        className={`group flex items-center gap-3 rounded-xl border px-4 py-4 text-start transition-all ${
                          active
                            ? "border-violet/50 bg-gradient-to-r from-amber/10 to-violet/10 shadow-soft"
                            : "border-white/60 bg-white/55 backdrop-blur hover:border-violet/40 hover:-translate-y-0.5 hover:shadow-glass"
                        }`}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="font-display font-semibold text-ink">
                          {t(`questions.${QUESTIONS[step].key}.options.${opt.id}` as Parameters<typeof t>[0])}
                        </span>
                        <span className="ms-auto text-ink/30 transition-transform group-hover:translate-x-1 rtl-flip">
                          →
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {step > 0 && (
                  <button
                    onClick={back}
                    className="mt-8 font-mono text-xs uppercase tracking-widest text-steel hover:text-amber"
                  >
                    <span className="rtl-flip inline-block">←</span> {t("previous")}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease }}
                className="p-8 sm:p-12"
              >
                <span className="tag text-amber">{t("recommendationTag")}</span>
                <h3 className="mt-3 font-display text-4xl font-extrabold text-ink sm:text-5xl">
                  {t(`packs.${id}.kit` as Parameters<typeof t>[0])}
                </h3>
                <p className="mt-3 max-w-lg text-lg text-ink/70">
                  {surprise ? t("packs.surpriseTagline") : t(`packs.${id}.tagline` as Parameters<typeof t>[0])}
                </p>

                <ul className="mt-7 grid gap-2 sm:grid-cols-2">
                  {pack!.items.map((it, i) => (
                    <motion.li
                      key={it}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 * i, duration: 0.35, ease }}
                      className="flex items-center gap-3 border-b border-line py-2.5"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-green to-green-deep text-xs font-bold text-snow">
                        ✓
                      </span>
                      <span className="font-medium text-ink">{it}</span>
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-ink/15 pt-6">
                  <div>
                    <div className="tag">{t("budgetAdvised")}</div>
                    <div className="mt-1 font-display text-3xl font-extrabold text-ink">
                      ≈ {f.number(pack!.estimate, "price")}
                    </div>
                    <div className="mt-1 font-mono text-xs text-steel">
                      {t("summary", {
                        project: t(`questions.projet.options.${answers.projet}` as Parameters<typeof t>[0]),
                        budget: t(`questions.budget.options.${answers.budget}` as Parameters<typeof t>[0]),
                      })}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <a href="#catalogue" className="btn-primary">
                      {t("viewCatalogue")}
                    </a>
                    <button onClick={restart} className="btn-ghost">
                      {t("restart")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
