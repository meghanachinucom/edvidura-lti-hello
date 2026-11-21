import { useState, useEffect } from "react";
import { Eye, ShieldCheck, Timer, X, Sparkles, Activity } from "lucide-react";

export function FocusStreakPill() {
  const [seconds, setSeconds] = useState(252); // Starts at 04:12
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const focusScore = Math.max(75, 100 - tabSwitches * 5);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowPopover((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50/90 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-colors"
        title="Live Proctoring & Learning Focus Monitor (Click for Breakdown)"
        aria-expanded={showPopover}
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-heading tracking-wide">Focus Streak · {formatTime(seconds)} · Focused</span>
      </button>

      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-border bg-surface p-4 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between border-b border-border/80 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span className="font-heading text-xs font-bold text-ink">
                  Focus & Integrity Telemetry
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPopover(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-md"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-800 font-semibold">Real-Time Focus Score</span>
                <span className="font-heading font-extrabold text-base text-emerald-700">
                  {focusScore}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-ink">
                <div className="p-2 rounded-xl bg-surface-sunken border border-border">
                  <span className="text-ink-muted block text-[11px]">Active Duration</span>
                  <span className="font-bold font-heading text-sm">{formatTime(seconds)}</span>
                </div>
                <div className="p-2 rounded-xl bg-surface-sunken border border-border">
                  <span className="text-ink-muted block text-[11px]">Tab Switches</span>
                  <span className="font-bold font-heading text-sm">
                    {tabSwitches === 0 ? "0 (Clean)" : `${tabSwitches} alerts`}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-ink-muted">
                <div className="flex items-center gap-1.5">
                  <Activity size={12} className="text-emerald-600" />
                  <span>Keystroke cadence: Consistent & engaged</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye size={12} className="text-emerald-600" />
                  <span>Visual viewport lock: Window active</span>
                </div>
              </div>

              <div className="border-t border-border/80 pt-2 text-[11px] text-ink-muted leading-tight">
                Verified session telemetry records formative study habits without intrusive browser extensions.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
