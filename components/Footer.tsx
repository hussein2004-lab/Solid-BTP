"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CATEGORIES, categoryColor, LOGO_LIGHT, LOGO_DARK } from "@/lib/constants";
import { Link } from "@/i18n/navigation";
import { useAmbiance } from "@/components/Ambiance";

const PHONE = "+225 07 00 00 00 00";
const EMAIL = "contact@solid-btp.ci";

export default function Footer() {
  const t = useTranslations("footer");
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");
  const f = useFormatter();
  const { ambiance } = useAmbiance();

  const year = f.dateTime(new Date(), { year: "numeric" });

  const CONTACT = [
    { label: t("addressLabel"), value: t("addressValue") },
    { label: t("phoneLabel"), value: PHONE, href: "tel:+2250700000000" },
    { label: t("emailLabel"), value: EMAIL, href: "mailto:contact@solid-btp.ci" },
    { label: t("hoursLabel"), value: t("hoursValue") },
  ];

  return (
    <footer className="veil-alt relative overflow-hidden text-ink">
      {/* Refined gradient hairline caps the page */}
      <div className="accent-line h-px w-full" aria-hidden />
      <div className="blob -left-24 top-10 h-72 w-72 bg-violet/12" aria-hidden />
      <div className="blob right-0 bottom-0 h-72 w-72 bg-cyan/12 [animation-delay:-8s]" aria-hidden />

      <div className="relative z-[2] mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ambiance === "minuit" ? LOGO_DARK : LOGO_LIGHT}
              alt={tc("logoAlt")}
              className="h-20 w-auto"
            />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">{t("blurb")}</p>
            <div className="mt-5 flex gap-0.5 text-yellow" aria-label={t("ratingAria")}>
              {"★★★★★".split("").map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
          </div>

          {/* Rayons — each with its signature color dot */}
          <div className="md:col-span-3">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-amber-deep">{t("rayons")}</h4>
            <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-ink-soft">
              {CATEGORIES.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <a href="#catalogue" className="group inline-flex items-center gap-2 transition-colors hover:text-ink">
                    <span
                      className="h-2 w-2 rounded-full transition-transform group-hover:scale-150"
                      style={{ backgroundColor: categoryColor(c.id) }}
                    />
                    {tCat(`${c.id}.label` as Parameters<typeof tCat>[0])}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Liens */}
          <div className="md:col-span-2">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-amber-deep">{t("links")}</h4>
            <ul className="mt-4 space-y-2 text-sm text-ink-soft">
              <li><a href="#conseil" className="transition-colors hover:text-amber-deep">{t("linkAdvice")}</a></li>
              <li><a href="#avis" className="transition-colors hover:text-amber-deep">{t("linkReviews")}</a></li>
              <li><a href="#nous-trouver" className="transition-colors hover:text-amber-deep">{t("linkFindUs")}</a></li>
              <li><a href="#contact" className="transition-colors hover:text-amber-deep">{t("linkQuote")}</a></li>
              <li><Link href="/admin/login" className="transition-colors hover:text-amber-deep">{t("linkAdmin")}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-amber-deep">{t("contact")}</h4>
            <ul className="mt-4 space-y-3 text-sm">
              {CONTACT.map((c) => (
                <li key={c.label} className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{c.label}</span>
                  {c.href ? (
                    <a href={c.href} className="text-ink transition-colors hover:text-amber-deep">{c.value}</a>
                  ) : (
                    <span className="text-ink">{c.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line-strong pt-6 text-xs text-muted sm:flex-row">
          <span>{t("copyright", { year })}</span>
          <div className="flex items-center gap-5">
            <span className="font-mono">{t("slogan")}</span>
            <a href="#top" className="font-mono transition-colors hover:text-amber-deep">{t("backToTop")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
