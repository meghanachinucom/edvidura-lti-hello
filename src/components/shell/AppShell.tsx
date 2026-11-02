import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { SessionExpired } from "@/components/shared/SessionExpired";
import { isSessionExpired, screenState } from "@/data/mockState";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { t } from "@/i18n";
import { accessPage, allowedFor, roleHome, roleNavItems } from "@/data/nav";
import { AskViduraPanel } from "@/components/learner/AskViduraPanel";
import { useRole } from "./RoleContext";

function TopBar() {
  const { session, signOut, role } = useRole();
  const { pathname } = useLocation();
  const navItems = roleNavItems[role];
  const active = [...navItems]
    .filter(({ to }) => pathname === to || pathname.startsWith(`${to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <header className="sticky top-0 z-30 border-b border-white/15 bg-[#17313A] text-white shadow-sm">
      <div className="flex min-h-14 items-center gap-4 px-4">
        <Link to="/" className="shrink-0 font-heading text-xl font-bold text-white">EdVidura</Link>
        <span className="shrink-0 rounded-full border border-white/30 px-2 py-1 text-xs text-white">{t(`roles.${role}`)}</span>
        <nav aria-label={t("nav.primary")} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active?.to === item.to ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center border-b-2 px-2 text-sm text-white ${active?.to === item.to ? "border-[#0F6E6E] font-bold" : "border-transparent font-normal"}`}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm">
          <span className="hidden md:inline">{session?.name}</span>
          <a className="min-h-11 inline-flex items-center text-white underline-offset-4 hover:underline" href="/">{t("nav.backToMoodle")}</a>
          <a
            className="min-h-11 inline-flex items-center text-white underline-offset-4 hover:underline"
            href="/login"
            onClick={() => signOut()}
          >
            {t("nav.signOut")}
          </a>
        </div>
      </div>
    </header>
  );
}

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
    <div className="flex min-h-screen flex-col bg-page-bg">
      <a href="#main" className="skip-link">{t("app.skip")}</a>
      <TopBar />
      <main id="main" className="flex-1">
        {blocked ? <AccessUnavailable back={{ to: roleHome[role], label: t("SH-03.back") }} /> : <Outlet />}
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-sm text-ink-muted">{t("app.footer")}</footer>
      {role === "learner" && !blocked && <AskViduraPanel />}
    </div>
  );
}
