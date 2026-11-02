import { useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { DraftBadge } from "@/components/teacher/DraftBadge";
import { simplifyDrafts } from "@/data/aiDrafts";
import { lessons, lessonById } from "@/data/lessons";
import { mockState } from "@/data/mockState";

// TC-10 Simplify. No reading-level selector, score, translation or automatic apply.
export const Route = createFileRoute("/_shell/teacher/ai/simplify")({
  head: () => ({
    meta: [
      { title: t("TC-10.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-10.lead") },
      { property: "og:title", content: t("TC-10.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-10.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-10.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";

function originalText(lessonId: string): string {
  const out: string[] = [];
  for (let i = 0; i < 10; i++) {
    const key = `LR-02.body.${lessonId}.${i}`;
    const v = t(key);
    if (v === key) break;
    out.push(v);
  }
  return out.join("\n\n");
}

function Page() {
  const id = useId();
  const m = mockState.teacher.simplify;
  const [lessonId, setLessonId] = useState("3");
  const [drafting, setDrafting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<null | "applied" | "draftError" | "saveError">(null);
  const has = body.trim().length > 0;

  const generate = () => {
    setDrafting(true); setMsg(null);
    setTimeout(() => {
      setDrafting(false);
      if (m.draft === "error") { setMsg("draftError"); return; }
      const d = simplifyDrafts[lessonId];
      if (d) { setTitle(d.title); setBody(d.body); }
    }, m.draftingMs);
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-28 pt-8 tablet:pb-8">
      <div>
        <PageHeading text={s("title")} />
      </div>
      <div className="studio-grid">
        <div className="space-y-4">
          <div>
            <label htmlFor={`${id}-l`} className="block font-semibold text-ink">{s("lesson")}</label>
            <select id={`${id}-l`} value={lessonId} onChange={(e) => { setLessonId(e.target.value); setTitle(""); setBody(""); setMsg(null); }} className={input}>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-o`} className="block font-semibold text-ink">{s("original")}</label>
            <textarea id={`${id}-o`} readOnly rows={10} value={originalText(lessonId)} className={`${input} bg-page-bg py-2`} />
          </div>
          <button type="button" className="btn-secondary" onClick={generate} disabled={drafting}>{s("generate")}</button>
          <p role="status" className="text-ink">{drafting ? s("drafting") : ""}</p>
        </div>
        <section aria-labelledby={`${id}-d`} className="space-y-4 rounded-surface border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`${id}-d`} className="font-heading text-[22px] text-ink">{s("draftHeading")}</h2>
            {has && msg !== "applied" && <DraftBadge />}
          </div>
          {!has ? <p className="text-ink-muted">{s("empty")}</p> : (
            <>
              <div>
                <label htmlFor={`${id}-t`} className="block font-semibold text-ink">{s("fTitle")}</label>
                <input id={`${id}-t`} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
              </div>
              <div>
                <label htmlFor={`${id}-b`} className="block font-semibold text-ink">{s("body")}</label>
                <textarea id={`${id}-b`} rows={10} value={body} onChange={(e) => setBody(e.target.value)} className={`${input} py-2 font-mono`} />
              </div>
              <p className="text-ink-muted">{s("check")}</p>
              <AITrustNote audience="instructor" sources={[lessonById(lessonId)?.title ?? ""]} />
            </>
          )}
        </section>
      </div>
      {msg === "draftError" && <ErrorAlert message={s("draftError")} onRetry={generate} />}
      {msg === "saveError" && <ErrorAlert message={s("saveError")} />}
      {msg === "applied" && <StatusBanner variant="success">{s("applied", { title: lessonById(lessonId)?.title ?? "" })}</StatusBanner>}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-border bg-surface p-3 tablet:static tablet:border-0 tablet:bg-transparent tablet:p-0">
        <button type="button" className="btn-primary flex-1 tablet:flex-none" disabled={!has}
          onClick={() => setMsg(m.save === "error" ? "saveError" : "applied")}>{s("apply")}</button>
        {has && <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={() => { setTitle(""); setBody(""); setMsg(null); }}>{t("shared.discard")}</button>}
        <Link to="/teacher/ai" className="btn-secondary flex-1 tablet:flex-none">{s("cancel")}</Link>
      </div>
    </div>
  );
}
