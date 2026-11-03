export type LessonKind = "reading" | "video" | "quiz";
export interface Lesson { id: string; order: number; title: string; kind: LessonKind; markedDone: boolean; courseCode: string }

/** Exactly 5 lessons. */
export const lessons: Lesson[] = [
  { id: "1", order: 1, title: "Electrical safety and PPE", kind: "reading", markedDone: true, courseCode: "ELE-A" },
  { id: "2", order: 2, title: "Ohm's law in practice", kind: "video", markedDone: true, courseCode: "ELE-A" },
  { id: "3", order: 3, title: "Earthing and why it matters", kind: "reading", markedDone: false, courseCode: "ELE-A" },
  { id: "4", order: 4, title: "MCBs, fuses and RCCBs", kind: "video", markedDone: false, courseCode: "ELE-A" },
  { id: "5", order: 5, title: "Checkpoint quiz", kind: "quiz", markedDone: false, courseCode: "ELE-A" },
];

export const lessonById = (id: string) => lessons.find((l) => l.id === id);
