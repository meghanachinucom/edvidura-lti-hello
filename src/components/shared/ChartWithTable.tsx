import { BarChartTable } from "./BarChartTable";

export type ChartTableRow = { label: string; value: number };

export function ChartWithTable(props: {
  title: string; caption?: string; summary: string; rows: ChartTableRow[];
  colLabel: string; valueLabel: string; percentage?: boolean; format?: (value: number) => string;
}) {
  return <BarChartTable {...props} />;
}
