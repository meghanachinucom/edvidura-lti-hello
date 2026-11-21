import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Lock,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  Unlock,
  ArrowRight,
  X,
} from "lucide-react";
import { t, useLocale } from "@/i18n";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { VoiceInputButton, VoiceListenButton } from "@/components/shared/VoiceControls";
import { coachExchanges, type CoachExchange } from "@/data/coach";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import { ChatQuizMinter } from "@/components/enterprise/ChatQuizMinter";
import { RevisionNotesSheet } from "@/components/enterprise/RevisionNotesSheet";

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

const STUDENT_STARTER_CHIPS = [
  "Help me solve 2x + 5 = 15 step by step",
  "Explain variables with a simple example",
  "Quiz me on what I learned today",
];

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

  // Top Bar Controls State
  const [selectedTopic, setSelectedTopic] = useState("Linear Equations & Balancing");
  const [tutorMode, setTutorMode] = useState<"guided" | "direct">("guided");
  const [voiceCleanupMode, setVoiceCleanupMode] = useState<"smart" | "exact">("smart");

  // Skill Tree Data
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

  // Chat State
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeHintLevel, setActiveHintLevel] = useState<number>(0);
  const [hintText, setHintText] = useState<string>("");

  // Diagnostic State (Tab 1: Progress)
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<any[]>([]);
  const [diagStep, setDiagStep] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState<Record<string, number>>({});
  const [diagComplete, setDiagComplete] = useState(false);
  const [diagTier, setDiagTier] = useState("Proficient");
  const [diagPercentile, setDiagPercentile] = useState(84);

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [turns, busy, hintText]);

  // Fetch live skill tree on mount
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

  // Diagnostic flow inside Progress tab
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
        const cal = await api.post<{
          ok?: boolean;
          results?: any[];
          skill_tree?: SkillTreeItem[];
          tier?: string;
          percentile?: number;
        }>("/api/v1/app/tutor/diagnostic", { subject: "6", answers: newAnswers });
        if (cal && cal.skill_tree) {
          setSkillTree(cal.skill_tree);
        }
        if (cal?.tier) setDiagTier(cal.tier);
        if (cal?.percentile) setDiagPercentile(cal.percentile);

        // Also notify skills benchmark endpoint
        await api.post("/api/v1/skills/benchmark/start", {
          user_id: "6",
          skill_code: "solve-linear",
          measured_score: 85,
        });
      } catch {
        // Fallback update
        setSkillTree((prev) =>
          prev.map((s) => (s.id === "solve-linear" ? { ...s, mastery_level: 3 } : s)),
        );
        setDiagTier("Proficient");
        setDiagPercentile(84);
      }
    }
  };

  // Step through Hint Ladder inside Guided Coach mode
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
        "Nudge: Look at the number added to the variable term (+5).",
        "Step-by-Step: Subtract 5 from both 2x + 5 and 15 to get 2x = 10.",
        "Worked Example: 2x = 10 implies x = 10 / 2 = 5.",
      ];
      setHintText(fallbacks[level - 1] ?? fallbacks[0] ?? "");
    }
  };

  // Send question to Vidura
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
    <div className="mx-auto w-full max-w-content px-4 py-6 space-y-6">
      {/* 1. CLEAN, UNCLUTTERED TOP BAR (ONE SINGLE ROW) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-ink flex items-center gap-2">
            <Sparkles className="size-6 text-secondary" />
            <span>Ask Vidura</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Ask any doubt by typing or speaking — I'll guide you step by step.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Topic Dropdown */}
          <div className="relative inline-flex items-center">
            <label htmlFor="coach-topic-select" className="sr-only">
              Topic Selection
            </label>
            <select
              id="coach-topic-select"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary cursor-pointer"
            >
              <option value="Linear Equations & Balancing">Topic: Linear Equations</option>
              <option value="Variables & Expressions">Topic: Variables & Expressions</option>
              <option value="Linear Word Problems">Topic: Linear Word Problems</option>
              <option value="Graphing Lines & Coordinates">Topic: Graphing Lines</option>
            </select>
          </div>

          {/* Simple 2-option Pill Toggle */}
          <div className="inline-flex rounded-full bg-surface-raised p-1 border border-border shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTutorMode("guided")}
              className={`rounded-full px-3 py-1 transition-all ${
                tutorMode === "guided"
                  ? "bg-secondary text-white font-bold shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Guided Coach
            </button>
            <button
              type="button"
              onClick={() => setTutorMode("direct")}
              className={`rounded-full px-3 py-1 transition-all ${
                tutorMode === "direct"
                  ? "bg-secondary text-white font-bold shadow-xs"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Quick Answer
            </button>
          </div>
        </div>
      </div>

      {/* 2. BALANCED 2-COLUMN WORKSPACE (CHAT IS THE HERO — ZERO STACKED CLUTTER) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Column (~58% on desktop) — Focused Chat Card (sticky so chat remains in view) */}
        <section
          aria-label={s("conversation")}
          className="lg:col-span-7 xl:col-span-7 lg:sticky lg:top-4 flex flex-col rounded-surface border border-border bg-surface shadow-xs min-h-[580px] h-[780px] overflow-hidden"
        >
          {/* Scrollable Chat Area */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {turns.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto my-auto">
                <div className="size-14 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shadow-2xs">
                  <Brain size={30} />
                </div>
                <div className="space-y-1">
                  <h2 className="font-heading text-lg font-bold text-ink">
                    Hi! I'm Vidura, your personal learning tutor.
                  </h2>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Ask me any concept question about Class 8 Algebra, or tap one of the common
                    topics below to start our guided step-by-step session:
                  </p>
                </div>

                {/* Friendly Starter Chips in Hero Empty State */}
                <div className="flex flex-col w-full gap-2 pt-2">
                  {STUDENT_STARTER_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => send(undefined, chip)}
                      className="w-full text-left rounded-control border border-border bg-page-bg hover:bg-secondary/5 hover:border-secondary p-2.5 text-xs font-semibold text-ink transition-colors flex items-center justify-between group"
                    >
                      <span>{chip}</span>
                      <ArrowRight
                        size={13}
                        className="text-secondary opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((x) => (
              <div key={x.id} className="space-y-3">
                {/* Student message bubble on right */}
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-xs bg-secondary/10 border border-secondary/20 p-3.5 text-ink shadow-2xs">
                  <div className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
                    You
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{x.question}</p>
                </div>

                {x.failed && <ErrorAlert message={s("error")} />}

                {/* Vidura reply bubble on left */}
                {x.reply && (
                  <Reply
                    ex={x.reply}
                    tutor={x.tutor}
                    tutorMode={tutorMode}
                    noSources={m.reply === "noSources"}
                    onAskFollowUp={(followUp) => send(undefined, followUp)}
                  />
                )}
              </div>
            ))}

            {busy && (
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-xs bg-page-bg border border-border p-3 text-xs text-ink-muted flex items-center gap-2">
                <Sparkles size={14} className="text-secondary animate-spin" />
                <span>{s("thinking")}</span>
              </div>
            )}
          </div>

          {/* Compact Hint Strip (Only when active in Guided Coach mode) */}
          {tutorMode === "guided" && (
            <div className="border-t border-border/70 bg-page-bg/70 px-4 py-2 flex items-center justify-between text-xs transition-colors">
              <div className="flex items-center gap-2 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const nextLevel = activeHintLevel >= 3 ? 1 : activeHintLevel + 1;
                    requestHint(nextLevel);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 font-bold text-amber-800 hover:bg-amber-500/20 transition-colors shrink-0"
                >
                  <Lightbulb size={13} className="text-amber-600" />
                  <span>Need a Hint?</span>
                  {activeHintLevel > 0 && (
                    <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                      {activeHintLevel === 1
                        ? "1: Nudge"
                        : activeHintLevel === 2
                          ? "2: Step-by-Step"
                          : "3: Worked Example"}
                    </span>
                  )}
                </button>
                {hintText && (
                  <span className="text-ink text-xs truncate font-medium">💡 {hintText}</span>
                )}
              </div>
              {activeHintLevel > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveHintLevel(0);
                    setHintText("");
                  }}
                  className="text-ink-muted hover:text-ink text-xs underline shrink-0 ml-2"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* Single Clean Bottom Input Bar */}
          <form
            onSubmit={(e) => send(e)}
            className="border-t border-border bg-surface p-3 sm:p-4 space-y-2.5"
          >
            {/* Friendly Starter Chips above input when turns exist */}
            {turns.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-ink-muted mr-1">Suggested:</span>
                {STUDENT_STARTER_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setText(chip);
                      input.current?.focus();
                    }}
                    className="text-[11px] rounded-full border border-border bg-page-bg px-2.5 py-0.5 text-ink-muted hover:text-secondary hover:border-secondary hover:bg-secondary/5 transition-colors text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={input}
                  id="coach-q"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your question or answer..."
                  className="w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              {/* Compact Mic Button + Cleanup Toggle */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setVoiceCleanupMode(voiceCleanupMode === "smart" ? "exact" : "smart")
                  }
                  title={`Voice input mode: ${voiceCleanupMode === "smart" ? "Smart Math Cleanup active" : "Exact Words"}`}
                  className="rounded-control border border-border bg-page-bg px-2.5 py-2 text-xs font-semibold text-ink-muted hover:text-secondary hover:border-secondary transition-colors"
                >
                  {voiceCleanupMode === "smart" ? "Smart Math" : "Exact"}
                </button>
                <VoiceInputButton
                  onTranscript={(transcript) => {
                    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
                    input.current?.focus();
                  }}
                  lang={bcp47}
                  cleanupMode={voiceCleanupMode}
                />
              </div>

              {/* Primary Send Button */}
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className="btn-primary inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold shrink-0 disabled:opacity-40"
              >
                <span>Send</span>
                <ArrowRight size={14} />
              </button>
              {busy && (
                <button
                  type="button"
                  onClick={stop}
                  className="btn-secondary py-2.5 px-3 text-xs shrink-0 font-semibold"
                >
                  Stop
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Right Side Column (~42% width on desktop) — 3 Individual, Clearly Visible Study Tools Boxes */}
        <aside aria-label="Study Tools" className="lg:col-span-5 xl:col-span-5 space-y-6">
          {/* Box 1: My Skill Levels (0–5) */}
          <div className="rounded-surface border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                  Class 8 Algebra I · Active Curriculum
                </span>
                <h3 className="text-sm sm:text-base font-bold text-ink font-heading flex items-center gap-1.5 mt-0.5">
                  <Award size={16} className="text-amber-500" />
                  <span>My Skill Levels (0–5)</span>
                </h3>
              </div>
              <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full shrink-0">
                {diagTier} Tier
              </span>
            </div>

            <div className="space-y-2.5">
              {skillTree.map((sk) => {
                const isLocked = sk.status === "Locked";
                const isMastered = sk.mastery_level >= 4;
                return (
                  <div
                    key={sk.id}
                    className="rounded-control border border-border bg-page-bg p-3 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-ink flex items-center gap-1.5 truncate max-w-[200px]">
                        {isLocked ? (
                          <Lock size={12} className="text-ink-muted shrink-0" />
                        ) : isMastered ? (
                          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Unlock size={12} className="text-secondary shrink-0" />
                        )}
                        <span className="truncate">{sk.name}</span>
                      </span>
                      <span className="text-[11px] font-bold text-secondary shrink-0">
                        Level {sk.mastery_level}/5
                      </span>
                    </div>

                    {/* Clean horizontal progress bar */}
                    <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary transition-all duration-300 rounded-full"
                        style={{ width: `${(sk.mastery_level / 5) * 100}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-ink-muted">
                      <span>{sk.status}</span>
                      <span className="font-medium text-ink">
                        {sk.mastery_level >= 3
                          ? "Proficient"
                          : sk.mastery_level >= 2
                            ? "Building Confidence"
                            : "Foundational"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Check My Level Button & Diagnostic View */}
            {!showDiagnostic && !diagComplete && (
              <div className="pt-2 border-t border-border space-y-3">
                <button
                  type="button"
                  onClick={startDiagnostic}
                  className="btn-primary w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
                >
                  <Award size={14} />
                  <span>Check My Level (3-Q Check)</span>
                </button>

                {/* Benchmark standing badge */}
                <div className="rounded-control border border-border bg-page-bg p-3 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-secondary">
                      {diagTier} Tier
                    </span>
                    <span className="text-xs font-bold text-ink">
                      {diagPercentile}th Percentile
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    Standardized Class 8 Algebra curriculum diagnostic check.
                  </p>
                </div>
              </div>
            )}

            {/* Interactive Diagnostic running right inside Box 1 */}
            {showDiagnostic && !diagComplete && diagnosticQuestions[diagStep] && (
              <div className="rounded-control border border-secondary/40 bg-secondary/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-secondary/20 pb-2">
                  <span className="font-bold text-secondary">
                    Question {diagStep + 1} of {diagnosticQuestions.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDiagnostic(false)}
                    className="text-ink-muted hover:text-ink text-xs inline-flex items-center gap-1"
                  >
                    <X size={12} />
                    <span>Cancel</span>
                  </button>
                </div>

                <p className="text-xs font-semibold text-ink leading-relaxed">
                  {diagnosticQuestions[diagStep].question}
                </p>

                <div className="space-y-1.5">
                  {diagnosticQuestions[diagStep].options.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => answerDiagnostic(idx)}
                      className="w-full text-left rounded-control border border-border bg-surface px-3 py-2 text-xs text-ink hover:border-secondary hover:bg-secondary/5 transition-colors"
                    >
                      <span className="font-bold text-secondary mr-1.5">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnostic Completed Result */}
            {diagComplete && (
              <div className="rounded-control border border-emerald-300 bg-emerald-50/70 p-4 text-center space-y-2">
                <CheckCircle2 className="size-7 text-emerald-600 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    Level Calibrated · {diagTier} Tier
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    {diagPercentile}th Percentile Standing in Class 8 Algebra
                  </p>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Your skill ladder has been updated with calibrated masteries.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDiagComplete(false);
                    setShowDiagnostic(false);
                  }}
                  className="btn-secondary text-xs py-1.5 px-4 font-bold"
                >
                  Done
                </button>
              </div>
            )}

            {/* Quick Academic Navigation Links */}
            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
              <Link
                to="/manuals"
                className="text-ink-muted hover:text-secondary underline inline-flex items-center gap-1"
              >
                <BookOpen size={12} />
                <span>Class 8 Manuals</span>
              </Link>
              <span className="text-border">·</span>
              <Link to="/active-quizzes" className="text-ink-muted hover:text-secondary underline">
                All Quizzes
              </Link>
              <span className="text-border">·</span>
              <Link to="/learn/gap" className="text-ink-muted hover:text-secondary underline">
                Study Plan
              </Link>
            </div>
          </div>

          {/* Box 2: Instant 3-Question Practice Quiz */}
          <ChatQuizMinter userId="6" defaultTopic={selectedTopic} />

          {/* Box 3: Personalized 2-Page Study Sheet */}
          <RevisionNotesSheet userId="6" defaultTopic={selectedTopic} />
        </aside>
      </div>
    </div>
  );
}

function Reply({
  ex,
  tutor,
  tutorMode,
  noSources,
  onAskFollowUp,
}: {
  ex: CoachExchange;
  tutor?: TutorTracker | undefined;
  tutorMode?: "guided" | "direct";
  noSources: boolean;
  onAskFollowUp?: ((q: string) => void) | undefined;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const { bcp47 } = useLocale();

  return (
    <div className="mr-auto max-w-[92%] rounded-2xl rounded-tl-xs bg-page-bg border border-border p-4 text-ink space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
          <Sparkles size={14} />
          <span>Vidura Tutor</span>
          {tutorMode === "guided" && (
            <span className="text-[10px] font-bold text-secondary/90 bg-secondary/10 px-2 py-0.5 rounded-full ml-1">
              Step Guide
            </span>
          )}
        </div>
        {/* Subtle Listen Aloud speaker icon button */}
        <VoiceListenButton text={`${ex.answer}. ${ex.checkYourself}`} lang={bcp47} />
      </div>

      {noSources ? (
        <p className="text-sm">{s("notFound")}</p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-ink">{ex.answer}</p>

          {/* Guiding Question Check Card */}
          {ex.checkYourself && (
            <div className="rounded-control bg-secondary/5 p-3 border border-secondary/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <HelpCircle size={14} />
                <span>Guided Step Check</span>
              </div>
              <p className="text-xs text-ink font-medium">{ex.checkYourself}</p>
              {tutor?.hint && (
                <p className="text-xs text-ink-muted italic">💡 Hint: {tutor.hint}</p>
              )}
              {onAskFollowUp && (
                <button
                  type="button"
                  onClick={() => onAskFollowUp(`How do I answer: "${ex.checkYourself}"?`)}
                  className="mt-1 text-xs font-bold text-secondary hover:underline inline-flex items-center gap-1"
                >
                  <span>Work through this step</span>
                  <ArrowRight size={12} />
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

          {/* Verified Sources */}
          <ul aria-label={t("shared.ai.sourcesLearner")} className="flex flex-wrap gap-1.5 pt-1">
            {ex.sources.map((source) => (
              <li
                key={source}
                className="rounded-full border border-secondary/30 bg-primary-fixed px-2.5 py-0.5 text-[11px] text-secondary font-semibold"
              >
                {source}
              </li>
            ))}
          </ul>
        </>
      )}

      <AITrustNote audience="learner" sources={[]} />

      {/* Helpful Feedback */}
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
              className={`inline-flex size-7 items-center justify-center rounded-control border ${
                vote === v
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              <Icon aria-hidden size={13} />
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
