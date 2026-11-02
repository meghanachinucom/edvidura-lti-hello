import { useEffect, useState } from "react";

export function CountUp({ value, suffix = "", decimals, className = "" }: { value: number | string; suffix?: string | undefined; decimals?: number | undefined; className?: string | undefined }) {
  const match = typeof value === "string" ? value.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/) : null;
  const numeric = typeof value === "number" ? value : Number(match?.[2] ?? 0);
  const prefix = match?.[1] ?? "";
  const tail = `${match?.[3] ?? ""}${suffix}`;
  const precision = decimals ?? (String(numeric).split(".")[1]?.length ?? 0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setShown(numeric); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 600, 1);
      setShown(Number((numeric * progress).toFixed(precision)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric, precision]);
  return <span className={`headline-number tabular-nums ${className}`}>{prefix}{shown}{tail}</span>;
}
