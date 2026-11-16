import type React from "react";
import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { LessonCode } from "@/components/shared/LessonList";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import {
  adaptSchoolOverview,
  type BackendSchoolOverview,
  type AdaptedInstituteDetail,
} from "@/lib/adapters";

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
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdaptedInstituteDetail | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<BackendSchoolOverview>("/api/v1/app/school-admin/overview");
        if (mounted) {
          setDetail(adaptSchoolOverview(data));
        }
      } catch {
        if (mounted) {
          setError(s("error"));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const empty = (k: "instructors" | "classes" | "attempts" | "officers") =>
    m.detailEmpty.includes(k);

  const activeDetail = detail || {
    id: "default",
    name: "EdVidura Training Center",
    code: "EV-01",
    course: "Vocational & Technical Training",
    learnersRecorded: 0,
    inMoodle: 0,
    schoolAdmins: 1,
    classesCount: 0,
    teachersCount: 0,
    attemptsCount: 0,
    classes: [],
    trainingOfficers: ["Academic Operations Desk"],
  };

  const attCount = empty("attempts") ? 0 : activeDetail.attemptsCount;
  const officers = empty("officers") ? [] : activeDetail.trainingOfficers;
  const cls = empty("classes") ? [] : activeDetail.classes;

  const details: [string, React.ReactNode][] = [
    [s("name"), activeDetail.name],
    [s("code"), activeDetail.code],
    [
      s("course"),
      <>
        {activeDetail.course} <LessonCode code={activeDetail.code} />
      </>,
    ],
    [s("recorded"), String(activeDetail.learnersRecorded)],
    [s("inMoodle"), String(activeDetail.inMoodle)],
    [s("moodleStatus"), s(m.moodleSynced ? "synced" : "notSynced")],
    [s("admins"), String(activeDetail.schoolAdmins)],
    [s("quiz"), attCount ? s("quizLine", { n: attCount, avg: 85 }) : "—"],
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-24 pt-8 tablet:pb-8">
      <PageHeading text={s("title")} />
      {error ? (
        <ErrorAlert message={error} />
      ) : loading ? (
        <LoadingSkeleton count={5} />
      ) : (
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
              {activeDetail.teachersCount > 0 ? (
                <p className="text-ink">
                  {activeDetail.teachersCount} instructor(s) assigned to tenant
                </p>
              ) : (
                <p className="text-ink">{s("noInstructors")}</p>
              )}
            </Section>
            <Section title={s("classes")}>
              {cls.length ? (
                <ul className="ml-5 list-disc text-ink">
                  {cls.map((c) => (
                    <li key={c.code}>
                      {c.code} — {c.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink">{s("noClasses")}</p>
              )}
            </Section>
            <Section title={s("quiz")}>
              <p className="text-ink">
                {attCount ? s("quizLine", { n: attCount, avg: 85 }) : s("noAttempts")}
              </p>
            </Section>
            <Section title={s("officers")}>
              {officers.length ? (
                <ul className="ml-5 list-disc text-ink">
                  {officers.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink">{s("noOfficers")}</p>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
