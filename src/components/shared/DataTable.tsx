import type { ReactNode } from "react";

export interface Column<T> { key: string; header: string; cell: (row: T) => ReactNode }

/** Real <table> from 640px; below that each row becomes a labelled card ("Label: value"). */
export function DataTable<T>({ caption, columns, rows, rowKey, empty }: {
  caption: string; columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) {
    return (<section aria-label={caption}><p className="mb-2 font-medium text-ink">{caption}</p>{empty}</section>);
  }
  return (
    <div>
      <table className="hidden w-full border-collapse bg-surface text-left tablet:table">
        <caption className="mb-2 text-left font-medium text-ink">{caption}</caption>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col" className="border-b-2 border-border-control px-3 py-2 text-sm font-semibold text-ink-muted">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-border">
              {columns.map((c) => <td key={c.key} className="px-3 py-3 align-top text-ink">{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <section aria-label={caption} className="tablet:hidden">
        <p className="mb-2 font-medium text-ink">{caption}</p>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={rowKey(r)} className="rounded-surface border border-border bg-surface p-3">
              <dl className="space-y-1">
                {columns.map((c) => (
                  <div key={c.key} className="flex flex-wrap gap-x-1">
                    <dt className="font-semibold text-ink-muted">{c.header}:</dt>
                    <dd className="min-w-0 text-ink">{c.cell(r)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
