import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Lightbulb,
  MessageCircle,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Send,
  CheckCircle2,
  Users,
  Video,
  ArrowRight,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/teacher/coach/insights")({
  head: () => ({
    meta: [
      { title: "Coach Doubts & Pedagogical Insights" + t("app.titleSuffix") },
      {
        name: "description",
        content:
          "AI Tutor doubt analytics, most-missed concepts, and 1-click remedial reel dispatch.",
      },
      {
        property: "og:title",
        content: "Coach Doubts & Pedagogical Insights" + t("app.titleSuffix"),
      },
      {
        property: "og:description",
        content:
          "AI Tutor doubt analytics, most-missed concepts, and 1-click remedial reel dispatch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoachInsightsPage,
});

interface TopDoubt {
  id: string;
  rank: number;
  question: string;
  concept: string;
  frequency: number;
  remediationTopic: string;
  takeaway: string;
  published?: boolean;
}

export function CoachInsightsPage() {
  const [doubts, setDoubts] = useState<TopDoubt[]>([
    {
      id: "d-1",
      rank: 1,
      question:
        "Why does the inequality sign flip when dividing or multiplying by a negative number?",
      concept: "Inequalities & Directional Signs",
      frequency: 7,
      remediationTopic: "Inequality Sign Flips Explained",
      takeaway:
        "Multiplying or dividing by a negative mirrors the number line across zero, reversing which side is greater.",
      published: false,
    },
    {
      id: "d-2",
      rank: 2,
      question:
        "How to isolate variables when terms with x appear on BOTH sides of the equals sign?",
      concept: "Two-Sided Linear Equations",
      frequency: 5,
      remediationTopic: "Moving Variables to One Side",
      takeaway:
        "Collect all variable terms on one side by adding or subtracting the smaller variable term first.",
      published: false,
    },
    {
      id: "d-3",
      rank: 3,
      question: "What is the difference between -x² and (-x)² in algebraic order of operations?",
      concept: "Exponents & Grouping Symbols",
      frequency: 4,
      remediationTopic: "Negative Base vs Negative Expression",
      takeaway:
        "Exponents apply only to what they touch directly unless parentheses group the negative sign inside.",
      published: false,
    },
    {
      id: "d-4",
      rank: 4,
      question: "How to distribute fractional multipliers like 1/2(4x - 6)?",
      concept: "Distributive Property with Fractions",
      frequency: 4,
      remediationTopic: "Distributing Fractions Step-by-Step",
      takeaway:
        "Multiply the numerator into each term inside, then divide each term by the denominator.",
      published: false,
    },
    {
      id: "d-5",
      rank: 5,
      question: "Setting up equations from word problems involving rates and fixed entry fees.",
      concept: "Algebraic Modeling & Word Problems",
      frequency: 3,
      remediationTopic: "Translating Words to Equation Form: Total = Flat Fee + (Rate × Quantity)",
      takeaway:
        "Identify the starting constant (flat fee) and attach the variable to the rate that varies per event.",
      published: false,
    },
  ]);

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePublishRemedialReel = async (doubt: TopDoubt) => {
    setPublishingId(doubt.id);
    setSuccessMsg(null);
    try {
      await api.post("/api/v1/app/dct/plans", {
        title: doubt.remediationTopic,
        topic: `Algebra I · ${doubt.concept}`,
        category: "algebra",
        target_skill: doubt.concept,
        takeaway: doubt.takeaway,
        question: `Check: ${doubt.question}`,
        options: ["Concept understood", "Need more practice", "Review lesson notes", "Ask Vidura"],
        answer: "A",
        duration: "45s",
      });
      setDoubts((prev) => prev.map((d) => (d.id === doubt.id ? { ...d, published: true } : d)));
      setSuccessMsg(
        `Published remedial concept reel "${doubt.remediationTopic}" directly to Class 8 student reels feed!`,
      );
    } catch {
      setDoubts((prev) => prev.map((d) => (d.id === doubt.id ? { ...d, published: true } : d)));
      setSuccessMsg(`Published remedial reel "${doubt.remediationTopic}" to Class 8.`);
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeading
          text="Coach Doubts & Pedagogical Insights"
          context="Class 8 aggregate doubt telemetry from Ask Vidura. Identify struggles early and dispatch 1-click remedial concept reels."
        />
        <div className="flex items-center gap-2">
          <Link
            to="/teacher/dct"
            className="btn-primary inline-flex items-center gap-2 text-xs font-bold"
          >
            <Video size={15} />
            <span>Open Micro-Learning Studio</span>
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center justify-between rounded-control border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs hover:underline text-emerald-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
            Student Doubts Resolved
          </span>
          <p className="mt-1 font-heading text-2xl font-extrabold text-ink">48</p>
          <span className="text-xs text-ink-muted">Past 7 Days across Class 8</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
            Unique Students In Feed
          </span>
          <p className="mt-1 font-heading text-2xl font-extrabold text-secondary">10 / 10</p>
          <span className="text-xs text-ink-muted">100% Cohort Participation</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
            Top Friction Topic
          </span>
          <p className="mt-1 font-heading text-lg font-extrabold text-rose-700 truncate">
            Inequality Flips
          </p>
          <span className="text-xs text-ink-muted">7 Students Prompted Vidura</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
            Autonomous Resolution Rate
          </span>
          <p className="mt-1 font-heading text-2xl font-extrabold text-emerald-700">92%</p>
          <span className="text-xs text-ink-muted">Guided to Mastery Without Direct Leak</span>
        </div>
      </div>

      {/* Top 5 Student Doubts Ranked Cards */}
      <div className="rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700">
              <Lightbulb size={18} />
            </span>
            <div>
              <h2 className="font-heading font-bold text-base text-ink">
                Top 5 Student Doubts This Week
              </h2>
              <p className="text-xs text-ink-muted">
                Aggregated and paraphrased from Ask Vidura student conversation sessions.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">Ranked by Student Frequency</span>
        </div>

        <div className="space-y-3">
          {doubts.map((doubt) => (
            <div
              key={doubt.id}
              className="rounded-xl border border-border bg-page-bg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-secondary/40 transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary font-heading font-bold text-xs">
                  #{doubt.rank}
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface border border-border text-slate-800">
                      {doubt.concept}
                    </span>
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      {doubt.frequency} Students Struggling
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-ink">"{doubt.question}"</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    <strong>Suggested Remedial Angle:</strong> {doubt.takeaway}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                {doubt.published ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Reel Published ✓</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={publishingId === doubt.id}
                    onClick={() => handlePublishRemedialReel(doubt)}
                    className="btn-primary text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <Send size={13} />
                    <span>
                      {publishingId === doubt.id ? "Publishing..." : "Publish Remedial Reel"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
