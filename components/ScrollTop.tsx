"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/** Floating "back to top" button with a live scroll-progress ring. */
export default function ScrollTop() {
  const t = useTranslations("scrollTop");
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? el.scrollTop / max : 0);
      setShow(el.scrollTop > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const R = 21;
  const C = 2 * Math.PI * R;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("aria")}
      className={`group fixed bottom-6 end-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber to-amber-deep text-snow shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow-strong ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-5 opacity-0"
      }`}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={R} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-snow/25" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-snow transition-[stroke-dashoffset] duration-150"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
        />
      </svg>
      <svg className="relative h-5 w-5 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}
