import type { ClassCode } from "./people";

export const course = { id: "c-ele", title: "Electrician — Domestic Wiring and Electrical Safety" };

export interface ClassGroup { code: ClassCode; title: string }
export const classes: ClassGroup[] = [
  { code: "ELE-A", title: "ELE-A — Electrician, Batch A" },
  { code: "ELE-B", title: "ELE-B — Electrician, Batch B" },
];
