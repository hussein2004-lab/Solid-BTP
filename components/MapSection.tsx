"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

// Daloa, Côte d'Ivoire — central coordinates (Solid-BTP is based here).
const LAT = 6.8772;
const LON = -6.4502;
const BBOX = "-6.4902,6.8472,-6.4102,6.9072";
const EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${BBOX}&layer=mapnik&marker=${LAT},${LON}`;
const FULL = `https://www.openstreetmap.org/?mlat=${LAT}&mlon=${LON}#map=14/${LAT}/${LON}`;

// Contact values that stay literal regardless of locale (phone is universal).
const PHONE = "+225 07 00 00 00 00";
const EMAIL = "contact@solid-btp.ci";

export default function MapSection() {
  const t = useTranslations("map");

  const INFOS = [
    { label: t("info.addressLabel"), value: t("info.addressValue") },
    { label: t("info.phoneLabel"), value: PHONE },
    { label: t("info.hoursLabel"), value: t("info.hoursValue") },
    { label: t("info.emailLabel"), value: EMAIL },
  ];

  return (
    <section id="nous-trouver" className="veil-alt py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-xl">
          <span className="tag">{t("tag")}</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h2>
          <div className="holo-rule mt-4" />
          <p className="mt-4 text-ink/60">{t("subtitle")}</p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-line bg-line shadow-card lg:grid-cols-3">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative aspect-[16/10] bg-mint lg:col-span-2 lg:aspect-auto"
          >
            <iframe
              title={t("iframeTitle")}
              src={EMBED}
              className="h-full min-h-[360px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>

          {/* Info panel — futuristic gradient "go find us" surface */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-deep via-violet to-cyan-deep p-8 text-white">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan/30 blur-3xl" aria-hidden />
            <div className="absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-amber/25 blur-3xl" aria-hidden />
            <div className="relative z-[2]">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/90">Solid-BTP · Daloa</span>
              </div>
              <dl className="mt-6 space-y-5">
                {INFOS.map((info) => (
                  <div key={info.label} className="border-b border-white/20 pb-4">
                    <dt className="font-mono text-[11px] uppercase tracking-widest text-white/65">
                      {info.label}
                    </dt>
                    <dd className="mt-1 font-medium text-white">{info.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <a
              href={FULL}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-[2] mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 font-display font-semibold text-violet-deep shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              {t("openRoute")}
              <span aria-hidden className="rtl-flip">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
