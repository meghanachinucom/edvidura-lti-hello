import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Wrench, Building2 } from "lucide-react";
import { useRole } from "@/components/shell/RoleContext";
import { demoAccounts } from "@/data/accounts";
import { t } from "@/i18n";
import type { Role } from "@/data/people";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: t("SH-01.title") }, { name: "description", content: t("SH-01.lead") }] }),
  component: Landing,
});

const ROLES: { role: Role; Icon: typeof BookOpen }[] = [
  { role: "learner", Icon: BookOpen }, { role: "instructor", Icon: GraduationCap }, { role: "trainingOfficer", Icon: Building2 },
];

function Landing() {
  const { signIn } = useRole();
  const navigate = useNavigate();
  const enter = (r: Role) => {
    const account = demoAccounts.find((a) => a.role === r);
    if (account && signIn(account.username)) navigate({ to: "/launch-hub" });
  };
  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <a href="#main" className="skip-link">{t("app.skip")}</a>
      <header className="flex items-center justify-between px-4 py-4"><p className="font-heading text-[22px] font-bold text-ink">{t("app.name")}</p><Link to="/login" className="btn-primary">{t("SH-01.signIn")}</Link></header>
      <main id="main" className="w-full flex-1">
        <section className="landing-hero relative overflow-hidden px-4 py-16 text-center text-white tablet:py-24">
          <Wrench aria-hidden className="absolute right-[8%] top-1/2 size-40 -translate-y-1/2 rotate-[-24deg] opacity-10 tablet:size-64" />
          <div className="relative mx-auto max-w-content"><h1 className="font-heading text-[32px] font-extrabold tracking-[-0.02em] tablet:text-[48px]">{t("SH-01.title")}</h1><p className="mx-auto mt-4 max-w-reading text-lg text-white/80">{t("SH-01.lead")}</p><div aria-hidden className="mx-auto mt-5 h-0.5 w-12 rounded-full bg-button-main" /></div>
        </section>
        <ul aria-label={t("SH-01.rolesLabel")} className="mx-auto grid w-full max-w-content gap-4 px-4 py-10 text-left tablet:grid-cols-3 tablet:py-14">
          {ROLES.map(({ role, Icon }) => <li key={role} className="role-card flex flex-col rounded-surface border border-border bg-surface p-5">
            <Icon aria-hidden size={30} className="text-secondary" />
            <h2 className="mt-3 font-heading text-[18px] text-ink">{t(`roles.${role}`)}</h2>
            <p className="mt-2 flex-1 text-ink">{t(`SH-01.${role}`)}</p>
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => enter(role)}>{t(`SH-01.enter_${role}`)}</button>
          </li>)}
        </ul>
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-sm text-ink-muted">{t("app.footer")}</footer>
    </div>
  );
}
