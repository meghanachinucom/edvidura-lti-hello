export type SkillLink = "linked" | "missing";
export interface Skill { code: string; title: string; link: SkillLink; lessonId?: string }

/** Exactly 4 skills. */
export const skills: Skill[] = [
  { code: "ohms-law", title: "Apply Ohm's law", link: "linked" },
  { code: "circuit-protection", title: "Select circuit protection", link: "linked" },
  { code: "earthing", title: "Explain earthing", link: "missing", lessonId: "3" },
  { code: "safe-isolation", title: "Isolate safely before work", link: "missing" },
];

/** Exactly 2 target roles. */
export const targetRoles = [
  { id: "tr-1", title: "Electrician — domestic wiring", missing: ["earthing", "safe-isolation"], skills: ["ohms-law", "circuit-protection", "earthing", "safe-isolation"] },
  { id: "tr-2", title: "Wireman — installation", missing: ["safe-isolation", "circuit-protection"], skills: ["ohms-law", "circuit-protection", "safe-isolation"] },
];
