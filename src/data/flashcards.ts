export interface Flashcard { id: string; term: string; definition: string }
export type FlashcardConfidence = "practice" | "mastered";
export function confidenceCounts(choices: Record<string, FlashcardConfidence>) {
  return Object.values(choices).reduce((counts, choice) => ({ ...counts, [choice]: counts[choice] + 1 }), { practice: 0, mastered: 0 });
}

/** Exactly 12 cards. */
export const flashcards: Flashcard[] = [
  { id: "fc-1", term: "Voltage", definition: "The electrical push that drives current around a circuit, measured in volts (V)." },
  { id: "fc-2", term: "Current", definition: "The flow of electric charge through a conductor, measured in amperes (A)." },
  { id: "fc-3", term: "Resistance", definition: "How strongly a material opposes the flow of current, measured in ohms (Ω)." },
  { id: "fc-4", term: "Ohm's law", definition: "Current equals voltage divided by resistance, written I = V ÷ R." },
  { id: "fc-5", term: "Power", definition: "The rate at which electrical energy is used, measured in watts (W) and found by P = V × I." },
  { id: "fc-6", term: "Earthing", definition: "Connecting metal parts to the ground so fault current has a safe path and the protective device trips." },
  { id: "fc-7", term: "MCB", definition: "A miniature circuit breaker that switches off a circuit automatically on overload or short circuit." },
  { id: "fc-8", term: "RCCB", definition: "A residual current circuit breaker that trips when current leaks to earth, protecting people from shock." },
  { id: "fc-9", term: "Fuse", definition: "A thin wire that melts and breaks the circuit when too much current flows." },
  { id: "fc-10", term: "Insulation", definition: "Material such as PVC that does not carry current and keeps live parts from being touched." },
  { id: "fc-11", term: "Continuity test", definition: "A check with a tester that a conductor is unbroken from one end to the other." },
  { id: "fc-12", term: "Lock-out/tag-out", definition: "Locking the isolator off and tagging it so nobody switches a circuit on while you work." },
];
