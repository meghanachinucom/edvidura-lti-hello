import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Volume2,
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
  ArrowRight,
  Headphones,
  Search,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { VoiceListenButton } from "@/components/shared/VoiceControls";
import { type CoverTone, type EbookCategory, type Ebook, ebooks } from "@/data/ebooks";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import { adaptEbook, type BackendManualItem } from "@/lib/adapters";

// LR-14 Living Interactive Textbooks Library
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

const COVER_GRADIENTS: Record<CoverTone, string> = {
  accent: "bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700",
  focus: "bg-gradient-to-br from-teal-700 via-emerald-700 to-cyan-800",
  amber: "bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-700",
  emerald: "bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-800",
  ink: "bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-950",
};

const CATEGORY_LABELS: Record<EbookCategory, string> = {
  maths: "Mathematics",
  physical: "Physical Sciences",
  vocational: "Technical & Vocational",
  cs: "Computer Science & AI",
  life: "Life Values & Ethics",
};

const CHIPS: ("all" | EbookCategory)[] = ["all", "maths", "physical", "vocational", "cs", "life"];

function Page() {
  const navigate = useNavigate();
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
          if (res && Array.isArray(res.manuals) && res.manuals.length > 0) {
            setManuals(res.manuals.map(adaptEbook));
          } else {
            setManuals(ebooks);
          }
        }
      } catch (err: unknown) {
        if (active) {
          if (mockState.library.list !== "empty") {
            setManuals(ebooks);
          } else {
            setError(err instanceof Error ? err.message : "Failed to load manuals catalogue");
            setManuals([]);
          }
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
      (b.title.toLowerCase().includes(query.trim().toLowerCase()) ||
        b.description.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <PageHeading text="Living Interactive Textbooks" />
        <p className="text-sm font-medium text-slate-600 mt-1 max-w-reading">
          Explore interactive curriculum textbooks with synchronized multi-lingual audiobooks,
          dynamic concept check stages, and assistive reading tools.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
        <div role="group" aria-label="Filter textbooks by subject" className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={chip === c}
              onClick={() => setChip(c)}
              className={`min-h-10 rounded-pill px-4 text-xs font-semibold transition-all ${
                chip === c
                  ? "bg-secondary text-white shadow-xs"
                  : "bg-surface border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {c === "all" ? "All Subjects" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className="relative w-full tablet:max-w-xs">
          <label htmlFor="ebook-search" className="sr-only">
            Search Textbooks
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </div>
          <input
            id="ebook-search"
            type="search"
            placeholder="Search by title or topic..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-10 w-full rounded-pill border border-slate-300 bg-surface pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
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
        <div className="rounded-2xl border border-slate-200 bg-surface p-8 text-center text-sm text-slate-600">
          No textbooks matched your filter query.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => {
            const pct = b.currentPage ? Math.round((b.currentPage / b.pages) * 100) : 0;
            const chapters = b.chaptersCount || 4;
            const gradient = COVER_GRADIENTS[b.cover] || COVER_GRADIENTS.accent;
            return (
              <div
                key={b.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs transition hover:border-secondary/40 hover:shadow-md"
              >
                {/* Book Cover Banner */}
                <div className={`relative p-5 text-white ${gradient}`}>
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-white backdrop-blur-xs font-mono">
                      {b.subjectCode || "EDV-LIB"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-white backdrop-blur-xs text-xs">
                      <Headphones size={11} /> Audiobook
                    </span>
                  </div>

                  <h3 className="mt-3 font-heading text-lg font-bold leading-snug text-white line-clamp-2">
                    {b.title}
                  </h3>

                  <p className="mt-1 text-xs text-white/80 line-clamp-1 font-medium">
                    {b.author || "EdVidura Academic Faculty"}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-xs text-white/90">
                    <span className="flex items-center gap-1">
                      <Layers size={13} /> {chapters} Chapters
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> ~{Math.round(b.pages * 0.75)} mins
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                    {b.description}
                  </p>

                  {/* Progress Indicator */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                      <span>{pct > 0 ? `Progress: ${pct}%` : "Not Started"}</span>
                      <span className="text-slate-500 font-mono">
                        {b.currentPage ? `Page ${b.currentPage} of ${b.pages}` : `${b.pages} pages`}
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-secondary transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      to="/manuals/$manualId"
                      params={{ manualId: b.id }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-secondary/90"
                    >
                      <span>Open Book</span>
                      <ArrowRight size={13} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        void navigate({
                          to: "/manuals/$manualId",
                          params: { manualId: b.id },
                        });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Volume2 size={14} className="text-secondary" />
                      <span>Listen Aloud</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
