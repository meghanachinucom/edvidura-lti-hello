import type { LabPack } from './types';

const KEY = 'edvidura-3d-lab-studio-v1';

export function loadPacks(): LabPack[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LabPack[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePacks(packs: LabPack[]): void {
  localStorage.setItem(KEY, JSON.stringify(packs));
}

export function upsertPack(pack: LabPack): LabPack[] {
  const all = loadPacks();
  const i = all.findIndex((p) => p.id === pack.id);
  if (i >= 0) all[i] = pack;
  else all.unshift(pack);
  savePacks(all);
  return all;
}

export function getPack(id: string): LabPack | undefined {
  return loadPacks().find((p) => p.id === id);
}
