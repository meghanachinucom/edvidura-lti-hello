export function PercentageBar({ value, animate = false }: { value: number; animate?: boolean }) {
  return (
    <div aria-hidden="true" className="percentage-track">
      <div className={`percentage-fill ${animate ? "percentage-animate" : ""}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}