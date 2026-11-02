import { useEffect, useId, useState } from "react";

/** Circular progress that fills once, from empty to `percent`, when it mounts. The label sits in the centre. */
export function ProgressRing({ percent, label }: { percent: number; label: string }) {
  const [filled, setFilled] = useState(false);
  const gradientId = `ring-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = filled ? c * (1 - percent / 100) : c;
  const words = label.split(" ");
  const line1 = words.slice(0, 3).join(" ");
  const line2 = words.slice(3).join(" ");
  return (
    <svg width="140" height="140" viewBox="0 0 120 120" role="img" aria-label={label} className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="gradient-accent" />
          <stop offset="100%" className="gradient-secondary" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke={`url(#${gradientId})`} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 60 60)"
        className="progress-ring-stroke"
      />
      <text x="60" y="58" textAnchor="middle" className="fill-ink font-heading text-[16px] font-extrabold">{line1}</text>
      {line2 && <text x="60" y="74" textAnchor="middle" className="fill-ink-muted text-[10px]">{line2}</text>}
    </svg>
  );
}
