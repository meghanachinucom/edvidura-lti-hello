export interface ReaderExplanation { id: string; terms: string[]; copyKey: string }
export const readerExplanations: ReaderExplanation[] = [
  { id: "breaker", terms: ["mcb", "breaker"], copyKey: "pass3.explanations.breaker" },
  { id: "earth", terms: ["earth", "earthing"], copyKey: "pass3.explanations.earth" },
  { id: "radial", terms: ["radial"], copyKey: "pass3.explanations.radial" },
  { id: "ring", terms: ["ring circuit"], copyKey: "pass3.explanations.ring" },
  { id: "continuity", terms: ["continuity", "unbroken"], copyKey: "pass3.explanations.continuity" },
  { id: "insulation", terms: ["insulation", "resistance"], copyKey: "pass3.explanations.insulation" },
  { id: "supply", terms: ["service cable", "main switch", "meter", "distribution board"], copyKey: "pass3.explanations.supply" },
];
export function explanationFor(text: string): string | null {
  const selection = text.toLowerCase();
  return readerExplanations.find((topic) => topic.terms.some((term) => new RegExp(`\\b${term}\\b`, "i").test(selection)))?.copyKey ?? null;
}