/** M2 Ask Vidura panel. Mock answers keyed by words in the question; the class is Algebra I. */

export const askViduraLanguages = [
  "English (India)", "English (US)", "Hindi", "Telugu", "Tamil", "Kannada",
  "Malayalam", "Marathi", "Gujarati", "Bengali", "Punjabi",
] as const;

export interface ViduraCitation { lesson: string; section: string }
export interface ViduraAnswer {
  key: string;
  answer: string; // exactly 2 sentences
  citations: [ViduraCitation, ViduraCitation];
  check: string;
}

export const viduraAnswers: ViduraAnswer[] = [
  {
    key: "equation",
    answer: "An equation says two expressions are equal, like 3x + 2 = 11. To solve it, you do the same operation on both sides until the unknown stands alone.",
    citations: [
      { lesson: "Solving one-step equations", section: "Section 1 · What an equation says" },
      { lesson: "Solving two-step equations", section: "Section 2 · Undoing operations" },
    ],
    check: "Solve: x + 5 = 12. What is x?",
  },
  {
    key: "variable",
    answer: "A variable is a letter that stands in for a number we do not know yet, like x in x + 4 = 9. Once we find the number, the variable has done its job.",
    citations: [
      { lesson: "Variables and expressions", section: "Section 1 · Letters as numbers" },
      { lesson: "Solving one-step equations", section: "Section 1 · What an equation says" },
    ],
    check: "In 7 + y = 15, which letter is the variable?",
  },
  {
    key: "fraction",
    answer: "A fraction names a part of a whole, with the bottom number saying how many equal parts make the whole. To add fractions, first give them the same bottom number.",
    citations: [
      { lesson: "Fractions as parts", section: "Section 1 · Reading a fraction" },
      { lesson: "Adding fractions", section: "Section 2 · Common denominators" },
    ],
    check: "Which is larger: 1/3 or 1/4?",
  },
  {
    key: "quiz",
    answer: "A quiz is a short check of what you have learned in the lessons so far. Try each question yourself first, then compare your working with the lesson examples.",
    citations: [
      { lesson: "Solving one-step equations", section: "Section 3 · Worked examples" },
      { lesson: "Adding fractions", section: "Section 3 · Practice" },
    ],
    check: "Before a quiz, what should you try doing first?",
  },
];

/** Exact reply for questions outside the lessons. */
export const VIDURA_OFF_SCOPE = "I can only answer from the lessons for Algebra I.";

export function pickViduraAnswer(question: string): ViduraAnswer | null {
  const q = question.toLowerCase();
  return viduraAnswers.find((a) => q.includes(a.key)) ?? null;
}
