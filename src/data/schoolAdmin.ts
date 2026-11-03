import type { ClassCode } from "./people";
import { learners } from "./people";
import { classAttempts, myAttempts } from "./attempts";

/** SA-01 institute figures (one institute only). */
export const instituteFigures = { learnersLaunched: 8, quizAttempts: 10, moodleUsers: 11, moodleBindings: 1, classesLinks: 2 };

/** SA-02 instructors and their access. */
export const instructorAccess = [
  { personId: "p-suresh", code: "INS-01", classes: ["ELE-A", "ELE-B"] as ClassCode[], access: "launched" as const },
  { personId: "p-farhan", code: "INS-02", classes: ["ELE-B"] as ClassCode[], access: "launched" as const },
];

/** SA-03 class bindings. */
export interface ClassBinding { code: string; name: string; moodleCourse: string | null; bound: boolean }
export const classBindings: ClassBinding[] = [
  { code: "ELE-A", name: "Electrician, Batch A", moodleCourse: "Electrician — Domestic Wiring", bound: true },
  { code: "ELE-B", name: "Electrician, Batch B", moodleCourse: null, bound: false },
];


/** SA-04 learner codes; demoRoster true shows the "Demo roster" label. */
export const learnerCodes: Record<string, string> = {
  "p-meena": "SITI-24-001", "p-arjun": "SITI-24-002", "p-lakshmi": "SITI-24-003", "p-imran": "SITI-24-004",
  "p-pooja": "SITI-24-005", "p-joseph": "SITI-24-006", "p-bikash": "SITI-24-007", "p-sneha": "SITI-24-008",
};
export const demoRoster = true;

/** Every attempt in the institute: Meena's full history plus one per other learner. */
export const instituteAttempts = [...myAttempts, ...classAttempts.filter((a) => a.personId !== "p-meena")];
export const classOf = (personId: string) => learners.find((p) => p.id === personId)?.classCode;

/** SA-05 activity figures not derivable from attempts. Lessons done are learners' own marks. */
export const instituteActivity = { everLaunched: 8, activeToday: 3, activeNow: 1, lessonsDoneByClass: { "ELE-A": 11, "ELE-B": 7 } as Record<string, number> };

/** SA-07 detail figures (M5: Riverside High / Algebra I world). */
export const instituteDetail = {
  name: "Riverside High",
  code: "RIV-01",
  course: "Electrician — Domestic Wiring",
  learnersRecorded: 96,
  inMoodle: 88,
  moodleSynced: true,
  schoolAdmins: 1,
  trainingOfficers: ["Gurpreet Kaur"],
};

/** M5 real-time cohort events. Times are text; no grade passback is shown as active or confirmed. */
export interface CohortEvent { id: string; text: string; time: string }
export const cohortEvents: CohortEvent[] = [
  { id: "ev-1", text: "ELE-A roster refreshed from Moodle", time: "10:42 IST" },
  { id: "ev-2", text: "2 learners in ELE-B opened EdVidura", time: "10:15 IST" },
  { id: "ev-3", text: "Quiz attempt recorded for ELE-A", time: "09:58 IST" },
  { id: "ev-4", text: "1 learner in ELE-A marked a lesson done", time: "09:30 IST" },
];
