"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CATEGORIES, categoryImage } from "@/lib/constants";
import { routing } from "@/i18n/routing";
import type { Article, MatchedArticle } from "@/lib/types";

/** Petit spinner inline pour l'assistant IA. */
function Spinner({ label }: { label?: string }) {
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

function ArticleCard({
  article,
  i,
  reason,
  tr,
}: {
  article: Article;
  i: number;
  reason?: string;
  /** Translates stored (French) catalogue text into the active locale. */
  tr?: (s: string) => string;
}) {
  const t = useTranslations("catalogue");
  const tCat = useTranslations("categories");
  const f = useFormatter();
  const src = article.imageUrl || categoryImage(article.category);
  const name = tr ? tr(article.name) : article.name;
  const description = tr ? tr(article.description) : article.description;
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: (i % 4) * 0.05 }}
      className="glass-card group relative flex flex-col overflow-hidden hover:-translate-y-1.5 hover:shadow-glass-lg"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-mist">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center blueprint">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">{t("imageSoon")}</span>
          </div>
        )}
        <span className="glass absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
          {tCat(`${article.category}.label` as Parameters<typeof tCat>[0])}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-tight text-ink">{name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{description}</p>
        {reason && (
          <p className="mt-2 flex-1 rounded-lg bg-violet/10 px-2.5 py-1.5 font-mono text-[11px] leading-snug text-violet-deep">
            ✦ {tr ? tr(reason) : reason}
          </p>
        )}
        {!reason && <div className="flex-1" />}
        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">{t("price")}</div>
            <span className="block whitespace-nowrap font-display text-lg font-extrabold text-amber-deep">
              {f.number(article.price, "price")}
            </span>
          </div>
          <a
            href="#contact"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber to-violet px-3.5 py-2 font-display text-xs font-semibold text-snow transition-all duration-300 group-hover:gap-2.5 group-hover:shadow-glow"
          >
            {t("order")}
            <span aria-hidden className="rtl-flip">→</span>
          </a>
        </div>
      </div>
    </motion.article>
  );
}

export default function Catalogue() {
  const t = useTranslations("catalogue");
  const tCat = useTranslations("categories");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");

  // ----- AI assistant (mode "match" : retrouve des articles existants) -----
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [aiResults, setAiResults] = useState<MatchedArticle[] | null>(null);
  const [aiLabel, setAiLabel] = useState(""); // ce qui a déclenché la recherche
  const [photoPreview, setPhotoPreview] = useState("");

  // ----- Traduction du contenu catalogue (nom + description) côté client -----
  // Le contenu est stocké en français ; pour toute autre langue on le traduit à
  // la volée (Gemini) avec un cache localStorage, donc 1 appel max par langue.
  const [tr, setTr] = useState<Record<string, string>>({});
  const trf = (s: string) => tr[s] ?? s;

  const labelOf = (id: string) => tCat(`${id}.label` as Parameters<typeof tCat>[0]);

  async function loadArticles() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/articles");
      if (!res.ok) throw new Error("load failed");
      const d = await res.json();
      setArticles(d.articles ?? []);
    } catch {
      setLoadError(true);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticles();
  }, []);

  // Translate visible article names/descriptions when the locale isn't French.
  useEffect(() => {
    if (locale === routing.defaultLocale) {
      setTr({});
      return;
    }
    const cacheKey = `sld-tr-${locale}`;
    let cache: Record<string, string> = {};
    try {
      cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
    } catch {
      cache = {};
    }
    setTr(cache); // show whatever is already cached immediately

    const texts = new Set<string>();
    const collect = (a: Article) => {
      if (a.name) texts.add(a.name);
      if (a.description) texts.add(a.description);
    };
    articles.forEach(collect);
    (aiResults ?? []).forEach(collect);
    // Also translate the AI assistant's French output (justification + note).
    (aiResults ?? []).forEach((a) => {
      if (a.reason) texts.add(a.reason);
    });
    if (aiNote) texts.add(aiNote);

    const missing = [...texts].filter((s) => !(s in cache));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: missing, target: locale }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(d.translations)) return;
        const next = { ...cache };
        missing.forEach((srcText, i) => {
          const v = d.translations[i];
          if (typeof v === "string" && v.trim()) next[srcText] = v;
        });
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          /* storage full / unavailable — translations still apply this session */
        }
        if (!cancelled) setTr(next);
      } catch {
        /* network/AI error — fall back to the original French text */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articles, aiResults, aiNote, locale]);

  async function runAiSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = aiText.trim();
    if (!q || aiLoading) return;
    setAiLoading(true);
    setAiErr("");
    setAiNote("");
    setAiResults(null);
    setPhotoPreview("");
    setAiLabel(t("ai.quoted", { query: q }));
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, mode: "match" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || t("ai.searchFailed"));
      setAiNote(d.note ?? "");
      setAiResults(d.results ?? []);
    } catch (err) {
      setAiErr(err instanceof Error ? err.message : tc("aiUnavailable"));
      setAiResults(null);
    } finally {
      setAiLoading(false);
    }
  }

  async function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner la même image
    if (!file || aiLoading) return;
    if (file.size > 5 * 1024 * 1024) {
      setAiErr(tc("imageTooLarge"));
      return;
    }
    setAiLoading(true);
    setAiErr("");
    setAiNote("");
    setAiResults(null);
    setAiText("");
    setAiLabel(t("ai.yourPhoto"));
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("mode", "match");
      const res = await fetch("/api/ai/identify", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || t("ai.imageFailed"));
      setAiNote(d.note ?? "");
      setAiResults(d.results ?? []);
    } catch (err) {
      setAiErr(err instanceof Error ? err.message : tc("aiUnavailable"));
      setAiResults(null);
    } finally {
      setAiLoading(false);
    }
  }

  function clearAi() {
    setAiResults(null);
    setAiErr("");
    setAiNote("");
    setAiText("");
    setAiLabel("");
    setPhotoPreview("");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      const matchCat = active === "all" || a.category === active;
      const matchQ =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        trf(a.name).toLowerCase().includes(q) ||
        trf(a.description).toLowerCase().includes(q) ||
        labelOf(a.category).toLowerCase().includes(q);
      return matchCat && matchQ;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, query, active, tr]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of articles) m[a.category] = (m[a.category] ?? 0) + 1;
    return m;
  }, [articles]);

  return (
    <section id="catalogue" className="veil-alt relative overflow-hidden py-24 lg:py-32">
      <div className="blob -right-32 top-40 h-[420px] w-[420px] bg-violet/10" aria-hidden />
      <div className="blob -left-32 bottom-20 h-[380px] w-[380px] bg-cyan/10 [animation-delay:-8s]" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="tag">{t("tag")}</span>
            <h2 className="mt-3 max-w-xl font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {t("title")}
            </h2>
            <div className="holo-rule mt-4" />
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <svg
              className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="field ps-10"
              aria-label={t("searchAria")}
            />
          </div>
        </div>

        {/* AI assistant */}
        <div className="glass-card mesh mt-8 overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-amber to-violet font-display text-sm font-extrabold text-snow">
              ✦
            </span>
            <h3 className="font-display text-lg font-extrabold text-ink">{t("ai.title")}</h3>
            <span className="font-mono text-[11px] uppercase tracking-widest text-steel">
              {t("ai.subtitle")}
            </span>
          </div>

          <form onSubmit={runAiSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder={t("ai.placeholder")}
              className="field flex-1"
              aria-label={t("ai.describeAria")}
              disabled={aiLoading}
            />
            <div className="flex gap-2">
              <button type="submit" disabled={aiLoading || !aiText.trim()} className="btn-primary disabled:opacity-50">
                {aiLoading ? t("ai.searching") : t("ai.ask")}
              </button>
              <label
                className={`btn-ghost cursor-pointer ${aiLoading ? "pointer-events-none opacity-50" : ""}`}
                title={t("ai.photoTitle")}
              >
                {t("ai.photo")}
                <input type="file" accept="image/*" capture="environment" onChange={onPhotoPick} className="hidden" />
              </label>
            </div>
          </form>

          {aiLoading && (
            <div className="mt-3">
              <Spinner label={t("ai.spinner")} />
            </div>
          )}
          {aiErr && (
            <div className="mt-3 rounded-xl border border-amber-deep/30 bg-amber-deep/5 p-3 text-sm text-amber-deep">
              {aiErr}
            </div>
          )}
        </div>

        {/* Category rail (browse normal) — masqué quand l'IA affiche des résultats */}
        {aiResults === null && (
          <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto pb-2">
            {[{ id: "all", label: t("all"), n: articles.length }, ...CATEGORIES.map((c) => ({ id: c.id, label: labelOf(c.id), n: counts[c.id] ?? 0 }))].map((c) => {
              const on = active === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`shrink-0 rounded-full px-4 py-2 font-display text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                    on
                      ? "bg-gradient-to-r from-amber to-violet text-snow shadow-glow"
                      : "glass text-ink hover:text-amber-deep"
                  }`}
                >
                  {c.label} ({c.n})
                </button>
              );
            })}
          </div>
        )}

        {/* Résultats IA (mode "match") */}
        {aiResults !== null && (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber/30 bg-amber/5 p-4">
              <div className="flex items-center gap-3">
                {photoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt={t("ai.previewAlt")} className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover" />
                )}
                <div>
                  <p className="font-display font-bold text-ink">
                    {t("ai.suggestedCount", { count: aiResults.length })}
                    {aiLabel && <span className="font-normal text-ink/55"> · {t("ai.forLabel", { label: aiLabel })}</span>}
                  </p>
                  {aiNote && <p className="mt-0.5 text-sm text-ink/65">💡 {trf(aiNote)}</p>}
                </div>
              </div>
              <button onClick={clearAi} className="btn-ghost shrink-0">
                ✕ {t("ai.clear")}
              </button>
            </div>

            {aiResults.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-mist py-16 text-center">
                <p className="font-display text-xl font-bold text-ink">{t("ai.noMatchTitle")}</p>
                <p className="mt-2 text-ink/55">
                  {t.rich("ai.noMatchBody", {
                    quote: (chunks) => (
                      <a href="#contact" className="font-semibold text-amber-deep underline">
                        {chunks}
                      </a>
                    ),
                  })}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {aiResults.map((a, i) => (
                  <ArticleCard key={a.id} article={a} i={i} reason={a.reason} tr={trf} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grid (browse normal) */}
        {aiResults === null && (
          <div className="mt-8">
            {/* Result count (once loaded, no error) */}
            {!loading && !loadError && articles.length > 0 && (
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-steel">
                {t("count", { count: filtered.length })}
                {(active !== "all" || query.trim()) && (
                  <>
                    {" "}·{" "}
                    <button
                      onClick={() => {
                        setActive("all");
                        setQuery("");
                      }}
                      className="text-amber-deep underline-offset-2 hover:underline"
                    >
                      {t("reset")}
                    </button>
                  </>
                )}
              </p>
            )}

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-2xl border border-line bg-mist" />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-dashed border-amber-deep/30 bg-amber-deep/5 py-20 text-center">
                <p className="font-display text-xl font-bold text-ink">{t("loadError.title")}</p>
                <p className="mt-2 text-ink/55">{t("loadError.body")}</p>
                <button onClick={loadArticles} className="btn-primary mt-6">
                  {tc("retry")}
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/20 bg-mist py-20 text-center">
                <p className="font-display text-xl font-bold text-ink">{t("empty.title")}</p>
                <p className="mt-2 text-ink/55">{t("empty.body")}</p>
                {(active !== "all" || query.trim()) && (
                  <button
                    onClick={() => {
                      setActive("all");
                      setQuery("");
                    }}
                    className="btn-ghost mt-6"
                  >
                    {t("resetFilters")}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {filtered.map((a, i) => (
                  <ArticleCard key={a.id} article={a} i={i} tr={trf} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
