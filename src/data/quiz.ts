export type OptionKey = "A" | "B" | "C" | "D";
export interface Question { id: string; text: string; options: { key: OptionKey; text: string }[]; correct: OptionKey }
export interface Quiz { id: string; title: string; questions: Question[] }

const q = (id: string, text: string, opts: [string, string, string, string], correct: OptionKey): Question => ({
  id, text, correct,
  options: (["A", "B", "C", "D"] as OptionKey[]).map((key, i) => ({ key, text: opts[i]! })),
});

export const checkpointQuiz: Quiz = {
  id: "qz-checkpoint",
  title: "Checkpoint quiz",
  questions: [
    q("q1", "A 230 V supply is connected to a heater element of 46 Ω. What current flows?", ["0.2 A", "5 A", "10.6 A", "276 A"], "B"),
    q("q2", "What is the main purpose of earthing an appliance's metal body?", ["To save electricity", "To give fault current a safe path so the protective device operates", "To increase voltage", "To reduce cable cost"], "B"),
    q("q3", "Before working on a distribution board, what must you do first?", ["Wear gloves and start", "Switch off, isolate, lock out and prove the circuit dead with a tester", "Ask a colleague to watch the switch", "Work quickly to reduce risk"], "B"),
    q("q4", "Which device mainly protects a circuit against overload and short circuit?", ["RCCB", "MCB", "Voltmeter", "Neutral link"], "B"),
    q("q5", "In Indian domestic wiring, which colour identifies the protective earth conductor?", ["Red", "Black", "Green or green-and-yellow", "Blue"], "C"),
  ],
};

/** Quiz names used only in attempt history. */
export const historyQuizzes = [
  { id: "qz-warmup", title: "Safety warm-up" },
  { id: "qz-earthing", title: "Earthing basics quiz" },
];

export const quizTitle = (id: string) => [checkpointQuiz, ...historyQuizzes].find((x) => x.id === id)?.title ?? "";
