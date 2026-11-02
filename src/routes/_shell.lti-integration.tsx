import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { institute } from "@/data/institute";
import { mockState } from "@/data/mockState";

// TC-19 Moodle connection. Information only: never raw URLs, client IDs or keys.
export const Route = createFileRoute("/_shell/lti-integration")({
  head: () => ({
    meta: [
      { title: t("TC-19.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-19.lead") },
      { property: "og:title", content: t("TC-19.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-19.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`TC-19.${k}`);
const h2 = "font-heading text-[22px] text-ink";
const card = "space-y-3 rounded-surface border border-border bg-surface p-4";

function Page() {
  const connected = mockState.teacher.moodle === "connected";
  const issuer = institute.moodleSite.replace(/^https?:\/\//, "");
  return (
    <div className="mx-auto w-full max-w-reading space-y-6 px-4 py-8">
      <PageHeading text={s("title")} />
      {!connected ? <StatusBanner variant="info">{s("notConnected")}</StatusBanner> : (
        <>
          <section aria-labelledby="ep" className={card}>
            <h2 id="ep" className={h2}>{s("endpoints")}</h2>
            <dl className="divide-y divide-border">
              {["toolUrl", "login", "launch", "jwks"].map((k) => (
                <div key={k} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <dt className="font-semibold text-ink">{s(k)}</dt>
                    <dd className="text-ink">{s("configured")}</dd>
                  </div>
                  <button type="button" className="btn-secondary" aria-label={`${s("copy")}: ${s(k)}`}>{s("copy")}</button>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="iss" className={card}>
            <h2 id="iss" className={h2}>{s("issuer")}</h2>
            <p className="text-ink">{issuer}</p>
          </section>
          <section aria-labelledby="cid" className={card}>
            <h2 id="cid" className={h2}>{s("clientId")}</h2>
            <p className="text-ink">{s("configured")}</p>
          </section>
          <section aria-labelledby="sync" className={card}>
            <h2 id="sync" className={h2}>{s("sync")}</h2>
            <p className="font-semibold text-ink">{s("notConfirmed")}</p>
            <p className="text-ink">{s("syncText")}</p>
          </section>
        </>
      )}
      <p className="text-ink-muted">{s("ask")}</p>
    </div>
  );
}
