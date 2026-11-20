import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, Eye } from "lucide-react";
import { api } from "@/lib/api";

export function ExamIntegrityMonitor({ sessionId = "sess-alice-slice-a" }: { sessionId?: string }) {
  const [incidentsCount, setIncidentsCount] = useState<number>(0);
  const [lastWarning, setLastWarning] = useState<string | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIncidentsCount((c) => c + 1);
        setLastWarning("Focus lost (tab switch recorded)");
        void api
          .post("/api/v1/proctoring/incident", {
            session_id: sessionId,
            user_id: "6",
            incident_type: "tab_switch",
            details: "Window lost focus / browser tab switch detected.",
          })
          .catch(() => {});
      }
    };

    const handleWindowBlur = () => {
      setIncidentsCount((c) => c + 1);
      setLastWarning("Window blur recorded");
      void api
        .post("/api/v1/proctoring/incident", {
          session_id: sessionId,
          user_id: "6",
          incident_type: "window_blur",
          details: "Focus moved away from quiz viewport.",
        })
        .catch(() => {});
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [sessionId]);

  return (
    <div
      aria-label="Exam Integrity Monitor"
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/5 text-xs font-bold text-secondary shadow-2xs"
    >
      <ShieldCheck className="size-3.5 text-secondary" />
      <span>Exam Integrity Sentinel Active · BF-15</span>
      {incidentsCount > 0 ? (
        <span className="flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
          <ShieldAlert className="size-3" />
          <span>{incidentsCount} focus events</span>
        </span>
      ) : (
        <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
          Clean Session (100%)
        </span>
      )}
    </div>
  );
}
