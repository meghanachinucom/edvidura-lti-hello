import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { StandaloneReader } from "@/components/learner/StandaloneReader";
import { ebookById } from "@/data/ebooks";
import { mockState } from "@/data/mockState";

// LR-16 Standalone reader (read-only).
export const Route = createFileRoute("/_shell/read/manuals/$manualId")({
  head: () => ({
    meta: [
      { title: t("pages.readManual") + t("app.titleSuffix") },
      { name: "description", content: t("LR-16.note") },
      { property: "og:title", content: t("pages.readManual") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-16.note") },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { manualId } = Route.useParams();
  const book = ebookById(manualId);
  // Unknown or unavailable record: neutral page, never confirming it exists elsewhere.
  if (!book || mockState.library.unavailableId === manualId)
    return <AccessUnavailable back={{ to: "/manuals", label: t("LR-16.back") }} />;
  return <StandaloneReader key={book.id} book={book} />;
}
