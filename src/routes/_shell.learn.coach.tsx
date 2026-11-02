import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { EmptyState } from "@/components/shared/EmptyState";
import { CoachStarterChips } from "@/components/shared/CoachStarterChips";
import { coachExchanges, type CoachExchange } from "@/data/coach";
import { mockState } from "@/data/mockState";

// LR-07 Ask Vidura.
export const Route = createFileRoute("/_shell/learn/coach")({
  head: () => ({
    meta: [
      { title: t("pages.coach") + t("app.titleSuffix") },
      { name: "description", content: t("LR-07.line1") },
      { property: "og:title", content: t("pages.coach") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-07.line1") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`LR-07.${k}`);

interface Turn { id: number; question: string; reply?: CoachExchange; failed?: boolean }

const norm = (x: string) => x.toLowerCase().replace(/[^a-z ]/g, "");
function pickReply(q: string, count: number): CoachExchange | undefined {
  const n = norm(q);
  return coachExchanges.find((e) => norm(e.question) === n || n.includes(norm(e.question).split(" ").slice(-2).join(" ")))
    ?? coachExchanges[count % coachExchanges.length];
}

function Page() {
  const m = mockState.coach;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const id = turns.length;
    setTurns((ts) => [...ts, { id, question: q }]);
    setText(""); setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      const reply = pickReply(q, id);
      setTurns((ts) => ts.map((x) => x.id !== id ? x : m.reply === "error" || !reply ? { ...x, failed: true } : { ...x, reply }));
    }, m.thinkingMs);
  };
  const stop = () => { clearTimeout(timer.current); setBusy(false); setTurns((ts) => ts.filter((x) => x.reply || x.failed)); };

  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 tablet:grid tablet:grid-cols-[minmax(0,1fr)_420px] tablet:gap-8">
      <div className="space-y-4">
        <PageHeading titleKey="pages.coach" />
        <div className="max-w-reading space-y-1 text-ink"><p>{s("line1")}</p><p>{s("line2")}</p></div>
        <nav aria-label={s("quick")} className="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap">
          <Link to="/learn/gap" className="btn-secondary">{s("plan")}</Link>
          <Link to="/active-quizzes" className="btn-secondary">{s("quiz")}</Link>
          <Link to="/learn/flashcards" className="btn-secondary">{s("flashcards")}</Link>
        </nav>
      </div>

      <section aria-label={s("conversation")} className="mt-6 flex min-h-[60vh] flex-col rounded-surface border border-border bg-surface tablet:mt-0">
        {!m.lessonsLinked ? (
          <div className="p-4"><EmptyState title={s("empty")} help={s("emptyHelp")} /></div>
        ) : (
          <>
            <ol className="flex-1 space-y-4 overflow-y-auto p-4">
              {turns.map((x) => (
                <li key={x.id} className="space-y-3">
                  <div className="ml-auto max-w-[85%] rounded-surface bg-highlight p-3 text-ink">
                    <p className="text-sm font-semibold">{s("yourQuestion")}</p>
                    <p>{x.question}</p>
                  </div>
                  {x.failed && <ErrorAlert message={s("error")} />}
                  {x.reply && <Reply ex={x.reply} noSources={m.reply === "noSources"} />}
                </li>
              ))}
            </ol>
            <p role="status" className="px-4 text-ink-muted">{busy ? s("thinking") : ""}</p>
            <form onSubmit={send} className="sticky bottom-0 space-y-2 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <CoachStarterChips onSelect={(prompt) => { setText(prompt); input.current?.focus(); }} />
              <label htmlFor="coach-q" className="block font-semibold text-ink">{s("yourQuestion")}</label>
              <textarea ref={input} id="coach-q" rows={3} value={text} onChange={(e) => setText(e.target.value)}
                className="w-full rounded-surface border border-border-control bg-surface p-2 text-ink" />
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="btn-primary">{s("send")}</button>
                {busy && <button type="button" onClick={stop} className="btn-secondary">{s("stop")}</button>}
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function Reply({ ex, noSources }: { ex: CoachExchange; noSources: boolean }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  return (
    <div className="max-w-[92%] rounded-surface border border-border bg-page-bg p-3 text-ink">
      <p className="text-sm font-semibold">{s("coach")}</p>
      {noSources ? <p>{s("notFound")}</p> : (
        <>
          <p>{ex.answer}</p>
          <p className="mt-2"><span className="font-semibold">{s("checkYourself")}</span> {ex.checkYourself}</p>
        </>
      )}
      <AITrustNote audience="learner" sources={noSources ? [] : ex.sources} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm">{s("helpful")}</span>
        {(["up", "down"] as const).map((v) => {
          const Icon = v === "up" ? ThumbsUp : ThumbsDown;
          return (
            <button key={v} type="button" aria-pressed={vote === v} aria-label={s(v === "up" ? "yes" : "no")}
              onClick={() => setVote(vote === v ? null : v)}
              className={`inline-flex size-11 items-center justify-center rounded-surface border-2 ${vote === v ? "border-accent bg-highlight" : "border-border-control"}`}>
              <Icon aria-hidden size={18} />
            </button>
          );
        })}
        <span role="status" className="text-sm">{vote ? s("thanks") : ""}</span>
      </div>
    </div>
  );
}
