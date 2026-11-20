import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Brain,
  HelpCircle,
  Lightbulb,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  CheckCircle2,
  ArrowRight,
  Lock,
  Unlock,
} from "lucide-react";
import { getLocaleBcp47, t, useLocale } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { EmptyState } from "@/components/shared/EmptyState";
import { CoachStarterChips } from "@/components/shared/CoachStarterChips";
import { VoiceInputButton, VoiceListenButton } from "@/components/shared/VoiceControls";
import { coachExchanges, type CoachExchange } from "@/data/coach";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import { ChatQuizMinter } from "@/components/enterprise/ChatQuizMinter";
import { RevisionNotesSheet } from "@/components/enterprise/RevisionNotesSheet";
import { SkillBenchmarkWidget } from "@/components/enterprise/SkillBenchmarkWidget";

// LR-07 Ask Vidura with Guided Mastery Tutor & Multilingual Indian Voice Studio
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

interface SkillTreeItem {
  id: string;
  name: string;
  parent_topic?: string;
  mastery_level: number;
  max_level: number;
  status: string;
  next_review_at?: string;
}

interface TutorTracker {
  skill: string;
  skill_name: string;
  mastery_level: number;
  max_level: number;
  level_description: string;
  leveled_up: boolean;
  diagnostic_question: string;
  hint: string;
  all_skills?: Array<{ id: string; name: string; level: number; max: number }>;
}

interface Turn {
  id: number;
  question: string;
  reply?: CoachExchange | undefined;
  tutor?: TutorTracker | undefined;
  failed?: boolean | undefined;
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z ]/g, "");
function pickReply(q: string, count: number): CoachExchange | undefined {
  const n = norm(q);
  return (
    coachExchanges.find(
      (e) => norm(e.question) === n || n.includes(norm(e.question).split(" ").slice(-2).join(" ")),
    ) ?? coachExchanges[count % coachExchanges.length]
  );
}

function Page() {
  const m = mockState.coach;
  const { bcp47 } = useLocale();
  const [tutorMode, setTutorMode] = useState<"guided" | "direct">("guided");
  const [voiceCleanupMode, setVoiceCleanupMode] = useState<"smart" | "exact">("smart");
  const [skillTree, setSkillTree] = useState<SkillTreeItem[]>([
    {
      id: "variables",
      name: "Variables & Expressions",
      mastery_level: 2,
      max_level: 5,
      status: "Building Confidence",
    },
    {
      id: "solve-linear",
      name: "Solving Linear Equations",
      mastery_level: 2,
      max_level: 5,
      status: "Review Due",
    },
    {
      id: "word-problems",
      name: "Linear Word Problems",
      mastery_level: 1,
      max_level: 5,
      status: "Getting Started",
    },
    {
      id: "graphing-lines",
      name: "Graphing Lines & Coordinates",
      mastery_level: 0,
      max_level: 5,
      status: "Locked",
    },
  ]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeHintLevel, setActiveHintLevel] = useState<number>(0);
  const [hintText, setHintText] = useState<string>("");
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<any[]>([]);
  const [diagStep, setDiagStep] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState<Record<string, number>>({});
  const [diagComplete, setDiagComplete] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Fetch live skill tree
  useEffect(() => {
    api
      .get<{ ok?: boolean; skills?: SkillTreeItem[] }>("/api/v1/app/tutor/skill-tree?subject=6")
      .then((res) => {
        if (res && res.skills && res.skills.length > 0) {
          setSkillTree(res.skills);
        }
      })
      .catch(() => {});
  }, []);

  // Load diagnostic questions when opened
  const startDiagnostic = async () => {
    setShowDiagnostic(true);
    setDiagStep(0);
    setDiagAnswers({});
    setDiagComplete(false);
    try {
      const res = await api.post<{ ok?: boolean; questions?: any[] }>(
        "/api/v1/app/tutor/diagnostic",
        { subject: "6" },
      );
      if (res && res.questions) {
        setDiagnosticQuestions(res.questions.slice(0, 3));
      }
    } catch {
      setDiagnosticQuestions([
        {
          question_id: "q_var_1",
          question: "In the expression 4x + 7, what is the variable?",
          options: ["4", "x", "7", "4x + 7"],
          correct_index: 1,
        },
        {
          question_id: "q_lin_1",
          question: "To solve 2x + 5 = 15, what is the first inverse operation?",
          options: ["Add 5", "Subtract 5 from both sides", "Divide by 5", "Multiply by 2"],
          correct_index: 1,
        },
        {
          question_id: "q_wp_1",
          question: "A number doubled plus 3 is 11. What is the equation?",
          options: ["2x - 3 = 11", "2x + 3 = 11", "x/2 + 3 = 11", "3x + 2 = 11"],
          correct_index: 1,
        },
      ]);
    }
  };

  const answerDiagnostic = async (optionIndex: number) => {
    const q = diagnosticQuestions[diagStep];
    const newAnswers = { ...diagAnswers, [q.question_id]: optionIndex };
    setDiagAnswers(newAnswers);

    if (diagStep < diagnosticQuestions.length - 1) {
      setDiagStep(diagStep + 1);
    } else {
      setDiagComplete(true);
      try {
        const cal = await api.post<{ ok?: boolean; results?: any[]; skill_tree?: SkillTreeItem[] }>(
          "/api/v1/app/tutor/diagnostic",
          { subject: "6", answers: newAnswers },
        );
        if (cal && cal.skill_tree) {
          setSkillTree(cal.skill_tree);
        }
      } catch {
        // Fallback update
        setSkillTree((prev) =>
          prev.map((s) => (s.id === "solve-linear" ? { ...s, mastery_level: 2 } : s)),
        );
      }
    }
  };

  // Request 3-step hint ladder
  const requestHint = async (level: number) => {
    setActiveHintLevel(level);
    try {
      const res = await api.post<{
        ok?: boolean;
        hint?: string;
        feedback?: string;
      }>("/api/v1/app/tutor/turn", {
        skill_id: "solve-linear",
        step: level,
        answer: "",
        mode: "guided",
        subject: "6",
      });
      if (res && (res.hint || res.feedback)) {
        setHintText(res.hint || res.feedback || "");
      }
    } catch {
      const fallbacks = [
        "Nudge: Look at the number added to the variable term.",
        "Step-by-Step: Subtract 5 from both 2x + 5 and 15 to get 2x = 10.",
        "Worked Example: 2x = 10 implies x = 10 / 2 = 5.",
      ];
      setHintText(fallbacks[level - 1] ?? fallbacks[0] ?? "");
    }
  };

  const send = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const q = (customQuestion || text).trim();
    if (!q || busy) return;
    const id = turns.length;
    setTurns((ts) => [...ts, { id, question: q }]);
    setText("");
    setBusy(true);
    setActiveHintLevel(0);
    setHintText("");

    try {
      const resp = await api.post<{
        answer?: string;
        text?: string;
        reply?: string;
        citations?: Array<{ title?: string; id?: string }>;
        sources?: string[];
        checkYourself?: string;
        check_question?: string;
        socratic?: TutorTracker;
      }>("/api/v1/app/coach", {
        question: q,
        reply_language: bcp47,
        mode: tutorMode === "guided" ? "socratic" : "direct",
        current_level: skillTree.find((s) => s.id === "solve-linear")?.mastery_level || 2,
      });

      const answerText = resp.answer || resp.text || resp.reply;
      if (answerText) {
        const sourcesList =
          resp.sources ||
          (resp.citations
            ? resp.citations.map((c) => c.title || c.id || "Class 8 RHS-C08 Manual")
            : ["Class 8 RHS-C08 Manual"]);

        if (resp.socratic?.all_skills) {
          setSkillTree((prev) =>
            prev.map((s) => {
              const found = resp.socratic?.all_skills?.find((x) => x.id === s.id);
              return found ? { ...s, mastery_level: found.level } : s;
            }),
          );
        }

        setTurns((ts) =>
          ts.map((x) =>
            x.id !== id
              ? x
              : {
                  ...x,
                  tutor: resp.socratic,
                  reply: {
                    id: `resp-${id}`,
                    question: q,
                    answer: answerText,
                    checkYourself:
                      resp.socratic?.diagnostic_question ||
                      resp.check_question ||
                      resp.checkYourself ||
                      "Verify your reasoning with the chapter balance method.",
                    sources: sourcesList,
                  },
                },
          ),
        );
        setBusy(false);
        return;
      }
    } catch (err) {
      console.warn("Backend coach API unavailable, using fallback:", err);
    }

    const reply = pickReply(q, id);
    setTurns((ts) =>
      ts.map((x) =>
        x.id !== id ? x : m.reply === "error" || !reply ? { ...x, failed: true } : { ...x, reply },
      ),
    );
    setBusy(false);
  };

  const stop = () => {
    clearTimeout(timer.current);
    setBusy(false);
    setTurns((ts) => ts.filter((x) => x.reply || x.failed));
  };

  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-8">
      {/* Left Column: Skill Tree, Mode, & Benchmark (32%) */}
      <div className="space-y-6">
        <div>
          <PageHeading titleKey="pages.coach" />
          <div className="max-w-reading space-y-1 text-ink mt-1">
            <p>{s("line1")}</p>
            <p className="text-sm text-ink-muted">
              Learn concepts step-by-step with guided hints, spoken math voice, and verified chapter
              citations.
            </p>
          </div>
        </div>

        {/* Guided Mastery Tutor Mode Selector */}
        <div className="rounded-surface border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="text-brand size-5" />
              <span className="font-heading font-semibold text-ink text-sm">Tutor Mode</span>
            </div>
            <span className="rounded-pill bg-brand/10 text-brand px-2.5 py-0.5 text-xs font-medium">
              Guided Mastery
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTutorMode("guided")}
              className={`rounded-card border p-2.5 text-left transition-all ${
                tutorMode === "guided"
                  ? "border-brand bg-brand/5 ring-1 ring-brand text-ink"
                  : "border-border bg-page-bg text-ink-muted hover:text-ink"
              }`}
            >
              <div className="font-semibold text-xs text-brand">Guided Mode</div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                Probing questions, one step at a time, targeted hint ladder.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTutorMode("direct")}
              className={`rounded-card border p-2.5 text-left transition-all ${
                tutorMode === "direct"
                  ? "border-brand bg-brand/5 ring-1 ring-brand text-ink"
                  : "border-border bg-page-bg text-ink-muted hover:text-ink"
              }`}
            >
              <div className="font-semibold text-xs">Direct Reference Mode</div>
              <div className="text-[11px] text-ink-muted mt-0.5">
                Immediate factual explanations and direct textbook excerpts.
              </div>
            </button>
          </div>

          {/* Skill Ladder (Levels 0 to 5) */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-ink mb-2">
              <span className="flex items-center gap-1.5">
                <Award className="size-4 text-amber-500" />
                Your Skill Ladder (Levels 0–5)
              </span>
              <button
                type="button"
                onClick={startDiagnostic}
                className="text-xs text-brand font-semibold hover:underline inline-flex items-center gap-1"
              >
                Quick 3-Question Check →
              </button>
            </div>
            <div className="space-y-2.5">
              {skillTree.map((sk) => {
                const isLocked = sk.status === "Locked";
                const isMastered = sk.mastery_level >= 4;
                return (
                  <div
                    key={sk.id}
                    className="text-xs rounded-xl border border-slate-200 p-3 bg-slate-50/60 shadow-2xs"
                  >
                    <div className="flex justify-between items-center text-[11px] mb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        {isLocked ? (
                          <Lock size={13} className="text-slate-400" />
                        ) : isMastered ? (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        ) : (
                          <Unlock size={13} className="text-secondary" />
                        )}
                        <span>{sk.name}</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          sk.mastery_level >= 3
                            ? "bg-emerald-100 text-emerald-800"
                            : sk.status === "Review Due"
                              ? "bg-amber-100 text-amber-800"
                              : sk.status === "Locked"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-cyan-100 text-cyan-800"
                        }`}
                      >
                        {sk.status} • Level {sk.mastery_level}/5
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary transition-all duration-300"
                        style={{ width: `${(sk.mastery_level / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Diagnostic Placement Modal / Card */}
        {showDiagnostic && (
          <div className="rounded-surface border border-brand/40 bg-brand/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xs font-bold text-ink">
                Quick 3-Question Diagnostic Check
              </h3>
              <button
                type="button"
                onClick={() => setShowDiagnostic(false)}
                className="text-xs text-ink-muted hover:text-ink font-semibold"
              >
                ✕ Close
              </button>
            </div>

            {!diagComplete && diagnosticQuestions[diagStep] ? (
              <div className="space-y-2.5">
                <div className="flex justify-between text-[11px] text-ink-muted">
                  <span>
                    Question {diagStep + 1} of {diagnosticQuestions.length}
                  </span>
                </div>
                <p className="text-xs font-semibold text-ink">
                  {diagnosticQuestions[diagStep].question}
                </p>
                <div className="space-y-1.5">
                  {diagnosticQuestions[diagStep].options.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => answerDiagnostic(idx)}
                      className="w-full text-left rounded border border-border bg-surface px-3 py-1.5 text-xs hover:border-brand hover:bg-brand/5 transition-colors"
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-2 space-y-1.5">
                <CheckCircle2 className="size-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-ink">Starting Level Calibrated!</p>
                <p className="text-[11px] text-ink-muted">
                  Your skill ladder has been updated with verified starting masteries.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDiagnostic(false)}
                  className="btn-primary text-xs py-1 px-3 mt-1"
                >
                  Continue Tutoring
                </button>
              </div>
            )}
          </div>
        )}

        <nav
          aria-label={s("quick")}
          className="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap"
        >
          <Link to="/learn/gap" className="btn-secondary text-xs">
            {s("plan")}
          </Link>
          <Link to="/active-quizzes" className="btn-secondary text-xs">
            {s("quiz")}
          </Link>
          <Link to="/learn/flashcards" className="btn-secondary text-xs">
            {s("flashcards")}
          </Link>
          <Link to="/manuals" className="btn-secondary text-xs inline-flex items-center gap-1">
            <BookOpen size={14} />
            eBooks & Textbooks
          </Link>
        </nav>

        {/* Enterprise Suite: Benchmark Diagnostic */}
        <div className="pt-2">
          <SkillBenchmarkWidget userId="6" />
        </div>
      </div>

      {/* Right Column: Chat Conversation (68%) & Action Drawers */}
      <div className="space-y-6">
        <section
          aria-label={s("conversation")}
          className="flex min-h-[62vh] flex-col rounded-surface border border-border bg-surface shadow-xs"
        >
          {!m.lessonsLinked ? (
            <div className="p-4">
              <EmptyState title={s("empty")} help={s("emptyHelp")} />
            </div>
          ) : (
            <>
              <ol className="flex-1 space-y-4 overflow-y-auto p-4 max-h-[60vh]">
                {turns.length === 0 && (
                  <div className="rounded-card border border-dashed border-border p-6 text-center text-ink-muted text-sm">
                    <Brain className="mx-auto size-8 text-brand/60 mb-2" />
                    <p className="font-semibold text-ink">Ask Vidura — Guided Mastery Tutor</p>
                    <p className="text-xs mt-1">
                      Ask questions about your Class 8 lessons or speak with math dictation in your
                      preferred Indian language.
                    </p>
                  </div>
                )}
                {turns.map((x) => (
                  <li key={x.id} className="space-y-3">
                    <div className="ml-auto max-w-[85%] rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 text-slate-900 shadow-2xs">
                      <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-1">
                        {s("yourQuestion")}
                      </p>
                      <p className="text-sm font-medium leading-relaxed">{x.question}</p>
                    </div>
                    {x.failed && <ErrorAlert message={s("error")} />}
                    {x.reply && (
                      <Reply
                        ex={x.reply}
                        tutor={x.tutor}
                        noSources={m.reply === "noSources"}
                        onAskFollowUp={(followUp) => send(undefined, followUp)}
                      />
                    )}
                  </li>
                ))}
              </ol>
              <p role="status" className="px-4 text-xs text-ink-muted">
                {busy ? s("thinking") : ""}
              </p>

              {/* 3-Step Hint Ladder Bar */}
              <div className="border-t border-border/70 bg-page-bg/80 px-4 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-ink inline-flex items-center gap-1">
                    <Lightbulb size={13} className="text-amber-500" />
                    3-Step Hint Ladder:
                  </span>
                  <span className="text-[11px] text-ink-muted">Need a step forward?</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => requestHint(1)}
                    className={`rounded border px-2 py-1 text-center text-[11px] font-medium transition-colors ${
                      activeHintLevel === 1
                        ? "border-brand bg-brand/10 text-brand font-bold"
                        : "border-border bg-surface text-ink hover:border-brand"
                    }`}
                  >
                    Hint 1 (Nudge)
                  </button>
                  <button
                    type="button"
                    onClick={() => requestHint(2)}
                    className={`rounded border px-2 py-1 text-center text-[11px] font-medium transition-colors ${
                      activeHintLevel === 2
                        ? "border-brand bg-brand/10 text-brand font-bold"
                        : "border-border bg-surface text-ink hover:border-brand"
                    }`}
                  >
                    Hint 2 (Step-by-Step)
                  </button>
                  <button
                    type="button"
                    onClick={() => requestHint(3)}
                    className={`rounded border px-2 py-1 text-center text-[11px] font-medium transition-colors ${
                      activeHintLevel === 3
                        ? "border-brand bg-brand/10 text-brand font-bold"
                        : "border-border bg-surface text-ink hover:border-brand"
                    }`}
                  >
                    Hint 3 (Worked Example)
                  </button>
                </div>
                {hintText && (
                  <div className="mt-2 rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 animate-fadeIn">
                    💡 {hintText}
                  </div>
                )}
              </div>

              {/* Input Form with Voice Mode Selector */}
              <form
                onSubmit={(e) => send(e)}
                className="sticky bottom-0 space-y-2 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
              >
                <div className="flex items-center justify-between gap-2">
                  <CoachStarterChips
                    onSelect={(prompt) => {
                      setText(prompt);
                      input.current?.focus();
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={voiceCleanupMode}
                      onChange={(e) => setVoiceCleanupMode(e.target.value as "smart" | "exact")}
                      className="text-[11px] rounded border border-border bg-page-bg px-2 py-1 text-ink-muted hover:text-ink focus:outline-none"
                      title="Voice cleanup mode"
                    >
                      <option value="smart">Smart Math Cleanup</option>
                      <option value="exact">Exact Words</option>
                    </select>
                    <VoiceInputButton
                      onTranscript={(transcript) => {
                        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
                        input.current?.focus();
                      }}
                      lang={bcp47}
                      cleanupMode={voiceCleanupMode}
                    />
                  </div>
                </div>

                <label htmlFor="coach-q" className="sr-only">
                  {s("yourQuestion")}
                </label>
                <textarea
                  ref={input}
                  id="coach-q"
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ask Vidura a concept question, or click Voice..."
                  className="w-full rounded-surface border border-border bg-surface p-2.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy || !text.trim()}
                      className="btn-primary text-xs py-1.5"
                    >
                      {s("send")}
                    </button>
                    {busy && (
                      <button type="button" onClick={stop} className="btn-secondary text-xs py-1.5">
                        {s("stop")}
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-muted font-medium">
                    {tutorMode === "guided" ? "Guided Mastery Mode" : "Direct Mode"}
                  </span>
                </div>
              </form>
            </>
          )}
        </section>

        {/* Prominent Action Cards: Chat Quiz Minter & Revision Notes Sheet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChatQuizMinter userId="6" defaultTopic="Linear Equations & Industrial Balance" />
          <RevisionNotesSheet userId="6" defaultTopic="Linear Equations & Industrial Balance" />
        </div>
      </div>
    </div>
  );
}

function Reply({
  ex,
  tutor,
  noSources,
  onAskFollowUp,
}: {
  ex: CoachExchange;
  tutor?: TutorTracker | undefined;
  noSources: boolean;
  onAskFollowUp?: ((q: string) => void) | undefined;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const { bcp47 } = useLocale();

  return (
    <div className="max-w-[94%] rounded-surface border border-border bg-page-bg p-3.5 text-ink space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
          <Sparkles size={14} />
          {s("coach")}
        </div>
        <VoiceListenButton text={`${ex.answer}. ${ex.checkYourself}`} lang={bcp47} />
      </div>

      {noSources ? (
        <p className="text-sm">{s("notFound")}</p>
      ) : (
        <>
          <p className="text-sm leading-relaxed">{ex.answer}</p>

          {/* Guiding Question Check Card */}
          {ex.checkYourself && (
            <div className="rounded-surface bg-highlight p-3 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-1">
                <HelpCircle size={14} className="text-brand" />
                <span>Guided Check Question</span>
              </div>
              <p className="text-xs text-ink">{ex.checkYourself}</p>
              {tutor?.hint && (
                <p className="text-[11px] text-ink-muted italic mt-1.5">💡 Hint: {tutor.hint}</p>
              )}
              {onAskFollowUp && (
                <button
                  type="button"
                  onClick={() => onAskFollowUp(`How do I answer: "${ex.checkYourself}"?`)}
                  className="mt-2 text-[11px] font-semibold text-brand hover:underline inline-flex items-center gap-1"
                >
                  Work through this step →
                </button>
              )}
            </div>
          )}

          {/* Level-Up Celebration Badge */}
          {tutor?.leveled_up && (
            <div className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-50 border border-emerald-300 px-3 py-1 text-xs text-emerald-800">
              <Award size={14} className="text-emerald-600" />
              <span>
                Level Up! Advanced to <strong>Level {tutor.mastery_level}</strong> in{" "}
                {tutor.skill_name}
              </span>
            </div>
          )}

          <ul aria-label={t("shared.ai.sourcesLearner")} className="flex flex-wrap gap-1.5 pt-1">
            {ex.sources.map((source) => (
              <li
                key={source}
                className="rounded-full border border-secondary/30 bg-primary-fixed px-2.5 py-0.5 text-xs text-secondary font-medium"
              >
                {source}
              </li>
            ))}
          </ul>
        </>
      )}

      <AITrustNote audience="learner" sources={[]} />

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
        <span className="text-xs text-ink-muted">{s("helpful")}</span>
        {(["up", "down"] as const).map((v) => {
          const Icon = v === "up" ? ThumbsUp : ThumbsDown;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={vote === v}
              aria-label={s(v === "up" ? "yes" : "no")}
              onClick={() => setVote(vote === v ? null : v)}
              className={`inline-flex size-8 items-center justify-center rounded-surface border ${
                vote === v
                  ? "border-brand bg-highlight text-brand"
                  : "border-border bg-surface text-ink-muted"
              }`}
            >
              <Icon aria-hidden size={14} />
            </button>
          );
        })}
        <span role="status" className="text-xs text-ink-muted">
          {vote ? s("thanks") : ""}
        </span>
      </div>
    </div>
  );
}
