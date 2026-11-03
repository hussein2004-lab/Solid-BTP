import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Resolve the caller's locale for API responses. Route handlers live outside the
 * `[locale]` segment, so we read the `NEXT_LOCALE` cookie (set by the language
 * switcher / middleware) and fall back to the default locale.
 */
export async function getApiLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  return hasLocale(routing.locales, cookieLocale)
    ? cookieLocale
    : routing.defaultLocale;
}

/** Translator for the `api` namespace, in the caller's locale. */
export async function getApiT() {
  const locale = await getApiLocale();
  return getTranslations({ locale, namespace: "api" });
}
