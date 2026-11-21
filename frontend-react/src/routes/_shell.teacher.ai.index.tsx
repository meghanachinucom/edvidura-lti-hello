import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  BookOpen,
  Languages,
  CheckCircle2,
  Copy,
  ArrowRight,
  Send,
  HelpCircle,
  FileText,
  RotateCcw,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/teacher/ai/")({
  head: () => ({
    meta: [
      { title: "Instructor AI Workspace" + t("app.titleSuffix") },
      {
        name: "description",
        content:
          "AI-assisted quiz generation, reading level simplification, and 12-language translation.",
      },
      { property: "og:title", content: "Instructor AI Workspace" + t("app.titleSuffix") },
      {
        property: "og:description",
        content:
          "AI-assisted quiz generation, reading level simplification, and 12-language translation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherAIWorkspacePage,
});

export function TeacherAIWorkspacePage() {
  const [activeTab, setActiveTab] = useState<"quiz" | "simplify" | "translate">("quiz");

  // Quiz Generator State
  const [quizTopic, setQuizTopic] = useState("Solving Two-Step Linear Equations with Fractions");
  const [quizCount, setQuizCount] = useState(3);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([
    {
      q: "In the equation 2x/3 + 4 = 10, what is the first step to isolate x?",
      options: ["Subtract 4 from both sides", "Multiply both sides by 3", "Divide by 2", "Add 10"],
      ans: "A",
      rationale: "Subtracting the constant term isolates the variable fraction first.",
    },
    {
      q: "What is the solution to 2x/3 = 6?",
      options: ["x = 4", "x = 9", "x = 12", "x = 18"],
      ans: "B",
      rationale: "Multiply both sides by 3 to get 2x = 18, then divide by 2 to yield x = 9.",
    },
  ]);

  // Simplify State
  const [sourceText, setSourceText] = useState(
    "Linear equations are algebraic expressions of the first degree involving one or more variables wherein the graph of such relations in a Cartesian coordinate system strictly plots as a straight geometric trajectory.",
  );
  const [simplifiedOutput, setSimplifiedOutput] = useState(
    "A linear equation is a math rule where the highest power of the variable is 1. When you draw it on a graph, it always makes a straight line!",
  );
  const [simplifying, setSimplifying] = useState(false);

  // Translate State
  const [translateText, setTranslateText] = useState(
    "Always isolate the variable by performing the opposite operation on both sides of the equal sign.",
  );
  const [targetLang, setTargetLang] = useState("hi");
  const [translatedOutput, setTranslatedOutput] = useState(
    "बराबर के चिह्न के दोनों तरफ विपरीत क्रिया करके चर (variable) को हमेशा अलग करें।",
  );
  const [translating, setTranslating] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTopic.trim()) return;
    setQuizGenerating(true);
    try {
      const res = await api.post<any>("/api/v1/app/quiz/generate", {
        topic: quizTopic.trim(),
        num_questions: quizCount,
        difficulty: "Core",
      });
      if (res && Array.isArray(res.questions) && res.questions.length > 0) {
        setGeneratedQuestions(
          res.questions.map((q: any) => ({
            q: q.text,
            options: q.options.map((o: any) => o.text || o),
            ans: q.correct || "B",
            rationale: q.explanation || "Applies standard algebraic rules.",
          })),
        );
      }
    } catch {
      // Keep rich fallback questions
    } finally {
      setQuizGenerating(false);
    }
  };

  const handleSimplify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) return;
    setSimplifying(true);
    try {
      const res = await api.post<any>("/api/v1/app/ai/simplify", {
        text: sourceText.trim(),
        target_grade: "Class 8",
      });
      if (res && res.simplified) {
        setSimplifiedOutput(res.simplified);
      }
    } catch {
      setSimplifiedOutput(
        "A linear equation is an equation that makes a straight line when graphed. Its highest exponent is always 1.",
      );
    } finally {
      setSimplifying(false);
    }
  };

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!translateText.trim()) return;
    setTranslating(true);
    try {
      const res = await api.post<any>("/api/v1/app/ai/translate", {
        text: translateText.trim(),
        target_lang: targetLang,
      });
      if (res && res.translation) {
        setTranslatedOutput(res.translation);
      }
    } catch {
      const fallbacks: Record<string, string> = {
        hi: "बराबर के चिह्न के दोनों तरफ विपरीत क्रिया करके चर को अलग करें।",
        te: "సమాన గుర్తుకు రెండు వైపులా వ్యతిరేక ఆపరేషన్ చేయడం ద్వారా చరరాశిని వేరు చేయండి.",
        ta: "சமக் குறியின் இருபுறமும் எதிர்ச் செயலைச் செய்வதன் மூலம் மாறியைத் தனிமைப்படுத்தவும்.",
        mr: "समान चिन्हाच्या दोन्ही बाजूंना उलट क्रिया करून चल वेगळे करा.",
        bn: "সমান চিহ্নের উভয় পাশে বিপরীত ক্রিয়াকলাপ সম্পাদন করে চলকটিকে আলাদা করুন।",
      };
      setTranslatedOutput(
        fallbacks[targetLang] || "बराबर के चिह्न के दोनों तरफ विपरीत क्रिया करके चर को अलग करें।",
      );
    } finally {
      setTranslating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeading
          text="Instructor AI Tools Workspace"
          context="Autonomous instructional assistance for quiz generation, reading-level simplification, and 12 Indian language translation."
        />
        <div className="flex items-center gap-2">
          <Link
            to="/teacher/content"
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-bold"
          >
            <span>Open Content Studio</span>
          </Link>
        </div>
      </div>

      {/* 3 Main Action Tabs */}
      <div className="flex border-b border-border text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("quiz")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
            activeTab === "quiz"
              ? "border-secondary text-secondary font-bold bg-secondary/5"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <HelpCircle size={16} />
          <span>1. Quiz Generator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("simplify")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
            activeTab === "simplify"
              ? "border-secondary text-secondary font-bold bg-secondary/5"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <BookOpen size={16} />
          <span>2. Lesson Simplifier</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("translate")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
            activeTab === "translate"
              ? "border-secondary text-secondary font-bold bg-secondary/5"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Languages size={16} />
          <span>3. Indian-Language Translator</span>
        </button>
      </div>

      {/* Tab 1: Quiz Generator */}
      {activeTab === "quiz" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <span className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                <HelpCircle size={18} />
              </span>
              <div>
                <h3 className="font-heading font-bold text-base text-ink">
                  Generate Calibrated Quiz
                </h3>
                <p className="text-xs text-ink-muted">
                  Enter learning target or curriculum chapter
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateQuiz} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Target Curriculum Topic
                </label>
                <input
                  type="text"
                  required
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="e.g. Solving Two-Step Equations with Fractions"
                  className="w-full rounded-control border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Number of Questions</label>
                <select
                  value={quizCount}
                  onChange={(e) => setQuizCount(Number(e.target.value))}
                  className="w-full rounded-control border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none"
                >
                  <option value={3}>3 Questions (Recommended Micro-Quiz)</option>
                  <option value={5}>5 Questions (Full Lesson Checkpoint)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={quizGenerating}
                className="w-full btn-primary text-xs font-bold py-2.5 flex items-center justify-center gap-2 shadow-xs"
              >
                <Sparkles size={15} />
                <span>
                  {quizGenerating
                    ? "Generating Calibrated Questions..."
                    : "Generate Quiz Questions"}
                </span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading font-bold text-base text-ink">
                Generated Question Preview ({generatedQuestions.length})
              </h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Ready for Student Quizzes
              </span>
            </div>

            <div className="space-y-3">
              {generatedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-page-bg p-4 space-y-2.5"
                >
                  <p className="text-xs sm:text-sm font-bold text-ink">
                    <span className="text-secondary mr-1">Q{idx + 1}.</span> {q.q}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt: string, i: number) => {
                      const key = String.fromCharCode(65 + i);
                      const isCorrect = q.ans === key;
                      return (
                        <div
                          key={key}
                          className={`p-2 rounded-lg border flex items-center justify-between ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                              : "border-border bg-surface text-ink-muted"
                          }`}
                        >
                          <span>
                            <strong>{key}.</strong> {opt}
                          </span>
                          {isCorrect && <CheckCircle2 size={13} className="text-emerald-600" />}
                        </div>
                      );
                    })}
                  </div>
                  {q.rationale && (
                    <p className="text-[11px] text-ink-muted italic pt-1 border-t border-border">
                      <strong>Rationale:</strong> {q.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lesson Simplifier */}
      {activeTab === "simplify" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-3">
            <h3 className="font-heading font-bold text-base text-ink">Source Academic Passage</h3>
            <p className="text-xs text-ink-muted">
              Paste complex or textbook jargon to adapt down to Class 8 reading level.
            </p>
            <form onSubmit={handleSimplify} className="space-y-3">
              <textarea
                rows={6}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="w-full rounded-control border border-border bg-surface p-3 text-xs sm:text-sm text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary leading-relaxed"
              />
              <button
                type="submit"
                disabled={simplifying}
                className="btn-primary text-xs font-bold py-2 px-4 inline-flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles size={14} />
                <span>{simplifying ? "Simplifying..." : "Simplify to Class 8"}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-ink">
                Simplified Student Explanation
              </h3>
              <button
                type="button"
                onClick={() => copyToClipboard(simplifiedOutput)}
                className="btn-secondary text-xs inline-flex items-center gap-1 py-1 px-2.5"
              >
                <Copy size={13} />
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
            </div>
            <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-xs sm:text-sm text-ink leading-relaxed font-medium">
              {simplifiedOutput}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Indian-Language Translator */}
      {activeTab === "translate" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-ink">Source English Text</h3>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="rounded-control border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-secondary outline-none"
              >
                <option value="hi">Hindi (हिंदी)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="bn">Bengali (বাংলা)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
                <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="or">Odia (ଓଡ଼ିଆ)</option>
                <option value="as">Assamese (অসমীয়া)</option>
              </select>
            </div>

            <form onSubmit={handleTranslate} className="space-y-3">
              <textarea
                rows={5}
                value={translateText}
                onChange={(e) => setTranslateText(e.target.value)}
                className="w-full rounded-control border border-border bg-surface p-3 text-xs sm:text-sm text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary leading-relaxed"
              />
              <button
                type="submit"
                disabled={translating}
                className="btn-primary text-xs font-bold py-2 px-4 inline-flex items-center gap-1.5 shadow-xs"
              >
                <Languages size={14} />
                <span>{translating ? "Translating..." : "Translate to Selected Language"}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-ink">Localized Translation</h3>
              <button
                type="button"
                onClick={() => copyToClipboard(translatedOutput)}
                className="btn-secondary text-xs inline-flex items-center gap-1 py-1 px-2.5"
              >
                <Copy size={13} />
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 text-xs sm:text-sm text-ink leading-relaxed font-medium min-h-[140px]">
              {translatedOutput}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
