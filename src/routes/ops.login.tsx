import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { OPS_DEMO_KEY } from "@/data/ops";
import { mockState } from "@/data/mockState";

// OP-01 Owner login. No account creation, reset, key hint or remember me.
export const Route = createFileRoute("/ops/login")({
  head: () => ({
    meta: [
      { title: t("OP.loginTitle") + t("app.titleSuffix") },
      { name: "description", content: t("OP.loginLead") },
      { property: "og:title", content: t("OP.loginTitle") + t("app.titleSuffix") },
      { property: "og:description", content: t("OP.loginLead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(false);
    setTimeout(() => {
      setBusy(false);
      if (key === OPS_DEMO_KEY) navigate({ to: "/ops/dashboard" });
      else setError(true);
    }, mockState.ops.submitMs);
  }

  return (
    <div className="flex justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-5 rounded-surface border border-border bg-surface p-6">
        <PageHeading text={t("OP.loginTitle")} />
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="owner-key" className="block font-semibold text-ink">{t("OP.key")}</label>
            <input id="owner-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)}
              aria-invalid={error || undefined} aria-describedby={error ? "owner-key-err" : undefined}
              className="mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control" />
            {error && <p id="owner-key-err" role="alert" className="mt-2 text-error">{t("OP.badKey")}</p>}
          </div>
          <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary w-full">
            {busy ? t("OP.signingIn") : t("OP.signIn")}
          </button>
          <button type="button" className="btn-secondary w-full">{t("OP.keycloak")}</button>
        </form>
        <Link to="/" className="inline-flex min-h-11 items-center text-ink underline">{t("OP.back")}</Link>
      </div>
    </div>
  );
}
