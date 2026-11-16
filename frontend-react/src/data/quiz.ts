export type OptionKey = "A" | "B" | "C" | "D";
export interface Question {
  id: string;
  text: string;
  options: { key: OptionKey; text: string }[];
  correct: OptionKey;
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
): Question => ({
  id,
  text,
  correct,
  options: (["A", "B", "C", "D"] as OptionKey[]).map((key, i) => ({ key, text: opts[i]! })),
});

export const checkpointQuiz: Quiz = {
  id: "aa11aa11-aa11-aa11-aa11-aa11aa11aa11",
  title: "Riverside Algebra check",
  questions: [
    q(
      "q1",
      "In algebra, a variable is best described as…",
      ["A constant number that never changes", "A symbol that represents a quantity that can vary", "An arithmetic operator like + or -", "The answer to an examination"],
      "B",
    ),
    q(
      "q2",
      "In 2x + 3 = 11, what is x?",
      ["3", "4", "5", "8"],
      "B",
    ),
    q(
      "q3",
      "Solve for x: 3x - 5 = 10",
      ["x = 3", "x = 5", "x = 15", "x = 25"],
      "B",
    ),
  ],
};

/** Quiz names used only in attempt history. */
export const historyQuizzes = [
  { id: "aa11aa11-aa11-aa11-aa11-aa11aa11aa11", title: "Riverside Algebra check" },
  { id: "qz-checkpoint", title: "Riverside Algebra check" },
  { id: "qz-warmup", title: "Safety warm-up" },
  { id: "qz-earthing", title: "Earthing basics quiz" },
];

export const quizTitle = (id: string) =>
  [checkpointQuiz, ...historyQuizzes].find((x) => x.id === id)?.title ?? "Riverside Algebra check";
