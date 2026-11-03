"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Store } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

/** Build an OpenStreetMap embed + full-page URL from decimal-degree strings. */
function mapLinks(lat: string, lon: string) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || (la === 0 && lo === 0)) return null;
  const d = 0.04;
  const bbox = `${lo - d},${la - d},${lo + d},${la + d}`;
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${la},${lo}`,
    full: `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=15/${la}/${lo}`,
  };
}

/** A single labelled detail row inside a store card. */
function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-cyan/25 bg-cyan/10 text-cyan-deep">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
        <div className="text-sm font-medium text-ink">{value}</div>
      </div>
    </div>
  );
}

const ICONS = {
  pin: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  phone: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
    </svg>
  ),
  clock: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  mail: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
};

export default function Stores() {
  const t = useTranslations("stores");
  const [stores, setStores] = useState<Store[] | null>(null);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => {
        const list: Store[] = d.stores ?? [];
        setStores(list);
        if (list[0]) setActiveId(list[0].id);
      })
      .catch(() => setStores([]));
  }, []);

  const active = useMemo(
    () => stores?.find((s) => s.id === activeId) ?? stores?.[0] ?? null,
    [stores, activeId],
  );
  const links = active ? mapLinks(active.lat, active.lon) : null;

  return (
    <section id="nous-trouver" className="veil-alt relative overflow-hidden py-24 lg:py-32">
      <div className="blob -left-24 top-32 h-80 w-80 bg-violet/12" aria-hidden />
      <div className="blob right-0 bottom-10 h-72 w-72 bg-cyan/12 [animation-delay:-8s]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <span className="tag">{t("tag")}</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h2>
          <div className="holo-rule mt-4" />
          <p className="mt-4 text-ink/60">{t("subtitle")}</p>
        </div>

        {/* Loading skeleton */}
        {stores === null && (
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="h-[420px] animate-pulse rounded-3xl border border-line bg-mist/60" />
            <div className="h-[420px] animate-pulse rounded-3xl border border-line bg-mist/60" />
          </div>
        )}

        {/* Empty */}
        {stores !== null && stores.length === 0 && (
          <p className="mt-12 rounded-3xl border border-dashed border-ink/20 bg-snow/70 p-10 text-center text-ink/55">
            {t("empty")}
          </p>
        )}

        {stores !== null && stores.length > 0 && (
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            {/* Store cards */}
            <div className="space-y-4">
              {stores.map((s, i) => {
                const on = active?.id === s.id;
                return (
                  <motion.button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease }}
                    aria-pressed={on}
                    className={`group glass-card relative w-full overflow-hidden p-0 text-start transition-all duration-300 ${
                      on ? "ring-2 ring-cyan/60 shadow-glow-violet" : "hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Storefront photo */}
                      <div className="relative h-44 w-full shrink-0 overflow-hidden sm:h-auto sm:w-44">
                        {s.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.imageUrl}
                            alt={s.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-violet/20 to-cyan/20 text-3xl">🏬</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent sm:bg-gradient-to-r" aria-hidden />
                        <span className="absolute bottom-2.5 start-3 inline-flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white backdrop-blur">
                          {ICONS.pin} {s.city}
                        </span>
                      </div>

                      {/* Summary */}
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-5">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${on ? "bg-cyan" : "bg-ink/20"}`} />
                          <h3 className="truncate font-display text-lg font-extrabold text-ink">{s.name}</h3>
                        </div>
                        {s.address && <p className="line-clamp-2 text-sm text-ink/60">{s.address}</p>}
                        {s.hours && (
                          <p className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[11px] text-steel">
                            {ICONS.clock} {s.hours}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Detail + map panel for the selected store */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <motion.div
                key={active?.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease }}
                className="glass-card bp-corners overflow-hidden"
              >
                <div className="accent-line h-px w-full" aria-hidden />

                {/* Map (when coordinates are known) */}
                {links ? (
                  <div className="relative aspect-[16/10] border-b border-cyan/20">
                    <iframe
                      title={t("mapTitle", { name: active?.name ?? "" })}
                      src={links.embed}
                      className="h-full w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : active?.imageUrl ? (
                  <div className="relative aspect-[16/10] border-b border-cyan/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={active.imageUrl} alt={active.name} className="h-full w-full object-cover" />
                  </div>
                ) : null}

                <div className="p-6 sm:p-7">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet">Solid-BTP</span>
                    <span className="h-1 w-1 rounded-full bg-ink/30" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-deep">{active?.city}</span>
                  </div>
                  <h3 className="mt-1.5 font-display text-2xl font-extrabold text-ink">{active?.name}</h3>
                  {active?.note && <p className="mt-2 text-sm text-ink/60">{active.note}</p>}

                  <div className="mt-5 space-y-4">
                    <Detail icon={ICONS.pin} label={t("addressLabel")} value={active?.address ?? ""} />
                    <Detail icon={ICONS.phone} label={t("phoneLabel")} value={active?.phone ?? ""} />
                    <Detail icon={ICONS.clock} label={t("hoursLabel")} value={active?.hours ?? ""} />
                    <Detail icon={ICONS.mail} label={t("emailLabel")} value={active?.email ?? ""} />
                  </div>

                  {links && (
                    <a
                      href={links.full}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary mt-6 w-full"
                    >
                      {t("directions")}
                      <span aria-hidden className="rtl-flip">→</span>
                    </a>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
