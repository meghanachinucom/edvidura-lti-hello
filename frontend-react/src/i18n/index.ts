import { useEffect, useState } from "react";
import en from "./en.json";
import {
  localeBcp47,
  localeNames,
  phrases,
  SUPPORTED_LOCALES,
  translations,
  type Locale,
} from "./locales";

const STORAGE_KEY = "edvidura_locale";

function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
        return stored;
      }
    } catch {
      // ignore
    }
  }
  return "en";
}

let currentLocale: Locale = getInitialLocale();

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
      window.dispatchEvent(new CustomEvent("edvidura:locale-change", { detail: locale }));
    } catch {
      // ignore
    }
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getLocaleBcp47(loc?: Locale): string {
  return localeBcp47[loc ?? currentLocale] || "en-IN";
}

/** Hook to subscribe to locale changes in React components */
export function useLocale(): { locale: Locale; setLocale: (loc: Locale) => void; bcp47: string } {
  const [locale, setLocState] = useState<Locale>(currentLocale);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Locale>).detail;
      if (detail) {
        currentLocale = detail;
        setLocState(detail);
      }
    };
    window.addEventListener("edvidura:locale-change", handler);
    return () => window.removeEventListener("edvidura:locale-change", handler);
  }, []);

  return {
    locale,
    setLocale,
    bcp47: getLocaleBcp47(locale),
  };
}

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

export { SUPPORTED_LOCALES, localeNames, localeBcp47 };
export type { Locale };
