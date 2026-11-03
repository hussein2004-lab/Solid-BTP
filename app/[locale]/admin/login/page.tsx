"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LOGO_LIGHT, LOGO_DARK } from "@/lib/constants";
import { Link, useRouter } from "@/i18n/navigation";
import { AmbianceSwitcher, useAmbiance } from "@/components/Ambiance";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AdminLogin() {
  const t = useTranslations("login");
  const router = useRouter();
  const { ambiance } = useAmbiance();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failed"));
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      setLoading(false);
    }
  }

  return (
    <main className="veil relative grid min-h-screen place-items-center overflow-hidden px-5 text-ink">
      <div className="dots absolute inset-0 opacity-20" aria-hidden />
      <div className="blob -right-32 top-0 h-96 w-96 bg-violet/15" aria-hidden />
      <div className="blob -left-32 bottom-0 h-80 w-80 bg-cyan/15 [animation-delay:-8s]" aria-hidden />

      <div className="absolute end-5 top-5 z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <AmbianceSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card relative z-[2] w-full max-w-md overflow-hidden"
      >
        {/* Refined gradient hairline on top */}
        <div className="accent-line h-px w-full" aria-hidden />

        <div className="p-8 sm:p-10">
          <Link href="/" className="inline-flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ambiance === "minuit" ? LOGO_DARK : LOGO_LIGHT}
              alt={t("logoAlt")}
              className="h-16 w-auto"
            />
          </Link>

          <div className="mt-8 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-amber-deep">
            <span className="h-px w-7 bg-amber" />
            {t("kicker")}
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t("subtitle")}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="u">
                {t("username")}
              </label>
              <input
                id="u"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="field"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="label" htmlFor="p">
                {t("password")}
              </label>
              <input
                id="p"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-amber-deep/30 bg-amber/10 px-4 py-2.5 text-sm text-amber-deep">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>

          <Link
            href="/"
            className="mt-6 block text-center font-mono text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-amber-deep"
          >
            {t("backToSite")}
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
