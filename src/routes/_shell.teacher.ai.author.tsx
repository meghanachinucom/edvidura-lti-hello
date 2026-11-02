import { useId, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { MarkdownPreview } from "@/components/teacher/MarkdownPreview";
import { ItemChecklist } from "@/components/teacher/ItemChecklist";
import { DraftBadge } from "@/components/teacher/DraftBadge";
import { draftLessonText } from "@/data/aiDrafts";
import { ebooks } from "@/data/ebooks";
import { mockState } from "@/data/mockState";

// TC-08 AI Author. Never auto-applies; Apply publishes only when "Publish now" is ticked.
export const Route = createFileRoute("/_shell/teacher/ai/author")({
  head: () => ({
    meta: [
      { title: t("TC-08.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-08.lead") },
      { property: "og:title", content: t("TC-08.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-08.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-08.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";
const sources = ["Earthing and why it matters", "MCBs, fuses and RCCBs"];
type Msg = null | "saved" | "saveError" | "applied" | "appliedPublished";

function Page() {
  const id = useId();
  const m = mockState.teacher.author;
  const [mode, setMode] = useState("lesson");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [body, setBody] = useState("");
  const [publish, setPublish] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [none, setNone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const hasDraft = body.trim().length > 0;

  const write = () => {
    setDrafting(true); setNone(false); setMsg(null);
    setTimeout(() => {
      setDrafting(false);
      if (m.result === "none") { setNone(true); return; }
      if (!title.trim()) setTitle(draftLessonText.title);
      setBody(`# ${draftLessonText.title}\n\n${draftLessonText.body}\n\n- Connect every exposed metal part to earth.\n- Test earth continuity before switching on.`);
    }, m.draftingMs);
  };
  const save = () => {
    setSaving(true); setMsg(null);
    setTimeout(() => { setSaving(false); setMsg(m.save === "error" ? "saveError" : "saved"); }, 800);
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-28 pt-8 tablet:pb-8">
      <PageHeading text={s("title")} />
      <div className="grid gap-6 desktop:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor={`${id}-m`} className="block font-semibold text-ink">{s("mode")}</label>
            <select id={`${id}-m`} value={mode} onChange={(e) => setMode(e.target.value)} className={input}>
              {(["lesson", "chapter", "mcq", "manual"] as const).map((k) => <option key={k} value={k}>{s(`modes.${k}`)}</option>)}
              {ebooks.map((b) => <option key={b.id} value={`v-${b.id}`}>{s("addVersion", { title: b.title })}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-t`} className="block font-semibold text-ink">{s("fTitle")}</label>
            <input id={`${id}-t`} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`${id}-p`} className="block font-semibold text-ink">{s("prompt")}</label>
            <textarea id={`${id}-p`} rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className={`${input} py-2`} />
          </div>
          <button type="button" className="btn-secondary" onClick={write} disabled={drafting}>{s("draft")}</button>
          <p role="status" className="text-ink">{drafting ? s("drafting") : ""}</p>
          {none && <StatusBanner variant="warning">{s("none")}</StatusBanner>}
          <div>
            <label htmlFor={`${id}-b`} className="block font-semibold text-ink">{s("body")}</label>
            <textarea id={`${id}-b`} rows={10} value={body} onChange={(e) => { setBody(e.target.value); setMsg(null); }} className={`${input} py-2 font-mono`} />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-ink">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="size-5 accent-accent" />{s("publishNow")}
          </label>
        </div>

        <div className="space-y-4">
          <section aria-labelledby={`${id}-pv`} className="rounded-surface border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id={`${id}-pv`} className="font-heading text-[22px] text-ink">{s("preview")}</h2>
              {hasDraft && msg !== "saved" && msg !== "applied" && msg !== "appliedPublished" && <DraftBadge />}
            </div>
            <div className="mt-3">
              {hasDraft ? <MarkdownPreview source={body} /> : <p className="text-ink-muted">{s("previewEmpty")}</p>}
            </div>
            {hasDraft && <AITrustNote audience="instructor" sources={sources} />}
          </section>
          <aside aria-labelledby={`${id}-g`} className="rounded-surface border border-border bg-surface p-4">
            <h2 id={`${id}-g`} className="font-heading text-[18px] text-ink">{s("guardTitle")}</h2>
            <p className="mt-2 text-ink">{s("guard")}</p>
          </aside>
          <ItemChecklist ns="TC-08" />
        </div>
      </div>

      {msg === "saveError" && <ErrorAlert message={s("saveError")} />}
      {msg && msg !== "saveError" && <StatusBanner variant="success">{s(msg)}</StatusBanner>}

      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-border bg-surface p-3 tablet:static tablet:border-0 tablet:bg-transparent tablet:p-0">
        <button type="button" className="btn-primary flex-1 tablet:flex-none" onClick={save} disabled={saving || !hasDraft}>{saving ? s("saving") : s("save")}</button>
        {hasDraft && (
          <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={() => setMsg(publish ? "appliedPublished" : "applied")}>{s("apply")}</button>
        )}
        {hasDraft && (
          <button type="button" className="btn-secondary flex-1 tablet:flex-none" onClick={() => { setTitle(""); setBody(""); setMsg(null); }}>{t("shared.discard")}</button>
        )}
      </div>
    </div>
  );
}
