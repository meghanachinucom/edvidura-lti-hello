import { useId, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { ebookById } from "@/data/ebooks";
import { manualRecords, type ManualRecord } from "@/data/manualVersions";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";

// TC-05 eBook management. No marketplace, pricing, sharing, export or reading analytics.
export const Route = createFileRoute("/_shell/teacher/manuals")({
  head: () => ({
    meta: [
      { title: t("TC-05.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-05.lead") },
      { property: "og:title", content: t("TC-05.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-05.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-05.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";
type Mode = null | "create" | "import" | "epub";
type Msg = null | { kind: "ready" | "published"; n: number };

function Page() {
  const [records, setRecords] = useState<ManualRecord[]>(mockState.teacher.manuals === "empty" ? [] : manualRecords);
  const [mode, setMode] = useState<Mode>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const publish = (id: string) => {
    const r = records.find((x) => x.ebookId === id)!;
    setRecords((rs) => rs.map((x) => (x.ebookId === id ? { ...x, status: "published" } : x)));
    setMsg({ kind: "published", n: r.versions.length });
  };
  const addVersion = (id: string, note: string) => {
    const r = records.find((x) => x.ebookId === id)!;
    const n = r.versions.length + 1;
    setRecords((rs) => rs.map((x) => (x.ebookId === id ? { ...x, status: "published", versions: [...x.versions, { n, date: new Date().toISOString(), note }] } : x)));
    setMsg({ kind: "published", n });
  };

  const cols: Column<ManualRecord>[] = [
    { key: "title", header: s("colTitle"), cell: (r) => ebookById(r.ebookId)?.title ?? "" },
    { key: "status", header: s("colStatus"), cell: (r) => s(r.status) },
    { key: "version", header: s("colVersion"), cell: (r) => { const v = r.versions[r.versions.length - 1]!; return s("versionLine", { n: v.n, date: formatIST(v.date) }); } },
    { key: "actions", header: s("colActions"), cell: (r) => (
      <span className="flex flex-wrap gap-2">
        {r.status === "draft" && (
          <button type="button" className="btn-primary" onClick={() => publish(r.ebookId)}>{r.versions.length === 1 ? s("publishV1") : s("publishNowBtn")}</button>
        )}
        <button type="button" className="btn-secondary" aria-expanded={historyFor === r.ebookId}
          onClick={() => setHistoryFor(historyFor === r.ebookId ? null : r.ebookId)}>
          {historyFor === r.ebookId ? s("hideHistory") : s("history")}
        </button>
      </span>
    ) },
  ];
  const open = records.find((r) => r.ebookId === historyFor);

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div>
        <PageHeading text={s("title")} />
        <p className="mt-1 text-ink">{s("subtitle")}</p>
        <p className="mt-2 max-w-reading text-ink-muted">{s("lead")}</p>
      </div>

      <div className="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap">
        {(["create", "import", "epub"] as const).map((m) => (
          <button key={m} type="button" aria-expanded={mode === m} className={mode === m ? "btn-primary" : "btn-secondary"}
            onClick={() => { setMsg(null); setMode(mode === m ? null : m); }}>{s(m)}</button>
        ))}
      </div>

      {mode === "create" && <CreateForm onCancel={() => setMode(null)} onDone={(published) => { setMode(null); setMsg({ kind: published ? "published" : "ready", n: 1 }); }} />}
      {(mode === "import" || mode === "epub") && <UploadForm key={mode} kind={mode} onCancel={() => setMode(null)} onDone={() => { setMode(null); setMsg({ kind: "ready", n: 1 }); }} />}

      {msg && <StatusBanner variant="success">{msg.kind === "ready" ? s("ready", { n: msg.n }) : s("publishedMsg", { n: msg.n })}</StatusBanner>}

      <DataTable caption={s("list")} columns={cols} rows={records} rowKey={(r) => r.ebookId}
        empty={<EmptyState headingLevel={3} title={s("empty")} help="" />} />

      {open && <History record={open} onAdd={(note) => addVersion(open.ebookId, note)} />}
    </div>
  );
}

function History({ record, onAdd }: { record: ManualRecord; onAdd: (note: string) => void }) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState(false);
  return (
    <section aria-labelledby={`${id}-h`} className="space-y-3 rounded-surface border border-border bg-surface p-4">
      <h2 id={`${id}-h`} className="font-heading text-[22px] text-ink">{s("history")}: {ebookById(record.ebookId)?.title}</h2>
      <ol className="space-y-2">
        {[...record.versions].reverse().map((v) => (
          <li key={v.n} className="text-ink"><span className="font-semibold">{s("versionItem", { n: v.n, date: formatIST(v.date) })}</span><br />{v.note}</li>
        ))}
      </ol>
      {!adding ? (
        <button type="button" className="btn-secondary" onClick={() => setAdding(true)}>{s("addVersion")}</button>
      ) : (
        <form noValidate className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) { setErr(true); document.getElementById(`${id}-c`)?.focus(); return; }
          onAdd(note.trim()); setAdding(false); setNote("");
        }}>
          <div>
            <label htmlFor={`${id}-c`} className="block font-semibold text-ink">{s("changelog")}</label>
            <textarea id={`${id}-c`} rows={3} value={note} onChange={(e) => { setNote(e.target.value); setErr(false); }}
              aria-invalid={err || undefined} aria-describedby={err ? `${id}-ce` : undefined} className={`${input} py-2 ${err ? "border-error" : ""}`} />
            {err && <p id={`${id}-ce`} className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{s("changelogError")}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 tablet:flex-row">
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>{s("cancel")}</button>
            <button type="submit" className="btn-primary">{s("saveVersion")}</button>
          </div>
        </form>
      )}
    </section>
  );
}

function CreateForm({ onCancel, onDone }: { onCancel: () => void; onDone: (published: boolean) => void }) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("markdown");
  const [body, setBody] = useState("");
  const [pub, setPub] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <form noValidate className="space-y-4 rounded-surface border border-border bg-surface p-4" onSubmit={(e) => {
      e.preventDefault();
      if (!title.trim()) { setErr(true); document.getElementById(`${id}-t`)?.focus(); return; }
      onDone(pub);
    }}>
      <div>
        <label htmlFor={`${id}-t`} className="block font-semibold text-ink">{s("fTitle")}</label>
        <input id={`${id}-t`} value={title} placeholder={s("fTitlePh")} onChange={(e) => { setTitle(e.target.value); setErr(false); }}
          aria-invalid={err || undefined} aria-describedby={err ? `${id}-te` : undefined} className={`${input} ${err ? "border-error" : ""}`} />
        {err && <p id={`${id}-te`} className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{s("titleError")}</p>}
      </div>
      <div className="max-w-xs">
        <label htmlFor={`${id}-f`} className="block font-semibold text-ink">{s("format")}</label>
        <select id={`${id}-f`} value={format} onChange={(e) => setFormat(e.target.value)} className={input}>
          <option value="markdown">{s("markdown")}</option>
          <option value="epub3">{s("epub3")}</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-b`} className="block font-semibold text-ink">{s("body")}</label>
        <textarea id={`${id}-b`} rows={8} value={body} onChange={(e) => setBody(e.target.value)} className={`${input} py-2 font-mono`} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-ink">
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="size-5 accent-accent" />{s("publishNow")}
      </label>
      <div className="flex flex-col-reverse gap-2 tablet:flex-row">
        <button type="button" className="btn-secondary" onClick={onCancel}>{s("cancel")}</button>
        <button type="submit" className="btn-primary">{s("save")}</button>
      </div>
    </form>
  );
}

function UploadForm({ kind, onCancel, onDone }: { kind: "import" | "epub"; onCancel: () => void; onDone: () => void }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const accept = kind === "epub" ? ".epub" : ".pdf,.txt,.md";

  const start = () => {
    const f = fileRef.current?.files?.[0];
    setFailed(false);
    if (!f) { setErr(s("noFile")); fileRef.current?.focus(); return; }
    const ok = kind === "epub" ? /\.epub$/i.test(f.name) : /\.(pdf|txt|md)$/i.test(f.name);
    if (!ok) { setErr(s(kind === "epub" ? "wrongEpub" : "wrongDoc")); fileRef.current?.focus(); return; }
    setErr(null);
    const m = mockState.teacher;
    const total = m.upload === "slow" ? 6000 : m.uploadMs;
    setProgress(0);
    setTimeout(() => setProgress(40), total * 0.3);
    setTimeout(() => {
      if (m.upload === "error") { setProgress(null); setFailed(true); return; }
      setProgress(100); onDone();
    }, total);
  };

  return (
    <div className="space-y-4 rounded-surface border border-border bg-surface p-4">
      <div>
        <label htmlFor={`${id}-f`} className="block font-semibold text-ink">{s(kind === "epub" ? "epubFile" : "docFile")}</label>
        <input ref={fileRef} id={`${id}-f`} type="file" accept={accept} onChange={() => setErr(null)}
          aria-invalid={err ? true : undefined} aria-describedby={`${id}-h${err ? ` ${id}-e` : ""}`} className="mt-2 block w-full text-ink" />
        <p id={`${id}-h`} className="mt-2 text-sm text-ink-muted">{s("fileHelp")}</p>
        {err && <p id={`${id}-e`} className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{err}</p>}
      </div>
      {progress !== null && <p role="status" className="text-ink">{s("uploading", { n: progress === 0 ? 0 : 40 })}</p>}
      <SlowNetworkNote pending={progress !== null} />
      {failed && <ErrorAlert message={s("failed")} onRetry={start} />}
      <div className="flex flex-col-reverse gap-2 tablet:flex-row">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={progress !== null}>{s("cancel")}</button>
        <button type="button" className="btn-primary" onClick={start} disabled={progress !== null}>{s("upload")}</button>
      </div>
    </div>
  );
}
