import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/data/people";
import { demoAccounts } from "@/data/accounts";
import { setLocale } from "@/i18n";
import { type Locale } from "@/i18n/locales";

// In-memory only: the brief forbids browser storage. Refreshing signs out.
export interface Session { name: string; username: string; role: Role }

interface Ctx {
  session: Session | null;
  role: Role;
  locale: Locale;
  changeLocale: (locale: Locale) => void;
  signIn: (username: string) => boolean;
  signOut: () => void;
}

const Ctx = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [locale, setLocaleState] = useState<Locale>("en");
  const value = useMemo<Ctx>(() => ({
    session,
    role: session?.role ?? "learner",
    locale,
    changeLocale: (next) => { setLocale(next); setLocaleState(next); if (typeof document !== "undefined") document.documentElement.lang = next; },
    signIn: (username) => {
      const acct = demoAccounts.find((a) => a.username === username.trim().toLowerCase());
      if (!acct) return false;
      setSession({ name: acct.name, username: acct.username, role: acct.role });
      return true;
    },
    signOut: () => setSession(null),
  }), [session, locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRole() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRole outside RoleProvider");
  return v;
}
