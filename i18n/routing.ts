import { defineRouting } from "next-intl/routing";

/**
 * Central routing config for next-intl.
 * - `fr` is the default and is reachable WITHOUT a prefix (`/`), thanks to
 *   `localePrefix: "as-needed"`. Every other locale is prefixed (`/en`, `/ar`…).
 * - `localeCookie` persists a manual switch (NEXT_LOCALE) so the choice sticks.
 * - `localeDetection` (on by default) reads Accept-Language for first-time visitors.
 */
export const routing = defineRouting({
  locales: ["fr", "en", "ar", "zh", "ru", "ja", "es", "de", "pt", "sw"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeCookie: true,
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];

/** Locales rendered right-to-left. */
export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isRtl(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}
