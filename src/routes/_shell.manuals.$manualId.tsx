import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { EbookReader } from "@/components/learner/EbookReader";
import { ebookById } from "@/data/ebooks";
import { mockState } from "@/data/mockState";

// LR-15 PeBL reader.
export const Route = createFileRoute("/_shell/manuals/$manualId")({
  head: () => ({
    meta: [
      { title: t("pages.manual") + t("app.titleSuffix") },
      { name: "description", content: t("LR-15.notes") },
      { property: "og:title", content: t("pages.manual") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-15.notes") },
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
    return <AccessUnavailable back={{ to: "/manuals", label: t("LR-15.backLibrary") }} />;
  return <EbookReader key={book.id} book={book} />;
}
