import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";

interface IncidentLog {
  timestamp: string;
  type: string;
  detail: string;
}

export function ExamIntegrityMonitor({ sessionId = "sess-alice-slice-a" }: { sessionId?: string }) {
  const [incidentsCount, setIncidentsCount] = useState<number>(0);
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [showLog, setShowLog] = useState<boolean>(false);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real browser focus & visibility listener
  useEffect(() => {
    const logIncident = (type: string, detail: string) => {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setIncidentsCount((c) => c + 1);
      setIncidents((prev) => [{ timestamp: now, type, detail }, ...prev.slice(0, 9)]);

      void api
        .post("/api/v1/proctoring/incident", {
          session_id: sessionId,
          user_id: "6",
          incident_type: type,
          details: detail,
        })
        .catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logIncident("tab_switch", "Browser tab hidden / learner navigated away from assessment");
      }
    };

    const handleWindowBlur = () => {
      logIncident("window_blur", "Application window lost focus");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [sessionId]);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      aria-label="Exam Focus and Integrity Status Strip"
      className="rounded-xl border border-secondary/20 bg-secondary/5 p-3 text-xs shadow-2xs space-y-2 pointer-events-auto select-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {incidentsCount > 0 ? (
            <span className="p-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <ShieldAlert className="size-4" />
            </span>
          ) : (
            <span className="p-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="size-4" />
            </span>
          )}

          <div className="flex items-center gap-2 font-bold text-ink">
            <span>Focus & Integrity Monitor Active</span>
            <span className="text-border">·</span>
            <span className="font-mono text-secondary inline-flex items-center gap-1">
              <Clock className="size-3" />
              <span>Session: {formatTimer(secondsElapsed)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {incidentsCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-100 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 px-2 py-0.5 rounded-full font-bold text-xs">
              <AlertTriangle className="size-3" />
              <span>{incidentsCount} Tab Switches</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-full font-semibold text-xs">
              <span>100% Unbroken Focus</span>
            </span>
          )}

          {incidents.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLog(!showLog)}
              className="text-xs font-bold text-secondary hover:underline inline-flex items-center gap-0.5"
            >
              <span>{showLog ? "Hide Log" : "View Log"}</span>
              {showLog ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          )}
        </div>
      </div>

      {showLog && incidents.length > 0 && (
        <div className="pt-2 border-t border-border/60 space-y-1">
          <p className="text-xs uppercase font-bold text-ink-muted">Recorded Focus Telemetry:</p>
          <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-xs">
            {incidents.map((inc, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-slate-600 dark:text-ink-muted bg-surface px-2 py-1 rounded border border-border/40"
              >
                <span>⚠ {inc.detail}</span>
                <span className="text-ink-muted ml-2 shrink-0">{inc.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
