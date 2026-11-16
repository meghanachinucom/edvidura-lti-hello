import { createFileRoute } from "@tanstack/react-router";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { t } from "@/i18n";

// PROTOTYPE-ONLY review route. The real app returns this page from the route the user asked for.
export const Route = createFileRoute("/_shell/__prototype/access")({
  head: () => ({
    meta: [
      { title: t("SH-03.title") + t("app.titleSuffix") },
      { name: "description", content: t("SH-03.body") },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: t("SH-03.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SH-03.body") },
    ],
  }),
  component: AccessUnavailable,
});
