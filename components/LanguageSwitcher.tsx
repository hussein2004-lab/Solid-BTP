"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/** Native language name + flag emoji for each supported locale. */
const LANGS: Record<Locale, { native: string; flag: string }> = {
  fr: { native: "Français", flag: "🇫🇷" },
  en: { native: "English", flag: "🇬🇧" },
  ar: { native: "العربية", flag: "🇸🇦" },
  zh: { native: "中文", flag: "🇨🇳" },
  ru: { native: "Русский", flag: "🇷🇺" },
  ja: { native: "日本語", flag: "🇯🇵" },
  es: { native: "Español", flag: "🇪🇸" },
  de: { native: "Deutsch", flag: "🇩🇪" },
  pt: { native: "Português", flag: "🇵🇹" },
  sw: { native: "Kiswahili", flag: "🇰🇪" },
};

/**
 * Header language dropdown. Switching keeps the current path + query params and
 * persists the choice in the NEXT_LOCALE cookie (handled by next-intl's router).
 */
export default function LanguageSwitcher() {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGS[locale] ?? LANGS.fr;

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

  function switchTo(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    // Read query params at click-time (client only) — avoids useSearchParams(),
    // which would force a Suspense boundary on every page that renders the header.
    const search = typeof window !== "undefined" ? window.location.search : "";
    const query = Object.fromEntries(new URLSearchParams(search).entries());
    startTransition(() => {
      router.replace({ pathname, query }, { locale: next });
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("change", { language: current.native })}
        disabled={pending}
        className="glass inline-flex items-center gap-2 rounded-full py-1.5 ps-2.5 pe-3 transition-all hover:-translate-y-0.5 disabled:opacity-60"
      >
        <span className="text-base leading-none" aria-hidden>
          {current.flag}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/70">
          {locale}
        </span>
        <svg
          className={`h-3 w-3 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="glass-card absolute end-0 top-full z-50 mt-2 max-h-[70vh] w-52 overflow-auto p-1.5"
        >
          <p className="px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted">
            {t("label")}
          </p>
          {routing.locales.map((loc) => {
            const meta = LANGS[loc];
            const on = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                lang={loc}
                onClick={() => switchTo(loc)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition-colors ${
                  on ? "bg-amber/10" : "hover:bg-ink/5"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {meta.flag}
                </span>
                <span className="min-w-0 flex-1 font-display text-sm font-semibold text-ink">
                  {meta.native}
                </span>
                {on && (
                  <span className="text-amber-deep" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
