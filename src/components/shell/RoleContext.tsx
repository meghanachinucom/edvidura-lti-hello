import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/data/people";
import { demoAccounts } from "@/data/accounts";

// In-memory only: the brief forbids browser storage. Refreshing signs out.
export interface Session { name: string; username: string; role: Role }

interface Ctx {
  session: Session | null;
  role: Role;
  /** Returns false when the username is not a demo account. */
  signIn: (username: string) => boolean;
  signOut: () => void;
}

const Ctx = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const value = useMemo<Ctx>(() => ({
    session,
    role: session?.role ?? "learner",
    signIn: (username) => {
      const acct = demoAccounts.find((a) => a.username === username.trim().toLowerCase());
      if (!acct) return false;
      setSession({ name: acct.name, username: acct.username, role: acct.role });
      return true;
    },
    signOut: () => setSession(null),
  }), [session]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRole() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRole outside RoleProvider");
  return v;
}
