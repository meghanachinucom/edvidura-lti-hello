export type OptionKey = "A" | "B" | "C" | "D";
export interface Question {
  id: string;
  text: string;
  options: { key: OptionKey; text: string }[];
  correct: OptionKey;
  topic?: string;
  difficulty?: "Foundational" | "Core" | "Advanced";
  points?: number;
  hint?: string;
  explanation?: string;
}
export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

const q = (
  id: string,
  text: string,
  opts: [string, string, string, string],
  correct: OptionKey,
  meta?: {
    topic?: string;
    difficulty?: "Foundational" | "Core" | "Advanced";
    points?: number;
    hint?: string;
    explanation?: string;
  },
): Question => {
  const item: Question = {
    id,
    text,
    correct,
    options: (["A", "B", "C", "D"] as OptionKey[]).map((key, i) => ({ key, text: opts[i]! })),
    topic: meta?.topic ?? "Algebra Fundamentals",
    difficulty: meta?.difficulty ?? "Core",
    points: meta?.points ?? 1,
  };
  if (meta?.hint) item.hint = meta.hint;
  if (meta?.explanation) item.explanation = meta.explanation;
  return item;
};

export const checkpointQuiz: Quiz = {
  id: "aa11aa11-aa11-aa11-aa11-aa11aa11aa11",
  title: "Riverside Algebra check",
  questions: [
    q(
      "q1",
      "In algebra, a variable is best described as…",
      [
        "A constant number that never changes",
        "A symbol that represents a quantity that can vary",
        "An arithmetic operator like + or -",
        "The answer to an examination",
      ],
      "B",
      {
        topic: "Variables & Expressions",
        difficulty: "Foundational",
        points: 1,
        hint: "Think about what the root word 'vary' means.",
        explanation:
          "A variable is a letter or symbol that holds the place of an unknown or changing quantity.",
      },
    ),
    q("q2", "In 2x + 3 = 11, what is x?", ["3", "4", "5", "8"], "B", {
      topic: "Linear Equations",
      difficulty: "Core",
      points: 1,
      hint: "Subtract 3 from both sides first, then divide by 2.",
      explanation: "Subtracting 3 gives 2x = 8. Dividing both sides by 2 gives x = 4.",
    }),
    q("q3", "Solve for x: 3x - 5 = 10", ["x = 3", "x = 5", "x = 15", "x = 25"], "B", {
      topic: "Linear Equations",
      difficulty: "Core",
      points: 1,
      hint: "Add 5 to both sides, then divide by 3.",
      explanation: "3x = 15, so x = 15 / 3 = 5.",
    }),
    q(
      "q4",
      "Solve using the distributive property: 2(x - 4) = 12",
      ["x = 6", "x = 8", "x = 10", "x = 14"],
      "C",
      {
        topic: "Distributive Property",
        difficulty: "Core",
        points: 1,
        hint: "Distribute the 2: 2x - 8 = 12, then isolate x.",
        explanation: "2x - 8 = 12 implies 2x = 20, which simplifies to x = 10.",
      },
    ),
    q(
      "q5",
      "A student club charges a $15 flat registration fee plus $2 per workshop attended. If Alice paid $25 in total, how many workshops did she attend?",
      ["3 workshops", "4 workshops", "5 workshops", "10 workshops"],
      "C",
      {
        topic: "Word Problems & Modeling",
        difficulty: "Advanced",
        points: 2,
        hint: "Set up the equation 15 + 2w = 25 and solve for w.",
        explanation: "2w = 25 - 15 = 10, therefore w = 5 workshops.",
      },
    ),
  ],
};

/** Quiz names used only in attempt history. */
export const historyQuizzes = [
  { id: "qz-checkpoint", title: "Riverside Algebra check" },
  { id: "qz-warmup", title: "Safety warm-up" },
  { id: "qz-earthing", title: "Earthing basics quiz" },
];

export const quizTitle = (id: string) =>
  [checkpointQuiz, ...historyQuizzes].find((x) => x.id === id)?.title ?? "Riverside Algebra check";
