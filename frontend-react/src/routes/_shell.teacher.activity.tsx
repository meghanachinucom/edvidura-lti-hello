import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LiveEventStreamViewer } from "@/components/enterprise/LiveEventStreamViewer";

// TC-04 Activity: Pure Real-Time Learning Event Feed
export const Route = createFileRoute("/_shell/teacher/activity")({
  head: () => ({
    meta: [
      { title: t("TC-04.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-04.lead") },
      { property: "og:title", content: t("TC-04.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-04.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading
        text="Real-Time Learning Event Feed"
        context="Authoritative live telemetry, formative question masteries, checkpoint completions, and student engagement."
      />

      {/* Pure Hero: Real-Time Telemetry & Event Stream Viewer */}
      <LiveEventStreamViewer />
    </div>
  );
}
