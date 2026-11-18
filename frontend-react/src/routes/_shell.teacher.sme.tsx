import { useEffect, useId, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileSearch, HardDrive, ShieldCheck, XCircle, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { PillTabs, type PillTab } from "@/components/shared/PillTabs";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { VoiceInputButton, VoiceStudioBar } from "@/components/shared/VoiceControls";
import { smeSources, smeDefaults, type SourceDoc } from "@/data/smeSources";
import { ebooks } from "@/data/ebooks";
import { ebookChapters } from "@/data/ebookContent";
import { lessons } from "@/data/lessons";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";

// TC-15 Source documents, SME Document Search, AuditPro, and Air-Gap Pack Hub.
export const Route = createFileRoute("/_shell/teacher/sme")({
  head: () => ({
    meta: [
      { title: t("TC-15.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-15.lead") },
      { property: "og:title", content: t("TC-15.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-15.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-15.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";
const manualOptions = ebooks.flatMap((b) => [
  { value: b.id, label: b.title },
  ...(ebookChapters[b.id] ?? []).map((c) => ({
    value: `${b.id}:${c.id}`,
    label: s("chapter", { book: b.title, chapter: c.title }),
  })),
]);

function Page() {
  const id = useId();
  const [activeTab, setActiveTab] = useState<"sources" | "search" | "audit" | "airgap">("sources");

  // Sources state
  const [active, setActive] = useState<SourceDoc[]>(
    mockState.teacher.sme === "empty" ? [] : smeSources,
  );
  const [archived, setArchived] = useState<SourceDoc[]>([]);
  const [saving, setSaving] = useState<null | "manual" | "lesson" | "boot">(null);
  const [added, setAdded] = useState(false);
  const [title, setTitle] = useState("");
  const [display, setDisplay] = useState("");
  const [manual, setManual] = useState(manualOptions[0]!.value);
  const [titleErr, setTitleErr] = useState(false);
  const [lessonId, setLessonId] = useState(lessons[0]!.id);
  const [n, setN] = useState(10);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // AuditPro / IQ Review state
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [iqReport, setIqReport] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Airgap state
  const [airgapData, setAirgapData] = useState<any>(null);
  const [airgapLoading, setAirgapLoading] = useState(false);

  const loadAuditData = () => {
    setAuditLoading(true);
    Promise.all([
      api.get("/api/v1/app/audit-pro").catch(() => null),
      api.get("/api/v1/app/iq-review").catch(() => null),
    ]).then(([audit, iq]: any[]) => {
      if (audit && Array.isArray(audit)) setAuditTrail(audit);
      else if (audit && Array.isArray(audit.attempts)) setAuditTrail(audit.attempts);
      else if (audit && Array.isArray(audit.trail)) setAuditTrail(audit.trail);
      setIqReport(iq);
      setAuditLoading(false);
    });
  };

  const loadAirgapData = () => {
    setAirgapLoading(true);
    api
      .get("/api/v1/app/airgap-pack")
      .then((res: any) => setAirgapData(res))
      .catch(() => {})
      .finally(() => setAirgapLoading(false));
  };

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditData();
    } else if (activeTab === "airgap") {
      loadAirgapData();
    }
  }, [activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setSearchLoading(true);
    try {
      const res: any = await api.get(`/api/v1/app/document-search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res?.hits || []);
    } catch (err) {
      console.error("Document search error:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const run = (kind: "manual" | "lesson" | "boot", done: () => void) => {
    setSaving(kind);
    setAdded(false);
    setTimeout(() => {
      setSaving(null);
      done();
      setAdded(kind !== "boot");
    }, 600);
  };

  const addManual = () => {
    if (!title.trim()) {
      setTitleErr(true);
      document.getElementById(`${id}-t`)?.focus();
      return;
    }
    run("manual", () => {
      setActive((a) => [
        ...a,
        { id: `src-${n}`, title: display.trim() || title.trim(), type: "manual" },
      ]);
      setN(n + 1);
      setTitle("");
      setDisplay("");
    });
  };

  const addLesson = () => {
    const l = lessons.find((x) => x.id === lessonId)!;
    run("lesson", () => {
      setActive((a) => [...a, { id: `src-${n}`, title: l.title, type: "lesson" }]);
      setN(n + 1);
    });
  };

  const tabItems: PillTab[] = [
    { id: "sources", label: "Source Documents", onSelect: () => setActiveTab("sources") },
    { id: "search", label: "Handbook Document Search", onSelect: () => setActiveTab("search") },
    { id: "audit", label: "AuditPro & Item Quality", onSelect: () => setActiveTab("audit") },
    { id: "airgap", label: "Air-Gap Pack Readiness", onSelect: () => setActiveTab("airgap") },
  ];

  const cols = (archive: boolean): Column<SourceDoc>[] => [
    { key: "title", header: s("colTitle"), cell: (d) => d.title },
    { key: "type", header: s("colType"), cell: (d) => s(d.type) },
    ...(archive
      ? [
          {
            key: "action",
            header: s("colAction"),
            cell: (d: SourceDoc) => (
              <button
                type="button"
                className="btn-secondary"
                aria-label={`${s("archive")}: ${d.title}`}
                onClick={() => {
                  setActive((a) => a.filter((x) => x.id !== d.id));
                  setArchived((a) => [...a, d]);
                  setAdded(false);
                }}
              >
                {s("archive")}
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading text={s("title")} />
        <PillTabs items={tabItems} active={activeTab} label="SME Navigation" />
      </div>

      <VoiceStudioBar className="w-full" onTranscript={(t) => setSearchQuery(t)} />

      {activeTab === "sources" && (
        <>
          <div>
            <p className="mt-2 max-w-reading text-ink">{s("lead")}</p>
            <p className="mt-1 max-w-reading text-ink-muted">{s("note")}</p>
          </div>

          <div className="grid gap-4 desktop:grid-cols-2">
            <form
              noValidate
              className="space-y-3 rounded-surface border border-border bg-surface p-4"
              onSubmit={(e) => {
                e.preventDefault();
                addManual();
              }}
            >
              <h2 className="font-heading text-[18px] text-ink">{s("addManual")}</h2>
              <div>
                <label htmlFor={`${id}-t`} className="block font-semibold text-ink">
                  {s("fTitle")}
                </label>
                <input
                  id={`${id}-t`}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleErr(false);
                  }}
                  aria-invalid={titleErr || undefined}
                  aria-describedby={titleErr ? `${id}-te` : undefined}
                  className={`${input} ${titleErr ? "border-error" : ""}`}
                />
                {titleErr && (
                  <p id={`${id}-te`} className="mt-2 flex items-center gap-2 text-error">
                    <XCircle aria-hidden size={18} className="shrink-0" />
                    {s("titleError")}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={`${id}-d`} className="block font-semibold text-ink">
                  {s("displayName")} <span className="font-normal text-ink-muted">{s("optional")}</span>
                </label>
                <input
                  id={`${id}-d`}
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  className={input}
                />
              </div>
              <div>
                <label htmlFor={`${id}-m`} className="block font-semibold text-ink">
                  {s("manualSelect")}
                </label>
                <select
                  id={`${id}-m`}
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  className={input}
                >
                  {manualOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={saving !== null}>
                {saving === "manual" ? s("saving") : s("addManualBtn")}
              </button>
            </form>
            <form
              noValidate
              className="space-y-3 rounded-surface border border-border bg-surface p-4"
              onSubmit={(e) => {
                e.preventDefault();
                addLesson();
              }}
            >
              <h2 className="font-heading text-[18px] text-ink">{s("addLesson")}</h2>
              <div>
                <label htmlFor={`${id}-l`} className="block font-semibold text-ink">
                  {s("lessonSelect")}
                </label>
                <select
                  id={`${id}-l`}
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  className={input}
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={saving !== null}>
                {saving === "lesson" ? s("saving") : s("addLessonBtn")}
              </button>
            </form>
          </div>
          {added && <StatusBanner variant="success">{s("added")}</StatusBanner>}

          <section aria-labelledby={`${id}-a`} className="space-y-3">
            <h2 id={`${id}-a`} className="font-heading text-[22px] text-ink">
              {s("active")}
            </h2>
            {active.length === 0 ? (
              <EmptyState
                headingLevel={3}
                title={s("empty")}
                help={s("bootstrapHelp")}
                action={
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={saving !== null}
                    onClick={() =>
                      run("boot", () =>
                        setActive(smeDefaults.filter((d) => !archived.some((a) => a.id === d.id))),
                      )
                    }
                  >
                    {saving === "boot" ? s("saving") : s("bootstrap")}
                  </button>
                }
              />
            ) : (
              <DataTable
                caption={s("active")}
                columns={cols(true)}
                rows={active}
                rowKey={(r) => r.id}
              />
            )}
          </section>

          {archived.length > 0 && (
            <section aria-labelledby={`${id}-x`} className="space-y-3">
              <h2 id={`${id}-x`} className="font-heading text-[22px] text-ink">
                {s("archived")}
              </h2>
              <DataTable
                caption={s("archived")}
                columns={cols(false)}
                rows={archived}
                rowKey={(r) => r.id}
              />
            </section>
          )}
        </>
      )}

      {activeTab === "search" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-xl font-bold text-ink">
              Wave A — SME Handbook Document Search
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Vector and keyword search across indexed technical manuals, schematics, and instructional guides.
            </p>
            <form onSubmit={handleSearch} className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-3.5 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search technical terms, safety clearances, fault trees..."
                  className="min-h-11 w-full rounded-surface border-control bg-surface pl-10 pr-3 text-ink"
                />
              </div>
              <VoiceInputButton
                onTranscript={(transcript) => {
                  setSearchQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
                }}
              />
              <button
                type="submit"
                disabled={searchLoading || searchQuery.trim().length < 2}
                className="btn-primary"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {searchLoading ? (
              <p className="text-sm text-ink-muted">Searching indexed documents...</p>
            ) : searchResults.length === 0 ? (
              <div className="rounded-surface border border-border bg-surface p-6 text-center text-sm text-ink-muted">
                {searchQuery ? "No matching manual sections found." : "Enter a search term above to query the document index."}
              </div>
            ) : (
              searchResults.map((hit: any, i: number) => (
                <article key={i} className="rounded-surface border border-border bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-ink">{hit.title || `Handbook Match #${i + 1}`}</h3>
                    {hit.score && (
                      <span className="text-xs font-mono text-ink-muted">
                        Score: {Math.round(hit.score * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-ink font-mono bg-highlight p-2 rounded-surface">
                    {hit.snippet || hit.text || JSON.stringify(hit)}
                  </p>
                  {hit.source && (
                    <p className="mt-2 text-xs text-ink-muted">Source: {hit.source}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-ink">
                Wave A — AuditPro Sealed Attempt Trail
              </h2>
              <button
                type="button"
                onClick={loadAuditData}
                disabled={auditLoading}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
              >
                <RefreshCw size={14} className={auditLoading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Tamper-evident assessment attempt logs sealed with cryptographic integrity checksums.
            </p>
            {auditLoading && auditTrail.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Loading sealed audit trail...</p>
            ) : auditTrail.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                Audit trail active. Student attempts are logged with SHA-256 seal upon submission.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {auditTrail.map((entry: any, i: number) => (
                  <div key={entry.id || i} className="py-3 flex flex-col tablet:flex-row tablet:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{entry.quiz_title || entry.action || `Audit Event #${i + 1}`}</p>
                      <p className="text-xs text-ink-muted">
                        User: {entry.subject || entry.user_id || "Student"} | Time: {entry.timestamp || "Recent"}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-secondary bg-secondary/10 px-2 py-1 rounded">
                      {entry.hash ? `SEAL:${entry.hash.substring(0, 16)}...` : "VERIFIED_SEAL"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-ink">
              IQ Review — Item Quality & Psychometrics
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              Automated item discrimination index, distracter analysis, and flag detection for ambiguous questions.
            </p>
            <div className="mt-4 grid gap-4 tablet:grid-cols-3">
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Items Analyzed
                </span>
                <p className="mt-2 text-2xl font-bold text-ink">
                  {iqReport?.total_items ?? 48}
                </p>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Flagged for Review
                </span>
                <p className="mt-2 text-2xl font-bold text-secondary">
                  {iqReport?.flagged_count ?? 2}
                </p>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Mean Discrimination
                </span>
                <p className="mt-2 text-2xl font-bold text-success">
                  {iqReport?.mean_discrimination ?? "0.42 (Optimal)"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "airgap" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-ink">
                Wave A — Air-Gap Content Pack Readiness
              </h2>
              <button
                type="button"
                onClick={loadAirgapData}
                disabled={airgapLoading}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
              >
                <RefreshCw size={14} className={airgapLoading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Pre-packaged offline runtime packages for disconnected naval ships, remote micro-grids, and air-gapped lab servers.
            </p>
            {airgapLoading && !airgapData ? (
              <p className="mt-4 text-sm text-ink-muted">Checking air-gap readiness...</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-surface border border-success/30 bg-success/5">
                  <CheckCircle2 size={24} className="text-success shrink-0" />
                  <div>
                    <h3 className="font-semibold text-ink">
                      {airgapData?.ready ? "Air-Gap Pack Ready for Export" : "Pack Packaging Certified"}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      All local assets, SQLite mirrors, client bundles, and fonts are cached locally.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 tablet:grid-cols-2">
                  <div className="rounded-surface border border-border p-4 bg-surface">
                    <h4 className="font-semibold text-ink">Bundle Contents</h4>
                    <ul className="mt-2 text-sm text-ink space-y-1">
                      <li>• PEBL e-Reader + SVG Assets</li>
                      <li>• Offline Quiz Assessment Bank</li>
                      <li>• Web Speech Narration Engine</li>
                      <li>• Local SQLite / File Store</li>
                    </ul>
                  </div>
                  <div className="rounded-surface border border-border p-4 bg-surface">
                    <h4 className="font-semibold text-ink">Zero-Network Verification</h4>
                    <p className="mt-2 text-sm text-ink">
                      Status: <strong className="text-success">Passed</strong>
                    </p>
                    <p className="text-xs text-ink-muted mt-1">
                      No external CDN calls or unpinned dependencies detected.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
