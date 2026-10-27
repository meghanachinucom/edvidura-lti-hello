import { getToken } from './api';
import { state, type ScreenId } from './state';

export type NavItem = { id: ScreenId; label: string };

function caps(): Record<string, boolean> {
  const raw = state.liveSession?.capabilities;
  if (raw && typeof raw === 'object') return raw as Record<string, boolean>;
  return {};
}

function capOn(key: string, fallback = true): boolean {
  const c = caps();
  if (!(key in c)) return fallback;
  return Boolean(c[key]);
}

export function navItems(): NavItem[] {
  const staff = state.role === 'teacher' || state.role === 'admin';
  if (staff) {
    const items: NavItem[] = [{ id: 'teacher-results', label: 'Gradebook' }];
    if (capOn('lessons')) items.push({ id: 'lessons', label: 'Lessons' });
    if (capOn('quiz_graded') || capOn('quiz_practice')) {
      items.push({ id: 'quiz', label: 'Quiz' });
    }
    if (capOn('manuals')) items.push({ id: 'manuals', label: 'Manuals' });
    if (capOn('ask_vidura')) items.push({ id: 'ask-vidura', label: 'Ask Vidura' });
    return items;
  }
  const items: NavItem[] = [{ id: 'student-home', label: 'Home' }];
  if (capOn('lessons')) items.push({ id: 'lessons', label: 'Lessons' });
  if (capOn('quiz_graded') || capOn('quiz_practice')) {
    items.push({ id: 'quiz', label: 'Quiz' });
  }
  if (capOn('manuals')) items.push({ id: 'manuals', label: 'Manuals' });
  if (capOn('ask_vidura')) items.push({ id: 'ask-vidura', label: 'Ask Vidura' });
  if (capOn('learner_progress')) items.push({ id: 'my-progress', label: 'Progress' });
  return items;
}

export function homeScreen(): ScreenId {
  return navItems()[0]?.id || 'student-home';
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function lmsReturnUrl(): string {
  const raw = state.liveSession?.lms_return_url;
  return typeof raw === 'string' ? raw.trim() : '';
}

export function lmsReturnHref(): string {
  const fromLaunch = lmsReturnUrl();
  if (fromLaunch) return fromLaunch;
  const token = getToken();
  if (token) return `/return-to-lms?token=${encodeURIComponent(token)}`;
  return 'https://moodle-production-1516.up.railway.app/my/';
}

export function returnToLms(): void {
  const url = lmsReturnHref();
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch {
    /* cross-origin frame */
  }
  window.location.href = url;
}
