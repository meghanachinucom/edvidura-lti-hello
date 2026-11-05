import { useId, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Clock3, Download, Eye, Search } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { HeroBand } from "@/components/shared/HeroBand";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
type ResultRow = { personId: string; attempts: Attempt[]; latest: Attempt; status: ReviewStatus; scorePercent: number; points: string };
type Filter = "all" | ReviewStatus;

function statusFor(attempts: Attempt[], scorePercent: number): ReviewStatus {
  if (attempts.every((attempt) => attempt.moodleStatus === "sent")) return "synced";
  if (scorePercent <= 40 || attempts.some((attempt) => ["waiting", "unavailable", "error"].includes(attempt.moodleStatus))) return "review";
  return "pending";
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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
  const allAttempts = m.attempts === "empty" ? [] : classAttempts;
  const attemptsForQuiz = quiz === "all" ? allAttempts : allAttempts.filter((attempt) => attempt.quizId === quiz);

  const rows = useMemo(() => {
    const grouped = new Map<string, Attempt[]>();
    for (const attempt of attemptsForQuiz) grouped.set(attempt.personId, [...(grouped.get(attempt.personId) ?? []), attempt]);
    return [...grouped.entries()].map(([personId, attempts]) => {
      const latest = [...attempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]!;
      const score = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
      const outOf = attempts.reduce((sum, attempt) => sum + attempt.outOf, 0);
      const scorePercent = outOf ? Math.round((score / outOf) * 100) : 0;
      return { personId, attempts, latest, status: statusFor(attempts, scorePercent), scorePercent, points: `${score}/${outOf}` };
    }).sort((a, b) => (personById(a.personId)?.name ?? "").localeCompare(personById(b.personId)?.name ?? ""));
  }, [attemptsForQuiz]);

  const syncedCount = rows.filter((row) => row.status === "synced").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const classMean = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.scorePercent, 0) / rows.length) : 0;
  const gradedAttempts = attemptsForQuiz.filter((attempt) => attempt.kind === "graded");
  const passRate = gradedAttempts.length ? Math.round((gradedAttempts.filter((attempt) => attempt.score / attempt.outOf >= 0.6).length / gradedAttempts.length) * 100) : 0;
  const visibleRows = rows.filter((row) => {
    const student = personById(row.personId);
    const email = `${student?.name.toLowerCase().replaceAll(" ", ".")}@example.edu`;
    return (filter === "all" || row.status === filter) && `${student?.name ?? ""} ${email}`.toLowerCase().includes(search.trim().toLowerCase());
  });

  const columns: Column<ResultRow>[] = [
    { key: "student", header: s("colStudent"), cell: (row) => {
      const person = personById(row.personId);
      const name = person?.name ?? "";
      return <span className="flex min-w-48 items-center gap-3"><span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-ink">{initials(name)}</span><span className="min-w-0"><span className="block font-semibold text-ink">{name}</span><span className="block break-all font-mono text-xs text-ink-muted">{`${name.toLowerCase().replaceAll(" ", ".")}@example.edu`}</span></span></span>;
    } },
    { key: "attempts", header: s("colAttempts"), cell: (row) => row.attempts.length },
    { key: "score", header: s("colScore"), cell: (row) => <span className="block min-w-24"><span className="font-semibold text-ink">{row.scorePercent}%</span><span className="mt-1 block h-2 overflow-hidden rounded-full bg-page-bg" role="progressbar" aria-label={`${s("colScore")}: ${personById(row.personId)?.name ?? ""}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.scorePercent}><span className="block h-full rounded-full bg-secondary" style={{ width: `${row.scorePercent}%` }} /></span></span> },
    { key: "points", header: s("colPoints"), cell: (row) => row.points },
    { key: "sync", header: s("colSync"), cell: (row) => <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${row.status === "synced" ? "bg-secondary-container text-ink" : "bg-tertiary-container text-ink"}`}>{row.status === "synced" ? s("synced") : s("queued")}</span> },
    { key: "actions", header: s("colActions"), cell: (row) => <span className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={() => setReviewRow(row)}>{s("reviewAction")}</button><button type="button" disabled={queuedSis.has(row.personId)} className="btn-primary disabled:opacity-60" onClick={() => { setSisMessage(false); setConfirmRow(row); }}>{queuedSis.has(row.personId) ? s("sisQueuedAction") : s("sendSis")}</button></span> },
  ];

  const downloadCsv = () => {
    const esc = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const header = [s("colStudent"), s("colAttempts"), s("colScore"), s("colPoints"), s("colSync")].map(esc).join(",");
    const lines = visibleRows.map((row) => {
      const person = personById(row.personId);
      const syncLabel = row.status === "synced" ? s("synced") : s("queued");
      return [person?.name ?? "", String(row.attempts.length), `${row.scorePercent}%`, row.points, syncLabel].map(esc).join(",");
    });
    downloadBlob(new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" }), "class-results.csv");
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
        <div className="min-w-0"><HeroBand><PageHeading text={s("title")} /></HeroBand><p className="mt-1 text-ink">{s("subtitle")}</p></div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={() => setPreviewOpen(true)}><Eye aria-hidden size={18} />{s("preview")}</button>
          <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={downloadCsv}><Download aria-hidden size={18} />{s("csv")}</button>
        </div>
      </div>
      <p className="max-w-reading text-ink-muted">{s("guidance")}</p>

      <section aria-label={s("summaryCards")} className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
        {summaryCards.map(({ label, count, icon: Icon, tone }) => <article key={label} className="flex items-center gap-4 rounded-surface border border-border bg-surface p-4 shadow-sm transition-transform duration-150 hover:-translate-y-0.5"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary-container"><Icon aria-hidden size={24} className={tone} /></span><div><p className="text-sm text-ink-muted">{label}</p><p className="font-heading text-2xl font-extrabold text-ink"><CountUp value={count} /></p></div></article>)}
      </section>

      <section aria-label={s("classSummary")} className="flex flex-col gap-3 rounded-surface border border-border bg-surface p-4 tablet:flex-row tablet:items-center tablet:justify-between tablet:p-5">
        <div><p className="text-sm font-semibold text-ink-muted">{s("classMean")}</p><p className="font-heading text-3xl font-bold text-accent"><CountUp value={classMean} suffix="%" /></p></div>
        <p className="font-semibold text-ink">{s("needReview", { n: reviewCount })}</p>
      </section>

      {!loading && attemptsForQuiz.length > 0 && <>
        <section aria-label={s("passRateLabel")} className="rounded-surface border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-ink-muted">{s("passRateLabel")}</p><p className="mt-1"><CountUp value={passRate} suffix="%" /></p>
          <p className="text-sm text-ink-muted">{s("passRateCount", { passed: gradedAttempts.filter((attempt) => attempt.score / attempt.outOf >= 0.6).length, total: gradedAttempts.length })}</p>
        </section>
        <div className="grid gap-6 desktop:grid-cols-2"><QuietClassRadar onSkillHighlight={setHighlightedSkill} /><WhoLacksWhat highlightedSkill={highlightedSkill} /></div>
        <p className="max-w-reading text-ink">{t("TC-01.nextStepPre", { n: earthingMissCount })} <Link to="/lessons/$lessonId" params={{ lessonId: "3" }} className="text-ink underline"><LessonName lesson={lessonById("3")!} /></Link>{s("nextStepMid")}<Link to="/teacher/ai/remediation" className="text-ink underline">{s("nextStepRemediation")}</Link>{s("nextStepPost")}</p>
      </>}

      <div className="grid gap-4 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:items-end">
        <div>
          <label htmlFor={`${id}-search`} className="mb-1 block font-semibold text-ink">{s("searchStudents")}</label>
          <div className="flex min-h-11 items-center gap-2 rounded-control border border-border-control bg-surface px-3"><Search aria-hidden size={18} className="text-ink-muted" /><input id={`${id}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={s("searchPlaceholder")} className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none" /></div>
        </div>
        <div className="max-w-xs">
          <label htmlFor={`${id}-q`} className="block font-semibold text-ink">{s("filter")}</label>
          <select id={`${id}-q`} value={quiz} onChange={(event) => setQuiz(event.target.value)} className="mt-1 min-h-11 w-full rounded-control border border-border-control bg-surface px-3 text-ink">
            <option value="all">{s("allQuizzes")}</option>{quizzes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={s("statusFilters")}>
        {(["all", "synced", "review", "pending"] as Filter[]).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${filter === value ? "border-secondary bg-secondary-container text-ink" : "border-border-control bg-surface text-ink"}`}>{s(value)}</button>)}
      </div>
      {sisMessage && <p role="status" className="rounded-surface border border-border bg-surface p-3 text-ink">{s("sisQueuedMessage")}</p>}

      {loading ? <LoadingSkeleton variant="table" count={5} /> : <DataTable caption={s("caption")} columns={columns} rows={visibleRows} rowKey={(row) => row.personId} empty={<EmptyState headingLevel={3} title={s("empty")} help="" />} />}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{s("previewTitle")}</DialogTitle><DialogDescription>{s("previewDescription")}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3 rounded-surface border border-border bg-page-bg p-4"><div><p className="text-sm text-ink-muted">{s("classMean")}</p><p className="font-semibold text-accent">{classMean}%</p></div><div><p className="text-sm text-ink-muted">{s("needReview", { n: reviewCount })}</p><strong>{rows.length} {s("learners")}</strong></div></div>
          <p className="text-sm text-ink-muted">{s("previewRows", { n: visibleRows.length })}</p>
        </DialogContent>
      </Dialog>
      <Dialog open={!!reviewRow} onOpenChange={(open) => { if (!open) setReviewRow(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{s("reviewAttemptTitle")}</DialogTitle><DialogDescription>{reviewRow ? personById(reviewRow.personId)?.name : ""}</DialogDescription></DialogHeader>
          {reviewRow && <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt className="font-semibold text-ink-muted">{s("colQuiz")}</dt><dd>{quizTitle(reviewRow.latest.quizId)}</dd><dt className="font-semibold text-ink-muted">{s("colAttempts")}</dt><dd>{reviewRow.attempts.length}</dd><dt className="font-semibold text-ink-muted">{s("colPoints")}</dt><dd>{reviewRow.points}</dd><dt className="font-semibold text-ink-muted">{s("colSubmitted")}</dt><dd>{formatIST(reviewRow.latest.submittedAt)}</dd></dl>}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!confirmRow} title={s("confirmSisTitle")} body={confirmRow ? s("confirmSisBody", { name: personById(confirmRow.personId)?.name ?? "" }) : ""} confirmLabel={s("confirmSisYes")} cancelLabel={s("confirmSisNo")} onConfirm={confirmSend} onCancel={() => setConfirmRow(null)} />
    </div>
  );
}
