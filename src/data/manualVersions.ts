/** TC-05 editions per eBook (ids match ebooks.ts). Dates are UTC ISO. */
export interface ManualVersion { n: number; date: string; note: string }
export interface ManualRecord { ebookId: string; status: "draft" | "published"; versions: ManualVersion[] }

export const manualRecords: ManualRecord[] = [
  { ebookId: "eb-wiring", status: "published", versions: [
    { n: 1, date: "2026-06-02T05:30:00Z", note: "First edition." },
    { n: 2, date: "2026-09-14T06:00:00Z", note: "Added the ring and radial circuits chapter." },
  ] },
  { ebookId: "eb-earthing", status: "published", versions: [{ n: 1, date: "2026-07-20T05:30:00Z", note: "First edition." }] },
  { ebookId: "eb-instruments", status: "draft", versions: [{ n: 1, date: "2026-10-18T09:00:00Z", note: "First draft." }] },
];
