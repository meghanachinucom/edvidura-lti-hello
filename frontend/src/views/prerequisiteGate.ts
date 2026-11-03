/**
 * Locked checkpoint — a single gate card, not a dashboard.
 */
import { setScreen, showToast } from '../state';

export function renderPrerequisiteGate(): string {
  return `
    <div class="hub-page">
      <section class="studio-lock">
        <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1800&q=80" alt="">
        <div class="studio-lock-card flex flex-col items-center gap-4">
          <span class="hub-ico !w-12 !h-12"><span class="material-symbols-outlined text-[24px]">lock</span></span>
          <p class="hub-kicker-ink">Unit 2 sequence check</p>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">One lesson left before Quiz 2</h1>
          <p class="text-sm text-slate-500 max-w-md">Finish Lesson 04: Slope-Intercept Form to unlock the Moodle-graded checkpoint. 20 pts · official score stays in Moodle.</p>
          <button id="gate-continue-btn" class="hub-cta-dark gate-continue" type="button">Continue Lesson 04 <span class="material-symbols-outlined text-[16px]">arrow_forward</span></button>
          <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button id="gate-return-btn" class="hub-cta-light" type="button" style="margin-top:0">Lessons</button>
            <button id="gate-practice-btn" class="hub-cta-light" type="button" style="margin-top:0">Sandbox</button>
            <button id="gate-contact-btn" class="hub-cta-light" type="button" style="margin-top:0">Ask Vidura</button>
          </div>
        </div>
      </section>
    </div>`;
}

export function bindPrerequisiteGateEvents(container: HTMLElement): void {
  const goLesson = () => setScreen('lesson-detail');
  container.querySelector('#gate-return-btn')?.addEventListener('click', () => setScreen('lessons'));
  container.querySelector('#gate-continue-btn')?.addEventListener('click', goLesson);
  container.querySelectorAll('.gate-continue').forEach(btn => btn.addEventListener('click', goLesson));
  container.querySelector('#gate-practice-btn')?.addEventListener('click', () => {
    showToast('Unlocked practice simulation sandbox', 'biotech');
    setScreen('quiz');
  });
  container.querySelector('#gate-contact-btn')?.addEventListener('click', () => setScreen('ask-vidura'));
}
