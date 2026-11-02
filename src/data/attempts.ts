export type AttemptKind = "graded" | "practice";
export type MoodleStatus = "sent" | "waiting" | "unavailable" | "error" | "practice";

export interface Attempt {
  id: string;
  personId: string;
  quizId: string;
  kind: AttemptKind;
  score: number;
  outOf: 5;
  moodleStatus: MoodleStatus;
  submittedAt: string; // UTC ISO
}

/** Meena's 3 attempts. */
export const myAttempts: Attempt[] = [
  { id: "at-m1", personId: "p-meena", quizId: "qz-warmup", kind: "graded", score: 4, outOf: 5, moodleStatus: "sent", submittedAt: "2026-10-19T05:30:00Z" },
  { id: "at-m2", personId: "p-meena", quizId: "qz-earthing", kind: "graded", score: 3, outOf: 5, moodleStatus: "unavailable", submittedAt: "2026-10-21T10:35:00Z" },
  { id: "at-m3", personId: "p-meena", quizId: "qz-checkpoint", kind: "practice", score: 2, outOf: 5, moodleStatus: "practice", submittedAt: "2026-10-23T05:12:00Z" },
];

/** Class attempts for instructor screens: one row per learner (8 rows). */
export const classAttempts: Attempt[] = [
  { id: "at-c1", personId: "p-meena", quizId: "qz-checkpoint", kind: "practice", score: 2, outOf: 5, moodleStatus: "practice", submittedAt: "2026-10-23T05:12:00Z" },
  { id: "at-c2", personId: "p-arjun", quizId: "qz-checkpoint", kind: "graded", score: 4, outOf: 5, moodleStatus: "sent", submittedAt: "2026-10-22T09:05:00Z" },
  { id: "at-c3", personId: "p-lakshmi", quizId: "qz-checkpoint", kind: "graded", score: 5, outOf: 5, moodleStatus: "sent", submittedAt: "2026-10-22T09:20:00Z" },
  { id: "at-c4", personId: "p-imran", quizId: "qz-checkpoint", kind: "graded", score: 3, outOf: 5, moodleStatus: "waiting", submittedAt: "2026-10-23T04:40:00Z" },
  { id: "at-c5", personId: "p-pooja", quizId: "qz-earthing", kind: "graded", score: 4, outOf: 5, moodleStatus: "unavailable", submittedAt: "2026-10-21T11:10:00Z" },
  { id: "at-c6", personId: "p-joseph", quizId: "qz-earthing", kind: "practice", score: 3, outOf: 5, moodleStatus: "practice", submittedAt: "2026-10-22T12:45:00Z" },
  { id: "at-c7", personId: "p-bikash", quizId: "qz-earthing", kind: "graded", score: 2, outOf: 5, moodleStatus: "error", submittedAt: "2026-10-22T13:30:00Z" },
  { id: "at-c8", personId: "p-sneha", quizId: "qz-warmup", kind: "practice", score: 5, outOf: 5, moodleStatus: "practice", submittedAt: "2026-10-20T08:15:00Z" },
];
