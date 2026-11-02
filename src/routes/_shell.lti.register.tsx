import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { mockState } from "@/data/mockState";

// SH-07 Moodle registration. Waiting / done switched by mockState.ltiRegister.
export const Route = createFileRoute("/_shell/lti/register")({
  head: () => ({
    meta: [
      { title: t("SH-07.waitingTitle") + t("app.titleSuffix") },
      { name: "description", content: t("SH-07.waitingBody") },
      { property: "og:title", content: t("SH-07.waitingTitle") + t("app.titleSuffix") },
      { property: "og:description", content: t("SH-07.waitingBody") },
    ],
  }),
  component: LtiRegister,
});

const s = (k: string) => t(`SH-07.${k}`);

function LtiRegister() {
  const done = mockState.ltiRegister === "done";
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="rounded-surface border border-border bg-surface p-6 text-center">
        {done ? (
          <>
            <CheckCircle2 aria-hidden size={32} className="mx-auto text-success" />
            <div className="mt-3"><PageHeading text={s("doneTitle")} /></div>
            <p className="mt-3 text-ink">{s("doneBody")}</p>
            <Link to="/launch-hub" className="btn-primary mt-6">{s("goHub")}</Link>
          </>
        ) : (
          <>
            <PageHeading text={s("waitingTitle")} />
            <p className="mt-3 text-ink">{s("waitingBody")}</p>
            <div aria-live="polite" className="mt-6 flex justify-center">
              <Loader2 aria-hidden size={32} className="animate-spin text-focus-ring motion-reduce:animate-none" />
              <span className="sr-only">{s("waitingStatus")}</span>
            </div>
            <button type="button" disabled className="btn-secondary mt-6 opacity-60">{s("checkAgain")}</button>
          </>
        )}
      </div>
    </div>
  );
}
