import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PillTabs } from "@/components/shared/PillTabs";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { flashcards } from "@/data/flashcards";
import { mockState } from "@/data/mockState";
import { Button } from "@/components/ui/button";
import { confidenceCounts, type FlashcardConfidence } from "@/data/flashcards";

// LR-10 Flashcards. Confidence is local to this deck session.
export const Route = createFileRoute("/_shell/learn/flashcards")({
  head: () => ({
    meta: [
      { title: t("pages.flashcards") + t("app.titleSuffix") },
      { name: "description", content: t("LR-10.instruction") },
      { property: "og:title", content: t("pages.flashcards") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-10.instruction") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-10.${k}`, v);

function Page() {
  const deck = mockState.flashcards.deck === "empty" ? [] : flashcards;
  const [i, setI] = useState(0);
  const [back, setBack] = useState(false);
  const [confidence, setConfidence] = useState<Record<string, FlashcardConfidence>>({});
  const counts = confidenceCounts(confidence);
  const atEnd = i >= deck.length;
  const card = deck[i];
  const deckRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (restoreFocus.current) {
      deckRef.current?.querySelector<HTMLButtonElement>(`.${back ? "flashcard-back" : "flashcard-front"} button`)?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [i, back]);
  const flip = (value: boolean) => { restoreFocus.current = true; setBack(value); };
  const go = (n: number) => { restoreFocus.current = true; setI(Math.max(0, Math.min(deck.length, n))); setBack(false); };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading titleKey="pages.flashcards" />
      <p className="max-w-reading text-ink">{s("instruction")}</p>
      <PillTabs label={s("modes")} active="study" items={[{ id: "study", label: s("study") }, { id: "practice", label: s("practice"), to: "/active-quizzes" }]} />

      {deck.length > 0 && <div className="max-w-reading space-y-3">
        <div role="progressbar" aria-label={t("pass3.flashcards.progress")} aria-valuemin={0} aria-valuemax={deck.length} aria-valuenow={Math.min(i + 1, deck.length)} className="flex h-2 gap-1">
          {deck.map((item, index) => <span key={item.id} className={`min-w-0 flex-1 rounded-full ${confidence[item.id] === "mastered" ? "bg-accent" : confidence[item.id] === "practice" ? "bg-secondary" : index <= i ? "bg-border-control" : "bg-border"}`} />)}
        </div>
        <div role="status" className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums text-ink-muted">
          <span>{t("pass3.flashcards.practiceCount", { n: counts.practice })}</span><span>{t("pass3.flashcards.masteredCount", { n: counts.mastered })}</span>
        </div>
      </div>}
      {deck.length === 0 ? <EmptyState title={s("empty")} help="" /> : atEnd ? (
        <div className="max-w-reading rounded-surface border border-border bg-surface p-6 text-center text-ink">
          <p role="status">{s("end")}</p>
          <button type="button" onClick={() => go(0)} className="btn-primary mt-4">{s("again")}</button>
        </div>
      ) : card && (
        <div className="max-w-reading space-y-4">
          <p className="text-ink-muted">{s("thinkFirst")}</p>
          <div ref={deckRef} onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); go(i + (e.key === "ArrowLeft" ? -1 : 1)); }
          }} className="flashcard block w-full rounded-surface text-center text-ink">
            <span className={`flashcard-inner ${back ? "is-flipped" : ""}`}>
              <span aria-hidden={back} inert={back} className="flashcard-face flashcard-front rounded-surface border-2 border-border-control bg-surface p-6">
                <Button type="button" variant="ghost" onClick={() => flip(true)} aria-label={`${s("turn")}: ${card.term}`} className="flashcard-copy learning-control hover:bg-transparent">
                  <span className="text-sm text-ink-muted">{s("term")}</span>
                  <span className="mt-2 font-heading text-[28px]">{card.term}</span>
                </Button>
              </span>
              <span aria-hidden={!back} inert={!back} className="flashcard-face flashcard-back rounded-surface border-2 border-border-control bg-surface p-6">
                <Button type="button" variant="ghost" onClick={() => flip(false)} aria-label={`${s("turn")}: ${card.term}`} className="flashcard-copy learning-control hover:bg-transparent">
                  <span className="text-sm text-ink-muted">{s("meaning")}</span>
                  <span className="mt-2 text-[18px]">{card.definition}</span>
                </Button>
                <span className="flex flex-wrap justify-center gap-2">
                  {(["practice", "mastered"] as const).map((choice) => <Button key={choice} type="button" variant="ghost"
                    aria-pressed={confidence[card.id] === choice} onClick={() => setConfidence((previous) => ({ ...previous, [card.id]: choice }))}
                    className={`${confidence[card.id] === choice ? "btn-primary" : "btn-secondary"} learning-control h-auto whitespace-normal`}>{t(`pass3.flashcards.${choice}`)}</Button>)}
                </span>
              </span>
            </span>
            <span aria-live="polite" className="sr-only">{back ? card.definition : card.term}</span>
          </div>
          <p className="text-center text-ink-muted">{s("counter", { n: i + 1, total: deck.length })}</p>
          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="btn-secondary">{s("prev")}</button>
            <button type="button" onClick={() => go(i + 1)} className="btn-secondary">{s("next")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
