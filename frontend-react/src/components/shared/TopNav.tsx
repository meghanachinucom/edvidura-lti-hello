import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Library,
  Lightbulb,
  ListChecks,
  Menu,
  MessageCircle,
  Radio,
  School,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
  LogOut,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { t, useLocale } from "@/i18n";
import { roleNavItems } from "@/data/nav";
import { useRole } from "@/components/shell/RoleContext";
import { LanguageSelector } from "@/components/shared/VoiceControls";

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
  useLocale();
  const { session, signOut, role } = useRole();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = roleNavItems[role];
  const active = [...navItems]
    .filter(({ to }) => pathname === to || pathname.startsWith(`${to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-40 inline-flex size-11 items-center justify-center rounded-control border border-border bg-surface text-ink shadow-sm tablet:hidden"
        aria-label={mobileOpen ? t("sidebar.closeMenu") : t("sidebar.openMenu")}
        aria-expanded={mobileOpen}
        aria-controls="role-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X aria-hidden size={20} /> : <Menu aria-hidden size={22} />}
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 tablet:hidden"
          aria-label={t("sidebar.closeMenu")}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-surface text-ink shadow-sm transition-transform duration-200 tablet:translate-x-0 tablet:w-[72px] desktop:w-60`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-teal-50/60 via-surface to-surface px-4 tablet:justify-center tablet:px-0 desktop:justify-start desktop:px-4">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="group flex items-center gap-2.5 tablet:hidden desktop:flex"
            title="EdVidura"
          >
            <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 via-secondary to-teal-800 text-white font-heading font-extrabold text-[15px] shadow-sm ring-2 ring-secondary/25 transition-all duration-200 group-hover:scale-105 group-hover:ring-secondary/40">
              EV
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-heading text-[18px] font-extrabold tracking-tight text-slate-900 group-hover:text-secondary transition-colors leading-none">
                EdVidura
              </span>
              <span className="text-[11px] font-bold tracking-wider uppercase text-secondary/90 mt-1">
                Learning Platform
              </span>
            </div>
          </Link>
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="hidden tablet:flex desktop:hidden items-center justify-center"
            title="EdVidura"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 via-secondary to-teal-800 text-white font-heading font-extrabold text-base shadow-sm ring-2 ring-secondary/25">
              EV
            </div>
          </Link>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-control text-ink tablet:hidden"
            aria-label={t("sidebar.closeMenu")}
            onClick={() => setMobileOpen(false)}
          >
            <X aria-hidden size={20} />
          </button>
        </div>
        <nav
          id="role-navigation"
          aria-label={t("nav.primary")}
          className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5 tablet:px-1.5 desktop:px-2.5"
        >
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = routeIcons[item.to] ?? FileText;
              const selected = active?.to === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={selected ? "page" : undefined}
                    title={t(item.labelKey)}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex min-h-[40px] items-center gap-2.5 rounded-lg border-l-[3.5px] px-3 py-1.5 text-[14.5px] leading-snug transition-all duration-150 tablet:justify-center tablet:gap-0 tablet:px-0 desktop:justify-start desktop:gap-2.5 desktop:px-3 ${selected ? "border-l-secondary bg-teal-500/12 font-bold text-teal-900 shadow-xs" : "border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium"}`}
                  >
                    <Icon
                      aria-hidden
                      size={19}
                      className={`shrink-0 transition-colors ${selected ? "text-teal-700 stroke-[2.25]" : "text-slate-500 stroke-2 group-hover:text-slate-700"}`}
                    />
                    <span className="tablet:hidden desktop:inline">{t(item.labelKey)}</span>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-control bg-topbar px-3 py-2 text-xs text-white shadow-md tablet:group-hover:block tablet:group-focus-visible:block desktop:hidden"
                    >
                      {t(item.labelKey)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="shrink-0 border-t border-border bg-surface p-2.5 tablet:px-1.5 desktop:p-3">
          <div className="mb-2 px-1 tablet:hidden desktop:block">
            <LanguageSelector className="w-full justify-between" />
          </div>
          <div className="mb-2.5 px-2 text-[14px] font-bold text-slate-800 tablet:hidden desktop:block">
            <div className="truncate">{session?.name}</div>
            <div className="text-xs font-semibold text-slate-500">{t(`roles.${role}`)}</div>
          </div>
          <a
            className="group relative flex min-h-9 items-center rounded-lg px-2 text-[13.5px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium tablet:justify-center tablet:px-0 desktop:justify-start desktop:px-2"
            title={
              session?.lmsReturnUrl?.includes("localhost:8085")
                ? t("nav.backToMoodle")
                : "Switch Persona / Review Portal"
            }
            href={
              session?.lmsReturnUrl?.includes("localhost:8085") ? session.lmsReturnUrl : "/review"
            }
            onClick={(e) => {
              e.preventDefault();
              const dest = session?.lmsReturnUrl?.includes("localhost:8085")
                ? session.lmsReturnUrl
                : "/review";
              window.location.href = dest;
            }}
          >
            <ArrowLeft aria-hidden size={17} className="hidden tablet:block desktop:hidden" />
            <span className="tablet:hidden desktop:inline">
              {session?.lmsReturnUrl?.includes("localhost:8085")
                ? t("nav.backToMoodle")
                : "Review Portal / Personas"}
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-control bg-topbar px-3 py-2 text-xs text-white shadow-md tablet:group-hover:block tablet:group-focus-visible:block desktop:hidden"
            >
              {session?.lmsReturnUrl?.includes("localhost:8085")
                ? t("nav.backToMoodle")
                : "Review Portal / Personas"}
            </span>
          </a>
          <button
            type="button"
            className="group relative flex min-h-9 w-full items-center rounded-lg px-2 text-left text-[13.5px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium tablet:justify-center tablet:px-0 desktop:justify-start desktop:px-2"
            title={t("nav.signOut")}
            onClick={() => {
              signOut();
            }}
          >
            <LogOut aria-hidden size={17} className="hidden tablet:block desktop:hidden" />
            <span className="tablet:hidden desktop:inline">{t("nav.signOut")}</span>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-control bg-topbar px-3 py-2 text-xs text-white shadow-md tablet:group-hover:block tablet:group-focus-visible:block desktop:hidden"
            >
              {t("nav.signOut")}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
