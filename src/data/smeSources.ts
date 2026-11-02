/** TC-15 active source documents for AI drafting. */
export type SourceType = "manual" | "lesson";
export interface SourceDoc { id: string; title: string; type: SourceType }
export const smeSources: SourceDoc[] = [
  { id: "src-1", title: "Domestic Wiring Practice — v2", type: "manual" },
  { id: "src-2", title: "Earthing and why it matters", type: "lesson" },
];
/** What "Bootstrap" loads: published manuals and lessons. */
export const smeDefaults: SourceDoc[] = [
  ...smeSources,
  { id: "src-3", title: "Earthing and Electrical Safety — v1", type: "manual" },
  { id: "src-4", title: "Ohm's law in practice", type: "lesson" },
];
