import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "@/data/people";
import { demoAccounts } from "@/data/accounts";
import { setLocale } from "@/i18n";
import { type Locale } from "@/i18n/locales";
import { queryClient } from "@/lib/queryClient";

// In-memory token storage (never localStorage for production token security)
let _inMemoryBearerToken: string | null = null;

interface CachedExchange {
  promise: Promise<Session | null>;
  createdAt: number;
}

const _codeExchangeCache = new Map<string, CachedExchange>();
let _lastResolvedSession: Session | null = null;
const EXCHANGE_CACHE_TTL_MS = 60_000; // 60 seconds bounded lifetime

export function clearAuthCache() {
  _inMemoryBearerToken = null;
  _lastResolvedSession = null;
  _codeExchangeCache.clear();
  queryClient.clear();
}

export function getBearerToken(): string | null {
  return _inMemoryBearerToken;
}

export function setBearerToken(token: string | null) {
  _inMemoryBearerToken = token;
}

export interface Session {
  name: string;
  username: string;
  role: Role;
  token?: string;
  tenantId?: string;
  className?: string;
  isInstructor?: boolean;
  isSchoolAdmin?: boolean;
  lmsReturnUrl?: string;
}

interface Ctx {
  session: Session | null;
  role: Role;
  locale: Locale;
  isLoading: boolean;
  error: string | null;
  changeLocale: (locale: Locale) => void;
  signIn: (username: string) => boolean;
  signOut: () => void;
}

const Ctx = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [locale, setLocaleState] = useState<Locale>("en");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        if (typeof window === "undefined") {
          setIsLoading(false);
          return;
        }

        const currentUrl = new URL(window.location.href);
        const tokenFromUrl = currentUrl.searchParams.get("token");
        const codeFromUrl = currentUrl.searchParams.get("code");

        // If fresh LTI launch or token parameter is present, clear any signed-out suppression
        if (codeFromUrl || tokenFromUrl) {
          try {
            sessionStorage.removeItem("edvidura_signed_out");
          } catch {}
        } else {
          // If user explicitly signed out, do NOT automatically restore session from cookie
          try {
            if (sessionStorage.getItem("edvidura_signed_out") === "true") {
              setIsLoading(false);
              return;
            }
          } catch {}
        }

        // 1. If single-use launch code is present (Moodle LTI 1.3 handoff), exchange for session
        if (codeFromUrl) {
          try {
            const cached = _codeExchangeCache.get(codeFromUrl);
            const isFresh = cached && (Date.now() - cached.createdAt < EXCHANGE_CACHE_TTL_MS);

            if (!isFresh) {
              if (cached) _codeExchangeCache.delete(codeFromUrl);
              const fetchPromise = (async (): Promise<Session | null> => {
                const exchResp = await fetch("/api/v1/auth/exchange", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: codeFromUrl }),
                });
                if (exchResp.ok) {
                  const exchJson = await exchResp.json();
                  if (exchJson.ok && exchJson.data) {
                    const exchData = exchJson.data;
                    if (exchData.token) {
                      setBearerToken(exchData.token);
                    }
                    const isSchoolAdmin = Boolean(exchData.is_school_admin);
                    const isInstructor = Boolean(exchData.is_instructor);
                    const mappedRole: Role = isSchoolAdmin
                      ? "trainingOfficer"
                      : isInstructor
                        ? "instructor"
                        : "learner";

                    return {
                      name: exchData.learner_name || "User",
                      username: exchData.subject || "user",
                      role: mappedRole,
                      token: exchData.token || undefined,
                      tenantId: exchData.tenant_id,
                      className: exchData.class_name,
                      isInstructor,
                      isSchoolAdmin,
                      lmsReturnUrl: exchData.lms_return_url || "/moodle/course/view.php?id=10",
                    };
                  }
                } else {
                  console.warn("LTI code exchange returned:", exchResp.status);
                }
                return null;
              })();
              _codeExchangeCache.set(codeFromUrl, { promise: fetchPromise, createdAt: Date.now() });
            }

            const activeEntry = _codeExchangeCache.get(codeFromUrl);
            const exchangedSession = activeEntry ? await activeEntry.promise : null;
            if (exchangedSession) {
              _lastResolvedSession = exchangedSession;
              try {
                if (exchangedSession.lmsReturnUrl) {
                  sessionStorage.setItem("edvidura_return_url", exchangedSession.lmsReturnUrl);
                }
              } catch {}
              queryClient.clear(); // Synchronously clear prior role query cache
              if (!cancelled) {
                setSession(exchangedSession);
                setIsLoading(false);
              }
              return;
            }
          } catch (e) {
            console.warn("Failed to exchange LTI launch code:", e);
          } finally {
            // Surgically clean code parameter from address bar
            currentUrl.searchParams.delete("code");
            const queryStr = currentUrl.searchParams.toString();
            const cleanPath =
              currentUrl.pathname +
              (queryStr ? `?${queryStr}` : "") +
              currentUrl.hash;
            window.history.replaceState(window.history.state ?? {}, document.title, cleanPath);
          }
        } else if (_lastResolvedSession) {
          if (!cancelled) {
            setSession(_lastResolvedSession);
            setIsLoading(false);
          }
          return;
        } else if (tokenFromUrl) {
          // 2. If token is present in URL (direct launch token), extract and store
          setBearerToken(tokenFromUrl);

          // Surgically delete ONLY the "token" query parameter, preserving other params, hash, and history.state
          currentUrl.searchParams.delete("token");
          const queryStr = currentUrl.searchParams.toString();
          const cleanPath =
            currentUrl.pathname +
            (queryStr ? `?${queryStr}` : "") +
            currentUrl.hash;
          window.history.replaceState(window.history.state ?? {}, document.title, cleanPath);
        }

        // 3. Validate session via /api/v1/app/session using in-memory bearer token or cookie
        const activeToken = getBearerToken();
        const authHeader: Record<string, string> = activeToken
          ? { Authorization: `Bearer ${activeToken}` }
          : {};
        const checkResp = await fetch("/api/v1/app/session", {
          headers: { ...authHeader },
        });

        if (checkResp.ok) {
          const body = await checkResp.json();
          if (body.ok && body.data) {
            const data = body.data;
            if (data.token) {
              setBearerToken(data.token);
            }
            const isSchoolAdmin = Boolean(data.is_school_admin);
            const isInstructor = Boolean(data.is_instructor);
            const mappedRole: Role = isSchoolAdmin
              ? "trainingOfficer"
              : isInstructor
                ? "instructor"
                : "learner";

            if (!cancelled) {
              queryClient.clear();
              const sessData: Session = {
                name: data.learner_name || "Learner",
                username: data.subject || "user",
                role: mappedRole,
                token: data.token || activeToken || undefined,
                tenantId: data.tenant_id,
                className: data.class_name,
                isInstructor,
                isSchoolAdmin,
                lmsReturnUrl: data.lms_return_url || "/moodle/course/view.php?id=10",
              };
              try {
                if (sessData.lmsReturnUrl) {
                  sessionStorage.setItem("edvidura_return_url", sessData.lmsReturnUrl);
                }
              } catch {}
              setSession(sessData);
              setIsLoading(false);
            }
            return;
          }
        }

        // No active session found
        if (!cancelled) {
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Authentication error";
          setError(msg);
          setIsLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      session,
      role: session?.role ?? "learner",
      locale,
      isLoading,
      error,
      changeLocale: (next) => {
        setLocale(next);
        setLocaleState(next);
        if (typeof document !== "undefined") document.documentElement.lang = next;
      },
      signIn: (username) => {
        const acct = demoAccounts.find((a) => a.username === username.trim().toLowerCase());
        if (!acct) return false;
        try {
          sessionStorage.removeItem("edvidura_signed_out");
        } catch {}
        queryClient.clear();
        _lastResolvedSession = null;
        _codeExchangeCache.clear();
        setSession({ name: acct.name, username: acct.username, role: acct.role });
        return true;
      },
      signOut: () => {
        const returnUrl =
          session?.lmsReturnUrl ||
          (typeof window !== "undefined" ? sessionStorage.getItem("edvidura_return_url") : null) ||
          "http://localhost:8085/course/view.php?id=10";
        try {
          sessionStorage.setItem("edvidura_signed_out", "true");
          sessionStorage.setItem("edvidura_return_url", returnUrl);
          localStorage.removeItem("edvidura_token");
          sessionStorage.removeItem("edvidura_token");
        } catch {}
        setBearerToken(null);
        setSession(null);
        _lastResolvedSession = null;
        _codeExchangeCache.clear();
        queryClient.clear();
        fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          keepalive: true,
        }).catch(() => {});
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      },
    }),
    [session, locale, isLoading, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRole() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRole outside RoleProvider");
  return v;
}
