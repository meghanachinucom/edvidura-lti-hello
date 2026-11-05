import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TopNav } from "@/components/shared/TopNav";
import { SessionExpired } from "@/components/shared/SessionExpired";
import { isSessionExpired, screenState } from "@/data/mockState";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { t } from "@/i18n";
import { accessPage, allowedFor, roleHome } from "@/data/nav";
import { AskViduraPanel } from "@/components/learner/AskViduraPanel";
import { useRole } from "./RoleContext";

export function AppShell() {
  const { session, role } = useRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!session) void navigate({ to: "/login", replace: true });
  }, [session, navigate]);
  useEffect(() => {
    if (session && pathname !== accessPage && !allowedFor(role, pathname)) {
      void navigate({ to: accessPage, replace: true });
    }
  }, [session, role, pathname, navigate]);
  if (!session) return null;
  if (isSessionExpired(pathname)) return <main id="main"><SessionExpired /></main>;
  const blocked = pathname === accessPage || screenState(pathname) === "unavailable";
  return (
    <div className="min-h-screen bg-page-bg">
      <a href="#main" className="skip-link">{t("app.skip")}</a>
      <TopNav />
      <div className="min-h-screen pt-0 tablet:pl-[72px] desktop:pl-60">
        <main id="main" className="min-h-[calc(100vh-56px)]">
          {blocked ? <AccessUnavailable back={{ to: roleHome[role], label: t("SH-03.back") }} /> : <Outlet />}
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-sm text-ink-muted">{t("app.footer")}</footer>
      </div>
      {role === "learner" && !blocked && <AskViduraPanel />}
    </div>
  );
}
