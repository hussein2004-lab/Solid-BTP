import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Per-request i18n config: resolves the active locale, loads its messages, and
 * exposes named CLDR formats used across the app via `useFormatter()`.
 *
 * Arabic uses the Arabic-Indic numbering system (`numberingSystem: "arab"`) so
 * numbers, prices and dates render as ١٢٣٤ instead of 1234. Currency stays XOF
 * (the store's real currency) but its symbol/separators follow each locale's CLDR.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Arabic-Indic digits for `ar`; inferred literal type keeps next-intl happy.
  const ns = locale === "ar" ? { numberingSystem: "arab" as const } : {};

  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    formats: {
      number: {
        // Prices: F CFA / XOF, no decimals (CFA franc has no minor unit).
        price: { style: "currency", currency: "XOF", maximumFractionDigits: 0, ...ns },
        decimal: { ...ns },
        // Ratings like 4,9 / 4.9
        oneDecimal: { minimumFractionDigits: 1, maximumFractionDigits: 1, ...ns },
        percent: { style: "percent", maximumFractionDigits: 0, ...ns },
      },
      dateTime: {
        short: { day: "numeric", month: "short", year: "numeric", ...ns },
        long: { dateStyle: "long", timeStyle: "short", ...ns },
      },
    },
  };
});
