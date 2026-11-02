export type ActivityAction = "Marked lesson done" | "Submitted quiz" | "Bookmarked page" | "Added note";
export type ActivityKind = "lessons" | "quizzes" | "ebooks";
/** detail: quiz = attempt kind + score; ebook = page or chapter number. */
export type ActivityDetail = { quiz: "graded" | "practice"; score: number } | { page: number } | { chapter: number };
export interface ActivityRow { id: string; personId: string; action: ActivityAction; item: string; at: string /* UTC ISO */; kind?: ActivityKind; detail?: ActivityDetail }

/** Meena's own activity (LR-13). */
export const learnerActivity: ActivityRow[] = [
  { id: "ac-1", personId: "p-meena", action: "Submitted quiz", item: "Checkpoint quiz", at: "2026-10-23T05:12:00Z", kind: "quizzes", detail: { quiz: "practice", score: 2 } },
  { id: "ac-2", personId: "p-meena", action: "Bookmarked page", item: "Domestic Wiring Practice", at: "2026-10-22T12:35:00Z", kind: "ebooks", detail: { page: 14 } },
  { id: "ac-3", personId: "p-meena", action: "Marked lesson done", item: "Ohm's law in practice", at: "2026-10-22T11:50:00Z", kind: "lessons" },
  { id: "ac-4", personId: "p-meena", action: "Added note", item: "Domestic Wiring Practice", at: "2026-10-22T11:42:00Z", kind: "ebooks", detail: { chapter: 2 } },
];

export const classActivity: ActivityRow[] = [
  ...learnerActivity.slice(0, 2),
  { id: "ac-7", personId: "p-imran", action: "Submitted quiz", item: "Checkpoint quiz", at: "2026-10-23T04:40:00Z", kind: "quizzes", detail: { quiz: "graded", score: 3 } },
  { id: "ac-8", personId: "p-lakshmi", action: "Marked lesson done", item: "Earthing and why it matters", at: "2026-10-22T10:05:00Z", kind: "lessons" },
  { id: "ac-9", personId: "p-arjun", action: "Added note", item: "Domestic Wiring Practice", at: "2026-10-22T08:55:00Z", kind: "ebooks", detail: { chapter: 3 } },
  { id: "ac-10", personId: "p-pooja", action: "Bookmarked page", item: "Earthing and Electrical Safety", at: "2026-10-21T11:30:00Z", kind: "ebooks", detail: { page: 6 } },
  { id: "ac-11", personId: "p-bikash", action: "Submitted quiz", item: "Earthing basics quiz", at: "2026-10-22T13:30:00Z", kind: "quizzes", detail: { quiz: "graded", score: 2 } },
];
