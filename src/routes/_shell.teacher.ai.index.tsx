import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";

// TC-06 AI tools hub. No API keys, model names, usage counts or "powered by" claims.
export const Route = createFileRoute("/_shell/teacher/ai/")({
  head: () => ({
    meta: [
      { title: t("TC-06.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-06.lead") },
      { property: "og:title", content: t("TC-06.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-06.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`TC-06.${k}`);
const tools = [
  { k: "author", to: "/teacher/ai/author" },
  { k: "generate", to: "/teacher/ai/generate" },
  { k: "remediation", to: "/teacher/ai/remediation" },
  { k: "simplify", to: "/teacher/ai/simplify" },
  { k: "grade", to: "/teacher/ai/grade-assist" },
] as const;

function Page() {
  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div>
        <PageHeading text={s("title")} />
        <p className="mt-2 max-w-reading text-ink">{s("lead")}</p>
      </div>
      <ul className="divide-y divide-border rounded-surface border border-border bg-surface">
        {tools.map((x) => (
          <li key={x.k} className="flex flex-col gap-2 p-4 tablet:flex-row tablet:items-center tablet:justify-between">
            <div className="min-w-0">
              <h2 className="font-heading text-[18px] text-ink">{s(`tools.${x.k}.t`)}</h2>
              <p className="text-ink-muted">{s(`tools.${x.k}.d`)}</p>
            </div>
            <Link to={x.to} className="btn-secondary shrink-0" aria-label={`${s("open")}: ${s(`tools.${x.k}.t`)}`}>{s("open")}</Link>
          </li>
        ))}
      </ul>
      <div className="space-y-1 text-ink">
        <p>{s("note1")}</p>
        <p>{s("note2")}</p>
      </div>
    </div>
  );
}
