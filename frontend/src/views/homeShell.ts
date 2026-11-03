/**
 * View 13: Moodle LTI Advantage Integration Shell
 * Styled with radiant coral (#FE580D), deep midnight navy (#111827),
 * student photography, browser chrome simulation, and quick launch pads.
 */
import { setScreen, showToast } from '../state';
import { hubPageHead } from '../components/hub';

export function renderHomeShell(): string {
  return `
    <div class="hub-page">
        
        ${hubPageHead({
          icon: 'link',
          kicker: 'LTI 1.3 Advantage',
          title: 'Moodle launch shell',
          sub: 'Simulates the student and teacher launch envelope from Moodle into this EdVidura course tool.',
          actions: `
            <button id="shell-open-home" class="hub-cta-dark" type="button">
              Enter course <span class="material-symbols-outlined text-[16px]">launch</span>
            </button>`,
        })}
        <section class="hub-hero" style="min-height:220px">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">Authenticated</p>
            <h1>Lakshmi Reddy · Student</h1>
          </div>
        </section>

        <!-- Embedded LTI Environment Card -->
        <div class="card-depth-interactive rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-8 bg-white border border-[#E2E8F0]">
          <div class="flex-1 space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF7ED] text-[#FE580D] text-xs font-bold font-mono border border-[#FED7AA]">
              <span class="w-2 h-2 rounded-full bg-[#FE580D]"></span>
              <span>LTI Advantage 1.3 Certified Core</span>
            </div>

            <h2 class="text-2xl font-bold text-[#0F172A] tracking-tight font-headline">
              Seamless Grade &amp; Attendance Handshake
            </h2>
            <p class="text-sm text-[#64748B] max-w-xl leading-relaxed">
              EdVidura operates directly inside the district learning management system. Quiz results and checkpoint submissions are signed via RSA-SHA256 and sent via LTI Assignment &amp; Grade Services (AGS) v2.0.
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-xs">
              <div>
                <span class="text-xs text-[#64748B] uppercase font-bold font-mono">Federation</span>
                <div class="font-bold text-[#0F172A] text-sm mt-0.5">Moodle 4.3+</div>
              </div>
              <div>
                <span class="text-xs text-[#64748B] uppercase font-bold font-mono">Security Token</span>
                <div class="font-bold text-[#10B981] text-sm mt-0.5">Verified Active</div>
              </div>
              <div class="col-span-2 sm:col-span-1">
                <span class="text-xs text-[#64748B] uppercase font-bold font-mono">User Persona</span>
                <div class="font-bold text-[#FE580D] text-sm mt-0.5">Learner (Ada Chen)</div>
              </div>
            </div>
          </div>

          <!-- Cartesian Geometric Motif Preview -->
          <div class="w-full lg:w-80 card-depth-interactive rounded-2xl p-5 flex flex-col gap-3 bg-white border border-[#CBD5E1] shrink-0">
            <div class="flex items-center justify-between text-[#64748B] text-xs border-b border-[#E2E8F0] pb-2 font-mono">
              <span class="font-bold text-[#0F172A]">Cartesian Studio</span>
              <span class="text-[#FE580D] font-bold">f(x) = 2x + 1</span>
            </div>
            <div class="w-full h-36 flex items-center justify-center hub-studio overflow-hidden p-2">
              <svg class="w-full h-full" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
                <line stroke="#486D82" stroke-width="1" x1="10" x2="190" y1="90" y2="90"></line>
                <line stroke="#486D82" stroke-width="1" x1="40" x2="40" y1="10" y2="110"></line>
                <line stroke="#334155" stroke-dasharray="3 3" stroke-width="0.75" x1="10" x2="190" y1="50" y2="50"></line>
                <line stroke="#334155" stroke-dasharray="3 3" stroke-width="0.75" x1="120" x2="120" y1="10" y2="110"></line>
                <path d="M 20 85 L 120 45 L 180 20" stroke="#FE580D" stroke-linecap="round" stroke-width="3"></path>
                <circle cx="40" cy="77" fill="#FE580D" r="4" stroke="#FFFFFF" stroke-width="2"></circle>
                <circle cx="120" cy="45" fill="#38BDF8" r="4" stroke="#FFFFFF" stroke-width="2"></circle>
              </svg>
            </div>
            <div class="flex items-center justify-between text-xs pt-1 border-t border-[#E2E8F0] font-mono">
              <span class="text-[#64748B]">Active Coursework:</span>
              <span class="font-bold text-[#FE580D]">Lesson 03 Sandbox</span>
            </div>
          </div>
        </div>

        <!-- Quick Switch Pathways -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
          <button class="shell-jump-btn card-depth-interactive rounded-2xl p-5 text-left cursor-pointer bg-white border border-[#E2E8F0] hover:border-[#FE580D]/40" data-screen="lessons">
            <span class="material-symbols-outlined text-[#FE580D] text-[28px]">menu_book</span>
            <div class="text-sm font-bold text-[#0F172A] mt-2 font-headline">Lessons Sequence</div>
            <p class="text-xs text-[#64748B] mt-1 leading-normal">Units 1-4 with 8 modules</p>
          </button>
          
          <button class="shell-jump-btn card-depth-interactive rounded-2xl p-5 text-left cursor-pointer bg-white border border-[#E2E8F0] hover:border-[#F59E0B]/40" data-screen="quiz">
            <span class="material-symbols-outlined text-[#F59E0B] text-[28px]">quiz</span>
            <div class="text-sm font-bold text-[#0F172A] mt-2 font-headline">Checkpoint 2 Quiz</div>
            <p class="text-xs text-[#64748B] mt-1 leading-normal">Graded 6-question assessment</p>
          </button>

          <button class="shell-jump-btn card-depth-interactive rounded-2xl p-5 text-left cursor-pointer bg-white border border-[#E2E8F0] hover:border-[#0284C7]/40" data-screen="lesson-detail">
            <span class="material-symbols-outlined text-[#0284C7] text-[28px]">ssid_chart</span>
            <div class="text-sm font-bold text-[#0F172A] mt-2 font-headline">Cartesian Sandbox</div>
            <p class="text-xs text-[#64748B] mt-1 leading-normal">Interactive coordinate grapher</p>
          </button>

          <button class="shell-jump-btn card-depth-interactive rounded-2xl p-5 text-left cursor-pointer bg-white border border-[#E2E8F0] hover:border-[#10B981]/40" data-screen="my-progress">
            <span class="material-symbols-outlined text-[#10B981] text-[28px]">insights</span>
            <div class="text-sm font-bold text-[#0F172A] mt-2 font-headline">Progress Roadmap</div>
            <p class="text-xs text-[#64748B] mt-1 leading-normal">Curriculum mastery sequence</p>
          </button>
        </div>
    </div>
  `;
}

export function bindHomeShellEvents(container: HTMLElement): void {
  container.querySelector('#shell-refresh-btn')?.addEventListener('click', () => {
    showToast('Reloading Moodle LTI Advantage 1.3 launch frame...', 'sync');
  });

  container.querySelector('#shell-open-home')?.addEventListener('click', () => {
    setScreen('student-home');
  });

  container.querySelectorAll('.shell-jump-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const scr = (e.currentTarget as HTMLElement).getAttribute('data-screen');
      if (scr) setScreen(scr as any);
    });
  });
}
