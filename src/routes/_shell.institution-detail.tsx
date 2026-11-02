import type React from "react";
import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { learners, instructors } from "@/data/people";
import { classBindings, instituteAttempts, instituteDetail } from "@/data/schoolAdmin";
import { mockState } from "@/data/mockState";

// SA-07 Institute details. No client IDs, keys, URLs, delete/change institute or retry buttons.
export const Route = createFileRoute("/_shell/institution-detail")({
  head: () => ({
    meta: [
      { title: t("SA-07.title") + t("app.titleSuffix") },
      { name: "description", content: t("SA-07.lead") },
      { property: "og:title", content: t("SA-07.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SA-07.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`SA-07.${k}`, v);
const card = "space-y-2 rounded-surface border border-border bg-surface p-4";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={card}>
      <h2 className="font-heading text-[22px] text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Page() {
  const m = mockState.schoolAdmin;
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (m.detail === "loading") return;
    const x = setTimeout(() => setLoading(false), m.loadingMs);
    return () => clearTimeout(x);
  }, [m.detail, m.loadingMs]);
  const empty = (k: "instructors" | "classes" | "attempts" | "officers") => m.detailEmpty.includes(k);
  const att = empty("attempts") ? [] : instituteAttempts;
  const avg = att.length ? Math.round((att.reduce((x, a) => x + a.score, 0) / (att.length * 5)) * 100) : 0;
  const officers = empty("officers") ? [] : instituteDetail.trainingOfficers;
  const ins = empty("instructors") ? [] : instructors;
  const cls = empty("classes") ? [] : classBindings;

  const details: [string, React.ReactNode][] = [
    [s("name"), instituteDetail.name], [s("code"), instituteDetail.code], [s("course"), instituteDetail.course],
    [s("recorded"), String(instituteDetail.learnersRecorded)], [s("inMoodle"), String(instituteDetail.inMoodle)],
    [s("moodleStatus"), s(m.moodleSynced ? "synced" : "notSynced")],
    [s("admins"), String(instituteDetail.schoolAdmins)],
    [s("quiz"), att.length ? s("quizLine", { n: att.length, avg }) : "—"],
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-24 pt-8 tablet:pb-8">
      <PageHeading text={s("title")} />
      {m.detail === "error" ? <ErrorAlert message={s("error")} /> : loading ? <LoadingSkeleton count={5} /> : (
        <>
          <Section title={s("details")}>
            <dl className="divide-y divide-border">
              {details.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 py-2 tablet:flex-row tablet:gap-4">
                  <dt className="font-semibold text-ink tablet:w-64 tablet:shrink-0">{k}</dt>
                  <dd className="min-w-0 text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <div className="grid gap-4 tablet:grid-cols-2">
            <Section title={s("instructors")}>
              {ins.length ? <ul className="ml-5 list-disc text-ink">{ins.map((p) => <li key={p.id}>{p.name}</li>)}</ul> : <p className="text-ink">{s("noInstructors")}</p>}
            </Section>
            <Section title={s("classes")}>
              {cls.length ? <ul className="ml-5 list-disc text-ink">{cls.map((c) => <li key={c.code}>{c.code} — {c.name}</li>)}</ul> : <p className="text-ink">{s("noClasses")}</p>}
            </Section>
            <Section title={s("quiz")}>
              <p className="text-ink">{att.length ? s("quizLine", { n: att.length, avg }) : s("noAttempts")}</p>
            </Section>
            <Section title={s("officers")}>
              {officers.length ? <ul className="ml-5 list-disc text-ink">{officers.map((o) => <li key={o}>{o}</li>)}</ul> : <p className="text-ink">{s("noOfficers")}</p>}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
