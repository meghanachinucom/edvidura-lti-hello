import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, ExternalLink } from "lucide-react";
import { useRole } from "@/components/shell/RoleContext";
import { roleHome } from "@/data/nav";
import { t } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EdVidura — Launch Required via Moodle LMS" },
      {
        name: "description",
        content:
          "EdVidura is an enterprise learning tool integrated with Moodle LMS via IMS Global LTI 1.3.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, isLoading } = useRole();
  const navigate = useNavigate();

  // If a verified LTI session is established, automatically route directly to the role's home experience
  useEffect(() => {
    if (!isLoading && session) {
      const target = roleHome[session.role] || "/lessons";
      void navigate({ to: target, replace: true });
    }
  }, [isLoading, session, navigate]);

  // If still checking authentication, render a clean loading skeleton instead of flashing the landing page
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page-bg">
        <div className="text-center space-y-3">
          <p className="font-heading text-xl font-bold text-ink">{t("app.name")}</p>
          <p className="text-sm text-ink-muted">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, return null while redirect effect executes
  if (session) return null;

  const returnUrl =
    (typeof window !== "undefined"
      ? sessionStorage.getItem("edvidura_return_url")
      : null) || "/moodle/course/view.php?id=10";

  return (
    <div className="flex min-h-screen flex-col bg-page-bg">
      <a href="#main" className="skip-link">
        {t("app.skip")}
      </a>
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-content items-center justify-between">
          <p className="font-heading text-[22px] font-bold text-ink">{t("app.name")}</p>
          <a
            href={returnUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
          >
            <span>Return to Moodle LMS</span>
            <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-surface border border-border bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-secondary-container text-secondary">
            <GraduationCap size={32} aria-hidden />
          </div>
          <h1 className="font-heading text-[24px] font-extrabold tracking-[-0.02em] text-ink">
            Signed Out / LTI Launch Required
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            EdVidura is integrated with Moodle LMS via IMS Global LTI 1.3. For security and role integrity, learning sessions must be launched directly from an authorized Moodle course activity.
          </p>

          <div className="my-6 rounded-control border border-border bg-page-bg p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Launch Details</p>
            <div className="mt-2 space-y-1 text-xs text-ink">
              <p>
                <span className="font-semibold text-ink-muted">Institution:</span> Riverside High School
              </p>
              <p>
                <span className="font-semibold text-ink-muted">Course:</span> Class 8 · Algebra I (Course 10)
              </p>
              <p>
                <span className="font-semibold text-ink-muted">Activity:</span> Activity 21 — Riverside Algebra check
              </p>
              <p>
                <span className="font-semibold text-ink-muted">Authentication:</span> Single Sign-On (LTI 1.3 Core)
              </p>
            </div>
          </div>

          <a
            href={returnUrl}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 text-center text-sm font-semibold shadow-sm"
          >
            <span>Return to Moodle LMS</span>
            <ExternalLink size={16} aria-hidden />
          </a>

          <div className="mt-4 pt-4 border-t border-border">
            <a
              href="/review"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Senior Management Review Gateway &rarr;</span>
            </a>
          </div>
        </div>
      </main>
      <footer className="border-t border-border bg-surface px-4 py-4 text-center text-xs text-ink-muted">
        <p>© EdVidura. Enterprise Learning Platform for Moodle LTI 1.3.</p>
      </footer>
    </div>
  );
}
