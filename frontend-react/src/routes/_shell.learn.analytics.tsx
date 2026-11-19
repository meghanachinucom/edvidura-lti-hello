import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Briefcase,
  Target,
  ArrowRight,
  Sparkles,
  Compass,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { PillTabs, type PillTab } from "@/components/shared/PillTabs";
import { CountUp } from "@/components/shared/CountUp";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { BarChartTable } from "@/components/shared/BarChartTable";
import { myAttempts, type Attempt } from "@/data/attempts";
import { lessons } from "@/data/lessons";
import { quizTitle } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";
import { PercentageBar } from "@/components/shared/PercentageBar";
import { LearnerFocusAnalytics } from "@/components/learner/LearnerFocusAnalytics";
import { api } from "@/lib/api";

// LR-12 My analytics and Learner Skills Passport Hub.
export const Route = createFileRoute("/_shell/learn/analytics")({
  head: () => ({
    meta: [
      { title: t("pages.learnAnalytics") + t("app.titleSuffix") },
      { name: "description", content: t("LR-12.lead") },
      { property: "og:title", content: t("pages.learnAnalytics") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-12.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-12.${k}`, v);

const columns: Column<Attempt>[] = [
  { key: "when", header: t("LR-03.colWhen"), cell: (a) => formatIST(a.submittedAt) },
  { key: "quiz", header: t("LR-03.colQuiz"), cell: (a) => quizTitle(a.quizId) },
  {
    key: "type",
    header: t("LR-03.colType"),
    cell: (a) => t(a.kind === "graded" ? "LR-03.typeGraded" : "LR-03.typePractice"),
  },
  { key: "score", header: t("LR-03.colScore"), cell: (a) => t("shared.scoreOf", { n: a.score }) },
  {
    key: "moodle",
    header: t("LR-03.colMoodle"),
    cell: (a) => t(`shared.moodleStatus.${a.moodleStatus}`),
  },
];

function Page() {
  const [activeTab, setActiveTab] = useState<"attempts" | "passport" | "apprentice" | "goals">(
    "attempts",
  );
  const m = mockState.analytics;
  const rows =
    m.attempts === "empty"
      ? []
      : [...myAttempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const done = lessons.filter((l) => l.markedDone).length;
  const pct = (a: Attempt) => (a.score / a.outOf) * 100;
  const avg = rows.length ? Math.round(rows.reduce((x, a) => x + pct(a), 0) / rows.length) : 0;
  const best = rows.reduce((x, a) => Math.max(x, a.score), 0);
  const below = rows.filter((a) => pct(a) < m.passMark).length;

  // Passport state
  const [passportData, setPassportData] = useState<any>(null);
  const [catData, setCatData] = useState<any>(null);
  const [passportLoading, setPassportLoading] = useState(false);

  const loadPassport = () => {
    setPassportLoading(true);
    Promise.all([
      api.get("/api/v1/app/learner/passport?subject=6").catch(() => null),
      api.get("/api/v1/app/skills-passport").catch(() => null),
      api.get("/api/v1/app/cat").catch(() => null),
    ]).then(([ledgerPass, pass, cat]: any[]) => {
      setPassportData(ledgerPass || pass);
      setCatData(cat);
      setPassportLoading(false);
    });
  };

  useEffect(() => {
    if (activeTab === "passport") {
      loadPassport();
    }
  }, [activeTab]);

  const stats = [
    { label: s("lessonsDone"), value: s("lessonsValue", { n: done, total: lessons.length }) },
    ...(rows.length
      ? [
          { label: s("attempts"), value: String(rows.length) },
          { label: s("average"), value: `${avg}%` },
          { label: s("best"), value: t("shared.scoreOf", { n: best }) },
          { label: s("belowPass"), value: String(below) },
        ]
      : []),
  ];

  const tabItems: PillTab[] = [
    { id: "attempts", label: "My Attempts & Focus", onSelect: () => setActiveTab("attempts") },
    { id: "passport", label: "Skills Passport & Badges", onSelect: () => setActiveTab("passport") },
    { id: "apprentice", label: "Apprenticeship Log", onSelect: () => setActiveTab("apprentice") },
    { id: "goals", label: "Study Plan & Goals", onSelect: () => setActiveTab("goals") },
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading titleKey="pages.learnAnalytics" />
        <div className="flex items-center gap-2">
          <PillTabs items={tabItems} active={activeTab} label="Analytics Navigation" />
          <a
            href="/learner-analytics"
            className="text-xs text-ink-muted underline hidden tablet:inline"
          >
            Open Server View
          </a>
        </div>
      </div>

      {activeTab === "attempts" && (
        <>
          <p className="max-w-reading text-ink">{s("lead")}</p>
          <LearnerFocusAnalytics />

          <section aria-label={s("summary")}>
            <dl className="grid grid-cols-2 gap-4 tablet:flex tablet:flex-wrap tablet:gap-10">
              {stats.map((x) => (
                <div key={x.label} className="kpi-figure tablet:min-w-36">
                  <dt className="text-sm text-ink-muted">{x.label}</dt>
                  <dd>
                    <CountUp value={x.value} />
                  </dd>
                  {x.value.endsWith("%") && (
                    <div className="mt-2">
                      <PercentageBar value={Number.parseFloat(x.value)} />
                    </div>
                  )}
                </div>
              ))}
            </dl>
            {rows.length > 0 && <p className="mt-3 text-ink">{s("passMark", { n: m.passMark })}</p>}
          </section>

          {rows.length > 0 && (
            <BarChartTable
              title={s("recent")}
              summary={s("passMark", { n: m.passMark })}
              rows={[...rows]
                .reverse()
                .map((a) => ({ label: quizTitle(a.quizId), value: Math.round(pct(a)) }))}
              colLabel={t("LR-03.colQuiz")}
              valueLabel={t("LR-03.colScore")}
              format={(v) => `${v}%`}
              percentage
            />
          )}

          <section aria-labelledby="recent">
            <h2 id="recent" className="sr-only">
              {s("recent")}
            </h2>
            <DataTable
              caption={s("recent")}
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              empty={<EmptyState headingLevel={3} title={s("empty")} help="" />}
            />
          </section>

          <div className="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-4">
            <Link to="/quiz" className="btn-primary">
              {s("takeQuiz")}
            </Link>
            <Link to="/learn/gap" className="inline-flex min-h-11 items-center text-ink underline">
              {s("plan")}
            </Link>
            <Link
              to="/active-quizzes"
              className="inline-flex min-h-11 items-center text-ink underline"
            >
              {s("practise")}
            </Link>
            <Link
              to="/learn/activity"
              className="inline-flex min-h-11 items-center text-ink underline"
            >
              {s("activity")}
            </Link>
          </div>
        </>
      )}

      {activeTab === "passport" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={22} className="text-secondary" />
                <h2 className="font-heading text-xl font-bold text-ink">
                  Learner Skills Passport & Badges
                </h2>
              </div>
              <button
                type="button"
                onClick={loadPassport}
                disabled={passportLoading}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
              >
                <RefreshCw size={14} className={passportLoading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Certified trade credentials and competency masteries verified through formative
              attempts and instructor evaluations.
            </p>

            {passportLoading && !passportData ? (
              <p className="mt-4 text-sm text-ink-muted">Loading your skills credentials...</p>
            ) : (
              <div className="mt-6 grid gap-4 tablet:grid-cols-3">
                <div className="rounded-surface border border-border p-4 bg-surface">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Verified Competencies
                  </span>
                  <p className="mt-2 text-2xl font-bold text-ink">
                    {catData?.competencies?.length ?? 8}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">Industrial benchmark certified</p>
                </div>
                <div className="rounded-surface border border-border p-4 bg-surface">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Passport Status
                  </span>
                  <p className="mt-2 text-2xl font-bold text-success">Active & Compliant</p>
                  <p className="text-xs text-ink-muted mt-1">Tamper-proof verifiable credential</p>
                </div>
                <div className="rounded-surface border border-border p-4 bg-surface">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Remediation Required
                  </span>
                  <p className="mt-2 text-2xl font-bold text-secondary">{below} Topics</p>
                  <p className="text-xs text-ink-muted mt-1">
                    <Link to="/learn/gap" className="underline">
                      View personalized study plan
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-ink">
              Mastered Competency Endorsements
            </h3>
            <div className="mt-4 grid gap-3 tablet:grid-cols-2">
              <div className="rounded-surface border border-border p-4 bg-surface flex items-start gap-3">
                <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink">Three-Phase Circuit Analysis</h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    NSQF Level 5 • Verified via 3 Graded Quizzes
                  </p>
                </div>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface flex items-start gap-3">
                <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink">Electrical Safety & PPE Protocols</h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Industrial Safety Standard • 100% Score
                  </p>
                </div>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface flex items-start gap-3">
                <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink">Circuit Breaker & MCCB Heuristics</h4>
                  <p className="text-xs text-ink-muted mt-0.5">Practical Diagnostic • Verified</p>
                </div>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface flex items-start gap-3">
                <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink">Earthing & Fault Current Protection</h4>
                  <p className="text-xs text-ink-muted mt-0.5">Substation Guide • Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "apprentice" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Briefcase size={22} className="text-amber-600" />
              <h2 className="font-heading text-xl font-bold text-ink">
                Workforce Apprenticeship & Dual Training Log
              </h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              SCERT / NCVT dual-education vocational placement tracking verified through employer
              mentor sign-offs.
            </p>

            <div className="mt-6 grid gap-4 tablet:grid-cols-3">
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Logged Practicum Hours
                </span>
                <p className="mt-2 text-2xl font-bold text-ink">142 / 200 hrs</p>
                <p className="text-xs text-ink-muted mt-1">71% requirement fulfilled</p>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Host Industry Partner
                </span>
                <p className="mt-2 text-lg font-bold text-ink truncate">
                  APTRANSCO 220kV Substation
                </p>
                <p className="text-xs text-ink-muted mt-1">Mentor: Er. R. Sreenivasulu</p>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Logbook Verification
                </span>
                <p className="mt-2 text-2xl font-bold text-success">Verified & Signed</p>
                <p className="text-xs text-ink-muted mt-1">Updated 2 days ago</p>
              </div>
            </div>
          </div>

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-ink">
              Recent On-the-Job Apprenticeship Modules
            </h3>
            <div className="mt-4 space-y-3">
              {[
                {
                  title: "Transformer Oil Breakdown Voltage Testing (BDV)",
                  hours: "16 hrs",
                  status: "Signed Off",
                  date: "14 Nov 2026",
                },
                {
                  title: "Switchyard Single-Line Diagram (SLD) Tracing",
                  hours: "24 hrs",
                  status: "Signed Off",
                  date: "08 Nov 2026",
                },
                {
                  title: "Battery Bank Float Voltage & Specific Gravity Monitoring",
                  hours: "12 hrs",
                  status: "In Progress",
                  date: "Active",
                },
              ].map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-surface border border-border bg-page-bg"
                >
                  <div>
                    <h4 className="text-xs font-bold text-ink">{m.title}</h4>
                    <span className="text-[11px] text-ink-muted">
                      {m.hours} · Logged {m.date}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.status === "Signed Off" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "goals" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Target size={22} className="text-secondary" />
              <h2 className="font-heading text-xl font-bold text-ink">
                Personalised Learning Engine (PLE) & Study Goals
              </h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Adaptive pacing goals based on your recent quiz attempts, handbook reading progress,
              and skill deficits.
            </p>

            <div className="mt-6 grid gap-4 tablet:grid-cols-2">
              <div className="rounded-surface border border-border p-5 bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                    Goal 1 · Weekly Target
                  </span>
                  <span className="text-xs font-bold text-ink">80% Done</span>
                </div>
                <h4 className="font-bold text-ink text-sm">
                  Master Linear Equations & Slope-Intercept Form
                </h4>
                <p className="text-xs text-ink-muted">
                  Complete Lesson 4 reading and score at least 4/5 on the Checkpoint 2 quiz.
                </p>
                <div className="pt-2">
                  <Link
                    to="/lessons/lesson-4"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline"
                  >
                    Continue Lesson 4 <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <div className="rounded-surface border border-border p-5 bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Goal 2 · Spatial Lab
                  </span>
                  <span className="text-xs font-bold text-ink">Unlocked</span>
                </div>
                <h4 className="font-bold text-ink text-sm">Explore 3D Cartesian Coordinate Walk</h4>
                <p className="text-xs text-ink-muted">
                  Experiment with positive and negative slopes in the WebXR 3D laboratory.
                </p>
                <div className="pt-2">
                  <Link
                    to="/xr-store"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Open Spatial Lab <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
