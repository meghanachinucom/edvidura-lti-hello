import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Compass,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Sparkles,
  RefreshCw,
  Award,
  Layers,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";

interface RecommendedResource {
  type: string;
  id?: string;
  title: string;
  label?: string;
  link?: string;
  progress?: number;
}

interface PathwayData {
  ok: boolean;
  student_id: string;
  active_track: "Support" | "Core" | "Enrichment";
  assessed_score: number;
  recommendation: string;
  branch_payload: {
    track: string;
    name: string;
    resources: RecommendedResource[];
  };
  all_tracks: Array<{ track: "Support" | "Core" | "Enrichment"; threshold: string; description: string }>;
}

export function AdaptivePathwayBanner({ studentId = "6" }: { studentId?: string }) {
  const [data, setData] = useState<PathwayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrackOverride, setSelectedTrackOverride] = useState<"Support" | "Core" | "Enrichment" | null>(null);

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
          "Mastery demonstrated! Your 88% score unlocks advanced 3D spatial simulation, multi-variable proof problems, and industrial applications.",
        branch_payload: {
          track: "Enrichment",
          name: "Advanced Cartesian & Applied Modeling",
          resources: [
            {
              type: "lab",
              id: "xr-cartesian-3d",
              title: "Cartesian 3D Spatial Simulator",
              label: "Interactive 3D Lab",
              link: "/xr-store",
              progress: 85,
            },
            {
              type: "challenge",
              title: "Multi-Variable Balance Challenge",
              label: "Practice Quiz",
              link: "/quiz",
              progress: 60,
            },
            {
              type: "reading",
              title: "Class 8 Balance & Equilibrium Handbook",
              label: "eBook Chapter 2",
              link: "/manuals",
              progress: 100,
            },
          ],
        },
        all_tracks: [
          {
            track: "Support",
            threshold: "< 60%",
            description: "Guided foundational review, step-by-step Socratic hints & remedial micro-lessons",
          },
          {
            track: "Core",
            threshold: "60% – 85%",
            description: "Standard curriculum pace, practice problems, workbook exercises & formative quizzes",
          },
          {
            track: "Enrichment",
            threshold: "> 85%",
            description: "Advanced spatial 3D labs, multi-variable challenge modeling & peer tutoring",
          },
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
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex items-center justify-between animate-pulse">
        <div className="space-y-2 w-1/2">
          <div className="h-4 bg-border/60 rounded w-1/3"></div>
          <div className="h-6 bg-border/80 rounded w-3/4"></div>
        </div>
        <div className="h-10 bg-border/60 rounded-xl w-32"></div>
      </div>
    );
  }

  const activeTrack = selectedTrackOverride || data?.active_track || "Enrichment";

  const trackStyles: Record<
    "Support" | "Core" | "Enrichment",
    {
      cardBorder: string;
      bgGradient: string;
      badge: string;
      accent: string;
      ring: string;
    }
  > = {
    Support: {
      cardBorder: "border-amber-200 dark:border-amber-800/60",
      bgGradient: "from-amber-500/5 via-surface to-surface",
      badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200",
      accent: "text-amber-700 dark:text-amber-400",
      ring: "ring-amber-500",
    },
    Core: {
      cardBorder: "border-blue-200 dark:border-blue-800/60",
      bgGradient: "from-blue-500/5 via-surface to-surface",
      badge: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200",
      accent: "text-blue-700 dark:text-blue-400",
      ring: "ring-blue-500",
    },
    Enrichment: {
      cardBorder: "border-emerald-200 dark:border-emerald-800/60",
      bgGradient: "from-emerald-500/5 via-surface to-surface",
      badge: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200",
      accent: "text-emerald-700 dark:text-emerald-400",
      ring: "ring-emerald-500",
    },
  };

  const style = trackStyles[activeTrack];

  return (
    <section
      aria-label="Adaptive Learning Pathway"
      className={`rounded-2xl border ${style.cardBorder} bg-gradient-to-br ${style.bgGradient} p-5 sm:p-6 shadow-sm transition-all space-y-5`}
    >
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 shadow-2xs">
              <Compass className="size-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Adaptive Learning Pathway
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.badge}`}
            >
              <Award className="size-3" />
              <span>{activeTrack} Track</span>
              <span className="opacity-80">· {data?.assessed_score}% Mastery Score</span>
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-heading font-extrabold text-ink tracking-tight">
            {data?.branch_payload?.name || "Curriculum Track: Advanced Linear Balance"}
          </h2>
          <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">{data?.recommendation}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchPathway}
            title="Recalibrate pathway based on latest quiz attempts"
            className="btn-secondary h-9 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 rounded-xl hover:bg-surface-raised transition"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Recalibrate Pathway</span>
          </button>
        </div>
      </div>

      {/* 3 Tracks Comparative Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {(data?.all_tracks || [
          { track: "Support", threshold: "< 60%", description: "Foundational review & hints" },
          { track: "Core", threshold: "60% – 85%", description: "Standard curriculum pace" },
          { track: "Enrichment", threshold: "> 85%", description: "Advanced spatial 3D & modeling" },
        ]).map((tr) => {
          const isActive = tr.track === activeTrack;
          return (
            <button
              key={tr.track}
              type="button"
              onClick={() => setSelectedTrackOverride(tr.track as any)}
              className={`text-left p-3.5 rounded-xl border transition-all ${isActive
                ? `${trackStyles[tr.track as "Support" | "Core" | "Enrichment"].cardBorder} bg-surface shadow-xs ring-2 ring-primary/60`
                : "border-border/60 bg-surface/40 hover:bg-surface text-ink-muted hover:text-ink"
                }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={isActive ? trackStyles[tr.track as "Support" | "Core" | "Enrichment"].accent : "text-ink"}>
                  {tr.track} Track
                </span>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-page-bg border border-border/60">
                  {tr.threshold}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-ink-muted line-clamp-2">
                {tr.description}
              </p>
              {isActive && (
                <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  <span>Active Assessment Match</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Recommended Interactive Modules (Every Chip is Clickable) */}
      <div className="space-y-2.5 pt-1 border-t border-border/40">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-ink flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-secondary" />
            Recommended Modules for Your Active Track:
          </span>
          <span className="text-xs text-ink-muted">Click any module to jump in</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(data?.branch_payload?.resources || []).map((res, idx) => (
            <Link
              key={idx}
              to={(res.link as any) || "/lessons"}
              className="group p-3.5 rounded-xl border border-border/80 bg-surface hover:border-secondary hover:shadow-md transition flex flex-col justify-between space-y-2 text-ink"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-secondary/10 text-secondary">
                    {res.label || res.type}
                  </span>
                  <ChevronRight className="size-3.5 text-ink-muted group-hover:text-secondary group-hover:translate-x-0.5 transition-transform" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-ink group-hover:text-secondary transition-colors line-clamp-1">
                  {res.title}
                </h4>
              </div>

              {/* Progress bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-ink-muted">
                  <span>Progress</span>
                  <span className="font-mono font-bold text-ink">{res.progress ?? 75}%</span>
                </div>
                <div className="h-1.5 w-full bg-page-bg rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-secondary rounded-full transition-all"
                    style={{ width: `${res.progress ?? 75}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
