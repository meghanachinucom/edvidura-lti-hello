import { Link, useLocation } from "@tanstack/react-router";
import { t } from "@/i18n";
import { roleNavItems } from "@/data/nav";
import { useRole } from "@/components/shell/RoleContext";

export function TopNav() {
  const { session, signOut, role } = useRole();
  const { pathname } = useLocation();
  const navItems = roleNavItems[role];
  const active = [...navItems].filter(({ to }) => pathname === to || pathname.startsWith(`${to}/`)).sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <header className="sticky top-0 z-30 border-b border-white/15 bg-topbar text-white shadow-sm">
      <div className="flex min-h-14 items-center gap-4 px-4">
        <Link to="/" className="shrink-0 font-heading text-xl font-bold text-white">EdVidura</Link>
        <span className="shrink-0 rounded-full border border-white/30 px-2 py-1 text-xs text-white">{t(`roles.${role}`)}</span>
        <nav aria-label={t("nav.primary")} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
          {navItems.map((item) => <Link key={item.to} to={item.to} aria-current={active?.to === item.to ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center border-b-2 px-2 text-sm text-white ${active?.to === item.to ? "border-secondary font-bold" : "border-transparent font-normal"}`}>
            {t(item.labelKey)}
          </Link>)}
        </nav>
        <div className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm">
          <span className="hidden md:inline">{session?.name}</span>
          <a className="min-h-11 inline-flex items-center text-white underline-offset-4 hover:underline" href="/">{t("nav.backToMoodle")}</a>
          <a className="min-h-11 inline-flex items-center text-white underline-offset-4 hover:underline" href="/login" onClick={() => signOut()}>{t("nav.signOut")}</a>
        </div>
      </div>
    </header>
  );
}
