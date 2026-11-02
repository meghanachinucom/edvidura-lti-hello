import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { SimpleBarChart } from "@/components/admin/SimpleBarChart";
import { opsInstitutes, opsQuizAttempts, opsQuietIds, opsDaily, opsScoreBands, type OpsInstituteRow } from "@/data/ops";
import { mockState } from "@/data/mockState";

// OP-02 Owner overview. No learner names, raw events, secrets, drill-down or links into the app.
export const Route = createFileRoute("/ops/dashboard")({
  head: () => ({
    meta: [
      { title: t("OP.title") + t("app.titleSuffix") },
      { name: "description", content: t("OP.lead") },
      { property: "og:title", content: t("OP.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("OP.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

const o = (k: string, v?: Record<string, string | number>) => t(`OP.${k}`, v);
const columns: Column<OpsInstituteRow>[] = [
  { key: "name", header: o("colInstitute"), cell: (r) => r.name },
  { key: "learners", header: o("colLearners"), cell: (r) => r.learners },
  { key: "attempts", header: o("colAttempts"), cell: (r) => opsQuizAttempts[r.id] ?? 0 },
  { key: "status", header: o("colStatus"), cell: (r) => o(`status.${r.connection}`) },
];

function DailyLines() {
  const W = 560, H = 200, P = 28;
  const max = Math.max(...opsDaily.map((d) => d.launches));
  const x = (i: number) => P + (i * (W - 2 * P)) / (opsDaily.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = (k: "launches" | "attempts") => opsDaily.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[k])}`).join(" ");
  const tl = opsDaily.reduce((s, d) => s + d.launches, 0), ta = opsDaily.reduce((s, d) => s + d.attempts, 0);
  return (
    <section aria-label={o("daily")} className="space-y-3 rounded-surface border border-border bg-surface p-4">
      <h3 className="font-heading text-[20px] text-ink">{o("daily")}</h3>
      <p className="text-ink">{o("dailySummary", { l: tl, a: ta })}</p>
      <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={path("launches")} fill="none" className="stroke-ink" strokeWidth={3} />
        <path d={path("attempts")} fill="none" className="stroke-ink-muted" strokeWidth={3} strokeDasharray="6 5" />
        {opsDaily.map((d, i) => <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink-muted text-[11px]">{d.day}</text>)}
      </svg>
      <ul aria-hidden className="flex gap-6 text-sm text-ink">
        <li className="flex items-center gap-2"><span className="inline-block h-1 w-6 bg-ink" />{o("launches")}</li>
        <li className="flex items-center gap-2"><span className="inline-block h-1 w-6 border-t-2 border-dashed border-ink-muted" />{o("attempts")}</li>
      </ul>
      <table className="sr-only">
        <caption>{o("daily")}</caption>
        <thead><tr><th scope="col">{o("colDay")}</th><th scope="col">{o("launches")}</th><th scope="col">{o("attempts")}</th></tr></thead>
        <tbody>{opsDaily.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.launches}</td><td>{d.attempts}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function Page() {
  const navigate = useNavigate();
  const state = mockState.ops.dashboard;
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [retried, setRetried] = useState(false);
  useEffect(() => {
    if (state === "loading") return;
    const x = setTimeout(() => setLoading(false), mockState.schoolAdmin.loadingMs);
    return () => clearTimeout(x);
  }, [state]);
  const quiet = opsInstitutes.filter((i) => opsQuietIds.includes(i.id));

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-6 py-8">
      <PageHeading text={o("title")} />
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={() => setConfirm(true)}>{o("retry")}</button>
        <a href="#" onClick={(e) => e.preventDefault()} className="btn-secondary">{o("metabase")}</a>
        <button type="button" className="btn-secondary" onClick={() => navigate({ to: "/ops/login" })}>{o("signOut")}</button>
      </div>
      {retried && <StatusBanner variant="success">{o("retried")}</StatusBanner>}
      {state === "error" ? <ErrorAlert message={o("error")} /> : loading ? <LoadingSkeleton variant="table" count={5} /> : (
        <>
          <section aria-labelledby="op-glance" className="space-y-2">
            <h2 id="op-glance" className="font-heading text-[22px] text-ink">{o("glance")}</h2>
            <DataTable caption={o("glance")} columns={columns} rows={opsInstitutes} rowKey={(r) => r.id} />
          </section>
          <section aria-labelledby="op-quiet" className="space-y-2">
            <h2 id="op-quiet" className="font-heading text-[22px] text-ink">{o("quiet")}</h2>
            {quiet.length ? <ul className="ml-5 list-disc text-ink">{quiet.map((i) => <li key={i.id}>{i.name}</li>)}</ul> : <p className="text-ink">{o("quietNone")}</p>}
          </section>
          <section aria-labelledby="op-an" className="space-y-3">
            <h2 id="op-an" className="font-heading text-[22px] text-ink">{o("analytics")}</h2>
            <div className="grid gap-4 desktop:grid-cols-2">
              <DailyLines />
              <SimpleBarChart title={o("bands")} summary={o("bandsSummary")} rows={opsScoreBands} colLabel={o("colBand")} valueLabel={o("colCount")} />
            </div>
          </section>
          <details className="rounded-surface border border-border bg-surface p-4">
            <summary className="min-h-11 cursor-pointer font-semibold text-ink">{o("howTitle")}</summary>
            <p className="mt-2 max-w-reading text-ink">{o("how")}</p>
          </details>
        </>
      )}
      <ConfirmDialog open={confirm} title={o("retryConfirm")} body={o("retryBody")} confirmLabel={o("retryGo")} cancelLabel={o("cancel")}
        onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); setRetried(true); }} />
    </div>
  );
}
