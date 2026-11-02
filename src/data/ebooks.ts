export type CoverTone = "accent" | "ink" | "focus";
export type EbookCategory = "vocational" | "life" | "physical" | "maths";
export interface Ebook { id: string; title: string; description: string; pages: number; currentPage: number | null; cover: CoverTone; category: EbookCategory }

/** Exactly 3 eBooks. currentPage null = not started. */
export const ebooks: Ebook[] = [
  { id: "eb-wiring", title: "Domestic Wiring Practice", description: "Circuits, cables and earthing for homes.", pages: 62, currentPage: 14, cover: "accent", category: "vocational" },
  { id: "eb-earthing", title: "Earthing and Electrical Safety", description: "Earth paths, protective devices and safe work.", pages: 48, currentPage: null, cover: "ink", category: "vocational" },
  { id: "eb-instruments", title: "Measuring Instruments", description: "Using testers, multimeters and insulation testers.", pages: 40, currentPage: null, cover: "focus", category: "physical" },
];

export const ebookById = (id: string) => ebooks.find((e) => e.id === id);
