/**
 * Pointer-tracked 3D tilt + spotlight for photo cards.
 * Bound once on #view-root; skipped for touch / reduced motion.
 */
const TILT_SEL = '.lms-shot, .hub-lesson, .hub-card';

function resetTilt(el: HTMLElement): void {
  el.classList.remove('is-tilt');
  el.style.removeProperty('--rx');
  el.style.removeProperty('--ry');
  el.style.removeProperty('--lift');
  el.style.removeProperty('--zoom');
  el.style.removeProperty('--shine-x');
  el.style.removeProperty('--shine-y');
}

export function bindMotion(root: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  let active: HTMLElement | null = null;

  root.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest?.(TILT_SEL) as HTMLElement | null;
      if (active && active !== card) {
        resetTilt(active);
      }
      if (!card) {
        active = null;
        return;
      }
      active = card;
      const r = card.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--rx', `${((0.5 - y) * 9).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`);
      card.style.setProperty('--lift', '-12px');
      card.style.setProperty('--zoom', '1.03');
      card.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`);
      card.classList.add('is-tilt');
    },
    { passive: true }
  );

  root.addEventListener('pointerleave', () => {
    if (active) resetTilt(active);
    active = null;
  });
}
