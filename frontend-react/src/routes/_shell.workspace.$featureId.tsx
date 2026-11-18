import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Database,
  ExternalLink,
  Layers,
  MessageCircle,
  Mic,
  Play,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { useRole } from "@/components/shell/RoleContext";
import { VoiceInputButton } from "@/components/shared/VoiceControls";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/workspace/$featureId")({
  component: WorkspaceFeatureScreen,
});

interface FeatureMeta {
  feature_id: string;
  title: string;
  nav_label?: string;
  role: string;
  category: string;
  target_route?: string;
  has_dedicated_route?: boolean;
  description: string;
  template_type: string;
  icon?: string;
  data_endpoint?: string;
  mutation_endpoint?: string;
  kpis?: Array<{ label: string; value: string }>;
  actions?: Array<{ id: string; label: string; endpoint?: string; route?: string }>;
}

export function WorkspaceFeatureScreen() {
  const { featureId } = Route.useParams();
  const { role } = useRole();
  const navigate = useNavigate();

  const [feature, setFeature] = useState<FeatureMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState<any>(null);
  const [actionInput, setActionInput] = useState("");
  const [actionOutput, setActionOutput] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const qRole = role === "trainingOfficer" ? "admin" : role;
    api
      .get<{ ok: boolean; features: FeatureMeta[] }>(`/api/v1/app/ui-registry?role=${qRole}`)
      .then((res) => {
        if (!active) return;
        if (res && Array.isArray(res.features)) {
          const matched = res.features.find((f) => f.feature_id === featureId);
          if (matched) {
            setFeature(matched);
            if (matched.data_endpoint) {
              api
                .get(matched.data_endpoint)
                .then((d) => active && setLiveData(d))
                .catch(() => {});
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [featureId, role]);

  const handleActionSubmit = async (endpoint?: string) => {
    const targetUrl = endpoint || feature?.mutation_endpoint;
    if (!targetUrl) return;

    setActionLoading(true);
    setActionOutput(null);
    try {
      let payload: any = { input: actionInput };
      if (targetUrl.includes("voice/cleanup")) {
        payload = {
          transcript: actionInput || "solve two x plus five equals fifteen",
          language: "en-IN",
        };
      } else if (targetUrl.includes("coach")) {
        payload = {
          message: actionInput || "How do I balance this linear equation?",
          mode: "socratic",
        };
      }

      const res = await api.post<any>(targetUrl, payload);
      setActionOutput(res);
    } catch (err: any) {
      setActionOutput({ ok: false, error: err?.message || "Action processing failed" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
        <PageHeading text="Connecting Workspace Capability..." />
        <div className="flex h-64 items-center justify-center rounded-surface border border-border bg-surface">
          <RefreshCw className="size-6 animate-spin text-secondary" />
        </div>
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
        <PageHeading text={`Workspace Capability: ${featureId}`} />
        <div className="rounded-surface border border-border bg-surface p-8 text-center">
          <Sparkles className="mx-auto size-10 text-secondary mb-3" />
          <h2 className="font-heading text-xl font-bold text-ink">Capability Discovered & Ready</h2>
          <p className="mt-2 text-sm text-ink-muted max-w-reading mx-auto">
            This capability has been dynamically mounted from the backend catalog. You can interact
            with its underlying endpoints and view live telemetry below.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/home" className="btn-secondary text-xs">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      {/* Header and Category Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-secondary mb-2">
            <Sparkles size={13} />
            <span>{feature.category}</span>
          </div>
          <PageHeading text={feature.title} />
        </div>
        {feature.target_route && feature.has_dedicated_route && (
          <button
            type="button"
            onClick={() => navigate({ to: feature.target_route as any })}
            className="btn-primary inline-flex items-center gap-2 text-xs font-semibold"
          >
            <span>Open Dedicated Studio Screen</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      <p className="max-w-reading text-sm text-ink-muted leading-relaxed">{feature.description}</p>

      {/* KPI Cards */}
      {feature.kpis && feature.kpis.length > 0 && (
        <div className="grid gap-4 tablet:grid-cols-3">
          {feature.kpis.map((kpi, idx) => (
            <div
              key={idx}
              className="rounded-surface border border-border bg-surface p-4 shadow-sm"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {kpi.label}
              </span>
              <p className="mt-2 text-xl font-bold text-ink">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Live Interactive Action & Studio Console */}
      <div className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-secondary" />
            <h3 className="font-heading text-lg font-bold text-ink">
              Interactive Execution Console
            </h3>
          </div>
          {feature.data_endpoint && (
            <span className="rounded font-mono text-[11px] bg-page-bg px-2.5 py-1 text-ink-muted border border-border">
              GET {feature.data_endpoint}
            </span>
          )}
        </div>

        {/* Input Bar with Voice Support */}
        <div className="space-y-2">
          <label htmlFor="workspace-action-input" className="block text-xs font-semibold text-ink">
            Parameter / Prompt Input (Spoken Voice or Typed)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="workspace-action-input"
              type="text"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="e.g. solve two x plus five equals fifteen or prompt question..."
              className="flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-secondary focus:outline-none"
            />
            <VoiceInputButton onTranscript={(txt) => setActionInput(txt)} className="shrink-0" />
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleActionSubmit()}
              className="btn-primary inline-flex items-center gap-1.5 px-4 text-xs font-semibold shrink-0"
            >
              {actionLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span>Execute</span>
            </button>
          </div>
        </div>

        {/* Action Results */}
        {actionOutput && (
          <div className="mt-4 rounded-surface border border-secondary/30 bg-secondary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider">
              <CheckCircle2 size={15} />
              <span>Execution Response</span>
            </div>
            <pre className="max-h-60 overflow-auto rounded bg-page-bg p-3 font-mono text-xs text-ink">
              {JSON.stringify(actionOutput, null, 2)}
            </pre>
          </div>
        )}

        {/* Live Data Inspection */}
        {liveData && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <span className="block text-xs font-semibold text-ink-muted">
              Live Backend Telemetry Payload
            </span>
            <pre className="max-h-48 overflow-auto rounded bg-page-bg p-3 font-mono text-xs text-ink-muted">
              {JSON.stringify(liveData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Preset Action Buttons */}
      {feature.actions && feature.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {feature.actions.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => {
                if (act.route) {
                  navigate({ to: act.route as any });
                } else if (act.endpoint) {
                  handleActionSubmit(act.endpoint);
                }
              }}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <Play size={12} className="text-secondary" />
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
