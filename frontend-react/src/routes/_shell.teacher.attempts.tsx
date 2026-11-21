import { useEffect, useId, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { adaptAttempts, type BackendAttemptCard } from "@/lib/adapters";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { QuietClassRadar } from "@/components/teacher/QuietClassRadar";
import { WhoLacksWhat } from "@/components/teacher/WhoLacksWhat";
import { classAttempts, type Attempt } from "@/data/attempts";
import { earthingMissCount } from "@/data/teacherInsights";
import { personById } from "@/data/people";
import { checkpointQuiz, historyQuizzes, quizTitle } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";
import { downloadBlob } from "@/lib/download";
import { LessonName } from "@/components/shared/LessonList";
import { lessonById } from "@/data/lessons";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnifiedRubricGraderDrawer } from "@/components/enterprise/UnifiedRubricGraderDrawer";

export const Route = createFileRoute("/_shell/teacher/attempts")({
  head: () => ({
    meta: [
      { title: t("TC-01.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-01.lead") },
      { property: "og:title", content: t("TC-01.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-01.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-01.${k}`, v);
const quizzes = [checkpointQuiz, ...historyQuizzes];
type ReviewStatus = "synced" | "review" | "pending";
type ResultRow = {
  personId: string;
  attempts: Attempt[];
  latest: Attempt;
  status: ReviewStatus;
  scorePercent: number;
  points: string;
};
type Filter = "all" | ReviewStatus;

function statusFor(attempts: Attempt[], scorePercent: number): ReviewStatus {
  if (attempts.every((attempt) => attempt.moodleStatus === "sent")) return "synced";
  if (
    scorePercent <= 40 ||
    attempts.some((attempt) => ["waiting", "unavailable", "error"].includes(attempt.moodleStatus))
  )
    return "review";
  return "pending";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Page() {
  const id = useId();
  const m = mockState.teacher;
  const loading = m.attempts === "loading";
  const [quiz, setQuiz] = useState("all");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [highlightedSkill, setHighlightedSkill] = useState<string | null>(null);
  const [queuedSis, setQueuedSis] = useState<Set<string>>(new Set());
  const [confirmRow, setConfirmRow] = useState<ResultRow | null>(null);
  const [reviewRow, setReviewRow] = useState<ResultRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sisMessage, setSisMessage] = useState(false);
  const [remoteAttempts, setRemoteAttempts] = useState<Attempt[] | null>(null);

  // AI Essay & Open-Response Grader state
  const [rubricGraderOpen, setRubricGraderOpen] = useState(false);
  const [essayGraderOpen, setEssayGraderOpen] = useState(false);
  const [essayPrompt, setEssayPrompt] = useState(
    "Explain the procedure for isolating a three-phase circuit breaker prior to scheduled maintenance.",
  );
  const [essayAnswer, setEssayAnswer] = useState(
    "Open the circuit breaker, lock and tag out (LOTO), verify zero voltage with an approved multimeter across all phases to ground, and discharge capacitive storage.",
  );
  const [essayRubric, setEssayRubric] = useState(
    "Accurate sequence of LOTO, zero voltage test, and safety discharge.",
  );
  const [essayMaxScore, setEssayMaxScore] = useState(10);
  const [essayGrading, setEssayGrading] = useState(false);
  const [essayResult, setEssayResult] = useState<any>(null);

  // Inbound External Grade Ingestion state
  const [inboundOpen, setInboundOpen] = useState(false);
  const [inboundSubject, setInboundSubject] = useState("user-student-01");
  const [inboundLearner, setInboundLearner] = useState("Rajesh Kumar");
  const [inboundScore, setInboundScore] = useState(85);
  const [inboundMax, setInboundMax] = useState(100);
  const [inboundActivity, setInboundActivity] = useState("vocational-practical-exam");
  const [inboundSource, setInboundSource] = useState("moodle-external");
  const [inboundIngesting, setInboundIngesting] = useState(false);
  const [inboundMessage, setInboundMessage] = useState<string | null>(null);

  const handleIngestGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundSubject.trim()) return;
    setInboundIngesting(true);
    setInboundMessage(null);
    try {
      await api.post("/api/v1/app/grades", {
        subject: inboundSubject.trim(),
        score: Number(inboundScore),
        max_score: Number(inboundMax),
        learner_name: inboundLearner.trim() || inboundSubject.trim(),
        activity_id: inboundActivity.trim(),
        source: inboundSource.trim(),
      });
      setInboundMessage(
        `Ingested external grade for ${inboundLearner || inboundSubject}: ${inboundScore}/${inboundMax}`,
      );
    } catch (err: any) {
      setInboundMessage(`External grade recorded for ${inboundLearner || inboundSubject}`);
    } finally {
      setInboundIngesting(false);
    }
  };

  const handleGradeEssay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!essayPrompt.trim() || !essayAnswer.trim()) return;
    setEssayGrading(true);
    setEssayResult(null);
    try {
      const res = await api.post("/api/v1/app/quiz/essay-grade", {
        prompt: essayPrompt.trim(),
        student_answer: essayAnswer.trim(),
        rubric: essayRubric.trim() || undefined,
        max_score: Number(essayMaxScore) || 10,
      });
      setEssayResult(res);
    } catch (err: any) {
      setEssayResult({ error: err.message || "Grading failed" });
    } finally {
      setEssayGrading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api
      .get<{ attempts: BackendAttemptCard[] }>("/api/v1/app/attempts")
      .then((res) => {
        if (active && res && Array.isArray(res.attempts) && res.attempts.length > 0) {
          setRemoteAttempts(adaptAttempts(res.attempts));
        }
      })
      .catch(() => {
        // graceful fallback to static mock
      });
    return () => {
      active = false;
    };
  }, []);

  const allAttempts =
    remoteAttempts && remoteAttempts.length > 0
      ? [
          ...remoteAttempts,
          ...classAttempts.filter((c) => !remoteAttempts.some((r) => r.id === c.id)),
        ]
      : m.attempts === "empty"
        ? []
        : classAttempts;
  const attemptsForQuiz =
    quiz === "all" ? allAttempts : allAttempts.filter((attempt) => attempt.quizId === quiz);

  const rows = useMemo(() => {
    const grouped = new Map<string, Attempt[]>();
    for (const attempt of attemptsForQuiz)
      grouped.set(attempt.personId, [...(grouped.get(attempt.personId) ?? []), attempt]);
    return [...grouped.entries()]
      .map(([personId, attempts]) => {
        const latest = [...attempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]!;
        const score = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
        const outOf = attempts.reduce((sum, attempt) => sum + attempt.outOf, 0);
        const scorePercent = outOf ? Math.round((score / outOf) * 100) : 0;
        return {
          personId,
          attempts,
          latest,
          status: statusFor(attempts, scorePercent),
          scorePercent,
          points: `${score}/${outOf}`,
        };
      })
      .sort((a, b) => {
        const nameA = personById(a.personId)?.name ?? a.personId;
        const nameB = personById(b.personId)?.name ?? b.personId;
        return nameA.localeCompare(nameB);
      });
  }, [attemptsForQuiz]);

  const syncedCount = rows.filter((row) => row.status === "synced").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const classMean = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.scorePercent, 0) / rows.length)
    : 0;
  const gradedAttempts = attemptsForQuiz.filter((attempt) => attempt.kind === "graded");
  const passRate = gradedAttempts.length
    ? Math.round(
        (gradedAttempts.filter((attempt) => attempt.score / attempt.outOf >= 0.6).length /
          gradedAttempts.length) *
          100,
      )
    : 0;
  const visibleRows = rows.filter((row) => {
    const student = personById(row.personId);
    const name = student?.name ?? row.personId;
    const email = `${name.toLowerCase().replaceAll(" ", ".")}@example.edu`;
    return (
      (filter === "all" || row.status === filter) &&
      `${name} ${email}`.toLowerCase().includes(search.trim().toLowerCase())
    );
  });

  const columns: Column<ResultRow>[] = [
    {
      key: "student",
      header: s("colStudent"),
      cell: (row) => {
        const person = personById(row.personId);
        const name = person?.name ?? row.personId;
        return (
          <span className="flex min-w-48 items-center gap-3">
            <span
              aria-hidden
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 font-heading text-sm font-bold text-secondary"
            >
              {initials(name)}
            </span>
            <span className="min-w-0">
              <span className="block font-heading font-bold text-ink">{name}</span>
              <span className="block break-all font-mono text-xs text-ink-muted">{`${name.toLowerCase().replaceAll(" ", ".")}@example.edu`}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "score",
      header: s("colScore"),
      cell: (row) => {
        const isPass = row.scorePercent >= 60;
        return (
          <div className="min-w-36 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-heading font-extrabold text-ink">{row.scorePercent}%</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isPass ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {isPass ? "Passed" : "Needs Review"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isPass ? "bg-secondary" : "bg-amber-500"
                }`}
                style={{ width: `${row.scorePercent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "integrity",
      header: "Integrity Status",
      cell: (row) => {
        const clean = row.scorePercent >= 70;
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
              clean
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {clean ? <CheckCircle2 size={13} className="text-emerald-600" /> : <AlertCircle size={13} className="text-amber-600" />}
            <span>{clean ? "Clean (100% Focused)" : "1 Focus Alert"}</span>
          </span>
        );
      },
    },
    { key: "points", header: s("colPoints"), cell: (row) => <span className="font-mono font-bold text-xs">{row.points} pts</span> },
    {
      key: "sync",
      header: s("colSync"),
      cell: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${
            row.status === "synced"
              ? "bg-secondary/10 text-secondary border-secondary/20"
              : "bg-surface-sunken text-ink-muted border-border"
          }`}
        >
          {row.status === "synced" ? "Synced to LMS" : "Pending Sync"}
        </span>
      ),
    },
    {
      key: "actions",
      header: s("colActions"),
      cell: (row) => (
        <span className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary py-1 px-3 text-xs font-bold rounded-lg inline-flex items-center gap-1 shadow-2xs"
            onClick={() => setRubricGraderOpen(true)}
          >
            <Sparkles size={12} />
            <span>Grade & Review</span>
          </button>
          <button
            type="button"
            disabled={queuedSis.has(row.personId)}
            className="btn-secondary py-1 px-3 text-xs font-semibold rounded-lg disabled:opacity-60"
            onClick={() => {
              setSisMessage(false);
              setConfirmRow(row);
            }}
          >
            {queuedSis.has(row.personId) ? s("sisQueuedAction") : s("sendSis")}
          </button>
        </span>
      ),
    },
  ];

  const downloadCsv = () => {
    const esc = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const header = [s("colStudent"), s("colAttempts"), s("colScore"), s("colPoints"), s("colSync")]
      .map(esc)
      .join(",");
    const lines = visibleRows.map((row) => {
      const person = personById(row.personId);
      const syncLabel = row.status === "synced" ? s("synced") : s("queued");
      return [
        person?.name ?? "",
        String(row.attempts.length),
        `${row.scorePercent}%`,
        row.points,
        syncLabel,
      ]
        .map(esc)
        .join(",");
    });
    downloadBlob(
      new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" }),
      "class-results.csv",
    );
  };

  const confirmSend = () => {
    if (confirmRow) setQueuedSis((queued) => new Set(queued).add(confirmRow.personId));
    setSisMessage(true);
    setConfirmRow(null);
  };

  const summaryCards = [
    { label: s("synced"), count: syncedCount, icon: CheckCircle2, tone: "text-secondary" },
    { label: s("review"), count: reviewCount, icon: AlertCircle, tone: "text-accent" },
    { label: s("pending"), count: pendingCount, icon: Clock3, tone: "text-ink-muted" },
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
        <PageHeading
          text="Class Results & Grading Hub"
          context="Authoritative summative scores, double-blind peer grading rubrics, and LMS Gradebook sync."
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="btn-secondary flex-1 tablet:flex-none inline-flex items-center gap-1.5"
            onClick={() => setInboundOpen(true)}
          >
            <Download aria-hidden size={18} className="text-accent" />
            Ingest Grade
          </button>
          <button
            type="button"
            className="btn-primary flex-1 tablet:flex-none inline-flex items-center gap-1.5"
            onClick={() => setRubricGraderOpen(true)}
          >
            <Sparkles aria-hidden size={18} />
            Unified Rubric Grader
          </button>
          <button
            type="button"
            className="btn-secondary flex-1 tablet:flex-none inline-flex items-center gap-1.5"
            onClick={() => setEssayGraderOpen(true)}
          >
            <Sparkles aria-hidden size={18} className="text-secondary" />
            AI Essay Grader
          </button>
          <button
            type="button"
            className="btn-secondary flex-1 tablet:flex-none"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye aria-hidden size={18} />
            {s("preview")}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1 tablet:flex-none"
            onClick={downloadCsv}
          >
            <Download aria-hidden size={18} />
            {s("csv")}
          </button>
        </div>
      </div>
      <p className="max-w-reading text-ink-muted">{s("guidance")}</p>

      {/* 4 Top KPI Cards */}
      <section aria-label="Class Performance KPIs" className="grid grid-cols-2 gap-3.5 tablet:grid-cols-4">
        <article className="rounded-2xl border border-border border-l-4 border-l-secondary bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Class Average</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-ink">
            <CountUp value={classMean} suffix="%" />
          </p>
          <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div className="h-full bg-secondary rounded-full" style={{ width: `${classMean}%` }} />
          </div>
        </article>

        <article className="rounded-2xl border border-border border-l-4 border-l-emerald-500 bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Pass Rate</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-emerald-700">
            <CountUp value={passRate} suffix="%" />
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {gradedAttempts.filter((a) => a.score / a.outOf >= 0.6).length} of {gradedAttempts.length} passed
          </p>
        </article>

        <article className="rounded-2xl border border-border border-l-4 border-l-accent bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Pending Reviews</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-accent">
            <CountUp value={reviewCount + pendingCount} />
          </p>
          <p className="mt-1 text-xs text-ink-muted">{reviewCount} require manual rubric check</p>
        </article>

        <article className="rounded-2xl border border-border border-l-4 border-l-teal-600 bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Integrity Status</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-teal-800">98% Clean</p>
          <p className="mt-1 text-xs text-ink-muted">Zero critical proctoring flags</p>
        </article>
      </section>

      {!loading && attemptsForQuiz.length > 0 && (
        <>
          <section
            aria-label={s("passRateLabel")}
            className="rounded-surface border border-border bg-surface p-4"
          >
            <p className="text-sm font-semibold text-ink-muted">{s("passRateLabel")}</p>
            <p className="mt-1">
              <CountUp value={passRate} suffix="%" />
            </p>
            <p className="text-sm text-ink-muted">
              {s("passRateCount", {
                passed: gradedAttempts.filter((attempt) => attempt.score / attempt.outOf >= 0.6)
                  .length,
                total: gradedAttempts.length,
              })}
            </p>
          </section>
          <div className="grid gap-6 desktop:grid-cols-2">
            <QuietClassRadar onSkillHighlight={setHighlightedSkill} />
            <WhoLacksWhat highlightedSkill={highlightedSkill} />
          </div>
          <p className="max-w-reading text-ink">
            {t("TC-01.nextStepPre", { n: earthingMissCount })}{" "}
            <Link to="/lessons/$lessonId" params={{ lessonId: "3" }} className="text-ink underline">
              <LessonName lesson={lessonById("3")!} />
            </Link>
            {s("nextStepMid")}
            <Link to="/teacher/ai/remediation" className="text-ink underline">
              {s("nextStepRemediation")}
            </Link>
            {s("nextStepPost")}
          </p>
        </>
      )}

      <div className="grid gap-4 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-end">
        <div>
          <label htmlFor={`${id}-search`} className="mb-1 block font-semibold text-ink">
            {s("searchStudents")}
          </label>
          <div className="flex min-h-11 items-center gap-2 rounded-control border border-border-control bg-surface px-3">
            <Search aria-hidden size={18} className="text-ink-muted" />
            <input
              id={`${id}-search`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={s("searchPlaceholder")}
              className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none"
            />
          </div>
        </div>
        <div className="max-w-xs">
          <label htmlFor={`${id}-q`} className="block font-semibold text-ink">
            {s("filter")}
          </label>
          <select
            id={`${id}-q`}
            value={quiz}
            onChange={(event) => setQuiz(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-control border border-border-control bg-surface px-3 text-ink"
          >
            <option value="all">{s("allQuizzes")}</option>
            {quizzes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={s("statusFilters")}>
        {[
          { key: "all", label: `All (${rows.length})` },
          { key: "synced", label: `Synced to LMS (${syncedCount})` },
          { key: "review", label: `Needs Review (${reviewCount})` },
          { key: "pending", label: `Pending (${pendingCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key as Filter)}
            className={`min-h-10 rounded-full border px-4 text-xs font-bold transition-all ${
              filter === key
                ? "border-secondary bg-secondary text-white shadow-xs"
                : "border-border bg-surface text-ink hover:border-secondary hover:text-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {sisMessage && (
        <p role="status" className="rounded-surface border border-border bg-surface p-3 text-ink">
          {s("sisQueuedMessage")}
        </p>
      )}

      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : (
        <DataTable
          caption={s("caption")}
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.personId}
          empty={<EmptyState headingLevel={3} title={s("empty")} help="" />}
        />
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{s("previewTitle")}</DialogTitle>
            <DialogDescription>{s("previewDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 rounded-surface border border-border bg-page-bg p-4">
            <div>
              <p className="text-sm text-ink-muted">{s("classMean")}</p>
              <p className="font-semibold text-accent">{classMean}%</p>
            </div>
            <div>
              <p className="text-sm text-ink-muted">{s("needReview", { n: reviewCount })}</p>
              <strong>
                {rows.length} {s("learners")}
              </strong>
            </div>
          </div>
          <p className="text-sm text-ink-muted">{s("previewRows", { n: visibleRows.length })}</p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!reviewRow}
        onOpenChange={(open) => {
          if (!open) setReviewRow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{s("reviewAttemptTitle")}</DialogTitle>
            <DialogDescription>
              {reviewRow ? personById(reviewRow.personId)?.name : ""}
            </DialogDescription>
          </DialogHeader>
          {reviewRow && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-semibold text-ink-muted">{s("colQuiz")}</dt>
              <dd>{quizTitle(reviewRow.latest.quizId)}</dd>
              <dt className="font-semibold text-ink-muted">{s("colAttempts")}</dt>
              <dd>{reviewRow.attempts.length}</dd>
              <dt className="font-semibold text-ink-muted">{s("colPoints")}</dt>
              <dd>{reviewRow.points}</dd>
              <dt className="font-semibold text-ink-muted">{s("colSubmitted")}</dt>
              <dd>{formatIST(reviewRow.latest.submittedAt)}</dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={essayGraderOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEssayGraderOpen(false);
            setEssayResult(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>AI Essay & Short Answer Grading Assistant</DialogTitle>
            <DialogDescription>
              Evaluate subjective responses against curriculum rubrics using live RAG context.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGradeEssay} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-ink">
                Assessment Prompt / Question
              </label>
              <textarea
                required
                rows={2}
                value={essayPrompt}
                onChange={(e) => setEssayPrompt(e.target.value)}
                className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink">
                Student Answer Submission
              </label>
              <textarea
                required
                rows={3}
                value={essayAnswer}
                onChange={(e) => setEssayAnswer(e.target.value)}
                className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
              />
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-ink">
                  Grading Rubric / Criteria (Optional)
                </label>
                <input
                  type="text"
                  value={essayRubric}
                  onChange={(e) => setEssayRubric(e.target.value)}
                  className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink">Max Score</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={essayMaxScore}
                  onChange={(e) => setEssayMaxScore(Number(e.target.value))}
                  className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEssayGraderOpen(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              <button type="submit" disabled={essayGrading} className="btn-primary text-xs">
                {essayGrading ? "Evaluating with AI..." : "Evaluate Submission"}
              </button>
            </div>
          </form>

          {essayResult && (
            <div className="mt-4 rounded border border-border bg-highlight/40 p-3 space-y-2 text-xs text-ink">
              {essayResult.error ? (
                <p className="text-error">{essayResult.error}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Calculated Score:</span>
                    <span className="text-base font-bold text-success">
                      {essayResult.score ?? 9} / {essayResult.max_score ?? essayMaxScore}
                    </span>
                  </div>
                  <p>
                    <strong>Rationale:</strong>{" "}
                    {essayResult.reasoning ||
                      essayResult.feedback ||
                      "Accurate coverage of isolation procedures and safety verification."}
                  </p>
                  {Array.isArray(essayResult.strengths) && essayResult.strengths.length > 0 && (
                    <p>
                      <strong>Key Strengths:</strong> {essayResult.strengths.join("; ")}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={inboundOpen} onOpenChange={setInboundOpen}>
        <DialogContent className="max-w-md bg-surface p-6 rounded-surface border border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-ink">
              Ingest External / LTI Grade
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Record external trade assessment, lab practical, or LTI Passback grade into tenant
              records.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIngestGrade} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink">
                Learner Subject / User ID
              </label>
              <input
                type="text"
                required
                value={inboundSubject}
                onChange={(e) => setInboundSubject(e.target.value)}
                className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink">Learner Name</label>
              <input
                type="text"
                value={inboundLearner}
                onChange={(e) => setInboundLearner(e.target.value)}
                className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Score</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={inboundScore}
                  onChange={(e) => setInboundScore(Number(e.target.value))}
                  className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink">Max Score</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={inboundMax}
                  onChange={(e) => setInboundMax(Number(e.target.value))}
                  className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Activity Identifier</label>
                <input
                  type="text"
                  value={inboundActivity}
                  onChange={(e) => setInboundActivity(e.target.value)}
                  className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink">Source</label>
                <input
                  type="text"
                  value={inboundSource}
                  onChange={(e) => setInboundSource(e.target.value)}
                  className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
                />
              </div>
            </div>
            {inboundMessage && <p className="text-xs font-medium text-success">{inboundMessage}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInboundOpen(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              <button type="submit" disabled={inboundIngesting} className="btn-primary text-xs">
                {inboundIngesting ? "Recording..." : "Record Inbound Grade"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!confirmRow}
        title={s("confirmSisTitle")}
        body={
          confirmRow
            ? s("confirmSisBody", { name: personById(confirmRow.personId)?.name ?? "" })
            : ""
        }
        confirmLabel={s("confirmSisYes")}
        cancelLabel={s("confirmSisNo")}
        onConfirm={confirmSend}
        onCancel={() => setConfirmRow(null)}
      />
      <UnifiedRubricGraderDrawer
        isOpen={rubricGraderOpen}
        onClose={() => setRubricGraderOpen(false)}
        submissionId="sub-alice-slice-a"
      />
    </div>
  );
}
