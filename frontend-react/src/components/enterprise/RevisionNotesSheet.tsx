import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface RevisionNotesSheetProps {
  userId?: string;
  defaultTopic?: string;
  embedded?: boolean;
}

export function RevisionNotesSheet({
  userId = "6",
  defaultTopic = "Linear Equations & Industrial Balance",
  embedded = false,
}: RevisionNotesSheetProps) {
  const [topic, setTopic] = useState(defaultTopic);

  useEffect(() => {
    if (defaultTopic) {
      setTopic(defaultTopic);
    }
  }, [defaultTopic]);
  const [loading, setLoading] = useState(false);
  const [notesId, setNotesId] = useState<string | null>(null);
  const [notesContent, setNotesContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSynthesize = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        ok: boolean;
        notes_id: string;
        summary?: string;
        content?: string;
      }>("/api/v1/coach/synthesize-notes", {
        user_id: userId,
        topic,
      });
      if (res && res.notes_id) {
        setNotesId(res.notes_id);
        setNotesContent(
          res.content ||
            res.summary ||
            `## ${topic} Revision Summary\n\n- Key Principle: Balance both sides of equations simultaneously.\n- Applied Standard: Industrial flow calculations require conservation of mass.\n- Common Pitfall: Forgetting to invert sign when transposing variables.`,
        );
      }
    } catch {
      setError("Could not synthesize revision notes at this time.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!notesContent) return;
    const blob = new Blob([notesContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Revision_Notes_${topic.replace(/\s+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 mb-1">
            Study Revision Engine
          </span>
          <h3 className="text-sm sm:text-base font-bold text-ink font-heading">
            {embedded ? "2-Page Study Sheet" : "Personalized Revision Sheet"}
          </h3>
          <p className="text-xs text-ink-muted">
            {embedded
              ? `Synthesize concise high-yield revision formulas and notes for ${topic}.`
              : "Synthesize concise high-yield revision summaries, formulas, and common traps."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic for revision handout..."
            className="flex-1 rounded-control border border-border bg-page-bg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
          />
          <button
            onClick={handleSynthesize}
            disabled={loading || !topic.trim()}
            className="btn-primary inline-flex items-center justify-center rounded-control disabled:opacity-50 text-white px-3.5 py-2 text-xs font-semibold transition shrink-0"
          >
            {loading ? "Generating..." : "Generate Notes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {notesContent && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Revision Sheet ID: {notesId}
            </span>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 transition"
            >
              Download Printable Notes
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200">
            {notesContent}
          </div>
        </div>
      )}
    </div>
  );
}
