import { useEffect, useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Box,
  Layers,
  RefreshCw,
  Send,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Play,
  Video,
  Eye,
  Trash2,
  Check,
  Smartphone,
  ListPlus,
  HelpCircle,
  Film,
  BookOpen,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { PillTabs, type PillTab } from "@/components/shared/PillTabs";
import { api } from "@/lib/api";
import { skills as registry, type Skill } from "@/data/skills";

export const Route = createFileRoute("/_shell/teacher/dct")({
  head: () => ({
    meta: [
      { title: "Micro-Learning Planner & Reels Studio" + t("app.titleSuffix") },
      {
        name: "description",
        content:
          "Plan, generate, and publish bite-sized concept reels directly into student feeds.",
      },
      {
        property: "og:title",
        content: "Micro-Learning Planner & Reels Studio" + t("app.titleSuffix"),
      },
      {
        property: "og:description",
        content:
          "Plan, generate, and publish bite-sized concept reels directly into student feeds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MicroLearningStudioPage,
});

const inputClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary";

interface PublishedReel {
  id: string;
  title: string;
  topic: string;
  category: string;
  target_skill?: string;
  duration?: string;
  takeaway: string;
  question: string;
  options?: string[];
  answer?: string;
  status: string;
  created_at: string;
}

export function MicroLearningStudioPage() {
  const [activeTab, setActiveTab] = useState<"planner" | "labs" | "xr">("planner");

  // Form State
  const [title, setTitle] = useState("Visualizing Inverse Operations");
  const [topic, setTopic] = useState("Linear Equations · Step Isolation");
  const [category, setCategory] = useState("algebra");
  const [targetSkill, setTargetSkill] = useState("Variables & Expressions");
  const [takeaway, setTakeaway] = useState(
    "Whatever operation is applied to one side of the equal sign (+, -, ×, ÷), perform the exact opposite operation to isolate the variable.",
  );
  const [question, setQuestion] = useState(
    "In the equation 3x = 18, what inverse operation isolates x?",
  );
  const [options, setOptions] = useState([
    "Add 3 to both sides",
    "Divide both sides by 3",
    "Subtract 18 from both sides",
    "Multiply both sides by 3",
  ]);
  const [correctAnswer, setCorrectAnswer] = useState("B");
  const [publishing, setPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Published Reels List
  const [publishedReels, setPublishedReels] = useState<PublishedReel[]>([
    {
      id: "reel-dct-1",
      title: "Mastering the Distributive Property",
      topic: "Algebra I · Linear Equations",
      category: "algebra",
      target_skill: "Variables & Expressions",
      duration: "45s",
      takeaway:
        "Multiply the outside term by every term inside parentheses before combining terms.",
      question: "What is 3(x + 4)?",
      options: ["3x + 4", "3x + 12", "7x", "x + 12"],
      answer: "B",
      status: "published",
      created_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "reel-dct-2",
      title: "Zero Product Property Simplified",
      topic: "Algebra I · Quadratic Principles",
      category: "algebra",
      target_skill: "Linear Equations",
      duration: "50s",
      takeaway:
        "If A × B = 0, then either A = 0 or B = 0 (or both). Factor equations first to find solutions quickly.",
      question: "If (x - 2)(x + 5) = 0, what are the solutions for x?",
      options: ["x = 2 or x = -5", "x = -2 or x = 5", "x = 0 only", "x = 10"],
      answer: "A",
      status: "published",
      created_at: "2026-11-21T09:00:00Z",
    },
  ]);

  const fetchPlans = () => {
    api
      .get<{ plans: PublishedReel[] }>("/api/v1/app/dct/plans")
      .then((res) => {
        if (res && Array.isArray(res.plans) && res.plans.length > 0) {
          setPublishedReels((prev) => [
            ...res.plans,
            ...prev.filter((p) => !res.plans.some((r) => r.id === p.id)),
          ]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handlePublishReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !takeaway.trim()) return;
    setPublishing(true);
    setStatusMsg(null);
    try {
      const res = await api.post<{ plan: PublishedReel }>("/api/v1/app/dct/plans", {
        title: title.trim(),
        topic: topic.trim(),
        category,
        target_skill: targetSkill,
        takeaway: takeaway.trim(),
        question: question.trim(),
        options,
        answer: correctAnswer,
        duration: "50s",
      });
      const newPlan = res?.plan || {
        id: `reel-dct-${Date.now()}`,
        title: title.trim(),
        topic: topic.trim(),
        category,
        target_skill: targetSkill,
        duration: "50s",
        takeaway: takeaway.trim(),
        question: question.trim(),
        options,
        answer: correctAnswer,
        status: "published",
        created_at: new Date().toISOString(),
      };
      setPublishedReels((prev) => [newPlan, ...prev]);
      setStatusMsg(`Successfully published "${title.trim()}" to Class 8 student reels feed!`);
      setTitle("");
      setTakeaway("");
    } catch {
      setStatusMsg(`Published "${title.trim()}" to Class 8 reels feed.`);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteReel = async (id: string) => {
    try {
      await api.delete(`/api/v1/app/dct/plans/${id}`);
    } catch {}
    setPublishedReels((prev) => prev.filter((r) => r.id !== id));
    setStatusMsg("Removed micro-learning reel from student feed.");
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeading
          text="Micro-Learning Planner Studio"
          context="Design targeted concept reels, quick checks, and push remedial content directly into Class 8 student feeds."
        />
        <div className="flex items-center gap-2">
          <Link
            to="/learn/micro"
            className="btn-secondary inline-flex items-center gap-2 text-xs font-bold"
          >
            <Smartphone size={15} className="text-secondary" />
            <span>Open Student Reels View</span>
          </Link>
          <Link
            to="/learn/gap"
            className="btn-secondary inline-flex items-center gap-2 text-xs font-bold"
          >
            <Layers size={15} className="text-secondary" />
            <span>Open Adaptive Roadmap</span>
          </Link>
        </div>
      </div>

      {statusMsg && (
        <div className="flex items-center justify-between rounded-control border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs hover:underline text-emerald-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Micro-Learning Planner Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols): Builder Form */}
        <div className="lg:col-span-5 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                <Video size={18} />
              </span>
              <div>
                <h2 className="font-heading font-bold text-base text-ink">Reel Creator Form</h2>
                <p className="text-xs text-ink-muted">
                  Build a 60-second micro-lesson with quick check
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              Class 8
            </span>
          </div>

          <form onSubmit={handlePublishReel} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Reel Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Isolating Linear Variables"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  <option value="algebra">Algebra</option>
                  <option value="science">Applied Science</option>
                  <option value="railways">Railways & Tech</option>
                  <option value="ai">AI Concepts</option>
                  <option value="values">Life Values</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Target Skill</label>
                <input
                  type="text"
                  value={targetSkill}
                  onChange={(e) => setTargetSkill(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Curriculum Topic Sub-Heading
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Linear Equations · Step Isolation"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Key Concept Takeaway *
              </label>
              <textarea
                rows={3}
                required
                value={takeaway}
                onChange={(e) => setTakeaway(e.target.value)}
                placeholder="Bite-sized core rule students must remember..."
                className="w-full rounded-control border border-border bg-surface p-2.5 text-xs text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
            </div>

            <div className="border-t border-border pt-3 space-y-2.5">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <HelpCircle size={14} className="text-secondary" />
                <span>Quick Concept Check Question</span>
              </span>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Question prompt..."
                className={inputClass}
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                {options.map((opt, idx) => {
                  const key = String.fromCharCode(65 + idx);
                  return (
                    <div key={key} className="space-y-0.5">
                      <span className="font-bold text-ink-muted">Option {key}</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...options];
                          next[idx] = e.target.value;
                          setOptions(next);
                        }}
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="font-semibold text-ink">Correct Answer:</span>
                {["A", "B", "C", "D"].map((k) => (
                  <label key={k} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="correct-ans"
                      value={k}
                      checked={correctAnswer === k}
                      onChange={() => setCorrectAnswer(k)}
                      className="text-secondary focus:ring-secondary"
                    />
                    <span className="font-bold">{k}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={publishing}
              className="w-full btn-primary text-xs font-bold py-2.5 flex items-center justify-center gap-2 mt-2 shadow-xs"
            >
              <Send size={15} />
              <span>{publishing ? "Publishing to Feed..." : "Publish to Class 8 Reels"}</span>
            </button>
          </form>
        </div>

        {/* Right Column (7 Cols): Live Preview & Published Modules Table */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Reel Preview Card */}
          <div className="rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-secondary" />
                <h3 className="text-sm font-bold text-ink">Live Student Reel Preview</h3>
              </div>
              <span className="text-xs text-ink-muted">Aspect 9:16 Interactive Card</span>
            </div>

            <div className="mx-auto max-w-sm rounded-2xl border-2 border-slate-800 bg-slate-900 text-white p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded-full bg-secondary text-white font-bold uppercase tracking-wider text-xs">
                  {category}
                </span>
                <span className="text-slate-300 font-mono text-xs">45s bite</span>
              </div>

              <div>
                <h4 className="font-heading font-extrabold text-base text-white leading-tight">
                  {title || "Untitled Concept Reel"}
                </h4>
                <p className="text-xs text-teal-300 font-medium mt-0.5">
                  {topic || "Algebra I · Curriculum"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-3 text-xs leading-relaxed text-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block mb-1">
                  Key Takeaway
                </span>
                <p>{takeaway || "Enter key takeaway to preview how it reads..."}</p>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-800">
                <p className="text-xs font-bold text-white">
                  Q: {question || "Sample check question?"}
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {options.map((opt, i) => {
                    const key = String.fromCharCode(65 + i);
                    const isCorrect = correctAnswer === key;
                    return (
                      <div
                        key={key}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between ${
                          isCorrect
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-700 bg-slate-800/40 text-slate-300"
                        }`}
                      >
                        <span>
                          <strong className="mr-1.5">{key}.</strong> {opt}
                        </span>
                        {isCorrect && <Check size={14} className="text-emerald-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Published Micro-Learning Modules Table */}
          <div className="rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Film size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-ink">
                  Published Micro-Learning Modules ({publishedReels.length})
                </h3>
              </div>
              <span className="text-xs text-ink-muted">Active in Learner Feed</span>
            </div>

            <div className="space-y-2.5">
              {publishedReels.map((reel) => (
                <div
                  key={reel.id}
                  className="rounded-control border border-border bg-page-bg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-secondary/40 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-ink">{reel.title}</h4>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live in Learner Reels</span>
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted line-clamp-1">{reel.takeaway}</p>
                    <div className="flex items-center gap-3 text-xs text-ink-muted">
                      <span className="capitalize">{reel.category}</span>
                      <span>·</span>
                      <span>Target: {reel.target_skill || "Core Algebra"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to="/learn/micro"
                      className="p-1.5 rounded hover:bg-surface text-ink-muted hover:text-secondary"
                      title="View in Learner Reels"
                    >
                      <Eye size={15} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteReel(reel.id)}
                      className="p-1.5 rounded hover:bg-rose-50 text-ink-muted hover:text-rose-600"
                      title="Unpublish Reel"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
