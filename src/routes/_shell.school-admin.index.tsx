import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, BookOpenCheck, GraduationCap, Users } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { HeroBand } from "@/components/shared/HeroBand";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { institute } from "@/data/institute";
import { instituteFigures } from "@/data/schoolAdmin";
import { mockState } from "@/data/mockState";

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
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (m.home === "loading") return;
    const x = setTimeout(() => setLoading(false), m.loadingMs);
    return () => clearTimeout(x);
  }, [m.home, m.loadingMs]);
  const empty = m.home === "empty";
  const f = empty ? { learnersLaunched: 0, quizAttempts: 0, moodleUsers: 0, moodleBindings: 0, classesLinks: 0 } : instituteFigures;
  const figures: [string, number][] = [
    [s("learners"), f.learnersLaunched], [s("attempts"), f.quizAttempts], [s("users"), f.moodleUsers],
    [s("bindings"), f.moodleBindings], [s("classes"), f.classesLinks],
  ];
  const big = [
    { to: "/school-admin/classes", label: s("classes"), Icon: BookOpenCheck },
    { to: "/school-admin/analytics", label: s("analytics"), Icon: BarChart3 },
    { to: "/school-admin/activity", label: s("activity"), Icon: Activity },
    { to: "/school-admin/teachers", label: s("instructors"), Icon: GraduationCap },
    { to: "/school-admin/students", label: s("students"), Icon: Users },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 pb-24 pt-8 tablet:pb-8">
      <HeroBand><PageHeading text={institute.shortName} /></HeroBand>
      {loading ? <LoadingSkeleton count={4} /> : (
        <>
          <section aria-label={s("figures")}>
            <dl className="grid grid-cols-2 gap-4 tablet:flex tablet:flex-wrap tablet:gap-10">
              {figures.map(([l, v]) => (
                <div key={l} className="min-w-0">
                  <dt className="text-sm text-ink-muted">{l}</dt>
                  <dd className="font-heading text-[24px] font-extrabold text-metric">{v}</dd>
                </div>
              ))}
            </dl>
            {empty && <p className="mt-4 text-ink">{s("empty")}</p>}
          </section>
          <ul className="grid gap-3 tablet:grid-cols-3">
            {big.map((b) => (
              <li key={b.to}>
                <Link to={b.to} className="flex min-h-20 items-center gap-4 rounded-surface border border-border-control bg-surface px-5 font-heading text-[20px] text-ink hover:bg-highlight">
                  <b.Icon aria-hidden size={24} className="shrink-0 text-accent" />{b.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
