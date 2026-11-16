import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { type CoverTone, type EbookCategory, type Ebook } from "@/data/ebooks";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import { adaptEbook, type BackendManualItem } from "@/lib/adapters";

// LR-14 eBook library.
export const Route = createFileRoute("/_shell/manuals/")({
  head: () => ({
    meta: [
      { title: t("LR-14.title") + t("app.titleSuffix") },
      { name: "description", content: t("LR-14.empty") },
      { property: "og:title", content: t("LR-14.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-14.title") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-14.${k}`, v);
const COVER: Record<CoverTone, string> = {
  accent: "bg-accent",
  ink: "bg-ink",
  focus: "bg-secondary",
};
const CHIPS: ("all" | EbookCategory)[] = ["all", "vocational", "life", "physical", "maths"];

function Page() {
  const [manuals, setManuals] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    async function fetchManuals() {
      try {
        setLoading(true);
        setError(null);
        if (mockState.library.list === "empty") {
          if (active) {
            setManuals([]);
            setLoading(false);
          }
          return;
        }
        const res = await api.get<{ manuals: BackendManualItem[] }>("/api/v1/app/manuals");
        if (active) {
          if (res && Array.isArray(res.manuals)) {
            setManuals(res.manuals.map(adaptEbook));
          } else {
            setManuals([]);
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load manuals catalogue");
          setManuals([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchManuals();
    return () => {
      active = false;
    };
  }, []);

  const list = manuals.filter(
    (b) =>
      (chip === "all" || b.category === chip) &&
      b.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading text={s("title")} />

      <div role="group" aria-label={s("filters")} className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={chip === c}
            onClick={() => setChip(c)}
            className={`filter-chip min-h-11 rounded-surface border px-4 ${chip === c ? "border-secondary bg-secondary-container text-secondary" : "border-border-control bg-surface text-ink"}`}
          >
            {s(`chip.${c}`)}
          </button>
        ))}
      </div>

      <div className="max-w-reading">
        <label htmlFor="ebook-search" className="block font-semibold text-ink">
          {s("search")}
        </label>
        <input
          id="ebook-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton count={3} />
        </div>
      ) : error ? (
        <ErrorAlert message={error} />
      ) : manuals.length === 0 ? (
        <EmptyState title={s("empty")} help={s("emptyHelp")} />
      ) : list.length === 0 ? (
        <p className="text-ink-muted">{s("noMatch")}</p>
      ) : (
        <ul className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {list.map((b) => (
            <li
              key={b.id}
              className="flex flex-col rounded-surface border border-border bg-surface"
            >
              <div aria-hidden className={`h-3 rounded-t-surface ${COVER[b.cover]}`} />
              <div className="flex flex-1 flex-col gap-1 p-4 text-ink">
                <h2 className="font-heading text-[20px]">{b.title}</h2>
                <p>{b.description}</p>
                <p className="text-ink-muted">
                  {b.currentPage
                    ? s("progress", { n: b.currentPage, total: b.pages })
                    : s("notStarted")}
                </p>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-full bg-border"
                  role="progressbar"
                  aria-label={s("progress", { n: b.currentPage ?? 0, total: b.pages })}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={b.currentPage ? Math.round((b.currentPage / b.pages) * 100) : 0}
                >
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${b.currentPage ? (b.currentPage / b.pages) * 100 : 0}%` }}
                  />
                </div>
                <Link
                  to="/manuals/$manualId"
                  params={{ manualId: b.id }}
                  aria-label={s("openBook", { title: b.title })}
                  className="btn-primary mt-3 self-start"
                >
                  {s("open")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
