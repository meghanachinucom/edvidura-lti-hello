export type ActivityAction =
  | "Marked lesson done"
  | "Submitted quiz"
  | "Bookmarked page"
  | "Added note"
  | "Completed chapter"
  | "Chatted with Vidura"
  | "Watched concept reel"
  | "3D Lab Simulated";

export type ActivityKind = "lessons" | "quizzes" | "ebooks" | "coach" | "all";

export interface ActivityRow {
  id: string;
  personId: string;
  personName?: string;
  action: ActivityAction;
  item: string;
  at: string /* UTC ISO */;
  kind: "lessons" | "quizzes" | "ebooks" | "coach";
  score?: number;
  maxScore?: number;
  durationMins?: number;
  detail?: string;
}

/** Alice Nguyen's authentic Class 8 Algebra learning timeline (LR-13). */
export const learnerActivity: ActivityRow[] = [
  {
    id: "act-1",
    personId: "6",
    personName: "Alice Nguyen",
    action: "Submitted quiz",
    item: "Riverside Algebra Check",
    at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    kind: "quizzes",
    score: 5,
    maxScore: 5,
    detail: "Perfect score (100%). Distributive property and linear isolation verified.",
  },
  {
    id: "act-2",
    personId: "6",
    personName: "Alice Nguyen",
    action: "Chatted with Vidura",
    item: "Ask Vidura Guided Mastery Tutor",
    at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    kind: "coach",
    durationMins: 12,
    detail: "Guided step-by-step resolution on equation 2x + 5 = 15 with hint ladder.",
  },
  {
    id: "act-3",
    personId: "6",
    personName: "Alice Nguyen",
    action: "Completed chapter",
    item: "Algebra I Handbook — Chapter 1: Foundations & Variables",
    at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    kind: "ebooks",
    durationMins: 24,
    detail: "Listened to multi-lingual audio narration and solved 2 inline checks.",
  },
  {
    id: "act-4",
    personId: "6",
    personName: "Alice Nguyen",
    action: "Watched concept reel",
    item: "Concept Reel: Balancing Linear Equations",
    at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    kind: "lessons",
    detail: "Verified balance scale schematic and passed instant concept check.",
  },
  {
    id: "act-5",
    personId: "6",
    personName: "Alice Nguyen",
    action: "Marked lesson done",
    item: "Solving Linear Equations with Inverse Operations",
    at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    kind: "lessons",
    durationMins: 18,
    detail: "Completed video masterclass unit and interactive step checkpoint.",
  },
  {
    id: "act-6",
    personId: "6",
    personName: "Alice Nguyen",
    action: "3D Lab Simulated",
    item: "Walk the Graph in 3D: Cartesian Coordinate Lab",
    at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    kind: "lessons",
    score: 95,
    maxScore: 100,
    detail: "Manipulated slope (m=1.5) and intercept (b=2.0) with certified transfer.",
  },
  {
    id: "act-7",
    personId: "6",
    personName: "Alice Nguyen",
    action: "Submitted quiz",
    item: "Linear Word Problems Practice Check",
    at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    kind: "quizzes",
    score: 4,
    maxScore: 5,
    detail: "Passed (80%). Formulated 15 + 2w = 25 and solved for workshop count.",
  },
  {
    id: "act-8",
    personId: "6",
    personName: "Alice Nguyen",
    action: "Bookmarked page",
    item: "Physical Science: Motion & Energy — Page 14",
    at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    kind: "ebooks",
    detail: "Bookmarked Newton's Third Law Action-Reaction schematic for exam review.",
  },
];

/** Multi-student cohort activity for Teacher Activity Monitor. */
export const classActivity: ActivityRow[] = [
  ...learnerActivity,
  {
    id: "act-c1",
    personId: "p-arjun",
    personName: "Arjun Das",
    action: "Submitted quiz",
    item: "Riverside Algebra Check",
    at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    kind: "quizzes",
    score: 4,
    maxScore: 5,
    detail: "Passed (80%). Clean exam integrity. Moodle grade synced.",
  },
  {
    id: "act-c2",
    personId: "p-lakshmi",
    personName: "Lakshmi Reddy",
    action: "Completed chapter",
    item: "Algebra I Handbook — Chapter 2: Linear Equations",
    at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    kind: "ebooks",
    durationMins: 32,
    detail: "Finished chapter reading and interactive visual simulation beats.",
  },
  {
    id: "act-c3",
    personId: "p-imran",
    personName: "Imran Shaikh",
    action: "Submitted quiz",
    item: "Riverside Algebra Check",
    at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    kind: "quizzes",
    score: 3,
    maxScore: 5,
    detail: "Passed (60%). Minor calculation slip in distributive step.",
  },
  {
    id: "act-c4",
    personId: "p-pooja",
    personName: "Pooja Yadav",
    action: "Marked lesson done",
    item: "Graphing Coordinates & Slope Intercept Form",
    at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    kind: "lessons",
    durationMins: 20,
    detail: "Finished lesson video and submitted practice checkpoints.",
  },
  {
    id: "act-c5",
    personId: "p-sneha",
    personName: "Sneha Patil",
    action: "3D Lab Simulated",
    item: "Walk the Graph in 3D: Cartesian Coordinate Lab",
    at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    kind: "lessons",
    score: 96,
    maxScore: 100,
    detail: "Achieved certified readiness in WebXR slope calculations.",
  },
];
