import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/shared/TopNav";
import { SessionExpired } from "@/components/shared/SessionExpired";
import { isSessionExpired, screenState } from "@/data/mockState";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { t, useLocale } from "@/i18n";
import { accessPage, allowedFor, roleHome } from "@/data/nav";
import { AskViduraPanel } from "@/components/learner/AskViduraPanel";
import { useRole } from "./RoleContext";

export function AppShell() {
  useLocale();
  const { session, role, isLoading } = useRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !session) {
      void navigate({ to: "/", replace: true });
    }
  }, [isLoading, session, navigate]);

  const isUnauthorized = !session || !role || !allowedFor(role, pathname);
  const isExpired = Boolean(session && isSessionExpired(pathname));
  const isUnavailable = pathname === accessPage || screenState(pathname) === "unavailable";
  const blocked = isUnauthorized || isUnavailable;

  useEffect(() => {
    if (!isLoading && session && isUnauthorized && pathname !== accessPage) {
      void navigate({ to: accessPage, replace: true });
    }
  }, [isLoading, session, isUnauthorized, pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-ink-muted">Loading session...</span>
        </div>
      </div>
    );
  }

  // State 2: Unauthenticated after init - explicit redirect fallback to locked-down landing
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page-bg">
        <div className="flex flex-col items-center gap-3 text-center p-6">
          <span className="text-sm font-semibold text-ink-muted">Redirecting to Moodle LMS launch...</span>
          <a href="/" className="text-sm text-secondary hover:underline">
            Click here if not redirected
          </a>
        </div>
      </div>
    );
  }

  // State 3: Authenticated with expired session
  if (isExpired) {
    return (
      <main id="main">
        <SessionExpired />
      </main>
    );
  }

  // State 4: Authenticated with unknown role - fail closed
  if (!role || !(role in roleHome)) {
    return (
      <main id="main" className="min-h-screen flex items-center justify-center bg-page-bg">
        <AccessUnavailable back={{ to: "/", label: t("SH-03.back") }} />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <a href="#main" className="skip-link">
        {t("app.skip")}
      </a>
      <TopNav />
      <div className="min-h-screen pt-0 tablet:pl-[72px] desktop:pl-60">
        <main id="main" className="min-h-[calc(100vh-56px)]">
          {blocked ? (
            <AccessUnavailable back={{ to: roleHome[role], label: t("SH-03.back") }} />
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-sm text-ink-muted">
          {t("app.footer")}
        </footer>
      </div>
      {role === "learner" && !blocked && <AskViduraPanel />}
    </div>
  );
}
