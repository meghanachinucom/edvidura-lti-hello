import { useId } from "react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PercentageBar } from "./PercentageBar";
import { useFirstView } from "./useFirstView";
import { t } from "@/i18n";

type Row = { label: string; value: number };

/** Bar shape that is keyboard-focusable and reveals its value on hover and focus. */
/** Pass B chart order: accent, secondary, tertiary, metric. */
const SERIES = ["var(--accent)", "var(--secondary)", "var(--tertiary)", "var(--metric)"];

function FocusableBar(props: {
  x?: number; y?: number; width?: number; height?: number; value?: number | string;
  payload?: Row; format: (v: number) => string; gradientId: string; index?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, value, payload, format, gradientId, index = 0 } = props;
  const series = SERIES[index % SERIES.length];
  const v = typeof value === "number" ? value : Number(value ?? 0);
  return (
    <g tabIndex={0} role="img" aria-label={`${payload?.label ?? ""}: ${format(v)}`} className="chart-bar">
      <rect x={x} y={y} width={width} height={height} rx={6} fill={series} className="chart-bar-fill" />
      <rect x={x} y={y} width={width} height={height} rx={6} fill={`url(#${gradientId}-bright)`} className="chart-bar-bright" />
      <text x={x + width / 2} y={y - 6} textAnchor="middle" className="chart-bar-value fill-ink text-[12px] font-semibold">
        {format(v)}
      </text>
    </g>
  );
}

/** Recharts bar chart with a visible data table beside it. Draws once when first scrolled into view. */
export function BarChartTable({ title, caption, summary, rows, colLabel, valueLabel, percentage = false, format = (v) => String(v) }: {
  title: string; caption?: string | undefined; summary: string; rows: Row[]; colLabel: string; valueLabel: string;
  format?: ((v: number) => string) | undefined; percentage?: boolean;
}) {
  const { ref, seen, reduced } = useFirstView();
  const gradientId = `chart-${useId().replace(/:/g, "")}`;

  return (
    <section aria-label={title} className="space-y-3 rounded-surface border border-border bg-surface p-4">
      <h2 className="font-heading text-[22px] text-ink">{title}</h2>
      {caption && <p className="text-ink-muted">{caption}</p>}
      <p className="text-ink">{summary}</p>
      <div className="grid items-start gap-4 desktop:grid-cols-2">
        <div ref={ref} className="h-60 w-full" role="group" aria-label={title}>
          {seen && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" className="gradient-accent" />
                    <stop offset="100%" className="gradient-secondary" />
                  </linearGradient>
                  <linearGradient id={`${gradientId}-bright`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" className="gradient-accent-bright" />
                    <stop offset="100%" className="gradient-secondary-bright" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={format} domain={percentage ? [0, 100] : [0, "auto"]} />
                {percentage && <ReferenceLine y={60} stroke="var(--secondary)" strokeDasharray="5 4"
                  label={{ value: t("pass2.passMark"), position: "insideTopRight", fill: "var(--secondary)", fontSize: 12 }} />}
                <Tooltip formatter={(v) => [format(Number(v)), valueLabel]} cursor={{ fill: "var(--highlight)" }} />
                <Bar dataKey="value" isAnimationActive={!reduced} animationDuration={400}
                  shape={(p: object) => <FocusableBar {...(p as object)} format={format} gradientId={gradientId} />} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <table className="w-full border-collapse text-sm text-ink">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="py-2 pr-2 font-semibold">{colLabel}</th>
              <th scope="col" className="py-2 font-semibold">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td className="py-2 pr-2">{r.label}</td>
                <td className="py-2"><span className="tabular-nums">{format(r.value)}</span>
                  {percentage && <div className="mt-1 w-24 max-w-full">{seen && <PercentageBar value={r.value} animate={!reduced} />}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
