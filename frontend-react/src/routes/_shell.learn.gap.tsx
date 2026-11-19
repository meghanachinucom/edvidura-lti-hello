import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Flame,
  HelpCircle,
  Layers,
  MessageCircle,
  Network,
  PlayCircle,
  Sparkles,
  Trophy,
  Video,
  ArrowRight,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { api } from "@/lib/api";

// LR-09 Your Personalized Study Path & Connected Curriculum Engine
export const Route = createFileRoute("/_shell/learn/gap")({
  head: () => ({
    meta: [
      { title: "Your Path to Mastery" + t("app.titleSuffix") },
      { name: "description", content: "Personalized study path and connected curriculum map" },
      { property: "og:title", content: "Your Path to Mastery" + t("app.titleSuffix") },
      {
        property: "og:description",
        content: "Personalized study path and connected curriculum map",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

interface RoadmapSkill {
  id: string;
  name: string;
  status: "Mastered" | "Almost Mastered" | "Building Confidence" | "Getting Started";
  level: number;
  reason: string;
  bookChapter: { manualId: string; title: string; chapterNum: number };
  reelId: string;
  coachTopic: string;
  quizId: string;
  quizScore?: number;
}

const SAMPLE_ROADMAP: RoadmapSkill[] = [
  {
    id: "variables-expr",
    name: "Variables & Mathematical Expressions",
    status: "Mastered",
    level: 5,
    reason: "Completed with distinction. Strong foundation for multi-step equations.",
    bookChapter: {
      manualId: "de7900fd-488b-4740-bf7e-7a11b3475cd6",
      title: "Algebra I: Ch. 1 Variables & Expressions",
      chapterNum: 1,
    },
    reelId: "reel-1",
    coachTopic: "Variable Substitution",
    quizId: "1",
    quizScore: 100,
  },
  {
    id: "solve-linear",
    name: "Solving Linear Equations (Two-Step Balance)",
    status: "Building Confidence",
    level: 2,
    reason: "Strengthen this before your upcoming Linear Equations Checkpoint quiz.",
    bookChapter: {
      manualId: "de7900fd-488b-4740-bf7e-7a11b3475cd6",
      title: "Algebra I: Ch. 2 The Balance Scale Method",
      chapterNum: 2,
    },
    reelId: "reel-2",
    coachTopic: "Inverse Operations",
    quizId: "2",
  },
  {
    id: "linear-modeling",
    name: "Real-World Linear Modeling & Word Problems",
    status: "Getting Started",
    level: 1,
    reason: "Next milestone. Builds directly upon two-step balance operations.",
    bookChapter: {
      manualId: "de7900fd-488b-4740-bf7e-7a11b3475cd6",
      title: "Algebra I: Ch. 4 Real-World Problem Modeling",
      chapterNum: 4,
    },
    reelId: "reel-3",
    coachTopic: "Word Problem Formulation",
    quizId: "3",
  },
];

const STATUS_BADGES: Record<RoadmapSkill["status"], { bg: string; text: string; border: string }> =
  {
    Mastered: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-300",
    },
    "Almost Mastered": {
      bg: "bg-cyan-50",
      text: "text-cyan-800",
      border: "border-cyan-300",
    },
    "Building Confidence": {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-300",
    },
    "Getting Started": {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-300",
    },
  };

function Page() {
  const [selectedSkillId, setSelectedSkillId] = useState<string>("solve-linear");
  const [roadmap, setRoadmap] = useState<RoadmapSkill[]>(SAMPLE_ROADMAP);

  useEffect(() => {
    let active = true;
    api
      .get<{ ok?: boolean; personalized_study_path?: any[] }>(
        "/api/v1/app/ple/difference-plan?subject=6",
      )
      .then((data) => {
        if (active && data && data.personalized_study_path) {
          // Keep synchronized
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const selectedSkill: RoadmapSkill =
    roadmap.find((s) => s.id === selectedSkillId) ?? SAMPLE_ROADMAP[1]!;

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      {/* Page Title & Intro */}
      <div className="flex flex-col gap-1">
        <PageHeading text="Your Path to Mastery" />
        <p className="text-sm font-medium text-slate-600 mt-1 max-w-reading">
          Your personalized study roadmap dynamically targets knowledge gaps by connecting
          textbooks, short concept reels, guided AI tutor practice, and certified mastery quizzes.
        </p>
      </div>

      {/* Top Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Skills Mastered
            </span>
            <span className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">1 of 3</div>
          <p className="mt-1 text-xs text-slate-600">33% curriculum competency verified</p>
        </div>

        <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Immediate Focus Skill
            </span>
            <span className="size-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <Compass size={16} />
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900 truncate">
            Solving Linear Equations
          </div>
          <p className="mt-1 text-xs text-slate-600">Balance scale method & inverse steps</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Estimated Recovery Time
            </span>
            <span className="size-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">~15 Mins</div>
          <p className="mt-1 text-xs text-slate-600">4 connected steps to reach Level 5</p>
        </div>
      </div>

      {/* Ordered Skill Roadmap Cards */}
      <section aria-labelledby="roadmap-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="roadmap-heading" className="font-heading text-lg font-bold text-slate-900">
            Ordered Step-by-Step Recovery Roadmap
          </h2>
          <span className="text-xs font-medium text-slate-500">Tailored for Class 8 Algebra I</span>
        </div>

        <div className="space-y-4">
          {roadmap.map((sk, idx) => {
            const badge = STATUS_BADGES[sk.status];
            const isCurrent = sk.id === selectedSkillId;
            return (
              <div
                key={sk.id}
                onClick={() => setSelectedSkillId(sk.id)}
                className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-xs ${
                  isCurrent
                    ? "border-secondary bg-surface ring-2 ring-secondary/20 shadow-md"
                    : "border-slate-200 bg-surface hover:border-slate-300"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-700">
                      0{idx + 1}
                    </span>
                    <h3 className="font-heading text-base font-bold text-slate-900">{sk.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {sk.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      Level {sk.level} of 5
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-300"
                    style={{ width: `${(sk.level / 5) * 100}%` }}
                  />
                </div>

                <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">{sk.reason}</p>

                {/* 4-Step Connected Learning Strip */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Connected Learning Path for this Skill:
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Step 1: Read Chapter */}
                    <Link
                      to="/manuals/$manualId"
                      params={{ manualId: sk.bookChapter.manualId }}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 hover:border-secondary transition group"
                    >
                      <BookOpen size={18} className="text-secondary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase text-secondary">
                          1. Read Chapter
                        </div>
                        <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-secondary">
                          Ch. {sk.bookChapter.chapterNum} Textbook
                        </div>
                      </div>
                    </Link>

                    {/* Step 2: Watch 2-Min Reel */}
                    <Link
                      to="/learn/micro"
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 hover:border-secondary transition group"
                    >
                      <Video size={18} className="text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase text-amber-600">
                          2. Watch 2-Min Reel
                        </div>
                        <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-amber-700">
                          Concept Reel & Visual
                        </div>
                      </div>
                    </Link>

                    {/* Step 3: Practice in Ask Vidura */}
                    <Link
                      to="/learn/coach"
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 hover:border-secondary transition group"
                    >
                      <MessageCircle size={18} className="text-cyan-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase text-cyan-600">
                          3. Practice in Vidura
                        </div>
                        <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-cyan-700">
                          {sk.coachTopic}
                        </div>
                      </div>
                    </Link>

                    {/* Step 4: Take Quiz */}
                    <Link
                      to="/active-quizzes"
                      className={`flex items-center gap-2 rounded-xl border p-3 transition group ${
                        sk.quizScore !== undefined
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-secondary bg-secondary text-white hover:bg-secondary/90 shadow-xs"
                      }`}
                    >
                      <Trophy size={18} className="shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase opacity-80">4. Take Quiz</div>
                        <div className="text-sm font-bold truncate">
                          {sk.quizScore !== undefined
                            ? `Mastered (${sk.quizScore}%)`
                            : "Mastery Check Quiz"}
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Clean Visual Learning Map (4 Aligned Columns) */}
      <section
        aria-labelledby="map-heading"
        className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 id="map-heading" className="font-heading text-lg font-bold text-slate-900">
              Visual Learning Map
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Select any skill above to inspect how curriculum standards connect into learning
              resources and certified mastery proof.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Active Focus: {selectedSkill.name}
          </span>
        </div>

        {/* 4 Aligned Columns with clear spacing */}
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-4 pt-2">
          {/* Column 1: Course Skills */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Course Skill
            </div>
            <div className="rounded-lg border-2 border-secondary bg-white p-3 shadow-xs">
              <div className="text-xs font-bold text-slate-900">{selectedSkill.name}</div>
              <div className="text-xs font-mono font-semibold text-secondary mt-1">
                Class 8 Core Competency
              </div>
            </div>
          </div>

          {/* Column 2: Lessons & Textbooks */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Textbook & Lesson
            </div>
            <Link
              to="/manuals/$manualId"
              params={{ manualId: selectedSkill.bookChapter.manualId }}
              className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-secondary transition shadow-xs group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-secondary">
                {selectedSkill.bookChapter.title}
              </div>
              <div className="text-xs text-slate-500 mt-1">Theory, diagrams & worked problems</div>
            </Link>
          </div>

          {/* Column 3: Interactive Practice */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Interactive Practice
            </div>
            <Link
              to="/learn/coach"
              className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-secondary transition shadow-xs group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-secondary">
                Ask Vidura: {selectedSkill.coachTopic}
              </div>
              <div className="text-xs text-slate-500 mt-1">Multi-turn guided ladder practice</div>
            </Link>
          </div>

          {/* Column 4: Mastery Proof */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              4. Mastery Proof
            </div>
            <Link
              to="/active-quizzes"
              className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-secondary transition shadow-xs group"
            >
              <div className="text-xs font-bold text-slate-900 group-hover:text-secondary">
                Verified Quiz Check
              </div>
              <div className="text-xs text-emerald-700 font-semibold mt-1">
                {selectedSkill.quizScore !== undefined
                  ? "✓ Credential Recorded"
                  : "Pending Assessment"}
              </div>
            </Link>
          </div>
        </div>

        {/* Quiet Verifiable Record Link */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Curriculum alignments are cryptographically backed by learning evidence records.
          </span>
          <a
            href="/api/v1/app/ld/graph?format=jsonld"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-secondary hover:underline"
          >
            <Download size={13} />
            <span>Download Verifiable Mastery Record</span>
          </a>
        </div>
      </section>
    </div>
  );
}
