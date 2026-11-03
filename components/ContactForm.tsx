"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { QUICK_ARTICLES } from "@/lib/constants";
import type { Store } from "@/lib/types";

type State = "idle" | "sending" | "done" | "error";

const ease = [0.22, 1, 0.36, 1] as const;

/** Emoji per project starter (zipped by index with the translated label/text). */
const STARTER_EMOJIS = ["🏗️", "🛠️", "🚰", "🎨"];

/** Frequently requested products — kept as catalogue data (not UI text). */
const POPULAR = [
  "Ciment CPA 50kg",
  "Peinture acrylique 20L",
  "Tuyau PVC Ø100 (4m)",
  "Carrelage 60x60 (m²)",
  "Perceuse-visseuse 18V",
  "Câble électrique 2.5mm² (100m)",
];

/** BCP-47 tag for the Web Speech API, per active locale. */
const SPEECH_LANG: Record<string, string> = {
  fr: "fr-FR", en: "en-US", ar: "ar-SA", zh: "zh-CN", ru: "ru-RU",
  ja: "ja-JP", es: "es-ES", de: "de-DE", pt: "pt-PT", sw: "sw-KE",
};

export default function ContactForm() {
  const t = useTranslations("contact");
  const tCat = useTranslations("categories");
  const locale = useLocale();

  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dateNeeded: "",
    message: "",
    storeId: "",
  });

  // Stores the request can be routed to (the client must pick one).
  const [stores, setStores] = useState<Store[]>([]);
  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => {
        const list: Store[] = d.stores ?? [];
        setStores(list);
        if (list[0]) setForm((f) => (f.storeId ? f : { ...f, storeId: list[0].id }));
      })
      .catch(() => {});
  }, []);

  const starters = t.raw("starters") as { label: string; text: string }[];
  const steps = t.raw("steps") as { title: string; desc: string }[];

  // ----- Saisie vocale (Web Speech API) -----
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.SpeechRecognition || w.webkitSpeechRecognition) setVoiceSupported(true);
    return () => recognitionRef.current?.stop();
  }, []);

  function appendToMessage(text: string) {
    setForm((f) => ({
      ...f,
      message: (f.message.trim() ? f.message.trim() + " " : "") + text,
    }));
  }

  function toggleVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.lang = SPEECH_LANG[locale] ?? "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText.trim()) appendToMessage(finalText.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  // ----- Suggestions d'articles pendant la rédaction -----
  const articleSuggestions = useMemo(() => {
    const msg = form.message.toLowerCase();
    const lastWord = (msg.split(/[\s\n]+/).pop() || "").trim();
    if (lastWord.length < 2) return [];
    return QUICK_ARTICLES.filter(
      (a) =>
        (a.name.toLowerCase().includes(lastWord) ||
          tCat(`${a.category}.label` as Parameters<typeof tCat>[0]).toLowerCase().includes(lastWord)) &&
        !msg.includes(a.name.toLowerCase()),
    ).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.message]);

  const showPopular = articleSuggestions.length === 0;
  const popularChips = useMemo(
    () => POPULAR.filter((n) => !form.message.toLowerCase().includes(n.toLowerCase())).slice(0, 6),
    [form.message],
  );

  function addArticle(name: string) {
    setForm((f) => {
      // Retire le mot partiel en cours de frappe (le terme de recherche).
      const trimmedRight = f.message.replace(/[^\s\n]*$/, "");
      const base =
        trimmedRight && !trimmedRight.endsWith("\n") ? trimmedRight.trimEnd() + "\n" : trimmedRight;
      return { ...f, message: base + "• " + name + " ×1\n" };
    });
  }

  function useStarter(text: string) {
    setForm((f) => ({
      ...f,
      message: f.message.trim() ? f.message.trim() + "\n" + text + " " : text + " ",
    }));
  }

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || t("sendFailed"));
      }
      setState("done");
      setForm({ name: "", email: "", phone: "", dateNeeded: "", message: "", storeId: stores[0]?.id ?? "" });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : t("genericError"));
    }
  }

  return (
    <section id="contact" className="veil relative overflow-hidden py-24 lg:py-32">
      <div className="blob -left-24 top-24 h-80 w-80 bg-violet/12" aria-hidden />
      <div className="blob right-0 bottom-10 h-72 w-72 bg-cyan/12 [animation-delay:-10s]" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8">
        {/* Left copy */}
        <div>
          <span className="tag">{t("tag")}</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h2>
          <div className="holo-rule mt-4" />
          <p className="mt-5 max-w-md text-lg text-ink/65">
            {t.rich("intro", { strong: (chunks) => <span className="font-semibold text-ink">{chunks}</span> })}
          </p>

          <div className="mt-10 space-y-5">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber/25 bg-amber/10 font-mono text-sm font-bold text-amber-deep">
                  {`0${i + 1}`}
                </span>
                <div>
                  <div className="font-display font-bold text-ink">{s.title}</div>
                  <div className="text-sm text-ink/55">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Reassurance card */}
          <div className="mt-8 flex items-center gap-4 rounded-2xl border border-line bg-snow p-5 shadow-soft">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber to-amber-deep text-2xl text-snow shadow-glow">
              💬
            </span>
            <div>
              <div className="font-display font-bold text-ink">{t("reassureTitle")}</div>
              <div className="text-sm text-ink/55">{t("reassureBody")}</div>
            </div>
          </div>

          {/* Atmosphere image */}
          <div className="relative mt-8 hidden overflow-hidden rounded-2xl shadow-card lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200&auto=format&fit=crop"
              alt={t("atelierAlt")}
              loading="lazy"
              className="h-48 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" aria-hidden />
            <div className="absolute bottom-4 start-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-soft">{t("atelierKicker")}</div>
              <div className="font-display text-lg font-bold text-snow">{t("atelierTitle")}</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease }}
          className="glass-card bp-corners relative overflow-hidden p-7 sm:p-9"
        >
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber via-violet to-cyan" aria-hidden />

          {state === "done" ? (
            <div className="grid min-h-[440px] place-items-center text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber to-amber-deep text-3xl text-snow shadow-glow">
                  ✓
                </div>
                <h3 className="mt-5 font-display text-2xl font-extrabold text-ink">{t("doneTitle")}</h3>
                <p className="mt-2 max-w-xs text-ink/60">{t("doneBody")}</p>
                <button onClick={() => setState("idle")} className="btn-ghost mt-6">
                  {t("newRequest")}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {stores.length > 0 && (
                <div>
                  <label className="label" htmlFor="store">{t("storeLabel")}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-cyan-deep" aria-hidden>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <select
                      id="store"
                      required
                      className="field ps-10"
                      value={form.storeId}
                      onChange={(e) => update("storeId", e.target.value)}
                    >
                      <option value="" disabled>{t("storePlaceholder")}</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.city ? ` — ${s.city}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-steel">{t("storeHint")}</p>
                </div>
              )}
              <div>
                <label className="label" htmlFor="name">{t("nameLabel")}</label>
                <input id="name" required className="field" value={form.name}
                  onChange={(e) => update("name", e.target.value)} placeholder={t("namePlaceholder")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="email">{t("emailLabel")}</label>
                  <input id="email" type="email" required className="field" value={form.email}
                    onChange={(e) => update("email", e.target.value)} placeholder={t("emailPlaceholder")} />
                </div>
                <div>
                  <label className="label" htmlFor="phone">{t("phoneLabel")}</label>
                  <input id="phone" required className="field" value={form.phone}
                    onChange={(e) => update("phone", e.target.value)} placeholder={t("phonePlaceholder")} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="date">{t("dateLabel")}</label>
                <input id="date" type="date" className="field" value={form.dateNeeded}
                  onChange={(e) => update("dateNeeded", e.target.value)} />
              </div>

              {/* Message + voice + suggestions */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="label mb-0" htmlFor="message">{t("messageLabel")}</label>
                  {voiceSupported && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-steel">
                      {listening ? t("voiceListening") : t("voicePrompt")}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    id="message"
                    rows={5}
                    className="field resize-none pe-14"
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    placeholder={t("messagePlaceholder")}
                  />
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoice}
                      aria-label={listening ? t("voiceStopAria") : t("voiceStartAria")}
                      aria-pressed={listening}
                      className={`absolute bottom-3 end-3 grid h-10 w-10 place-items-center rounded-xl border transition-all ${
                        listening
                          ? "border-amber bg-amber text-snow shadow-glow"
                          : "border-line bg-snow text-ink/60 hover:border-amber hover:text-amber-deep"
                      }`}
                    >
                      {listening && (
                        <span className="absolute inset-0 animate-ping rounded-xl bg-amber/40" aria-hidden />
                      )}
                      <svg className="relative h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10a7 7 0 0 0 14 0" />
                        <path d="M12 19v3" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Suggestions to help the client write */}
                <div className="mt-3 rounded-xl border border-amber/15 bg-gradient-to-br from-amber-tint/50 to-snow p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-amber text-[11px] font-bold text-snow">✦</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-steel">
                      {articleSuggestions.length > 0
                        ? t("suggestMatching")
                        : form.message.trim()
                          ? t("suggestPopular")
                          : t("suggestStart")}
                    </span>
                  </div>

                  {/* Starter trames (when empty) */}
                  {!form.message.trim() && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {starters.map((s, i) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => useStarter(s.text)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-snow px-3 py-1.5 text-xs font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-amber/50 hover:text-amber-deep"
                        >
                          <span>{STARTER_EMOJIS[i]}</span> {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Article chips: contextual matches, else popular */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {(articleSuggestions.length > 0
                      ? articleSuggestions.map((a) => a.name)
                      : showPopular && form.message.trim()
                        ? popularChips
                        : []
                    ).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => addArticle(name)}
                        className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber-deep transition-all hover:-translate-y-0.5 hover:bg-amber/20"
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {state === "error" && (
                <p className="rounded-xl border border-amber-deep/30 bg-amber/10 px-4 py-2.5 text-sm text-amber-deep">
                  {error}
                </p>
              )}

              <button type="submit" disabled={state === "sending"} className="btn-primary w-full shadow-glow hover:shadow-glow-strong disabled:opacity-60">
                {state === "sending" ? t("submitting") : t("submit")}
              </button>
              <p className="text-center font-mono text-[11px] text-steel">
                {t("footnote")}
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
