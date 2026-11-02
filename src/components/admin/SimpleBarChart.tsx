import { BarChartTable } from "@/components/shared/BarChartTable";

/** Bar chart with a text summary and a visible data table. Kept as a thin wrapper for existing callers. */
export function SimpleBarChart({ title, caption, summary, rows, colLabel, valueLabel }: {
  title: string; caption?: string; summary: string; rows: { label: string; value: number }[]; colLabel: string; valueLabel: string;
}) {
  return <BarChartTable title={title} caption={caption} summary={summary} rows={rows} colLabel={colLabel} valueLabel={valueLabel} />;
}
