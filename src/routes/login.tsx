import { useState, type FormEvent } from "react";
import { BookOpen, Building2, GraduationCap, Wrench } from "lucide-react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { useRole } from "@/components/shell/RoleContext";
import { demoAccounts } from "@/data/accounts";

// M1 sign-in. Mock only: any password of 1+ characters is accepted; session lives in React state.
export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: t("M1.title") + t("app.titleSuffix") },
      { name: "description", content: t("M1.lead") },
      { property: "og:title", content: t("M1.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("M1.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const { session, signIn } = useRole();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<"empty" | "unknown" | null>(null);

  if (session) return <Navigate to="/launch-hub" replace />;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) { setError("empty"); return; }
    if (!signIn(username)) { setError("unknown"); return; }
    navigate({ to: "/launch-hub" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <a href="#main" className="skip-link">{t("app.skip")}</a>
      <header className="px-4 py-4 text-center">
        <p className="font-heading text-[22px] font-bold text-ink">{t("app.name")}</p>
      </header>
      <main id="main" className="mx-auto grid w-full max-w-content flex-1 gap-8 px-4 py-10 desktop:grid-cols-2 desktop:items-center">
        <aside aria-hidden className="login-illustration hidden min-h-[520px] items-center justify-center rounded-surface desktop:flex">
          <div className="relative grid size-72 place-items-center rounded-full border border-white/20 bg-white/5"><span className="absolute inset-8 rounded-full border border-white/10" /><Wrench size={150} strokeWidth={1.2} className="relative rotate-[-35deg] text-button-main" /></div>
        </aside>
        <section className="mx-auto w-full max-w-lg">
        <PageHeading text={t("M1.title")} />
        <p className="mt-2 text-ink-muted">{t("M1.lead")}</p>

        <ul aria-label={t("M1.accountsLabel")} className="mt-6 space-y-2">
          {demoAccounts.map((a) => {
            const RoleIcon = a.role === "learner" ? BookOpen : a.role === "instructor" ? GraduationCap : Building2;
            return <li key={a.username}>
              <button
                type="button"
                aria-pressed={username === a.username}
                onClick={() => { setUsername(a.username); setError(null); }}
                className="login-role flex min-h-16 w-full items-center justify-between gap-3 rounded-surface border-2 border-border bg-surface px-4 py-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary-container text-secondary"><RoleIcon aria-hidden size={20} /></span><span className="min-w-0">
                  <span className="block font-semibold text-ink">{a.name}</span>
                  <span className="block text-sm text-ink-muted">{t(`roles.${a.role}`)}</span>
                </span></span>
                <span className="shrink-0 text-sm text-ink-muted">{a.username}</span>
              </button>
            </li>;
          })}
        </ul>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="login-username" className="block font-semibold text-ink">{t("M1.username")}</label>
            <input
              id="login-username" type="text" autoComplete="username" value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              aria-invalid={error !== null || undefined} aria-describedby={error ? "login-err" : undefined}
              className="mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block font-semibold text-ink">{t("M1.password")}</label>
            <input
              id="login-password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              aria-invalid={error !== null || undefined} aria-describedby={error ? "login-err" : undefined}
              className="mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control"
            />
          </div>
          {error && <p id="login-err" role="alert" className="text-error">{t(`M1.${error === "empty" ? "errEmpty" : "errUnknown"}`)}</p>}
          <button type="submit" className="btn-primary w-full">{t("M1.signIn")}</button>
        </form>
        </section>
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-sm text-ink-muted">{t("app.footer")}</footer>
    </div>
  );
}
