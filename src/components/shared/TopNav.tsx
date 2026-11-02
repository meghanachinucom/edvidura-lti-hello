import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { t } from "@/i18n";
import { roleNavItems } from "@/data/nav";
import { localeNames, type Locale } from "@/i18n/locales";
import { useRole } from "@/components/shell/RoleContext";

export function TopNav() {
  const { session, signOut, role, locale, changeLocale } = useRole();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = roleNavItems[role];
  const active = [...navItems].filter(({ to }) => pathname === to || pathname.startsWith(`${to}/`)).sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <header className="app-top-nav sticky top-0 z-30 border-b border-white/15 text-white shadow-sm">
      <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 px-3 py-2 desktop:flex desktop:min-h-14 desktop:flex-nowrap desktop:gap-4 desktop:px-4 desktop:py-0">
        <Link to="/" className="shrink-0 font-heading text-xl font-bold text-white">EdVidura</Link>
        <span className="shrink-0 justify-self-start rounded-full border border-white/30 px-2 py-1 text-xs text-white">{t(`roles.${role}`)}</span>
        <button type="button" className="inline-flex size-11 items-center justify-center justify-self-end rounded-surface border border-white/30 text-white desktop:hidden"
          aria-label={t("nav.primary")} aria-expanded={mobileOpen} aria-controls="role-navigation" onClick={() => setMobileOpen((open) => !open)}>
          {mobileOpen ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
        </button>
        <nav id="role-navigation" aria-label={t("nav.primary")}
          className={`${mobileOpen ? "grid" : "hidden"} absolute left-0 right-0 top-full z-40 grid-cols-2 gap-1 border-b border-white/15 bg-topbar p-3 shadow-lg desktop:static desktop:z-auto desktop:order-none desktop:flex desktop:min-w-0 desktop:flex-1 desktop:flex-wrap desktop:gap-1 desktop:overflow-visible desktop:border-0 desktop:bg-transparent desktop:p-0 desktop:shadow-none`}>
          {navItems.map((item) => <Link key={item.to} to={item.to} aria-current={active?.to === item.to ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
            className={`flex min-h-11 min-w-0 items-center rounded-surface border-b-[3px] px-2 text-xs text-white desktop:shrink-0 desktop:px-2 desktop:text-sm ${active?.to === item.to ? "border-secondary bg-white/10 font-bold" : "border-transparent font-normal hover:bg-white/5"}`}>
            {t(item.labelKey)}
          </Link>)}
        </nav>
        <div className="col-span-3 row-start-2 flex min-w-0 items-center justify-end gap-2 whitespace-nowrap text-xs desktop:col-span-1 desktop:row-auto desktop:ml-auto desktop:gap-3 desktop:text-sm">
          <label className="sr-only" htmlFor="top-nav-language">Language</label>
          <select id="top-nav-language" value={locale} onChange={(event) => changeLocale(event.target.value as Locale)} className="min-h-10 max-w-24 rounded-surface border border-white/40 bg-topbar px-2 text-white">
            {(Object.entries(localeNames) as [Locale, string][]).map(([code, name]) => <option key={code} value={code} className="bg-surface text-ink">{name}</option>)}
          </select>
          <span className="hidden desktop:inline">{session?.name}</span>
          <a className="inline-flex min-h-11 items-center text-white underline-offset-4 hover:underline" href="/">{t("nav.backToMoodle")}</a>
          <a className="inline-flex min-h-11 items-center text-white underline-offset-4 hover:underline" href="/login" onClick={() => signOut()}>{t("nav.signOut")}</a>
        </div>
      </div>
    </header>
  );
}
