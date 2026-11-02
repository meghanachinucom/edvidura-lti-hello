export const lotoSteps = ["supply", "lock", "tag", "test"] as const;

export function updateLotoSteps(current: readonly boolean[], index: number, checked: boolean): boolean[] {
  if (index < 0 || index >= lotoSteps.length || current.slice(0, index).some((value) => !value)) return [...current];
  return Array.from({ length: lotoSteps.length }, (_, i) => i < index ? Boolean(current[i]) : i === index ? checked : checked ? Boolean(current[i]) : false);
}

export const transitionRoles = [
  { id: "electrician", titleKey: "pass2.delta.electrician", held: 2, gap: 2, total: 4, savedPercent: 50 },
  { id: "wireman", titleKey: "pass2.delta.wireman", held: 2, gap: 2, total: 4, savedPercent: 50 },
] as const;