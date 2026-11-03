"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LOGO_LIGHT, LOGO_DARK } from "@/lib/constants";
import { Link } from "@/i18n/navigation";
import { AmbianceSwitcher, useAmbiance } from "@/components/Ambiance";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/** Section anchors (same-page hash links) paired with their translation key. */
const LINKS = [
  { href: "#catalogue", key: "catalogue" },
  { href: "#conseil", key: "advice" },
  { href: "#avis", key: "reviews" },
  { href: "#nous-trouver", key: "stores" },
  { href: "#contact", key: "contact" },
] as const;

export default function Navbar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const tl = useTranslations("languageSwitcher");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const { ambiance } = useAmbiance();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      if (window.scrollY < 80) setActive(""); // no link highlighted while on the hero
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the nav link of the section currently in view.
  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the menu when crossing into the desktop breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Solid bar when scrolled OR when the mobile menu is open (legibility).
  const onLight = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        onLight
          ? "border-b border-line bg-sun/85 shadow-[0_10px_30px_-18px_rgba(43,37,33,0.25)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300 lg:px-8 ${
          onLight ? "py-2.5" : "py-4"
        }`}
      >
        {/* Brand logo — transparent PNG, picked to suit the ambiance so it blends */}
        <a href="#top" onClick={() => setOpen(false)} className="group flex items-center" aria-label={t("homeAria")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ambiance === "minuit" ? LOGO_DARK : LOGO_LIGHT}
            alt={tc("logoAlt")}
            className={`w-auto transition-all duration-300 group-hover:-translate-y-0.5 ${
              onLight ? "h-10" : "h-12"
            }`}
          />
        </a>

        {/* Desktop nav links with animated underline */}
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => {
            const isActive = active === l.href;
            return (
              <a
                key={l.href}
                href={l.href}
                aria-current={isActive ? "true" : undefined}
                className={`group relative font-display text-[15px] font-semibold transition-colors hover:text-amber ${
                  isActive ? "text-amber" : "text-ink/75"
                }`}
              >
                {t(l.key)}
                <span
                  className={`absolute -bottom-1.5 start-0 h-[2px] bg-amber transition-all duration-300 ${
                    isActive ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </a>
            );
          })}
        </nav>

        {/* Right-side actions (desktop): language, ambiance, admin entry + amber devis CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <AmbianceSwitcher />
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-snow px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition-all hover:border-amber hover:text-amber"
          >
            {t("adminSpace")}
            <span aria-hidden className="rtl-flip">→</span>
          </Link>
          <a
            href="#contact"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-amber to-amber-deep px-5 py-2.5 font-display text-sm font-semibold text-snow shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-strong"
          >
            {t("freeQuote")}
            <span aria-hidden className="rtl-flip">→</span>
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t("closeMenu") : t("openMenu")}
          aria-expanded={open}
          className="relative z-50 grid h-11 w-11 place-items-center rounded-xl border-2 border-line bg-snow text-ink backdrop-blur transition-colors md:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute start-0 block h-[2px] w-5 bg-current transition-all duration-300 ${
                open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute start-0 top-1/2 block h-[2px] w-5 -translate-y-1/2 bg-current transition-all duration-200 ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute start-0 block h-[2px] w-5 bg-current transition-all duration-300 ${
                open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {open && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="border-t border-line bg-snow px-5 pb-6 pt-2 shadow-card md:hidden"
          >
            <ul className="flex flex-col">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i + 0.05, duration: 0.25 }}
                >
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between border-b border-line py-3.5 font-display text-lg font-semibold text-ink transition-colors hover:text-amber"
                  >
                    {t(l.key)}
                    <span aria-hidden className="rtl-flip text-ink/25">→</span>
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl border border-line bg-snow px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{t("background")}</span>
                <AmbianceSwitcher />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line bg-snow px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{tl("label")}</span>
                <LanguageSwitcher />
              </div>
              <a href="#contact" onClick={() => setOpen(false)} className="btn-primary w-full">
                {t("requestQuote")}
              </a>
              <Link
                href="/admin/login"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-steel transition-colors hover:border-amber hover:text-amber"
              >
                {t("adminSpace")} <span aria-hidden className="rtl-flip">→</span>
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
