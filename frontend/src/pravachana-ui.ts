import { getLocale } from './i18n';
import type { PravachanaEpisode } from './api';

export function episodeTitle(ep: { title_te?: string; title_en?: string } | null): string {
  if (!ep) return '';
  return getLocale().startsWith('en') ? ep.title_en || ep.title_te || '' : ep.title_te || ep.title_en || '';
}

export function packLabel(pack: string): string {
  if (pack === 'no_bag_day') return 'No Bag Day';
  if (pack === 'library_hour') return 'Library hour';
  return 'Public';
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function progressPct(ep: PravachanaEpisode): number {
  const p = ep.progress;
  if (!p) return 0;
  if (p.completed) return 100;
  const dur = p.duration_sec || ep.duration_sec || 0;
  if (!dur) return 0;
  return Math.min(100, Math.round((100 * p.position_sec) / dur));
}
