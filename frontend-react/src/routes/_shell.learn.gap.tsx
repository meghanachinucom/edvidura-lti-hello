import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Network, Sparkles } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoopStepper } from "@/components/shared/LoopStepper";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { lessonById } from "@/data/lessons";
import { skills, targetRoles } from "@/data/skills";
import { mockState } from "@/data/mockState";
import { RoleTransitionDelta } from "@/components/learner/RoleTransitionDelta";
import { LessonName } from "@/components/shared/LessonList";
import { api } from "@/lib/api";

// LR-09 My plan. Fixed step labels only; no percentages or dates.
export const Route = createFileRoute("/_shell/learn/gap")({
  head: () => ({
    meta: [
      { title: t("pages.gap") + t("app.titleSuffix") },
      { name: "description", content: t("LR-09.lead") },
      { property: "og:title", content: t("pages.gap") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-09.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`LR-09.${k}`);
type Step = 1 | 2 | 3;

function Page() {
  const m = mockState.plan;
  const [step, setStep] = useState<Step>(m.step);
  const [roleId, setRoleId] = useState(targetRoles[0]?.id ?? "");
  const [appliedId, setAppliedId] = useState(targetRoles[0]?.id ?? "");
  const [msg, setMsg] = useState<"" | "applied" | "error">("");
  const review = lessonById("3");

  useEffect(() => {
    let active = true;
    api
      .get<{ plan?: any; steps?: any[]; current_step?: number }>("/api/v1/app/plan")
      .then((data) => {
        if (active && data) {
          const cur = data.current_step;
          if (cur === 1 || cur === 2 || cur === 3) {
            setStep(cur as Step);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const save = (fn: () => void) => {
    if (m.save === "error") {
      setMsg("error");
      return;
    }
    setMsg("");
    fn();
  };
  const status = (n: Step) => (n < step ? s("done") : n === step ? s("now") : s("next"));
  const role = targetRoles.find((r) => r.id === appliedId);
  const missing = skills.filter((k) => role?.missing.includes(k.code));

  if (!m.open) {
    return (
      <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
        <PageHeading titleKey="pages.gap" />
        <EmptyState
          title={s("emptyTitle")}
          help={s("emptyHelp")}
          action={
            <Link to="/active-quizzes" className="btn-primary">
              {s("takeQuiz")}
            </Link>
          }
        />
      </div>
    );
  }

  const Group = ({ n, title, children }: { n: Step; title: string; children: React.ReactNode }) => (
    <li
      className={`rounded-surface border bg-surface p-4 text-ink ${n === step ? "border-2 border-accent" : "border-border"}`}
    >
      <h3 className="font-heading text-[20px]">
        {n}. {title}
      </h3>
      <p className="mt-1 font-semibold">{status(n)}</p>
      <div className="mt-3 flex flex-col gap-2 tablet:flex-row tablet:flex-wrap tablet:items-center">
        {children}
      </div>
    </li>
  );

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <PageHeading titleKey="pages.gap" />
        <a href="/learn/gap" className="text-xs text-ink-muted underline">
          Open Server Gap Pathway (Jinja)
        </a>
      </div>
      <p className="max-w-reading text-ink">{s("lead")}</p>
      <LoopStepper current={step} />
      <RoleTransitionDelta />

      <div className="flex flex-col gap-2 tablet:flex-row tablet:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="target-role" className="font-semibold text-ink">
            {s("role")}
          </label>
          <select
            id="target-role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="min-h-11 rounded-surface border border-border-control bg-surface px-3 text-ink"
          >
            {targetRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            save(() => {
              setAppliedId(roleId);
              setMsg("applied");
            })
          }
        >
          {s("apply")}
        </button>
      </div>
      <p role="status" className="text-ink">
        {msg === "applied" ? s("applied") : ""}
      </p>
      {msg === "error" && <ErrorAlert message={s("saveError")} />}

      <ol className="space-y-3">
        <Group n={1} title={s("review")}>
          {review && (
            <Link
              to="/lessons/$lessonId"
              params={{ lessonId: review.id }}
              className="inline-flex min-h-11 items-center underline"
            >
              <LessonName lesson={review} />
            </Link>
          )}
          {step === 1 && (
            <button type="button" className="btn-secondary" onClick={() => save(() => setStep(2))}>
              {s("markDone")}
            </button>
          )}
        </Group>
        <Group n={2} title={s("practise")}>
          <Link to="/active-quizzes" className="btn-secondary">
            {s("takeQuiz")}
          </Link>
          <Link to="/active-quizzes" className="inline-flex min-h-11 items-center underline">
            {s("jump")}
          </Link>
        </Group>
        <Group n={3} title={s("retry")}>
          {step === 3 ? (
            <Link to="/quiz" className="btn-secondary">
              {s("retry")}
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="btn-secondary"
                aria-describedby="retry-lock"
              >
                {s("retry")}
              </button>
              <span id="retry-lock" className="text-ink-muted">
                {s("retryLocked")}
              </span>
            </>
          )}
        </Group>
      </ol>

      {step < 3 && (
        <button
          type="button"
          className="btn-primary w-full tablet:w-auto"
          onClick={() => save(() => setStep((x) => (x + 1) as Step))}
        >
          {s("continue")}
        </button>
      )}

      <section
        aria-labelledby="optional"
        className="rounded-surface border border-border bg-surface p-4"
      >
        <h2 id="optional" className="font-heading text-[20px] text-ink">
          {s("optional")}
        </h2>
        <ul className="mt-3 space-y-2 text-ink">
          {missing.map((k) => {
            const l = k.lessonId ? lessonById(k.lessonId) : undefined;
            return (
              <li key={k.code}>
                <p className="font-semibold">{k.title}</p>
                {l ? (
                  <Link
                    to="/lessons/$lessonId"
                    params={{ lessonId: l.id }}
                    className="inline-flex min-h-11 items-center underline"
                  >
                    <LessonName lesson={l} />
                  </Link>
                ) : (
                  <p className="text-ink-muted">{s("noLesson")}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* IEEE 1484.20.3 & ADL TLA Semantic Linked Data Competency Map */}
      <section className="rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Network className="text-brand size-5" />
            <h2 className="font-heading text-lg font-bold text-ink">
              IEEE 1484.20.3 Competency Graph & Learning Alignments
            </h2>
          </div>
          <span className="rounded-pill bg-brand/10 text-brand px-2.5 py-0.5 text-xs font-mono font-medium">
            JSON-LD Semantic Layer
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          Your learning path is semantically linked to standardized competencies, textbook chapters,
          and xAPI diagnostic evidence.
        </p>

        <div className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
          <div className="rounded-card border border-border bg-page-bg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-brand">comp-variables</span>
              <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-1.5 py-0.2">
                Prerequisite Met
              </span>
            </div>
            <h3 className="text-xs font-bold text-ink">Variables & Algebraic Expressions</h3>
            <p className="text-[11px] text-ink-muted">
              Foundational skill for balancing equations.
            </p>
            <div className="pt-2 border-t border-border/60 text-[11px] text-ink-muted">
              Aligned:{" "}
              <Link
                to="/read/manuals/$manualId"
                params={{ manualId: "11111111-2222-3333-4444-555555555551" }}
                className="text-brand underline font-medium"
              >
                Algebra I Ch. 1
              </Link>
            </div>
          </div>

          <div className="rounded-card border border-brand/40 bg-brand/5 p-3.5 space-y-2 ring-1 ring-brand/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-brand">comp-solve-linear</span>
              <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.2">
                In Progress
              </span>
            </div>
            <h3 className="text-xs font-bold text-ink">Solving Linear Equations</h3>
            <p className="text-[11px] text-ink-muted">
              Two-step isolation and inverse balance operations.
            </p>
            <div className="pt-2 border-t border-border/60 text-[11px] text-ink-muted">
              Aligned:{" "}
              <Link to="/active-quizzes" className="text-brand underline font-medium">
                Slice A Quiz (Q2, Q3)
              </Link>
            </div>
          </div>

          <div className="rounded-card border border-border bg-page-bg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-ink-muted">
                comp-word-problems
              </span>
              <span className="rounded bg-gray-100 text-gray-700 text-[10px] font-semibold px-1.5 py-0.2">
                Next Goal
              </span>
            </div>
            <h3 className="text-xs font-bold text-ink">Linear Word Problems</h3>
            <p className="text-[11px] text-ink-muted">
              Formulating real-world quantitative conditions into models.
            </p>
            <div className="pt-2 border-t border-border/60 text-[11px] text-ink-muted">
              Aligned:{" "}
              <Link
                to="/read/manuals/$manualId"
                params={{ manualId: "11111111-2222-3333-4444-555555555551" }}
                className="text-brand underline font-medium"
              >
                Algebra I Ch. 4
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
