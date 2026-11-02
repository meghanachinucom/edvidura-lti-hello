import { Link, useLocation } from "@tanstack/react-router";
import { t } from "@/i18n";
import { roleNavItems } from "@/data/nav";
import { localeNames, type Locale } from "@/i18n/locales";
import { useRole } from "@/components/shell/RoleContext";

export function TopNav() {
  const { session, signOut, role, locale, changeLocale } = useRole();
  const { pathname } = useLocation();
  const navItems = roleNavItems[role];
  const active = [...navItems].filter(({ to }) => pathname === to || pathname.startsWith(`${to}/`)).sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <header className="app-top-nav sticky top-0 z-30 border-b border-white/15 text-white shadow-sm">
      <div className="flex min-h-14 flex-wrap items-center gap-2 px-3 tablet:flex-nowrap tablet:gap-4 tablet:px-4">
        <Link to="/" className="shrink-0 font-heading text-xl font-bold text-white">EdVidura</Link>
        <span className="shrink-0 rounded-full border border-white/30 px-2 py-1 text-xs text-white">{t(`roles.${role}`)}</span>
        <nav aria-label={t("nav.primary")} className="order-last flex min-w-0 basis-full flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap tablet:order-none tablet:basis-auto">
          {navItems.map((item) => <Link key={item.to} to={item.to} aria-current={active?.to === item.to ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center border-b-[3px] px-3 text-sm text-white ${active?.to === item.to ? "border-secondary bg-white/10 font-bold" : "border-transparent font-normal hover:bg-white/5"}`}>
            {t(item.labelKey)}
          </Link>)}
        </nav>
        <div className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm">
          <label className="sr-only" htmlFor="top-nav-language">Language</label>
          <select id="top-nav-language" value={locale} onChange={(event) => changeLocale(event.target.value as Locale)} className="min-h-10 max-w-24 rounded-surface border border-white/40 bg-topbar px-2 text-white">
            {(Object.entries(localeNames) as [Locale, string][]).map(([code, name]) => <option key={code} value={code} className="bg-surface text-ink">{name}</option>)}
          </select>
          <span className="hidden md:inline">{session?.name}</span>
          <a className="min-h-11 inline-flex items-center text-white underline-offset-4 hover:underline" href="/">{t("nav.backToMoodle")}</a>
          <a className="min-h-11 inline-flex items-center text-white underline-offset-4 hover:underline" href="/login" onClick={() => signOut()}>{t("nav.signOut")}</a>
        </div>
      </div>
    </header>
  );
}
