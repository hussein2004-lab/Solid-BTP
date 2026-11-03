import type { routing } from "@/i18n/routing";
import type messages from "@/messages/fr.json";

/**
 * Type-safe i18n: augments next-intl with the app's locale union and the message
 * shape (from fr.json, the source of truth). This gives autocomplete + typo
 * checking on every `t("…")` key and on `useLocale()`.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
