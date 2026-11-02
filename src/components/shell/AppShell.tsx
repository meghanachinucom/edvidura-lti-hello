import { useEffect, useRef, useState, type ReactNode } from "react";
import { Outlet } from "@tanstack/react-router";
import { useFocusTrap } from "@/components/shared/useFocusTrap";
import { SessionExpired } from "@/components/shared/SessionExpired";
import { isSessionExpired, screenState } from "@/data/mockState";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BarChart3, BookOpen, BookText, ClipboardList, FileText, GraduationCap, Home, Link2, MessageCircle, Sparkles, Users, ChevronDown, Menu, X } from "lucide-react";
import { BottomTabBar, type TabItem } from "@/components/shared/BottomTabBar";
import { t } from "@/i18n";
import { navGroups, groupsForRole, type NavGroup } from "@/data/nav";
import type { Role } from "@/data/people";
import { AskViduraPanel } from "@/components/learner/AskViduraPanel";
import { useRole } from "./RoleContext";
import { demoAccounts } from "@/data/accounts";

const TAB_DEFS: Record<Role, { to: string; key: string; icon: TabItem["icon"] }[]> = {
  learner: [
    { to: "/launch-hub", key: "home", icon: Home },
    { to: "/lessons", key: "lessons", icon: BookOpen },
    { to: "/active-quizzes", key: "quiz", icon: ClipboardList },
    { to: "/learn/coach", key: "askVidura", icon: MessageCircle },
    { to: "/manuals", key: "ebooks", icon: BookText },
  ],
  instructor: [
    { to: "/launch-hub", key: "home", icon: Home },
    { to: "/teacher/attempts", key: "results", icon: BarChart3 },
    { to: "/teacher/content", key: "content", icon: FileText },
    { to: "/teacher/ai", key: "aiTools", icon: Sparkles },
    { to: "/teacher/coach/insights", key: "coach", icon: MessageCircle },
  ],
  trainingOfficer: [
    { to: "/launch-hub", key: "home", icon: Home },
    { to: "/school-admin/teachers", key: "teachers", icon: Users },
    { to: "/school-admin/classes", key: "classes", icon: Link2 },
    { to: "/school-admin/students", key: "students", icon: GraduationCap },
    { to: "/school-admin/analytics", key: "analytics", icon: BarChart3 },
  ],
};

const SWITCH_ROLES: Role[] = ["learner", "instructor", "trainingOfficer"];

// M1 guards: which signed-in roles may open which route areas.
const TEACH_PREFIXES = ["/teacher", "/lti-integration", "/student-directory", "/institutions"];
const ADMIN_PREFIXES = ["/school-admin", "/institution-detail"];

function allowedFor(role: Role, path: string): boolean {
  if (ADMIN_PREFIXES.some((p) => path.startsWith(p))) return role === "trainingOfficer";
  if (TEACH_PREFIXES.some((p) => path.startsWith(p))) return role !== "learner";
  return true;
}

function useIsActive() {
  const { pathname } = useLocation();
  return (to: string) => pathname === to;
}

function Dropdown({ label, children, align = "left" }: { label: ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button ref={btn} type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="nav-btn">
        {label}
        <ChevronDown aria-hidden size={16} />
      </button>
      {open && (
        <div className={`absolute top-full z-30 mt-1 min-w-60 rounded-surface border border-border bg-surface-raised p-1 shadow-sm ${align === "right" ? "right-0" : "left-0"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function GroupLinks({ group, onNavigate }: { group: NavGroup; onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <ul>
      {group.items.map((it) => (
        <li key={it.to}>
          <Link to={it.to} onClick={onNavigate} aria-current={isActive(it.to) ? "page" : undefined} className="nav-link">
            {t(it.labelKey)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AccountPanel({ onDone }: { onDone?: () => void }) {
  const { session, signOut, signIn } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!session) return null;
  const switchTo = (r: Role) => {
    const acct = demoAccounts.find((a) => a.role === r);
    if (!acct || !signIn(acct.username)) return;
    onDone?.();
    if (!allowedFor(r, pathname)) void navigate({ to: "/launch-hub" });
  };
  return (
    <div className="p-2">
      <p className="font-medium text-ink">{session.name}</p>
      <p className="text-sm text-ink-muted">{t(`roles.${session.role}`)}</p>
      <p className="mt-3 text-sm font-semibold text-ink-muted">{t("commandBar.switchRole")}</p>
      <div className="mt-1 grid gap-1">
        {SWITCH_ROLES.map((r) => (
          <button key={r} type="button" aria-pressed={session.role === r} className="nav-btn justify-start" onClick={() => switchTo(r)}>
            {t(`roles.${r}`)}
          </button>
        ))}
      </div>
      <button type="button" className="btn-secondary mt-3 w-full">{t("nav.backToMoodle")}</button>
      <button
        type="button"
        className="btn-secondary mt-2 w-full"
        onClick={() => { signOut(); onDone?.(); navigate({ to: "/login", replace: true }); }}
      >
        {t("nav.signOut")}
      </button>
    </div>
  );
}

function MobilePanel({ onClose }: { onClose: () => void }) {
  const { role } = useRole();
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={t("nav.menu")} className="fixed inset-0 z-40 overflow-y-auto bg-surface p-4">
      <div className="flex justify-end">
        <button type="button" onClick={onClose} aria-label={t("nav.closeMenu")} className="icon-btn"><X aria-hidden /></button>
      </div>
      {groupsForRole[role].map((g) => (
        <section key={g} className="mt-4">
          <h2 className="px-3 text-sm font-semibold text-ink-muted">{t(navGroups[g].labelKey)}</h2>
          <GroupLinks group={navGroups[g]} onNavigate={onClose} />
        </section>
      ))}
      <section className="mt-6 border-t border-border pt-4">
        <h2 className="px-2 text-sm font-semibold text-ink-muted">{t("nav.account")}</h2>
        <AccountPanel onDone={onClose} />
      </section>
    </div>
  );
}

function TopBar() {
  const { role } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const close = () => setMobileOpen(false);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-content items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-heading text-[22px] font-bold text-ink">{t("app.name")}</Link>
          <span className="hidden rounded-full border border-border px-2 py-0.5 text-xs uppercase text-ink-muted tablet:inline">{t("commandBar.context")}</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-ink">{t(`roles.${role}`)}</span>
        </div>
        <nav aria-label={t("nav.primary")} className="hidden flex-1 items-center justify-center gap-1 min-[980px]:flex">
          {groupsForRole[role].map((g) => {
            const group = navGroups[g];
            const active = group.items.some((i) => i.to === pathname);
            return (
              <Dropdown key={g} label={<span className={active ? "nav-active" : undefined}>{t(group.labelKey)}</span>}>
                {(c) => <GroupLinks group={navGroups[g]} onNavigate={c} />}
              </Dropdown>
            );
          })}
        </nav>
        <div className="hidden items-center gap-1 min-[980px]:flex">
          <Dropdown align="right" label={t("nav.account")}>{(c) => <AccountPanel onDone={c} />}</Dropdown>
        </div>
        <button ref={menuBtn} type="button" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="nav-btn min-[980px]:hidden">
          <Menu aria-hidden size={20} />{t("nav.menu")}
        </button>
      </div>
      {mobileOpen && <MobilePanel onClose={close} />}
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
  if (!session) return null;
  if (isSessionExpired(pathname)) return <main id="main"><SessionExpired /></main>;
  const blocked = !allowedFor(role, pathname);
  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <a href="#main" className="skip-link">{t("app.skip")}</a>
      <TopBar />
      <main id="main" className="flex-1">
        {blocked || screenState(pathname) === "unavailable" ? <AccessUnavailable /> : <Outlet />}
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-sm text-ink-muted">{t("app.footer")}</footer>
      <div className="h-14 tablet:hidden" aria-hidden />
      <BottomTabBar items={TAB_DEFS[role].map((x) => ({ to: x.to, label: t(`shellTabs.${x.key}`), icon: x.icon }))} />
      {role === "learner" && !blocked && <AskViduraPanel />}
    </div>
  );
}
