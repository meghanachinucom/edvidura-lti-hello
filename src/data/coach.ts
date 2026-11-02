export interface CoachExchange { id: string; question: string; answer: string; checkYourself: string; sources: string[] }

/** 2 pre-written coach exchanges. Never answers graded quiz questions. */
export const coachExchanges: CoachExchange[] = [
  {
    id: "ce-1",
    question: "Why do we earth the metal body of an iron?",
    answer: "The metal body of an iron can become live if a wire inside comes loose. The earth wire gives that fault current an easy path to the ground. A large current flows, so the MCB or fuse switches off the supply. Then the body cannot give you a shock.",
    checkYourself: "If the earth wire were broken, what could happen when you touch the iron during a fault?",
    sources: ["Earthing and why it matters", "MCBs, fuses and RCCBs"],
  },
  {
    id: "ce-2",
    question: "How do I find current if I know voltage and resistance?",
    answer: "First, try to remember the formula that links voltage, current and resistance. Say it to yourself. Yes — it is V = I × R. To find current, divide the voltage by the resistance.",
    checkYourself: "If the element were 23 Ω instead, would the current go up or down?",
    sources: ["Ohm's law in practice"],
  },
];

export interface CoachInsightTopic { id: string; topic: string; questionsAsked: number; lessonTitle: string }

export const coachInsightTopics: CoachInsightTopic[] = [
  { id: "ci-1", topic: "MCB versus RCCB", questionsAsked: 9, lessonTitle: "MCBs, fuses and RCCBs" },
  { id: "ci-2", topic: "Working out current with Ohm's law", questionsAsked: 7, lessonTitle: "Ohm's law in practice" },
  { id: "ci-3", topic: "Earth wire colours", questionsAsked: 4, lessonTitle: "Earthing and why it matters" },
  { id: "ci-4", topic: "Proving a circuit dead", questionsAsked: 3, lessonTitle: "Electrical safety and PPE" },
];

/** TC-12 paraphrased recent coach turns (no learner names, no verbatim messages). */
export const coachInsights = {
  learnersInFeed: 5,
  refusals: 0,
  turns: [
    { id: "ct-1", topic: "Why an iron's metal body is earthed", lesson: "Earthing and why it matters", sourced: true },
    { id: "ct-2", topic: "Finding current from voltage and resistance", lesson: "Ohm's law in practice", sourced: true },
    { id: "ct-3", topic: "Difference between an MCB and an RCCB", lesson: "MCBs, fuses and RCCBs", sourced: true },
    { id: "ct-4", topic: "What earth wire colour to use", lesson: "Earthing and why it matters", sourced: true },
    { id: "ct-5", topic: "Choosing gloves for live work", lesson: "Electrical safety and PPE", sourced: false },
    { id: "ct-6", topic: "Why a fault current trips the MCB", lesson: "MCBs, fuses and RCCBs", sourced: true },
  ],
};

/** TC-13 starter shortcuts shown in Ask Vidura. */
export const coachShortcuts = [
  { id: "cs-1", label: "Quiz me on MCB ratings", prompt: "Ask me three questions about MCB ratings, one at a time." },
  { id: "cs-2", label: "Explain earthing in simple words", prompt: "Explain earthing in simple words, then ask me one check question." },
  { id: "cs-3", label: "Check my Ohm's law working", prompt: "I will show my Ohm's law working. Point out any mistake without giving the answer." },
];
