import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRole } from "@/components/shell/RoleContext";
import { demoAccounts } from "@/data/accounts";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import type { Role } from "@/data/people";

// SH-01 Landing. Role cards sign in a demo account and open the launch hub. Sits outside the signed-in shell.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: t("SH-01.title") },
      { name: "description", content: t("SH-01.lead") },
      { property: "og:title", content: t("SH-01.title") },
      { property: "og:description", content: t("SH-01.lead") },
    ],
  }),
  component: Landing,
});

const ROLES: Role[] = ["learner", "instructor", "trainingOfficer"];

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
      <header className="flex items-center justify-between px-4 py-4">
        <p className="font-heading text-[22px] font-bold text-ink">{t("app.name")}</p>
        <Link to="/login" className="btn-primary">{t("SH-01.signIn")}</Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-10 text-center">
        <PageHeading titleKey="SH-01.title" />
        <p className="mx-auto mt-3 max-w-reading text-[18px] text-ink-muted">{t("SH-01.lead")}</p>
        <ul aria-label={t("SH-01.rolesLabel")} className="mt-10 grid gap-4 text-left tablet:grid-cols-3">
          {ROLES.map((r) => (
            <li key={r} className="rounded-surface border border-border bg-surface p-5">
              <h2 className="font-heading text-[18px] text-ink">{t(`roles.${r}`)}</h2>
              <p className="mt-2 text-ink">{t(`SH-01.${r}`)}</p>
              <button type="button" className="btn-primary mt-4 w-full" onClick={() => enter(r)}>
                {t(`SH-01.enter_${r}`)}
              </button>
            </li>
          ))}
        </ul>
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-sm text-ink-muted">{t("app.footer")}</footer>
    </div>
  );
}
