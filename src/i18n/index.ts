import en from "./en.json";
import { phrases, translations, type Locale } from "./locales";

let currentLocale: Locale = "en";
export function setLocale(locale: Locale) { currentLocale = locale; }
export function getLocale(): Locale { return currentLocale; }

/** Single text helper. English remains the source of truth; supported locale entries override matching keys. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const localized = translations[currentLocale]?.[key];
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, en);
  const english = typeof value === "string" ? value : key;
  let out = localized ?? phrases[currentLocale]?.[english] ?? english;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}
