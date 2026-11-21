import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, CheckCircle2, XCircle, Clock, Award, ChevronDown, ChevronUp, Sparkles, AlertCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { EmptyState } from "@/components/shared/EmptyState";
import { QuizSession } from "@/components/learner/QuizSession";
import { QuizModeBadge } from "@/components/shared/QuizModeBadge";
import { checkpointQuiz } from "@/data/quiz";
import { lessons } from "@/data/lessons";
import { myAttempts, type Attempt } from "@/data/attempts";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import { adaptAttempts, type BackendAttemptCard } from "@/lib/adapters";
import { AlgorithmicPracticeCard } from "@/components/enterprise/AlgorithmicPracticeCard";
import { ExamIntegrityMonitor } from "@/components/enterprise/ExamIntegrityMonitor";
import { PeerReviewStudio } from "@/components/enterprise/PeerReviewStudio";
import { formatIST } from "@/lib/time";

export const Route = createFileRoute("/_shell/quiz/")({
  head: () => ({
    meta: [
      { title: checkpointQuiz.title + t("app.titleSuffix") },
      { name: "description", content: t("LR-04.graded") },
      { property: "og:title", content: checkpointQuiz.title + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-04.graded") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-04.${k}`, v);

function Page() {
  const [started, setStarted] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("practice") === "1" || sp.get("practice") === "true") {
        setPracticeMode(true);
      }
    }
  }, []);

  if (started || mockState.quiz.mode === "session") {
    return <QuizSession practice={practiceMode} />;
  }
  return (
    <Gate
      onStart={() => setStarted(true)}
      onStartPractice={() => {
        setPracticeMode(true);
        setStarted(true);
      }}
    />
  );
}

interface QuizGateApiResponse {
  count?: number;
  can_submit?: boolean;
  practice?: boolean;
  quota?: { allowed?: boolean; remaining?: number };
}

interface AttemptsApiResponse {
  attempts: BackendAttemptCard[];
}

function Gate({ onStart, onStartPractice }: { onStart: () => void; onStartPractice: () => void }) {
  const q = mockState.quiz;
  const [canSubmit, setCanSubmit] = useState(true);
  const [hasQuestions, setHasQuestions] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>(myAttempts);
  const [ghostCoachBlocked, setGhostCoachBlocked] = useState(false);
  const [ghostCoachMsg, setGhostCoachMsg] = useState<string>("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkGate() {
      try {
        const [quizResp, attemptsResp] = await Promise.all([
          api.get<QuizGateApiResponse>("/api/v1/app/quiz").catch((err) => {
            if (
              err &&
              typeof err === "object" &&
              "code" in err &&
              err.code === "ghost_coach_gate"
            ) {
              if (active) {
                setGhostCoachBlocked(true);
                setGhostCoachMsg(
                  err.message || "Complete the required lessons before attempting the quiz.",
                );
              }
            } else {
              console.warn("Quiz gate API fallback:", err);
            }
            return null;
          }),
          api.get<AttemptsApiResponse>("/api/v1/app/attempts").catch((err) => {
            console.warn("Quiz attempts fallback:", err);
            return null;
          }),
        ]);

        if (active) {
          if (quizResp) {
            setCanSubmit(quizResp.can_submit !== false);
            setHasQuestions((quizResp.count ?? 1) > 0);
          }
          if (attemptsResp?.attempts) {
            setAttempts(adaptAttempts(attemptsResp.attempts));
          }
        }
      } catch (err) {
        console.warn("Quiz gate error:", err);
      }
    }
    checkGate();
    return () => {
      active = false;
    };
  }, []);

  if (q.gate === "unavailable") return <AccessUnavailable />;
  const done = lessons.filter((l) => l.markedDone).length;
  const gradedAttempts = attempts.filter((a) => a.kind === "graded");
  const lastGraded = gradedAttempts.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] || attempts[0];
  const next = lessons.find((l) => !l.markedDone && l.kind !== "quiz");

  const scorePct = lastGraded ? Math.round((lastGraded.score / (lastGraded.outOf || 5)) * 100) : 100;
  const isPassed = scorePct >= 70;

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          text={checkpointQuiz.title}
          context="Linear equations and Cartesian coordinate system mastery checkpoint."
        />
        <QuizModeBadge kind={q.gateType} />
      </div>

      {/* Rich Quiz Attempt History & Performance Panel */}
      {lastGraded && (
        <section aria-label="Latest Attempt Performance" className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
            <div className="flex items-center gap-4">
              {/* Circular Score Badge */}
              <div
                className={`flex size-14 shrink-0 items-center justify-center rounded-2xl font-heading font-extrabold text-xl shadow-xs border ${
                  isPassed
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                {scorePct}%
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Latest Graded Checkpoint
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      isPassed
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {isPassed ? "Passed · Certified" : "Needs Review"}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-ink">
                  Score: {lastGraded.score} of {lastGraded.outOf || 5} Questions Correct
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-ink-muted">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-secondary" />
                <span>Submitted: {formatIST(lastGraded.submittedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-sunken px-3 py-1.5 rounded-lg border border-border">
                <span>Duration: 12m 45s</span>
              </div>
            </div>
          </div>

          {/* Interactive Review Breakdown Toggle */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className="inline-flex items-center gap-2 text-xs font-bold text-secondary hover:text-secondary-hover transition"
            >
              <span>{showBreakdown ? "Hide Question Breakdown" : "Review Question Breakdown"}</span>
              {showBreakdown ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showBreakdown && (
              <div className="space-y-2 pt-2 border-t border-border animate-in fade-in duration-200">
                {[
                  {
                    q: "1. Solve 3x + 12 = 45. What is the value of x?",
                    ans: "x = 11",
                    correct: true,
                    time: "1m 12s",
                  },
                  {
                    q: "2. Which operation eliminates +7 on the left side of 2x + 7 = 19?",
                    ans: "Subtract 7 from both sides",
                    correct: true,
                    time: "48s",
                  },
                  {
                    q: "3. If 5(x - 4) = 30, what is the first step in reverse PEMDAS?",
                    ans: "Divide both sides by 5 or distribute",
                    correct: true,
                    time: "1m 40s",
                  },
                  {
                    q: "4. Verify balance equilibrium for x = 6 in 4x - 8 = 16.",
                    ans: "4(6) - 8 = 24 - 8 = 16 (LHS = RHS)",
                    correct: true,
                    time: "1m 05s",
                  },
                  {
                    q: "5. Find the slope of the line representing y = 3x - 5.",
                    ans: "m = 3",
                    correct: lastGraded.score >= 5,
                    time: "2m 10s",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-4 p-3 rounded-xl bg-page-bg border border-border text-xs"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-ink">{item.q}</p>
                      <p className="text-ink-muted">
                        Selected Answer: <span className="font-mono text-ink font-bold">{item.ans}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-ink-muted text-[11px]">{item.time}</span>
                      {item.correct ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={12} /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                          <XCircle size={12} /> Review Needed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recommended Next Step */}
      {next && (
        <section aria-labelledby="gate-rec" className="space-y-2">
          <h2 id="gate-rec" className="font-heading text-lg font-bold text-ink">
            {s("recommended")}
          </h2>
          <Link
            to="/lessons/$lessonId"
            params={{ lessonId: next.id }}
            className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-secondary/30 bg-secondary/[0.03] p-4 text-ink hover:bg-secondary/[0.06] transition shadow-xs"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-secondary uppercase tracking-wider">{s("keepGoing")}</span>
              <span className="block text-base font-heading font-extrabold text-ink">{next.title}</span>
            </span>
            <ChevronRight aria-hidden className="shrink-0 text-secondary" />
          </Link>
        </section>
      )}

      {/* Ghost Coach Gate or Quiz Launcher */}
      {ghostCoachBlocked ? (
        <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50/40 p-6 space-y-3">
          <p className="font-heading font-bold text-ink">Ghost Coach Prerequisite Gate</p>
          <p className="text-xs text-ink-muted leading-relaxed">
            {ghostCoachMsg ||
              "You must complete the required curriculum lessons before attempting the graded quiz."}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" className="btn-primary" onClick={onStartPractice}>
              Take Practice Quiz (Unlocked)
            </button>
            <Link to="/lessons" className="btn-secondary">
              Review Lessons
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {!hasQuestions || q.gate === "noQuestions" ? (
            <EmptyState title={s("noQuestions")} help="" />
          ) : !canSubmit && lastGraded ? (
            <Link
              to="/quiz/result/$attemptId"
              params={{ attemptId: lastGraded.id }}
              className="btn-primary"
            >
              {s("viewResult")}
            </Link>
          ) : q.gate === "submitted" ? (
            <Link
              to="/quiz/result/$attemptId"
              params={{ attemptId: q.submittedAttemptId }}
              className="btn-primary"
            >
              {s("viewResult")}
            </Link>
          ) : (
            <>
              <button type="button" className="btn-primary shadow-xs" onClick={onStart}>
                {s("start")}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onStartPractice}
              >
                Practice Quiz Mode (Untimed)
              </button>
            </>
          )}
        </div>
      )}

      {/* Enterprise Suite: Integrity Proctoring Monitor */}
      <ExamIntegrityMonitor sessionId="sess-alice-slice-a" />

      {/* Enterprise Suite: Algorithmic Math Generator */}
      <AlgorithmicPracticeCard studentId="6" templateKey="linear-balance" />

      {/* Enterprise Suite: Double-Blind Calibrated Peer Review */}
      <PeerReviewStudio assignmentId="assign-slice-a" reviewerId="6" />

      {/* Other Resources */}
      <section aria-labelledby="gate-other" className="pt-2 border-t border-border">
        <h2 id="gate-other" className="font-heading text-sm font-bold text-ink mb-2">
          {s("other")}
        </h2>
        <ul className="flex flex-wrap gap-x-6 text-xs font-semibold">
          <li>
            <Link to="/lessons" className="inline-flex min-h-11 items-center text-secondary hover:underline">
              {s("lessons")}
            </Link>
          </li>
          <li>
            <Link to="/manuals" className="inline-flex min-h-11 items-center text-secondary hover:underline">
              {s("ebooks")}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
