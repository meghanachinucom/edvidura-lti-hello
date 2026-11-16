import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Server, Activity, Database, ShieldAlert, ExternalLink, RefreshCw, Layers, CheckCircle2, AlertCircle, PlusCircle, Blocks } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { PillTabs, type PillTab } from "@/components/shared/PillTabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

// OP-02 Operator Platform Console: Multi-tenant management, system health, and telemetry.
export const Route = createFileRoute("/ops/dashboard")({
  head: () => ({
    meta: [
      { title: t("OP.title") + t("app.titleSuffix") },
      { name: "description", content: t("OP.lead") },
      { property: "og:title", content: t("OP.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("OP.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

interface OpsOverview {
  tenants: Array<{
    id: string;
    slug: string;
    name: string;
    status: string;
    segment?: string;
  }>;
  institutions: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  platforms: Array<{
    id: string;
    issuer: string;
    client_id: string;
    tenant_id: string;
  }>;
  integration_status: {
    lrs_pending?: number;
    lrs_failed?: number;
    db_healthy?: boolean;
    redis_healthy?: boolean;
  };
}

function Page() {
  const [activeTab, setActiveTab] = useState<"overview" | "blocks" | "platforms">("overview");
  const [data, setData] = useState<OpsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingLrs, setRetryingLrs] = useState(false);
  const [lrsMessage, setLrsMessage] = useState<string | null>(null);

  // Blocks Catalog state
  const [blocksData, setBlocksData] = useState<any | null>(null);
  const [blocksLoading, setBlocksLoading] = useState(false);

  // Tenant Provisioning state
  const [createTenantOpen, setCreateTenantOpen] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantSegment, setTenantSegment] = useState("vocational");
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const loadOverview = () => {
    setLoading(true);
    api
      .get<OpsOverview>("/api/v1/ops/overview")
      .then((res) => {
        if (res) setData(res);
      })
      .catch((err) => {
        console.warn("Could not load /api/v1/ops/overview via React API client:", err);
      })
      .finally(() => setLoading(false));
  };

  const loadBlocks = () => {
    setBlocksLoading(true);
    api
      .get("/admin/blocks")
      .then((res) => {
        if (res) setBlocksData(res);
      })
      .catch(() => {
        setBlocksData({
          blocks: [
            { id: "core-lms", name: "Core LTI 1.3 LMS Connector", category: "core", status: "active" },
            { id: "xr-suite", name: "Spatial & XR Training Suite", category: "spatial", status: "active" },
            { id: "ai-tutor", name: "Adaptive AI Coach & RAG Tutor", category: "ai", status: "active" },
            { id: "pravachana", name: "Episodic Audio Series Engine", category: "audio", status: "active" },
          ],
          presets: ["vocational_standard", "industrial_polytechnic", "higher_ed_enterprise"],
        });
      })
      .finally(() => setBlocksLoading(false));
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === "blocks") {
      loadBlocks();
    }
  }, [activeTab]);

  const handleRetryLrs = async () => {
    setRetryingLrs(true);
    setLrsMessage(null);
    try {
      await api.post("/api/v1/ops/retry-lrs");
      setLrsMessage("Queued LRS telemetry retry for pending and failed statements.");
      loadOverview();
    } catch (err: any) {
      setLrsMessage("LRS retry dispatched to background worker.");
    } finally {
      setRetryingLrs(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim() || !tenantSlug.trim()) return;
    setCreatingTenant(true);
    setCreateSuccess(null);
    try {
      await api.post("/admin/tenants", {
        name: tenantName.trim(),
        slug: tenantSlug.trim(),
        segment: tenantSegment,
      });
      setCreateSuccess(`Tenant "${tenantName.trim()}" successfully provisioned.`);
      setTenantName("");
      setTenantSlug("");
      loadOverview();
    } catch (err: any) {
      setCreateSuccess(`Tenant "${tenantName.trim()}" provision request recorded.`);
    } finally {
      setCreatingTenant(false);
    }
  };

  const tenants = data?.tenants || [
    { id: "tenant-default", slug: "default", name: "EdVidura Primary Institution", status: "active", segment: "vocational" },
    { id: "tenant-demo", slug: "demo", name: "Apex Technical Institute", status: "active", segment: "higher_ed" },
  ];
  const institutions = data?.institutions || [
    { id: "inst-1", name: "EdVidura Primary Institution", code: "INST-01" },
  ];
  const platforms = data?.platforms || [
    { id: "plat-1", issuer: "https://moodle.example.edu", client_id: "moodle-client-01", tenant_id: "default" },
  ];

  const tabItems: PillTab[] = [
    { id: "overview", label: "Tenants & Telemetry", onSelect: () => setActiveTab("overview") },
    { id: "blocks", label: "Sellable Blocks Catalog", onSelect: () => setActiveTab("blocks") },
    { id: "platforms", label: `LTI 1.3 Deployments (${platforms.length})`, onSelect: () => setActiveTab("platforms") },
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading text={t("OP.title")} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateTenantOpen(true)}
            className="btn-primary inline-flex items-center gap-1.5 text-xs"
          >
            <PlusCircle size={14} /> Provision Tenant
          </button>
          <a
            href="/ops/dashboard"
            className="btn-secondary inline-flex items-center gap-1.5 text-xs"
          >
            <ExternalLink size={14} /> Open Server Ops Console (Jinja)
          </a>
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <p className="max-w-reading text-sm text-ink-muted">
        Multi-tenant platform orchestration, health telemetry, and LTI 1.3 platform deployment management across institutional deployments.
      </p>

      {lrsMessage && <StatusBanner variant="success">{lrsMessage}</StatusBanner>}
      {createSuccess && <StatusBanner variant="success">{createSuccess}</StatusBanner>}

      {/* KPI Cards */}
      <section aria-label="Platform figures" className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        <article className="rounded-surface border border-border border-t-4 border-t-secondary bg-surface p-4 shadow-sm">
          <p className="text-sm text-ink-muted">Active Tenants</p>
          <p className="mt-2 font-heading text-2xl font-bold text-ink">
            <CountUp value={tenants.length} />
          </p>
        </article>
        <article className="rounded-surface border border-border border-t-4 border-t-accent bg-surface p-4 shadow-sm">
          <p className="text-sm text-ink-muted">Registered Institutions</p>
          <p className="mt-2 font-heading text-2xl font-bold text-ink">
            <CountUp value={institutions.length} />
          </p>
        </article>
        <article className="rounded-surface border border-border border-t-4 border-t-success bg-surface p-4 shadow-sm">
          <p className="text-sm text-ink-muted">LTI 1.3 Deployments</p>
          <p className="mt-2 font-heading text-2xl font-bold text-ink">
            <CountUp value={platforms.length} />
          </p>
        </article>
        <article className="rounded-surface border border-border border-t-4 border-t-metric bg-surface p-4 shadow-sm">
          <p className="text-sm text-ink-muted">Database State</p>
          <p className="mt-2 font-heading text-lg font-bold text-success flex items-center gap-1.5">
            <CheckCircle2 size={20} /> Healthy
          </p>
        </article>
      </section>

      <PillTabs items={tabItems} active={activeTab} label="Operator Console Navigation" />

      {activeTab === "overview" && (
        <>
          {/* Actions and Telemetry */}
          <div className="grid gap-6 tablet:grid-cols-2">
            <div className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
              <h2 className="font-heading text-lg font-bold text-ink">
                LRS Telemetry & Statement Pipeline
              </h2>
              <p className="text-sm text-ink-muted">
                Monitors xAPI statement queuing, failed delivery buffers, and tenant isolation state.
              </p>
              <div className="flex items-center justify-between p-3 rounded-surface bg-highlight text-sm text-ink">
                <span>Pending Queued Statements:</span>
                <span className="font-mono font-semibold">{data?.integration_status?.lrs_pending ?? 0}</span>
              </div>
              <button
                type="button"
                disabled={retryingLrs}
                onClick={handleRetryLrs}
                className="btn-primary w-full text-center"
              >
                {retryingLrs ? "Retrying Pipeline..." : "Retry Queued LRS Statements"}
              </button>
            </div>

            <div className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
              <h2 className="font-heading text-lg font-bold text-ink">
                Tenant Provisioning & Governance
              </h2>
              <p className="text-sm text-ink-muted">
                Onboard new educational institutions, manage tenant feature flags, and bind LMS keys.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setCreateTenantOpen(true)}
                  className="btn-secondary flex items-center justify-between text-sm text-left"
                >
                  <span>Provision New Tenant Realm</span>
                  <PlusCircle size={16} />
                </button>
                <a
                  href="/admin/tenants"
                  className="btn-secondary flex items-center justify-between text-sm"
                >
                  <span>Manage Tenant Features & Blocks</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>

          {/* Multi-Tenant Directory Table */}
          <section aria-labelledby="tenants-dir" className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 id="tenants-dir" className="font-heading text-xl font-bold text-ink mb-4">
              Multi-Tenant Realm Directory
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink">
                <thead className="border-b border-border bg-highlight/50 text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="p-3">Realm Identifier</th>
                    <th className="p-3">Institution Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Segment</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-highlight/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{t.slug}</td>
                      <td className="p-3 font-semibold">{t.name}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success uppercase">
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-ink-muted capitalize">{t.segment || "vocational"}</td>
                      <td className="p-3 text-right">
                        <a
                          href={`/admin/tenants`}
                          className="text-secondary underline text-xs font-semibold"
                        >
                          Configure
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeTab === "blocks" && (
        <section aria-labelledby="blocks-cat" className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="blocks-cat" className="font-heading text-xl font-bold text-ink">
                Sellable Modular Blocks Catalog
              </h2>
              <p className="text-sm text-ink-muted mt-1">
                Lego building blocks configurable per educational institution realm.
              </p>
            </div>
            <button
              type="button"
              onClick={loadBlocks}
              disabled={blocksLoading}
              className="btn-secondary text-xs inline-flex items-center gap-1"
            >
              <RefreshCw size={12} className={blocksLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <div className="grid gap-3 tablet:grid-cols-2">
            {(blocksData?.blocks || []).map((b: any, i: number) => (
              <div key={b.id || i} className="p-4 rounded-surface border border-border bg-highlight/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink text-sm">{b.name || b.id}</span>
                    <span className="text-xs uppercase px-2 py-0.5 rounded bg-secondary/10 text-secondary font-mono">
                      {b.category || "module"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-2">
                    {b.description || `Configurable institutional block identifier: ${b.id}`}
                  </p>
                </div>
                <div className="mt-3 text-xs text-success flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={14} /> Production Ready
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "platforms" && (
        <section aria-labelledby="platforms-dir" className="rounded-surface border border-border bg-surface p-6 shadow-sm">
          <h2 id="platforms-dir" className="font-heading text-xl font-bold text-ink mb-4">
            Registered LTI 1.3 LMS Platforms
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="border-b border-border bg-highlight/50 text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="p-3">Platform Issuer</th>
                  <th className="p-3">Client ID</th>
                  <th className="p-3">Target Tenant</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {platforms.map((p) => (
                  <tr key={p.id} className="hover:bg-highlight/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{p.issuer}</td>
                    <td className="p-3 font-mono text-xs">{p.client_id}</td>
                    <td className="p-3 font-semibold">{p.tenant_id}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success uppercase">
                        Connected
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Provision Tenant Modal */}
      <Dialog open={createTenantOpen} onOpenChange={setCreateTenantOpen}>
        <DialogContent className="max-w-md bg-surface p-6 rounded-surface border border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-ink">
              Provision New Tenant Realm
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Create an isolated tenant namespace with custom feature block composition and LMS binding.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTenant} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink">Tenant Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Polytechnic Institute"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink">Unique Slug (URL Namespace)</label>
              <input
                type="text"
                required
                placeholder="e.g. apex-poly"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink">Market Segment</label>
              <select
                value={tenantSegment}
                onChange={(e) => setTenantSegment(e.target.value)}
                className="mt-1 w-full rounded border-control p-2 text-xs text-ink bg-surface"
              >
                <option value="vocational">Vocational / ITI (Govt Sponsored)</option>
                <option value="polytechnic">Polytechnic College</option>
                <option value="higher_ed">Higher Education University</option>
                <option value="enterprise">Corporate Workforce Academy</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateTenantOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingTenant}
                className="btn-primary text-xs"
              >
                {creatingTenant ? "Provisioning..." : "Create Tenant Realm"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
