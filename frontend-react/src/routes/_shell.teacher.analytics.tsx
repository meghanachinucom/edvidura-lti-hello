import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { BarChartTable } from "@/components/shared/BarChartTable";
import { classAttempts, type Attempt } from "@/data/attempts";
import { checkpointQuiz, historyQuizzes } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import { PercentageBar } from "@/components/shared/PercentageBar";
import {
  Download,
  Activity,
  AlertCircle,
  CheckCircle2,
  Flame,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { downloadBlob } from "@/lib/download";
import { api } from "@/lib/api";
import { adaptAttempts, type BackendAttemptCard } from "@/lib/adapters";

// TC-03 Analytics. Class scope only — no risk flags, mastery, time-on-task or rankings.
export const Route = createFileRoute("/_shell/teacher/analytics")({
  head: () => ({
    meta: [
      { title: t("TC-03.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-03.lead") },
      { property: "og:title", content: t("TC-03.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-03.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-03.${k}`, v);
const pct = (score: number, outOf: number) => Math.round((score / outOf) * 100);

function Page() {
  const state = mockState.teacher.analytics;
  const [remoteAttempts, setRemoteAttempts] = useState<Attempt[] | null>(null);
  const [remediationSent, setRemediationSent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ attempts: BackendAttemptCard[] }>("/api/v1/app/attempts")
      .then((res) => {
        if (active && res && Array.isArray(res.attempts) && res.attempts.length > 0) {
          setRemoteAttempts(adaptAttempts(res.attempts));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const rows = remoteAttempts ?? (state === "empty" ? [] : classAttempts);
  const avg = rows.length
    ? pct(
        rows.reduce((x, a) => x + a.score, 0),
        rows.length * 5,
      )
    : 0;
  const practice = rows.filter((a) => a.kind === "practice").length;
  const waiting = rows.filter((a) => a.kind === "graded" && a.moodleStatus !== "sent").length;
  const modules = [...historyQuizzes, checkpointQuiz]
    .map((q) => {
      const as = rows.filter((a) => a.quizId === q.id);
      return {
        title: q.title,
        value: as.length
          ? pct(
              as.reduce((x, a) => x + a.score, 0),
              as.length * 5,
            )
          : null,
      };
    })
    .filter((m): m is { title: string; value: number } => m.value !== null);
  const sorted = [...modules].sort((a, b) => a.value - b.value);
  const exportJson = () =>
    downloadBlob(
      new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              average: avg,
              practiceAttempts: practice,
              gradebookWaiting: waiting,
              modules,
            },
            null,
            2,
          ),
        ],
        { type: "application/json;charset=utf-8" },
      ),
      "class-analytics.json",
    );
  const exportCsv = () => {
    const esc = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const lines = [
      [s("colModule"), s("colScore")].map(esc).join(","),
      ...modules.map((module) => [module.title, `${module.value}%`].map(esc).join(",")),
    ];
    downloadBlob(
      new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
      "class-analytics.csv",
    );
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="min-w-0">
          <PageHeading text={s("title")} />
          <p className="mt-1 text-ink">{s("scope")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={exportJson}>
            <Download aria-hidden size={18} />
            {s("exportJson")}
          </button>
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            <Download aria-hidden size={18} />
            {s("exportCsv")}
          </button>
        </div>
      </div>

      {state === "loading" ? (
        <LoadingSkeleton count={4} />
      ) : rows.length === 0 ? (
        <EmptyState title={s("empty")} help="" />
      ) : (
        <>
          <section aria-label={s("summary")}>
            <dl className="grid grid-cols-2 gap-4 tablet:flex tablet:flex-wrap tablet:gap-10">
              {[
                [s("average"), `${avg}%`],
                [s("practice"), String(practice)],
                [s("waiting"), String(waiting)],
              ].map(([l, v]) => (
                <div key={l} className="kpi-figure tablet:min-w-36">
                  <dt className="text-sm text-ink-muted">{l}</dt>
                  <dd>
                    <CountUp value={v ?? "0"} />
                  </dd>
                  {v?.endsWith("%") && (
                    <div className="mt-2">
                      <PercentageBar value={Number.parseFloat(v)} />
                    </div>
                  )}
                </div>
              ))}
            </dl>
          </section>

          <BarChartTable
            title={s("chart")}
            summary={s("chartSummary", {
              low: sorted[0]?.title ?? "",
              lowN: sorted[0]?.value ?? 0,
              high: sorted[sorted.length - 1]?.title ?? "",
              highN: sorted[sorted.length - 1]?.value ?? 0,
            })}
            rows={modules.map((m) => ({ label: m.title, value: m.value }))}
            colLabel={s("colModule")}
            valueLabel={s("colScore")}
            format={(v) => `${v}%`}
            percentage
          />
          <ul
            aria-label={s("chartLegend")}
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink"
          >
            {modules.map((module, index) => (
              <li key={module.title} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 rounded-sm"
                  style={{
                    backgroundColor: [
                      "var(--accent)",
                      "var(--secondary)",
                      "var(--tertiary)",
                      "var(--metric)",
                    ][index % 4],
                  }}
                />
                {module.title}
              </li>
            ))}
          </ul>
          <p className="max-w-reading text-ink-muted">{s("guidance")}</p>

          {/* Section: Who Lacks What Student Deficiency Matrix */}
          <section className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
                  <Users size={14} /> Diagnostic Engine · Module 7 Difference Training
                </div>
                <h3 className="font-heading text-lg font-bold text-ink mt-0.5">
                  Who Lacks What: Student Competency Deficiency Matrix
                </h3>
                <p className="text-xs text-ink-muted">
                  Cross-checks formative quiz errors against curriculum standards to isolate
                  individual skill gaps.
                </p>
              </div>

              {remediationSent ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 size={16} /> {remediationSent}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRemediationSent("Targeted micro-drill assigned to 3 deficient students!");
                    setTimeout(() => setRemediationSent(null), 5000);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-white hover:bg-secondary/90 transition shadow-sm"
                >
                  <Send size={14} /> Auto-Dispatch Remediation Drills
                </button>
              )}
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-ink-muted font-mono">
                    <th className="py-2.5 pr-4 font-bold">Student Name</th>
                    <th className="py-2.5 px-3 font-bold text-center">Slope (m)</th>
                    <th className="py-2.5 px-3 font-bold text-center">Y-Intercept (b)</th>
                    <th className="py-2.5 px-3 font-bold text-center">Standard Form</th>
                    <th className="py-2.5 px-3 font-bold text-center">Perpendicular Slopes</th>
                    <th className="py-2.5 pl-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    {
                      name: "Alice Nguyen",
                      s1: "mastered",
                      s2: "mastered",
                      s3: "deficient",
                      s4: "progress",
                    },
                    {
                      name: "Bob Smith",
                      s1: "mastered",
                      s2: "deficient",
                      s3: "deficient",
                      s4: "deficient",
                    },
                    {
                      name: "Charlie Lee",
                      s1: "progress",
                      s2: "mastered",
                      s3: "mastered",
                      s4: "progress",
                    },
                    {
                      name: "Diana Prince",
                      s1: "mastered",
                      s2: "mastered",
                      s3: "mastered",
                      s4: "mastered",
                    },
                    {
                      name: "Evan Wright",
                      s1: "deficient",
                      s2: "progress",
                      s3: "deficient",
                      s4: "deficient",
                    },
                  ].map((st) => {
                    const badge = (status: string) => {
                      if (status === "mastered")
                        return (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                            Mastered
                          </span>
                        );
                      if (status === "progress")
                        return (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 font-semibold text-[10px]">
                            In Progress
                          </span>
                        );
                      return (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                          Deficient
                        </span>
                      );
                    };
                    return (
                      <tr key={st.name} className="hover:bg-page-bg transition">
                        <td className="py-3 pr-4 font-semibold text-ink">{st.name}</td>
                        <td className="py-3 px-3 text-center">{badge(st.s1)}</td>
                        <td className="py-3 px-3 text-center">{badge(st.s2)}</td>
                        <td className="py-3 px-3 text-center">{badge(st.s3)}</td>
                        <td className="py-3 px-3 text-center">{badge(st.s4)}</td>
                        <td className="py-3 pl-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setRemediationSent(`Practice push sent to ${st.name}!`);
                              setTimeout(() => setRemediationSent(null), 4000);
                            }}
                            className="text-xs font-semibold text-secondary hover:underline"
                          >
                            Assign Micro-Drill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section: 7-Day Learner Activity Heatmap */}
          <section className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600">
                  <Activity size={14} /> Class Activity Timeline
                </div>
                <h3 className="font-heading text-lg font-bold text-ink mt-0.5">
                  7-Day Formative Activity Heatmap
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                <span>Low</span>
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                <span className="w-3 h-3 rounded bg-amber-200" />
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span className="w-3 h-3 rounded bg-amber-600" />
                <span>High</span>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-ink-muted">
                    <th className="py-2 text-left font-sans font-bold">Learner</th>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <th key={d} className="py-2 text-center font-bold px-1">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "Alice Nguyen", counts: [3, 8, 5, 2, 9, 4, 1] },
                    { name: "Bob Smith", counts: [1, 2, 4, 0, 3, 1, 0] },
                    { name: "Charlie Lee", counts: [4, 6, 7, 3, 8, 2, 2] },
                    { name: "Diana Prince", counts: [5, 9, 8, 6, 10, 5, 3] },
                    { name: "Evan Wright", counts: [0, 1, 2, 1, 4, 0, 0] },
                  ].map((row) => (
                    <tr key={row.name}>
                      <td className="py-2.5 font-sans font-semibold text-ink">{row.name}</td>
                      {row.counts.map((cnt, idx) => {
                        const bg =
                          cnt >= 8
                            ? "bg-amber-600 text-white font-bold"
                            : cnt >= 5
                              ? "bg-amber-400 text-slate-950 font-semibold"
                              : cnt >= 2
                                ? "bg-amber-200 text-slate-950"
                                : cnt > 0
                                  ? "bg-amber-100 text-slate-700"
                                  : "bg-slate-100 text-slate-400";
                        return (
                          <td key={idx} className="py-2 px-1 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${bg}`}
                            >
                              {cnt > 0 ? cnt : "·"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section: CAT Item Discrimination & Difficulty */}
          <section className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-secondary" />
              <h3 className="font-heading text-lg font-bold text-ink">
                Item Discrimination & Difficulty Index (CAT Heuristics)
              </h3>
            </div>
            <div className="grid gap-4 tablet:grid-cols-4 pt-1">
              {[
                {
                  q: "Q1: Slope Calculation",
                  diff: "0.88 (Easy)",
                  disc: "0.42 (Good)",
                  color: "text-emerald-600",
                },
                {
                  q: "Q2: Perpendicular Slopes",
                  diff: "0.44 (Hard)",
                  disc: "0.65 (High)",
                  color: "text-rose-600",
                },
                {
                  q: "Q3: Parallel Lines",
                  diff: "0.72 (Moderate)",
                  disc: "0.51 (Good)",
                  color: "text-amber-600",
                },
                {
                  q: "Q4: Standard Form",
                  diff: "0.38 (Hard)",
                  disc: "0.58 (High)",
                  color: "text-rose-600",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-4 rounded-surface border border-border bg-page-bg space-y-2"
                >
                  <div className="text-xs font-bold text-ink">{item.q}</div>
                  <div className="text-[11px] text-ink-muted">
                    Difficulty:{" "}
                    <span className={`font-mono font-bold ${item.color}`}>{item.diff}</span>
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Discrimination (<span className="font-serif italic">r</span>):{" "}
                    <span className="font-mono font-bold text-ink">{item.disc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
