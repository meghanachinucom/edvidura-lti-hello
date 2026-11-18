import { useEffect, useId, useState } from "react";

export interface ProgressRingProps {
  percent?: number;
  progress?: number;
  label?: string;
  subtext?: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  className?: string;
}

/** Circular progress that fills once, from empty to `percent`, when it mounts. The label sits in the centre. */
export function ProgressRing({
  percent,
  progress,
  label = "",
  subtext,
  sublabel,
  size = 120,
  strokeWidth = 10,
  colorClass,
  className = "",
}: ProgressRingProps) {
  const [filled, setFilled] = useState(false);
  const gradientId = `ring-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const value = Math.max(0, Math.min(100, percent ?? progress ?? 0));
  const r = 50;
  const c = 2 * Math.PI * r;
  const offset = filled ? c * (1 - value / 100) : c;
  const secondaryText = subtext || sublabel;
  const words = label.split(" ");
  const line1 = words.slice(0, 3).join(" ");
  const line2 = secondaryText || (words.length > 3 ? words.slice(3).join(" ") : undefined);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={label || `${value}%`}
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="gradient-accent" />
          <stop offset="100%" className="gradient-secondary" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={colorClass ? "currentColor" : `url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
        className={`progress-ring-stroke ${colorClass || ""}`}
      />
      <text
        x="60"
        y={line2 ? 54 : 61}
        textAnchor="middle"
        className="fill-ink font-heading text-[15px] font-extrabold"
      >
        {line1}
      </text>
      {line2 && (
        <text x="60" y="72" textAnchor="middle" className="fill-ink-muted text-[11px] font-semibold">
          {line2}
        </text>
      )}
    </svg>
  );
}
