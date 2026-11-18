import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  ExternalLink,
  Flame,
  HelpCircle,
  Layers,
  Mic,
  Network,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Sliders,
  Terminal,
} from "lucide-react";
import { t, useLocale } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { VoiceStudioBar } from "@/components/shared/VoiceControls";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/workspace/$featureId")({
  head: () => ({
    meta: [
      { title: "Dynamic Capability Workspace" + t("app.titleSuffix") },
      { name: "description", content: "Auto-generated backend-to-frontend feature screen" },
    ],
  }),
  component: WorkspaceFeaturePage,
});

interface ActionDef {
  id: string;
  label: string;
  route?: string;
  endpoint?: string;
}

interface FeatureDef {
  feature_id: string;
  title: string;
  nav_label: string;
  role: string;
  category: string;
  target_route: string;
  has_dedicated_route: boolean;
  description: string;
  template_type: string;
  icon?: string;
  data_endpoint?: string;
  mutation_endpoint?: string | null;
  kpis?: Array<{ label: string; value: string }>;
  actions?: ActionDef[];
}

export function WorkspaceFeaturePage() {
  const { featureId } = Route.useParams();
  const { locale } = useLocale();

  const [loading, setLoading] = useState(true);
  const [feature, setFeature] = useState<FeatureDef | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [queryInput, setQueryInput] = useState("");
  const [actionOutput, setActionOutput] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadFeature() {
      setLoading(true);
      try {
        const reg = await api.get<{ ok: boolean; features: FeatureDef[] }>("/api/v1/app/ui-registry");
        if (active && reg && Array.isArray(reg.features)) {
          const found = reg.features.find((f) => f.feature_id === featureId);
          if (found) {
            setFeature(found);
            if (found.data_endpoint) {
              try {
                const data = await api.get(found.data_endpoint);
                if (active) setLiveData(data);
              } catch {
                // optional live data
              }
            }
          }
        }
      } catch {
        // Fallback
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFeature();
    return () => {
      active = false;
    };
  }, [featureId]);

  const runAction = async (act: ActionDef) => {
    if (act.route) {
      window.location.href = act.route;
      return;
    }
    if (!act.endpoint) return;
    setExecuting(true);
    setActionOutput(null);
    try {
      const res = await api.post(act.endpoint, {
        query: queryInput || "Diagnostic Test",
        transcript: queryInput || "solve 2x + 5 = 15",
        language: locale,
      });
      setActionOutput(res);
    } catch (err: any) {
      setActionOutput({ error: err.message || "Execution failed" });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-content space-y-4 px-4 py-8">
        <LoadingSkeleton count={6} />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
        <PageHeading text={`Workspace: ${featureId}`} />
        <div className="rounded-card border border-border bg-surface p-8 text-center text-ink-muted">
          <p className="font-semibold text-ink">Capability '{featureId}' Registered</p>
          <p className="text-xs mt-1">This backend capability is active. Explore via navigation or review portal.</p>
          <div className="mt-4">
            <Link to="/review" className="btn-secondary text-xs">
              Return to Review Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link to="/review" className="hover:text-secondary flex items-center gap-1 font-semibold">
          <ArrowLeft size={14} /> Review Portal
        </Link>
        <span>/</span>
        <span>Workspaces</span>
        <span>/</span>
        <span className="font-mono text-secondary">{feature.feature_id}</span>
      </div>

      {/* Screen Heading */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-[11px] font-bold text-secondary">
              {feature.category}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-mono text-ink-muted">
              Role: {feature.role.toUpperCase()}
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 border border-emerald-500/30">
              Auto-Wired UI
            </span>
          </div>
          <PageHeading text={feature.title} />
          <p className="mt-1 text-xs text-ink-muted max-w-2xl">{feature.description}</p>
        </div>

        {feature.has_dedicated_route && (
          <Link
            to={feature.target_route as any}
            className="btn-primary inline-flex items-center gap-2 text-xs font-semibold"
          >
            <span>Open Dedicated View</span>
            <ExternalLink size={14} />
          </Link>
        )}
      </div>

      {/* FreeFlow AI Voice & Multilingual Studio Bar */}
      <VoiceStudioBar
        onTranscript={(text) => setQueryInput((prev) => (prev ? `${prev} ${text}` : text))}
        className="w-full"
      />

      {/* KPI Summary Stat Cards */}
      {feature.kpis && feature.kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {feature.kpis.map((kpi, idx) => (
            <div
              key={idx}
              className="rounded-surface border border-border bg-surface p-4 shadow-2xs flex flex-col justify-between"
            >
              <span className="text-xs font-semibold text-ink-muted">{kpi.label}</span>
              <span className="mt-2 font-heading text-xl font-extrabold text-ink">{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Action & Mutation Studio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sliders size={16} className="text-secondary" />
            <h2 className="font-heading text-sm font-bold text-ink">Capability Actions & Studio</h2>
          </div>

          <div className="space-y-2">
            <label htmlFor="ws-query" className="block text-xs font-semibold text-ink">
              Interactive Test Input / Query:
            </label>
            <textarea
              id="ws-query"
              rows={3}
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Enter a prompt, spoken math expression, or query..."
              className="w-full rounded-control border border-border bg-page-bg p-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div className="space-y-2 pt-2">
            {feature.actions?.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => runAction(act)}
                disabled={executing}
                className="btn-secondary w-full justify-between text-xs font-semibold py-2"
              >
                <span>{act.label}</span>
                {executing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Play size={12} className="text-secondary fill-secondary" />
                )}
              </button>
            ))}
          </div>

          {actionOutput && (
            <div className="rounded-control border border-border bg-page-bg p-3 text-xs space-y-1">
              <span className="font-bold text-ink flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-500" /> Output:
              </span>
              <pre className="font-mono text-[11px] text-ink-muted overflow-x-auto max-h-40">
                {JSON.stringify(actionOutput, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Live Data Inspector / Schema Viewer */}
        <div className="lg:col-span-2 rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-secondary" />
              <h2 className="font-heading text-sm font-bold text-ink">Live Backend Data & Contract</h2>
            </div>
            {feature.data_endpoint && (
              <span className="font-mono text-[11px] text-ink-muted bg-muted px-2 py-0.5 rounded">
                GET {feature.data_endpoint}
              </span>
            )}
          </div>

          {liveData ? (
            <div className="space-y-3">
              <p className="text-xs text-ink-muted">
                Live response received directly from backend endpoint ({feature.data_endpoint}):
              </p>
              <pre className="rounded-control border border-border bg-page-bg p-4 font-mono text-xs text-ink overflow-x-auto max-h-[380px] leading-relaxed">
                {JSON.stringify(liveData, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-border p-8 text-center text-ink-muted text-xs">
              <p className="font-semibold text-ink">Ready for Interaction</p>
              <p className="mt-1">
                Use the Capability Actions panel on the left or voice controls above to test this module.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
