import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EbookReader } from "@/components/learner/EbookReader";
import { ebookById, type Ebook } from "@/data/ebooks";
import { ebookChapters, type Chapter } from "@/data/ebookContent";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import {
  adaptEbook,
  adaptChapters,
  type BackendManualDetail,
  type BackendProgressItem,
  type BackendBookmarkItem,
} from "@/lib/adapters";

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
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<Ebook | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<BackendProgressItem | null>(null);
  const [bookmarks, setBookmarks] = useState<BackendBookmarkItem[]>([]);

  useEffect(() => {
    let active = true;
    async function loadManual() {
      if (mockState.library.unavailableId === manualId) {
        if (active) setLoading(false);
        return;
      }
      try {
        const resp = await api.get<BackendManualDetail>(`/api/v1/app/manuals/${manualId}`);
        if (active && resp?.manual) {
          setBook(adaptEbook(resp.manual));
          setChapters(adaptChapters(manualId, resp.chapters));
          setProgress(resp.reading_progress ?? null);
          setBookmarks(resp.bookmarks ?? []);
          setLoading(false);
          return;
        }
      } catch {
        // Fallback for prototype/mock tests
      }
      if (active) {
        const fallback = ebookById(manualId);
        if (fallback) {
          setBook(fallback);
          setChapters(ebookChapters[manualId] ?? []);
        }
        setLoading(false);
      }
    }
    loadManual();
    return () => {
      active = false;
    };
  }, [manualId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-content px-4 py-8">
        <LoadingSkeleton count={6} />
      </div>
    );
  }

  // Unknown or unavailable record: neutral page, never confirming it exists elsewhere.
  if (!book || mockState.library.unavailableId === manualId)
    return <AccessUnavailable back={{ to: "/manuals", label: t("LR-15.backLibrary") }} />;

  return (
    <EbookReader
      key={book.id}
      book={book}
      initialChapters={chapters}
      initialProgress={progress}
      initialBookmarks={bookmarks}
    />
  );
}
