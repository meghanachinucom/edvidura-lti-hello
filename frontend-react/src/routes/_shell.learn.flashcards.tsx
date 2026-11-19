import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  RotateCw,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { t } from "@/i18n";
import { PillTabs } from "@/components/shared/PillTabs";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { flashcards, type Flashcard } from "@/data/flashcards";
import { mockState } from "@/data/mockState";
import { Button } from "@/components/ui/button";
import { confidenceCounts, type FlashcardConfidence } from "@/data/flashcards";
import { api } from "@/lib/api";

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
  const [remoteCards, setRemoteCards] = useState<Flashcard[]>([]);
  const allCards =
    remoteCards.length > 0 ? remoteCards : mockState.flashcards.deck === "empty" ? [] : flashcards;

  useEffect(() => {
    let active = true;
    api
      .get<{
        flashcards?: Array<{
          id?: string;
          term?: string;
          definition?: string;
          front?: string;
          back?: string;
        }>;
      }>("/api/v1/app/flashcards")
      .then((data) => {
        if (active && data?.flashcards && data.flashcards.length > 0) {
          setRemoteCards(
            data.flashcards.map((fc, idx) => ({
              id: fc.id || `fc-${idx + 1}`,
              term: fc.term || fc.front || "Concept",
              definition: fc.definition || fc.back || "Explanation",
            })),
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const [i, setI] = useState(0);
  const [back, setBack] = useState(false);
  const [reviewingPractice, setReviewingPractice] = useState(false);
  const [confidence, setConfidence] = useState<Record<string, FlashcardConfidence>>({});
  const counts = confidenceCounts(confidence);
  const missedCards = allCards.filter((item) => confidence[item.id] === "practice");
  const deck = reviewingPractice ? missedCards : allCards;
  const atEnd = i >= deck.length;
  const card = deck[i];
  const deckRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!reviewingPractice && atEnd && missedCards.length > 0) {
      setReviewingPractice(true);
      setI(0);
      setBack(false);
    }
  }, [reviewingPractice, atEnd, missedCards.length]);
  useEffect(() => {
    if (restoreFocus.current) {
      deckRef.current
        ?.querySelector<HTMLButtonElement>(`.${back ? "flashcard-back" : "flashcard-front"} button`)
        ?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [i, back]);
  const flip = (value: boolean) => {
    restoreFocus.current = true;
    setBack(value);
  };
  const go = (n: number) => {
    restoreFocus.current = true;
    setI(Math.max(0, Math.min(deck.length, n)));
    setBack(false);
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading titleKey="pages.flashcards" />
      <p className="max-w-reading text-ink">{s("instruction")}</p>
      <PillTabs
        label={s("modes")}
        active="study"
        items={[
          { id: "study", label: s("study") },
          { id: "practice", label: s("practice"), to: "/active-quizzes" },
        ]}
      />
      <div className="flex justify-end">
        <a href="/learn/flashcards" className="text-xs text-ink-muted underline">
          Open Server Flashcards (Jinja)
        </a>
      </div>

      {deck.length > 0 && (
        <div className="max-w-reading space-y-3">
          <div
            role="progressbar"
            aria-label={t("pass3.flashcards.progress")}
            aria-valuemin={0}
            aria-valuemax={deck.length}
            aria-valuenow={Math.min(i + 1, deck.length)}
            className="flex h-2 gap-1"
          >
            {deck.map((item, index) => (
              <span
                key={item.id}
                className={`min-w-0 flex-1 rounded-full ${confidence[item.id] === "mastered" ? "bg-secondary" : confidence[item.id] === "practice" ? "bg-accent" : index <= i ? "bg-border-control" : "bg-border"}`}
              />
            ))}
          </div>
          <div role="status" className="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums">
            <span className="font-semibold text-accent">
              {t("pass3.flashcards.practiceCount", { n: counts.practice })}
            </span>
            <span className="font-semibold text-secondary">
              {t("pass3.flashcards.masteredCount", { n: counts.mastered })}
            </span>
          </div>
        </div>
      )}
      {allCards.length === 0 ? (
        <EmptyState title={s("empty")} help="" />
      ) : atEnd ? (
        <div className="max-w-reading rounded-surface border border-border bg-surface p-6 text-center text-ink">
          <p role="status">{s("end")}</p>
          {counts.practice > 0 && !reviewingPractice && (
            <button
              type="button"
              onClick={() => {
                setReviewingPractice(true);
                go(0);
              }}
              className="btn-primary mt-4"
            >
              {s("reviewPractice", { n: counts.practice })}
            </button>
          )}
          {reviewingPractice && <p className="mt-3 text-secondary">{s("practiceReviewed")}</p>}
          <button
            type="button"
            onClick={() => {
              setReviewingPractice(false);
              go(0);
            }}
            className="btn-secondary mt-4"
          >
            {s("again")}
          </button>
        </div>
      ) : (
        card && (
          <div className="max-w-reading space-y-4">
            <div className="flex items-center justify-between text-sm text-ink-muted">
              <span>{s("thinkFirst")}</span>
              <span className="font-semibold text-ink">
                {s("counter", { n: i + 1, total: deck.length })}
              </span>
            </div>

            <div
              ref={deckRef}
              tabIndex={0}
              role="region"
              aria-label={`Flashcard: ${card.term}`}
              onClick={() => flip(!back)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  go(i - 1);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  go(i + 1);
                } else if (e.key === " " || e.code === "Space") {
                  e.preventDefault();
                  flip(!back);
                }
              }}
              className="flashcard block w-full rounded-2xl shadow-md cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-secondary select-none"
            >
              <span className={`flashcard-inner ${back ? "is-flipped" : ""}`}>
                {/* FRONT FACE: Question / Term */}
                <span
                  aria-hidden={back}
                  inert={back}
                  className="flashcard-face flashcard-front rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/40 p-6 sm:p-8 flex flex-col justify-between shadow-xs transition hover:border-secondary/60"
                >
                  <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
                      <Sparkles size={14} />
                      <span>{s("term")}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Card {i + 1} of {deck.length}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => flip(true)}
                    aria-label={`${s("turn")}: ${card.term}`}
                    className="flashcard-copy learning-control my-auto py-6 hover:bg-transparent flex flex-col items-center justify-center text-center cursor-pointer"
                  >
                    <span className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                      {card.term}
                    </span>
                    <span className="mt-3 text-xs sm:text-sm text-slate-500 font-medium">
                      Tap card or click button below to reveal answer
                    </span>
                  </Button>

                  <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        flip(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-secondary/90 active:scale-95"
                    >
                      <RotateCw size={15} />
                      <span>Flip to Reveal Answer</span>
                    </button>
                  </div>
                </span>

                {/* BACK FACE: Answer & Definition */}
                <span
                  aria-hidden={!back}
                  inert={!back}
                  className="flashcard-face flashcard-back rounded-2xl border-2 border-secondary/40 bg-gradient-to-b from-white via-teal-50/20 to-teal-50/40 p-6 sm:p-8 flex flex-col justify-between shadow-xs"
                >
                  <div className="w-full flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 size={14} />
                      <span>{s("meaning")}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      Card {i + 1} of {deck.length}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => flip(false)}
                    aria-label={`${s("turn")}: ${card.term}`}
                    className="flashcard-copy learning-control my-auto py-4 hover:bg-transparent flex flex-col items-center justify-center text-center cursor-pointer"
                  >
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">
                      {card.term}
                    </span>
                    <span className="text-base sm:text-lg text-slate-800 leading-relaxed font-semibold max-w-lg">
                      {card.definition}
                    </span>
                  </Button>

                  <div className="w-full pt-3 border-t border-slate-200/60 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600">
                        How well did you know this?
                      </span>
                      <div className="flex items-center gap-2">
                        {(["practice", "mastered"] as const).map((choice) => (
                          <Button
                            key={choice}
                            type="button"
                            variant="ghost"
                            aria-pressed={confidence[card.id] === choice}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfidence((previous) => ({ ...previous, [card.id]: choice }));
                            }}
                            className={`${
                              confidence[card.id] === choice
                                ? choice === "mastered"
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-amber-600 text-white hover:bg-amber-700"
                                : "btn-secondary"
                            } learning-control h-9 px-3.5 text-xs font-bold whitespace-nowrap rounded-xl shadow-2xs`}
                          >
                            {t(`pass3.flashcards.${choice}`)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          flip(false);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-secondary/30 bg-surface px-4 py-2 text-xs sm:text-sm font-bold text-secondary shadow-2xs hover:bg-secondary/10 transition active:scale-95"
                      >
                        <RotateCw size={14} />
                        <span>Flip Back to Question</span>
                      </button>
                    </div>
                  </div>
                </span>
              </span>

              <span aria-live="polite" className="sr-only">
                {back ? card.definition : card.term}
              </span>
            </div>

            {/* Bottom Navigation & Controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => go(i - 1)}
                disabled={i === 0}
                className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 font-semibold disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                <span>{s("prev")}</span>
              </button>

              <button
                type="button"
                onClick={() => flip(!back)}
                className="inline-flex items-center gap-2 rounded-xl border border-secondary/40 bg-secondary/10 px-5 py-2.5 text-sm font-bold text-secondary hover:bg-secondary/20 transition active:scale-95"
              >
                <RotateCw size={16} />
                <span>{back ? "Show Term" : "Flip Card"}</span>
              </button>

              <button
                type="button"
                onClick={() => go(i + 1)}
                disabled={i >= deck.length - 1}
                className="btn-secondary inline-flex items-center gap-1.5 px-4 py-2 font-semibold disabled:opacity-40"
              >
                <span>{s("next")}</span>
                <ChevronRight size={16} />
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 font-medium pt-1">
              Keyboard:{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-[11px]">
                Space
              </kbd>{" "}
              Flip ·{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-[11px]">
                ←
              </kbd>{" "}
              Prev ·{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-[11px]">
                →
              </kbd>{" "}
              Next
            </p>
          </div>
        )
      )}
    </div>
  );
}
