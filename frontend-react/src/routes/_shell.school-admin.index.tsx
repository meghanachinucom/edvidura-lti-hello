import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  ExternalLink,
  GraduationCap,
  Users,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { institute } from "@/data/institute";
import { instituteFigures } from "@/data/schoolAdmin";
import { mockState } from "@/data/mockState";
import { useRole } from "@/components/shell/RoleContext";
import { api } from "@/lib/api";
import { ComplianceAlertsCard } from "@/components/enterprise/ComplianceAlertsCard";
import { ApprenticeshipOjtCard } from "@/components/enterprise/ApprenticeshipOjtCard";

interface SchoolOverviewResponse {
  institution: {
    id: string;
    name: string;
    code: string;
    status: string;
    segment: string;
  };
  snapshot: {
    student_count: number;
    teacher_count: number;
    class_count: number;
    chapter_count: number;
    binding_count: number;
    admin_count: number;
  };
  figures: {
    learnersLaunched: number;
    quizAttempts: number;
    moodleUsers: number;
    moodleBindings: number;
    classesLinks: number;
  };
}

// SA-01 Institute home. One institute only; no billing, plans or user deletion.
export const Route = createFileRoute("/_shell/school-admin/")({
  head: () => ({
    meta: [
      { title: institute.shortName + t("app.titleSuffix") },
      { name: "description", content: t("SA-01.lead") },
      { property: "og:title", content: institute.shortName + t("app.titleSuffix") },
      { property: "og:description", content: t("SA-01.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`SA-01.${k}`);

function Page() {
  const m = mockState.schoolAdmin;
  const { session } = useRole();
  const token = session?.token || "";
  const institutionDetailUrl = token
    ? `/institution-detail?token=${encodeURIComponent(token)}`
    : "/institution-detail";

  const [loading, setLoading] = useState(true);
  const [remoteData, setRemoteData] = useState<SchoolOverviewResponse | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<SchoolOverviewResponse>("/api/v1/app/school-admin/overview")
      .then((res) => {
        if (active && res && res.figures) {
          setRemoteData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const fallbackTimeout = setTimeout(() => {
      if (active) setLoading(false);
    }, m.loadingMs);

    return () => {
      active = false;
      clearTimeout(fallbackTimeout);
    };
  }, [m.loadingMs]);

  const empty = m.home === "empty";
  const f =
    remoteData?.figures ??
    (empty
      ? { learnersLaunched: 0, quizAttempts: 0, moodleUsers: 0, moodleBindings: 0, classesLinks: 0 }
      : instituteFigures);
  const figures: [string, number][] = [
    [s("learners"), f.learnersLaunched],
    [s("attempts"), f.quizAttempts],
    [s("users"), f.moodleUsers],
    [s("bindings"), f.moodleBindings],
    [s("classes"), f.classesLinks],
  ];
  const big = [
    { to: "/school-admin/classes", label: s("classes"), Icon: BookOpenCheck },
    { to: "/school-admin/analytics", label: s("analytics"), Icon: BarChart3 },
    { to: "/school-admin/activity", label: s("activity"), Icon: Activity },
    { to: "/school-admin/teachers", label: s("instructors"), Icon: GraduationCap },
    { to: "/school-admin/students", label: s("students"), Icon: Users },
  ] as const;

  const title = remoteData?.institution?.name || institute.shortName;

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 pb-24 pt-8 tablet:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          text={title}
          context="Institutional governance, class section enrollments, and statutory compliance oversight."
        />
        <Link to="/institution-detail" className="btn-primary inline-flex items-center gap-2">
          <ExternalLink size={16} />
          Open Institution Workspace
        </Link>
      </div>
      {loading ? (
        <LoadingSkeleton count={4} />
      ) : (
        <>
          <section aria-label={s("figures")} className="grid grid-cols-2 gap-3 desktop:grid-cols-5">
            {figures.map(([l, v], index) => (
              <article
                key={l}
                className={`rounded-surface border border-border border-t-4 ${["border-t-secondary", "border-t-accent", "border-t-success", "border-t-metric", "border-t-secondary"][index]} bg-surface p-4 shadow-sm transition-transform duration-150 hover:-translate-y-0.5`}
              >
                <p className="text-sm text-ink-muted">{l}</p>
                <p className="mt-2 font-heading text-2xl font-extrabold text-ink">
                  <CountUp value={v} />
                </p>
              </article>
            ))}
            {empty && <p className="col-span-full mt-1 text-ink">{s("empty")}</p>}
          </section>
          <ul className="grid gap-3 tablet:grid-cols-3">
            {big.map((b) => (
              <li key={b.to}>
                <Link
                  to={b.to}
                  className="flex min-h-20 items-center gap-4 rounded-surface border border-border-control bg-surface px-5 font-heading text-[20px] text-ink hover:bg-highlight"
                >
                  <b.Icon aria-hidden size={24} className="shrink-0 text-accent" />
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Enterprise Suite: Compliance Alerts & Apprenticeship OJT Card */}
          <div className="space-y-6 pt-4">
            <ComplianceAlertsCard />
            <ApprenticeshipOjtCard apprenticeId="p-rajesh" />
          </div>
        </>
      )}
    </div>
  );
}
