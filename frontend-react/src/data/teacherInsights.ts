/** M4 teacher completion mock data. Counts and rates only — never learner names. */

export interface QuestionFailRate {
  id: string;
  label: string;
  failRate: number; // percent of the class that missed this question
  skillCode: string;
}

/** Quiet Class Radar: five checkpoint questions with class fail rates. */
export const questionFailRates: QuestionFailRate[] = [
  { id: "q1", label: "Fault current path", failRate: 62, skillCode: "earthing" },
  { id: "q2", label: "Continuity test", failRate: 38, skillCode: "earthing" },
  { id: "q3", label: "RCCB operation", failRate: 75, skillCode: "safe-isolation" },
  { id: "q4", label: "Safe isolation", failRate: 25, skillCode: "safe-isolation" },
  { id: "q5", label: "Earth wire colour", failRate: 50, skillCode: "earthing" },
];

export interface SkillGap {
  code: string;
  title: string;
  learners: number; // how many learners lack this skill
}

/** Who lacks what: skill gaps as counts only. */
export const skillGaps: SkillGap[] = [
  { code: "earthing", title: "Explain earthing", learners: 3 },
  { code: "safe-isolation", title: "Isolate safely before work", learners: 2 },
  { code: "ohms-law", title: "Apply Ohm's law", learners: 1 },
];

/** Learners who missed the earthing questions — drives the next-step sentence. */
export const earthingMissCount = 3;
