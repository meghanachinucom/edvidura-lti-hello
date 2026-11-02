import { PillTabs } from "@/components/shared/PillTabs";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { t } from "@/i18n";
import { downloadBlob } from "@/lib/download";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { SimpleBarChart } from "@/components/admin/SimpleBarChart";
import { classes } from "@/data/course";
import { instructors } from "@/data/people";
import { instituteAttempts, classOf, instituteActivity } from "@/data/schoolAdmin";
import { mockState } from "@/data/mockState";
import { PercentageBar } from "@/components/shared/PercentageBar";

// SA-05 Institute analytics. No per-learner risk, predictions, benchmarks or league tables.
export const Route = createFileRoute("/_shell/school-admin/analytics")({
  head: () => ({
    meta: [
      { title: t("SA-05.title") + t("app.titleSuffix") },
      { name: "description", content: t("SA-05.lead") },
      { property: "og:title", content: t("SA-05.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SA-05.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`SA-05.${k}`, v);

function summary(rows: { label: string; value: number }[]) {
  return rows.length === 1
    ? s("summary1", { a: rows[0]!.label, an: rows[0]!.value })
    : s("summary", { a: rows[0]!.label, an: rows[0]!.value, b: rows[1]!.label, bn: rows[1]!.value });
}

function Page() {
  const m = mockState.schoolAdmin;
  const [loading, setLoading] = useState(true);
  const [cls, setCls] = useState("all");
  useEffect(() => {
    if (m.analytics === "loading") return;
    const x = setTimeout(() => setLoading(false), m.loadingMs);
    return () => clearTimeout(x);
  }, [m.analytics, m.loadingMs]);

  const all = m.analytics === "empty" ? [] : instituteAttempts;
  const att = cls === "all" ? all : all.filter((a) => classOf(a.personId) === cls);
  const avg = att.length ? Math.round((att.reduce((x, a) => x + a.score, 0) / (att.length * 5)) * 100) : 0;
  const best = att.reduce((x, a) => Math.max(x, a.score), 0);
  const learnersWith = new Set(att.map((a) => a.personId)).size;
  const shown = classes.filter((c) => cls === "all" || c.code === cls);
  const perClass = shown.map((c) => ({ label: c.code, value: all.filter((a) => classOf(a.personId) === c.code).length }));
  const lessonsDone = shown.map((c) => ({ label: c.code, value: instituteActivity.lessonsDoneByClass[c.code] ?? 0 }));

  const figures: [string, string | number][] = [
    [s("everLaunched"), instituteActivity.everLaunched], [s("activeToday"), instituteActivity.activeToday],
    [s("activeNow"), instituteActivity.activeNow], [s("attempts"), att.length], [s("avg"), `${avg}%`],
    [s("best"), t("shared.scoreOf", { n: best })], [s("instructors"), instructors.length], [s("learners"), learnersWith],
  ];

  const exportJson = () => {
    const payload = { exportedAt: new Date().toISOString(), classFilter: cls, figures: Object.fromEntries(figures.map(([l, v]) => [l, String(v)])), attempts: att };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }), "institute-analytics.json");
  };
  const exportCsv = () => {
    const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const lines = figures.map(([l, v]) => [l, String(v)].map(esc).join(","));
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), "institute-analytics.csv");
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-24 pt-8 tablet:pb-8">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-start tablet:justify-between">
        <PageHeading text={s("title")} />
        {!loading && all.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={exportJson}><Download aria-hidden size={18} />{s("exportJson")}</button>
            <button type="button" className="btn-secondary" onClick={exportCsv}><Download aria-hidden size={18} />{s("exportCsv")}</button>
          </div>
        )}
      </div>
      {loading ? <LoadingSkeleton count={4} /> : all.length === 0 ? <EmptyState title={s("empty")} help="" /> : (
        <>
          <div>
            <p className="block font-semibold text-ink">{s("class")}</p>
            <div className="mt-2 overflow-x-auto"><PillTabs label={s("class")} active={cls}
              items={[{ id: "all", label: s("allClasses"), onSelect: () => setCls("all") }, ...classes.map((c) => ({ id: c.code, label: c.title, onSelect: () => setCls(c.code) }))]} /></div>
          </div>
          <section aria-label={s("figures")}>
            <dl className="grid grid-cols-2 gap-4 tablet:grid-cols-4">
              {figures.map(([l, v]) => (
                <div key={l} className="kpi-figure">
                  <dt className="text-sm text-ink-muted">{l}</dt>
                  <dd className="font-heading text-[24px] font-extrabold text-ink">{v}</dd>
                  {typeof v === "string" && v.endsWith("%") && <div className="mt-2"><PercentageBar value={Number.parseFloat(v)} /></div>}
                </div>
              ))}
            </dl>
          </section>
          <div className="grid gap-4 desktop:grid-cols-2">
            <SimpleBarChart title={s("chartAttempts")} summary={summary(perClass)} rows={perClass} colLabel={s("colClass")} valueLabel={s("colValue")} />
            <SimpleBarChart title={s("chartLessons")} caption={s("lessonsCaption")} summary={summary(lessonsDone)} rows={lessonsDone} colLabel={s("colClass")} valueLabel={s("colValue")} />
          </div>
          <p className="max-w-reading text-ink-muted">{s("guidance")}</p>
        </>
      )}
    </div>
  );
}
