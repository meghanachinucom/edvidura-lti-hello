export interface Reel { id: string; title: string; idea: string; lessonId: string }

/** Exactly 4 reels. Videos are placeholders; real ones need captions. */
export const reels: Reel[] = [
  { id: "r-1", title: "Why the earth wire matters", idea: "The earth wire gives fault current a safe path so the MCB or RCCB can trip.", lessonId: "3" },
  { id: "r-2", title: "Reading an MCB rating", idea: "The number on an MCB, such as B16, tells you its trip curve and the current it is rated for.", lessonId: "4" },
  { id: "r-3", title: "Proving dead before you touch", idea: "Test your tester, test the circuit, then test your tester again before touching any conductor.", lessonId: "1" },
  { id: "r-4", title: "Ohm's law in 60 seconds", idea: "If you know any two of voltage, current and resistance, you can work out the third.", lessonId: "2" },
];
