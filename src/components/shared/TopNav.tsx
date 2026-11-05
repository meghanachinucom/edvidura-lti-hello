import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity, BarChart3, BookOpen, Building2, ClipboardCheck, ClipboardList, FileText, GraduationCap,
  Library, Lightbulb, ListChecks, Menu, MessageCircle, Radio, School, Settings2, ShieldCheck,
  Sparkles, Users, Video, X, LogOut, ArrowLeft, type LucideIcon,
} from "lucide-react";
import { t } from "@/i18n";
import { roleNavItems } from "@/data/nav";
import { useRole } from "@/components/shell/RoleContext";

const routeIcons: Record<string, LucideIcon> = {
  "/lessons": BookOpen,
  "/active-quizzes": ClipboardList,
  "/learn/gap": ListChecks,
  "/learn/coach": MessageCircle,
  "/learn/flashcards": ClipboardCheck,
  "/learn/micro": Video,
  "/manuals": Library,
  "/learn/analytics": BarChart3,
  "/learn/activity": Activity,
  "/teacher/attempts": ClipboardCheck,
  "/teacher/content": FileText,
  "/teacher/analytics": BarChart3,
  "/teacher/activity": Activity,
  "/teacher/manuals": Library,
  "/lti-integration": Radio,
  "/teacher/ai": Sparkles,
  "/teacher/coach/insights": Lightbulb,
  "/teacher/coach/shortcuts": MessageCircle,
  "/teacher/skills": GraduationCap,
  "/teacher/sme": ShieldCheck,
  "/teacher/dct": Video,
  "/student-directory": Users,
  "/institutions": Building2,
  "/school-admin": School,
  "/school-admin/teachers": GraduationCap,
  "/school-admin/classes": Users,
  "/school-admin/students": Users,
  "/school-admin/analytics": BarChart3,
  "/school-admin/activity": Activity,
  "/institution-detail": Settings2,
};

export function TopNav() {
  const { session, signOut, role } = useRole();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = roleNavItems[role];
  const active = [...navItems].filter(({ to }) => pathname === to || pathname.startsWith(`${to}/`)).sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <>
      <button type="button" className="fixed left-3 top-3 z-40 inline-flex size-11 items-center justify-center rounded-control border border-border bg-surface text-ink shadow-sm tablet:hidden" aria-label={mobileOpen ? t("sidebar.closeMenu") : t("sidebar.openMenu")} aria-expanded={mobileOpen} aria-controls="role-navigation" onClick={() => setMobileOpen((open) => !open)}>
        {mobileOpen ? <X aria-hidden size={20} /> : <Menu aria-hidden size={22} />}
      </button>
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-ink/40 tablet:hidden" aria-label={t("sidebar.closeMenu")} onClick={() => setMobileOpen(false)} />}
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-surface text-ink shadow-sm transition-transform duration-200 tablet:translate-x-0 tablet:w-[72px] desktop:w-60`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 tablet:justify-center tablet:px-0 desktop:justify-start desktop:px-5">
          <Link to="/" onClick={() => setMobileOpen(false)} className="font-heading text-xl font-extrabold text-secondary tablet:hidden desktop:block">EdVidura</Link>
          <span aria-hidden className="hidden font-heading text-xl font-extrabold text-secondary tablet:block desktop:hidden">E</span>
          <button type="button" className="inline-flex size-11 items-center justify-center rounded-control text-ink tablet:hidden" aria-label={t("sidebar.closeMenu")} onClick={() => setMobileOpen(false)}>
            <X aria-hidden size={20} />
          </button>
        </div>
        <nav id="role-navigation" aria-label={t("nav.primary")} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 tablet:px-2 desktop:px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = routeIcons[item.to] ?? FileText;
              const selected = active?.to === item.to;
              return (
                <li key={item.to}>
                  <Link to={item.to} aria-current={selected ? "page" : undefined} title={t(item.labelKey)} onClick={() => setMobileOpen(false)}
                    className={`group relative flex min-h-11 items-center gap-3 rounded-control border-l-[3px] px-3 text-sm font-semibold text-ink transition-colors duration-150 tablet:justify-center tablet:gap-0 tablet:px-0 desktop:justify-start desktop:gap-3 desktop:px-3 ${selected ? "border-l-secondary bg-secondary-container font-bold text-secondary" : "border-l-transparent hover:bg-page-bg"}`}>
                    <Icon aria-hidden size={20} className="shrink-0" />
                    <span className="tablet:hidden desktop:inline">{t(item.labelKey)}</span>
                    <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-control bg-topbar px-3 py-2 text-xs text-white shadow-md tablet:group-hover:block tablet:group-focus-visible:block desktop:hidden">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="shrink-0 border-t border-border bg-surface p-3 tablet:px-2 desktop:p-4">
          <div className="mb-3 px-2 text-sm font-semibold text-ink tablet:hidden desktop:block">
            <div className="truncate">{session?.name}</div>
            <div className="font-semibold text-ink-muted">{t(`roles.${role}`)}</div>
          </div>
          <a className="group relative flex min-h-11 items-center rounded-control px-2 text-sm text-ink hover:bg-page-bg tablet:justify-center tablet:px-0 desktop:justify-start desktop:px-2" title={t("nav.backToMoodle")} href="/">
            <ArrowLeft aria-hidden size={18} className="hidden tablet:block desktop:hidden" /><span className="tablet:hidden desktop:inline">{t("nav.backToMoodle")}</span>
            <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-control bg-topbar px-3 py-2 text-xs text-white shadow-md tablet:group-hover:block tablet:group-focus-visible:block desktop:hidden">{t("nav.backToMoodle")}</span>
          </a>
          <a className="group relative flex min-h-11 items-center rounded-control px-2 text-sm text-ink hover:bg-page-bg tablet:justify-center tablet:px-0 desktop:justify-start desktop:px-2" title={t("nav.signOut")} href="/login" onClick={() => signOut()}>
            <LogOut aria-hidden size={18} className="hidden tablet:block desktop:hidden" /><span className="tablet:hidden desktop:inline">{t("nav.signOut")}</span>
            <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-control bg-topbar px-3 py-2 text-xs text-white shadow-md tablet:group-hover:block tablet:group-focus-visible:block desktop:hidden">{t("nav.signOut")}</span>
          </a>
        </div>
      </aside>
    </>
  );
}
