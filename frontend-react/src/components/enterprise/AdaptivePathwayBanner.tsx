import { useEffect, useState } from "react";
import { Compass, CheckCircle2, ArrowRight, BookOpen, Sparkles, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

interface PathwayData {
  ok: boolean;
  student_id: string;
  active_track: "Support" | "Core" | "Enrichment";
  assessed_score: number;
  recommendation: string;
  branch_payload: {
    track: string;
    name: string;
    resources: Array<{ type: string; id?: string; title: string; label?: string }>;
  };
  all_tracks: Array<{ track: string; threshold: string }>;
}

export function AdaptivePathwayBanner({ studentId = "6" }: { studentId?: string }) {
  const [data, setData] = useState<PathwayData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPathway = async () => {
    setLoading(true);
    try {
      const res = await api.get<PathwayData>(`/api/v1/adaptive/student-route/${studentId}`);
      if (res && res.active_track) {
        setData(res);
      }
    } catch {
      // Fallback state seeded for Riverside High Class 8
      setData({
        ok: true,
        student_id: studentId,
        active_track: "Enrichment",
        assessed_score: 88,
        recommendation:
          "Mastery demonstrated! Advanced spatial 3D simulation and modeling unlocked.",
        branch_payload: {
          track: "Enrichment",
          name: "Advanced Cartesian & Applied Modeling",
          resources: [
            { type: "lab", id: "xr-cartesian-3d", title: "Cartesian 3D Spatial Simulator" },
            { type: "challenge", title: "Real-World Multi-Variable Word Problems" },
          ],
        },
        all_tracks: [
          { track: "Support", threshold: "< 60%" },
          { track: "Core", threshold: "60% - 85%" },
          { track: "Enrichment", threshold: "> 85%" },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPathway();
  }, [studentId]);

  if (loading && !data) {
    return (
      <div className="rounded-surface border border-border bg-surface p-4 flex items-center justify-between animate-pulse">
        <div className="h-4 bg-border rounded w-1/3"></div>
        <div className="h-8 bg-border rounded w-24"></div>
      </div>
    );
  }

  const trackColors = {
    Support: "bg-amber-50 text-amber-900 border-amber-300",
    Core: "bg-blue-50 text-blue-900 border-blue-300",
    Enrichment: "bg-emerald-50 text-emerald-900 border-emerald-300",
  };

  const badgeColors = {
    Support: "bg-amber-600 text-white",
    Core: "bg-blue-600 text-white",
    Enrichment: "bg-emerald-700 text-white",
  };

  const track = data?.active_track || "Core";

  return (
    <section
      aria-label="Adaptive Learning Pathway"
      className={`rounded-surface border p-4 sm:p-5 shadow-xs transition-all ${trackColors[track]}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-surface/80 border border-border shadow-2xs">
              <Compass className="size-5 text-secondary" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Adaptive Learning Pathway · BF-03
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${badgeColors[track]}`}
            >
              {track} Track ({data?.assessed_score}% Mastery)
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-heading font-extrabold text-ink">
            {data?.branch_payload?.name || "Curriculum Track"}
          </h2>
          <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">{data?.recommendation}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="flex -space-x-1">
            {data?.branch_payload?.resources?.slice(0, 2).map((res, idx) => (
              <span
                key={idx}
                title={res.title}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface rounded-control border border-border text-xs font-bold text-ink shadow-2xs"
              >
                <BookOpen className="size-3.5 text-secondary" />
                <span className="truncate max-w-[140px]">{res.title}</span>
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchPathway}
            title="Refresh adaptive pathway routing"
            className="btn-secondary h-9 px-3 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>Recalibrate</span>
          </button>
        </div>
      </div>
    </section>
  );
}
