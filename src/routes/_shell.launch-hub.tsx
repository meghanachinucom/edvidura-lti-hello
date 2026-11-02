import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { HeroBand } from "@/components/shared/HeroBand";
import { targetRoles } from "@/data/skills";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { useRole } from "@/components/shell/RoleContext";
import { currentUsers, personById, type Role } from "@/data/people";
import { course } from "@/data/course";
import { institute } from "@/data/institute";
import { lessons } from "@/data/lessons";
import { myAttempts, classAttempts } from "@/data/attempts";
import { quizTitle } from "@/data/quiz";
import { adminHub, adminHubClasses, learnerHub, teacherHub, type HubClass } from "@/data/hub";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";
import { LotoCheck } from "@/components/learner/LotoCheck";

export const Route = createFileRoute("/_shell/launch-hub")({
  head: () => ({
    meta: [
      { title: t("SH-02.title") + t("app.titleSuffix") },
      { name: "description", content: t("SH-02.continue") },
      { property: "og:title", content: t("SH-02.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SH-02.continue") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LaunchHub,
});

const s = (k: string, v?: Record<string, string | number>) => t(`SH-02.${k}`, v);
const QUICK: Record<Role, { to: string; key: string }[]> = {
  learner: [{ to: "/active-quizzes", key: "quiz" }, { to: "/learn/coach", key: "coach" }, { to: "/lessons", key: "lessons" }, { to: "/learn/micro", key: "micro" }, { to: "/learn/gap", key: "plan" }],
  instructor: [{ to: "/teacher/attempts", key: "classResults" }, { to: "/teacher/content", key: "content" }, { to: "/teacher/manuals", key: "ebooks" }, { to: "/teacher/ai", key: "ai" }],
  trainingOfficer: [{ to: "/school-admin/teachers", key: "teachers" }, { to: "/school-admin/classes", key: "classes" }, { to: "/school-admin/students", key: "students" }, { to: "/school-admin/analytics", key: "analytics" }, { to: "/school-admin/activity", key: "activity" }],
};
const firstName = (name: string) => name.split(" ")[0] ?? name;

function LaunchHub() {
  const { role, session } = useRole();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), mockState.launchHub.loadingMs);
    return () => clearTimeout(id);
  }, []);
  const name = session?.name ?? currentUsers[role].name;
  const subline = role === "trainingOfficer" ? institute.shortName : `${course.title} · ${institute.shortName}`;
  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      <HeroBand className={role === "learner" ? "learner-home-hero" : ""}>
        <div className="relative">
          <PageHeading text={s("hi", { name: firstName(name) })} />
          <p className="mt-2 text-ink-muted">{subline}</p>
        </div>
      </HeroBand>
      {loading ? <LoadingSkeleton variant="text" count={4} /> : <HubBody role={role} />}
    </div>
  );
}

function QuickActions({ role }: { role: Role }) {
  return (
    <section aria-labelledby="hub-quick">
      <h2 id="hub-quick" className="font-heading text-[22px] text-ink">{s("quickActions")}</h2>
      <ul className="mt-3 grid gap-2 tablet:grid-cols-2">
        {QUICK[role].map((q) => <li key={q.to}><Link to={q.to} className="flex min-h-11 items-center justify-between gap-2 rounded-surface border border-border bg-surface px-4 py-3 text-ink"><span className="min-w-0">{s(`qa.${q.key}`)}</span><ChevronRight aria-hidden size={18} className="shrink-0 text-ink-muted" /></Link></li>)}
      </ul>
    </section>
  );
}

function LearnerHome() {
  const next = lessons.find((l) => !l.markedDone && l.kind !== "quiz");
  const results = myAttempts.filter((a) => a.kind === "graded").sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 2);
  const pathway = targetRoles[0];
  const progress = learnerHub.ringPercent;
  return (
    <>
      <section aria-label={s("progress")} className="rounded-surface border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-[20px] text-ink">{s("progress")}</h2>
          <p className="font-heading text-2xl font-extrabold text-accent tabular-nums">{learnerHub.lessonsDone}<span className="text-base font-medium text-ink-muted"> / {learnerHub.lessonsTotal}</span></p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-border" role="progressbar" aria-label={s("progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-secondary" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section aria-labelledby="hub-continue">
        <h2 id="hub-continue" className="font-heading text-[22px] text-ink">{s("continue")}</h2>
        {next ? (
          <Link to="/lessons/$lessonId" params={{ lessonId: next.id }} className="mt-3 flex min-h-40 items-center justify-between gap-4 rounded-surface border border-border bg-surface p-6 text-ink shadow-md">
            <span className="min-w-0"><span className="block text-sm text-ink-muted">{t(`shared.lessonKind.${next.kind}`)}</span><span className="mt-2 block font-heading text-2xl font-bold">{next.title}</span><span className="mt-4 inline-flex min-h-11 items-center text-secondary underline">{s("continueLesson")}</span></span>
            <ChevronRight aria-hidden size={28} className="shrink-0 text-secondary" />
          </Link>
        ) : <div className="mt-3 rounded-surface bg-surface p-4 text-ink"><p>{s("endOfLessons")}</p><Link to="/active-quizzes" className="btn-primary mt-3">{s("endLink")}</Link></div>}
      </section>

      {pathway && <section aria-labelledby="career-pathway" className="rounded-surface border border-border bg-surface p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{s("careerPathway")}</p>
        <h2 id="career-pathway" className="mt-1 font-heading text-[22px] text-ink">{pathway.title}</h2>
        <p className="mt-2 text-ink">{s("credentialNext")}: {pathway.title}</p>
        <Link to="/learn/gap" className="mt-3 inline-flex min-h-11 items-center text-secondary underline">{s("viewPathway")}</Link>
      </section>}

      <QuickActions role="learner" />
      <LotoCheck />

      <section aria-labelledby="hub-results">
        <h2 id="hub-results" className="font-heading text-[22px] text-ink">{s("myResults")}</h2>
        {results.length === 0 ? <p className="mt-3 text-ink-muted">{s("noAttempts")}</p> : (
          <ul className="mt-3 divide-y divide-border rounded-surface bg-surface">
            {results.map((a) => <li key={a.id}><Link to="/quiz/result/$attemptId" params={{ attemptId: a.id }} className="grid min-h-11 gap-1 p-4 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:gap-4"><div className="min-w-0"><p className="font-semibold text-ink">{quizTitle(a.quizId)}</p><p className="text-sm text-ink-muted">{formatIST(a.submittedAt)}</p></div><div className="tablet:text-right"><p className="text-ink">{t("shared.scoreOf", { n: a.score })}</p><p className="text-sm text-ink-muted">{t(`shared.moodleStatus.${a.moodleStatus}`)}</p></div></Link></li>)}
          </ul>
        )}
      </section>
    </>
  );
}

function TeacherHome() {
  const recent = [...classAttempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 4);
  const kpis: { key: string; value: string | number; note?: string }[] = [
    { key: "kpiAttempts", value: teacherHub.attempts }, { key: "kpiAvg", value: teacherHub.avgScore },
    { key: "kpiPass", value: teacherHub.passRate, note: s("passMark", { mark: teacherHub.passMark }) },
  ];
  return (
    <>
      <section aria-labelledby="hub-kpis"><h2 id="hub-kpis" className="font-heading text-[22px] text-ink">{s("classSnapshot")}</h2><ul className="mt-3 grid gap-2 tablet:grid-cols-3">{kpis.map((k) => <li key={k.key} className="rounded-surface border border-border bg-surface p-4"><p className="text-sm text-ink-muted">{s(k.key)}</p><p className="mt-1 font-heading text-[28px] font-extrabold text-metric">{k.value}</p>{k.note && <p className="mt-1 text-sm text-ink-muted">{k.note}</p>}</li>)}</ul><p className="mt-3 text-ink">{s("nextStep", { passRate: teacherHub.passRate, passMark: teacherHub.passMark, avg: teacherHub.avgScore, attempts: teacherHub.attempts })}</p></section>
      <section aria-labelledby="hub-recent"><h2 id="hub-recent" className="font-heading text-[22px] text-ink">{s("recentAttempts")}</h2><ul className="mt-3 divide-y divide-border rounded-surface bg-surface">{recent.map((a) => <li key={a.id} className="grid gap-1 p-4 tablet:grid-cols-[minmax(0,1fr)_auto] tablet:gap-4"><div className="min-w-0"><p className="font-semibold text-ink">{quizTitle(a.quizId)}</p><p className="text-sm text-ink-muted">{personById(a.personId)?.name} · {formatIST(a.submittedAt)}</p></div><div className="tablet:text-right"><p className="text-ink">{t("shared.scoreOf", { n: a.score })}</p><p className="text-sm text-ink-muted">{t(`shared.moodleStatus.${a.moodleStatus}`)}</p></div></li>)}</ul></section>
      <QuickActions role="instructor" />
    </>
  );
}

const classColumns: Column<HubClass>[] = [
  { key: "class", header: t("SH-02.colClass"), cell: (r) => <span><span className="font-semibold">{r.code}</span> · {r.name}</span> },
  { key: "status", header: t("SH-02.colStatus"), cell: (r) => t(r.bound ? "SH-02.bound" : "SH-02.notBound") },
];

function AdminHome() {
  const counts: { key: string; value: number }[] = [{ key: "countClasses", value: adminHub.classes }, { key: "countTeachers", value: adminHub.teachers }, { key: "countStudents", value: adminHub.students }];
  return (
    <>
      <section aria-labelledby="hub-counts"><h2 id="hub-counts" className="font-heading text-[22px] text-ink">{s("instituteSnapshot")}</h2><ul className="mt-3 grid gap-2 tablet:grid-cols-3">{counts.map((c) => <li key={c.key} className="rounded-surface border border-border bg-surface p-4"><p className="text-sm text-ink-muted">{s(c.key)}</p><p className="mt-1 font-heading text-[28px] font-bold text-ink">{c.value}</p></li>)}</ul></section>
      <DataTable caption={s("classesTable")} columns={classColumns} rows={adminHubClasses} rowKey={(r) => r.code} />
      <QuickActions role="trainingOfficer" />
    </>
  );
}

function HubBody({ role }: { role: Role }) {
  if (role === "instructor") return <TeacherHome />;
  if (role === "trainingOfficer") return <AdminHome />;
  return <LearnerHome />;
}
