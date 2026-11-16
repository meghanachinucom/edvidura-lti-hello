import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";

// OP-01 Owner login. Redirects to baseline FastAPI /ops/login to maintain cookie session.
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
  useEffect(() => {
    // Navigate top-level to FastAPI /ops/login
    window.location.href = "/ops/login";
  }, []);

  return (
    <div className="flex justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-5 rounded-surface border border-border bg-surface p-6 text-center">
        <PageHeading text={t("OP.loginTitle")} />
        <p className="text-sm text-ink-muted">Redirecting to Operator Login Console...</p>
        <p className="pt-2">
          <a href="/ops/login" className="btn-primary inline-flex">
            Click here if not redirected
          </a>
        </p>
      </div>
    </div>
  );
}
