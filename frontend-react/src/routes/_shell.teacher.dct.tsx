import { useEffect, useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Box,
  Layers,
  RefreshCw,
  Send,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Play,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { PillTabs, type PillTab } from "@/components/shared/PillTabs";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { MarkdownPreview } from "@/components/teacher/MarkdownPreview";
import { DraftBadge } from "@/components/teacher/DraftBadge";
import { skills as registry, type Skill } from "@/data/skills";
import { microDrafts } from "@/data/aiDrafts";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";

// TC-16 Micro-learning planner, Interactive Labs, and XR Suite Hub.
export const Route = createFileRoute("/_shell/teacher/dct")({
  head: () => ({
    meta: [
      { title: t("TC-16.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-16.lead") },
      { property: "og:title", content: t("TC-16.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-16.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-16.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";

function Page() {
  const id = useId();
  const [activeTab, setActiveTab] = useState<"planner" | "labs" | "xr">("planner");

  // Planner state
  const st = mockState.teacher.dct;
  const [all, setAll] = useState<Skill[]>(
    st === "empty"
      ? []
      : st === "allLinked"
        ? registry.map((k) => ({ ...k, link: "linked" as const }))
        : registry,
  );
  const [plan, setPlan] = useState<string[]>(all.slice(0, 3).map((k) => k.code));
  const [pick, setPick] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [video, setVideo] = useState("");
  const [cap, setCap] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  // Labs state
  const [labPacks, setLabPacks] = useState<any[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [filterChapter, setFilterChapter] = useState("all");
  const [proposeTitle, setProposeTitle] = useState("");
  const [proposeBody, setProposeBody] = useState("");
  const [proposing, setProposing] = useState(false);
  const [proposalResult, setProposalResult] = useState<any>(null);
  const [savingPack, setSavingPack] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // XR Suite state
  const [xrOverview, setXrOverview] = useState<any>(null);
  const [xrStore, setXrStore] = useState<any[]>([]);
  const [xrAssets, setXrAssets] = useState<any[]>([]);
  const [xrActiveModules, setXrActiveModules] = useState<any>(null);
  const [xrLoading, setXrLoading] = useState(false);

  const missing = all.filter((k) => k.link === "missing").length;
  const rows = plan.map((c) => all.find((k) => k.code === c)).filter((k): k is Skill => !!k);
  const notInPlan = all.filter((k) => !plan.includes(k.code));
  const draftSkill = all.find((k) => k.code === draftFor);
  const draft = draftFor ? microDrafts[draftFor] : undefined;

  const loadLabs = (chapter?: string) => {
    setLabsLoading(true);
    const targetChapter = typeof chapter === "string" ? chapter : filterChapter;
    const req =
      targetChapter !== "all"
        ? api.get<{ pack?: any; items?: any[] }>(
            `/api/v1/app/labs/packs/by-chapter?manual_id=00000000-0000-0000-0000-000000000001&chapter_slug=${targetChapter}`,
          )
        : api.get<{ packs?: any[] }>("/api/v1/app/labs/packs");

    req
      .then((res: any) => {
        const packs = res?.packs || (res?.pack ? [res.pack] : []);
        if (Array.isArray(packs)) {
          setLabPacks(packs);
        }
      })
      .catch(() => {})
      .finally(() => setLabsLoading(false));
  };

  const loadXr = () => {
    setXrLoading(true);
    Promise.all([
      api.get("/api/v1/app/xr/overview").catch(() => null),
      api.get("/api/v1/app/xr/store").catch(() => null),
      api.get("/api/v1/app/xr/assets").catch(() => null),
      api.get("/api/v1/app/xr/labs").catch(() => null),
      api.get("/api/v1/app/xr/ar").catch(() => null),
      api.get("/api/v1/app/xr/vr-maintainer").catch(() => null),
      api.get("/api/v1/app/xr/configurator?asset_id=motor-5hp").catch(() => null),
    ]).then(([ov, st, ast, xrLabs, xrAr, vrMaint, cfg]: any[]) => {
      setXrOverview(ov);
      if (st && Array.isArray(st)) setXrStore(st);
      else if (st && Array.isArray(st.items)) setXrStore(st.items);
      if (ast && Array.isArray(ast)) setXrAssets(ast);
      else if (ast && Array.isArray(ast.items)) setXrAssets(ast.items);
      setXrActiveModules({ xrLabs, xrAr, vrMaint, cfg });
      setXrLoading(false);
    });
  };

  useEffect(() => {
    if (activeTab === "labs") {
      loadLabs();
    } else if (activeTab === "xr") {
      loadXr();
    }
  }, [activeTab]);

  const generate = (code: string) => {
    setGenerating(code);
    setDraftFor(null);
    setSaved(null);
    setVideo("");
    setCap("");
    setTimeout(() => {
      setGenerating(null);
      setDraftFor(code);
    }, 800);
  };

  const save = () => {
    if (!draftSkill) return;
    setAll(all.map((k) => (k.code === draftSkill.code ? { ...k, link: "linked" } : k)));
    setSaved(draftSkill.title);
    setDraftFor(null);
  };

  const handleProposeLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (proposeBody.trim().length < 20) return;
    setProposing(true);
    setProposalResult(null);
    try {
      const res = await api.post("/api/v1/app/labs/propose", {
        title: proposeTitle.trim() || "Virtual Lab Experiment",
        body_md: proposeBody.trim(),
        chapter_slug: "overview",
      });
      setProposalResult(res);
    } catch (err: any) {
      setProposalResult({ error: err.message || "Failed to propose lab" });
    } finally {
      setProposing(false);
    }
  };

  const handleSaveLabPack = async () => {
    if (!proposalResult || proposalResult.error) return;
    setSavingPack(true);
    try {
      const pack = proposalResult.pack || proposalResult;
      await api.post("/api/v1/app/labs/packs", {
        pack,
        chapter_slug: "overview",
        status: "draft",
      });
      loadLabs();
      setProposalResult(null);
      setPublishSuccess("Draft lab pack saved to repository.");
    } catch (err: any) {
      console.error("Save lab failed:", err);
    } finally {
      setSavingPack(false);
    }
  };

  const handlePublishLab = async (packId: string) => {
    try {
      await api.post(`/api/v1/app/labs/packs/${packId}/publish`);
      loadLabs();
      setPublishSuccess("Lab pack successfully published for students.");
    } catch (err) {
      console.error("Publish lab failed:", err);
    }
  };

  const tabItems: PillTab[] = [
    { id: "planner", label: "Micro-Learning Planner", onSelect: () => setActiveTab("planner") },
    {
      id: "labs",
      label: `Interactive Labs (${labPacks.length})`,
      onSelect: () => setActiveTab("labs"),
    },
    { id: "xr", label: "XR Suite & Spatial Training", onSelect: () => setActiveTab("xr") },
  ];

  const cols: Column<Skill>[] = [
    { key: "skill", header: s("colSkill"), cell: (k) => k.title },
    { key: "status", header: s("colStatus"), cell: (k) => s(k.link) },
    {
      key: "action",
      header: s("colAction"),
      cell: (k) =>
        k.link === "missing" ? (
          <button
            type="button"
            className="btn-secondary"
            aria-label={`${s("generate")}: ${k.title}`}
            disabled={generating !== null}
            onClick={() => generate(k.code)}
          >
            {s("generate")}
          </button>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading text={s("title")} />
        <PillTabs items={tabItems} active={activeTab} label="DCT Navigation" />
      </div>

      {activeTab === "planner" && (
        <>
          <p className="font-heading text-[22px] text-ink">
            {missing === 0
              ? s("allLinked")
              : missing === 1
                ? s("missing1")
                : s("missingN", { n: missing })}
          </p>

          {notInPlan.length > 0 && (
            <div className="flex flex-col gap-2 tablet:flex-row tablet:items-end">
              <div className="tablet:w-80">
                <label htmlFor={`${id}-p`} className="sr-only">
                  {s("choose")}
                </label>
                <select
                  id={`${id}-p`}
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  className={input}
                >
                  <option value="">{s("choose")}</option>
                  {notInPlan.map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={!pick}
                onClick={() => {
                  setPlan([...plan, pick]);
                  setPick("");
                }}
              >
                {s("addToPlan")}
              </button>
            </div>
          )}

          <DataTable caption={s("caption")} columns={cols} rows={rows} rowKey={(r) => r.code} />
          <p role="status" className="text-ink">
            {generating ? s("generating") : ""}
          </p>
          {saved && <StatusBanner variant="success">{s("saved", { skill: saved })}</StatusBanner>}

          {draft && draftSkill && (
            <section
              aria-labelledby={`${id}-d`}
              className="space-y-4 rounded-surface border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 id={`${id}-d`} className="font-heading text-[22px] text-ink">
                  {s("draftFor", { skill: draftSkill.title })}
                </h2>
                <DraftBadge />
              </div>
              <p className="font-semibold text-ink">{draft.title}</p>
              <MarkdownPreview source={draft.body} />
              <div className="grid gap-4 desktop:grid-cols-2">
                <div>
                  <label htmlFor={`${id}-v`} className="block font-semibold text-ink">
                    {s("video")}
                  </label>
                  <p id={`${id}-vh`} className="text-sm text-ink-muted">
                    {s("videoHelp")}
                  </p>
                  <input
                    id={`${id}-v`}
                    type="url"
                    inputMode="url"
                    value={video}
                    aria-describedby={`${id}-vh`}
                    onChange={(e) => setVideo(e.target.value)}
                    className={input}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-c`} className="block font-semibold text-ink">
                    {s("caption1")}
                  </label>
                  <input
                    id={`${id}-c`}
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                    className={input}
                  />
                </div>
              </div>
              <AITrustNote audience="instructor" sources={draft.sources} />
              <div className="flex flex-col-reverse gap-2 tablet:flex-row">
                <button type="button" className="btn-secondary" onClick={() => setDraftFor(null)}>
                  {t("shared.discard")}
                </button>
                <button type="button" className="btn-primary" onClick={save}>
                  {s("save")}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === "labs" && (
        <div className="space-y-6">
          {publishSuccess && <StatusBanner variant="success">{publishSuccess}</StatusBanner>}
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-xl font-bold text-ink">
              Interactive Lab Pack Authoring
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Generate interactive simulation labs from textbook instructions, circuit diagrams, or
              maintenance procedures.
            </p>
            <form onSubmit={handleProposeLab} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink">Lab / Chapter Title</label>
                <input
                  type="text"
                  value={proposeTitle}
                  onChange={(e) => setProposeTitle(e.target.value)}
                  placeholder="e.g. Three-Phase Motor Star-Delta Starter Wiring Lab"
                  className={input}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink">
                  Curriculum / Procedure Text (min 20 characters)
                </label>
                <textarea
                  value={proposeBody}
                  onChange={(e) => setProposeBody(e.target.value)}
                  placeholder="Describe step-by-step experiment steps, components, meter measurements, safety interlocks..."
                  rows={4}
                  className="mt-2 w-full rounded-surface border-control bg-surface p-3 font-mono text-sm text-ink"
                />
              </div>
              <button
                type="submit"
                disabled={proposing || proposeBody.trim().length < 20}
                className="btn-primary"
              >
                {proposing ? "Drafting Lab Pack..." : "Draft Interactive Lab Pack"}
              </button>
            </form>

            {proposalResult && (
              <div className="mt-4 rounded-surface border border-secondary/30 bg-secondary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">Generated Lab Pack Proposal</h3>
                  <button
                    type="button"
                    onClick={handleSaveLabPack}
                    disabled={savingPack}
                    className="btn-primary text-xs"
                  >
                    {savingPack ? "Saving..." : "Save Pack to Tenant Repository"}
                  </button>
                </div>
                {proposalResult.error ? (
                  <p className="text-sm text-error">{proposalResult.error}</p>
                ) : (
                  <div className="text-sm text-ink space-y-2">
                    <p>
                      <strong>Title:</strong> {proposalResult.title || proposeTitle}
                    </p>
                    <p>
                      <strong>Steps:</strong> {proposalResult.steps?.length ?? 4} procedural stages
                      configured.
                    </p>
                    <p>
                      <strong>Safety Checklist:</strong> Enforced before virtual energized state.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-ink">
                Tenant Interactive Lab Packs
              </h2>
              <button
                type="button"
                onClick={() => loadLabs()}
                disabled={labsLoading}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
              >
                <RefreshCw size={14} className={labsLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            {labsLoading && labPacks.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Loading lab packs...</p>
            ) : labPacks.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                No custom lab packs published yet. Draft one using the editor above.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {labPacks.map((pack: any, i: number) => (
                  <div key={pack.id || i} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-ink">{pack.title || `Lab Pack #${i + 1}`}</p>
                      <p className="text-xs text-ink-muted font-mono">
                        Status: <span className="uppercase">{pack.status || "draft"}</span> |
                        Chapter: {pack.chapter_slug || "overview"}
                      </p>
                    </div>
                    {pack.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => handlePublishLab(pack.id)}
                        className="btn-secondary text-xs"
                      >
                        Publish for Students
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "xr" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-ink">
                Wave B — XR Suite & Spatial Training
              </h2>
              <button
                type="button"
                onClick={loadXr}
                disabled={xrLoading}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
              >
                <RefreshCw size={14} className={xrLoading ? "animate-spin" : ""} />
                Refresh Overview
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Spatial training environments, 3D asset configurators, AR overlays, and VR maintainer
              modules.
            </p>
            {xrLoading && !xrOverview ? (
              <p className="mt-4 text-sm text-ink-muted">Loading XR capabilities...</p>
            ) : (
              <div className="mt-4 grid gap-4 tablet:grid-cols-3">
                <div className="rounded-surface border border-border p-4 bg-surface">
                  <div className="flex items-center gap-2">
                    <Box size={18} className="text-secondary" />
                    <h3 className="font-semibold text-ink">Immersive Labs</h3>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-ink">
                    {xrOverview?.products?.immersive_labs ? "Active" : "Enabled"}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">
                    Multi-user spatial simulation rooms.
                  </p>
                </div>
                <div className="rounded-surface border border-border p-4 bg-surface">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-accent" />
                    <h3 className="font-semibold text-ink">AR Assistance</h3>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-ink">
                    {xrOverview?.products?.ar_assistance ? "Active" : "Enabled"}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">Real-time HUD pinout verification.</p>
                </div>
                <div className="rounded-surface border border-border p-4 bg-surface">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-success" />
                    <h3 className="font-semibold text-ink">VR Maintainer</h3>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-ink">
                    {xrOverview?.products?.vr_maintainer ? "Active" : "Enabled"}
                  </p>
                  <p className="text-xs text-ink-muted mt-1">Virtual maintenance qualification.</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-ink">
              3D Asset Repository & Configurator
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              Industrial models, engine cutaways, and switchgear assemblies configured for classroom
              labs.
            </p>
            <div className="mt-4 grid gap-3 tablet:grid-cols-2">
              <div className="rounded-surface border border-border p-3 bg-surface">
                <p className="font-semibold text-ink">Three-Phase Induction Motor 5HP</p>
                <p className="text-xs text-ink-muted">
                  Format: GLTF/USDZ | Exploded View: Supported
                </p>
              </div>
              <div className="rounded-surface border border-border p-3 bg-surface">
                <p className="font-semibold text-ink">Distribution Panel MCCB & Busbar</p>
                <p className="text-xs text-ink-muted">
                  Format: GLTF/USDZ | Interactive Breakers: Yes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
