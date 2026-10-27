/**
 * Floating Screen Explorer Palette
 * Allows instant navigation between all screens and role testing.
 * Executive Presentation Remote Control: 3D floating widget,
 * glassmorphic panel, and ESC key support.
 */
import { state, setScreen, setRole, ScreenId, UserRole } from '../state';

interface ScreenDef {
  id: ScreenId;
  label: string;
  badge: string;
  role: UserRole;
  desc: string;
}

const screensList: ScreenDef[] = [
  { id: 'student-home', label: '00. EdVidura Academic Home', badge: 'Student', role: 'student', desc: 'Flagship STEM portal: interactive labs, metrics ribbon, courses & pedagogy' },
  { id: 'lessons', label: '01. Lessons Sequence', badge: 'Student', role: 'student', desc: 'Curriculum units, module checklist, progress tags' },
  { id: 'lesson-detail', label: '02. Lesson 03 Detail', badge: 'Student', role: 'student', desc: 'Linear equations, interactive Cartesian sandbox' },
  { id: 'quiz', label: '03. Checkpoint Quiz', badge: 'Student', role: 'student', desc: '6 questions, radio choices, live answer counter' },
  { id: 'quiz-results', label: '04. Graded Results', badge: 'Student', role: 'student', desc: 'Score breakdown, radial dial, derivation review' },
  { id: 'prerequisite-gate', label: '05. Prerequisite Gate', badge: 'Student', role: 'student', desc: 'Locked checkpoint modal, practice requirement' },
  { id: 'manuals', label: '06. Manuals Shelf', badge: 'Student', role: 'student', desc: 'Handbooks, formula sheets, calculator guides' },
  { id: 'manual-reader', label: '07. Manual Reader', badge: 'Student', role: 'student', desc: 'Zoom controls, chapter index, margin notes' },
  { id: 'ask-vidura', label: '08. Ask Vidura AI', badge: 'Student', role: 'student', desc: 'Socratic math solver, syllabus guard verification' },
  { id: 'my-progress', label: '09. My Progress', badge: 'Student', role: 'student', desc: 'Competency mastery bars, badges, attempt history' },
  { id: 'teacher-results', label: '10. Teacher Results', badge: 'Teacher', role: 'teacher', desc: 'Roster gradebook, Moodle sync, status filters' },
  { id: 'teacher-diagnostics', label: '11. Class Analytics', badge: 'Teacher', role: 'teacher', desc: 'Topic miss rate, student intervention lane' },
  { id: 'admin-overview', label: '12. Admin Overview', badge: 'Admin', role: 'admin', desc: 'LTI 1.3 Tenant, security key sets, audit logs' },
  { id: 'home-shell', label: '13. Moodle LTI Shell', badge: 'LTI Shell', role: 'student', desc: 'LTI advantage launch container context' },
  { id: 'xr-store', label: '14. XR Store & 3D Labs', badge: 'Student', role: 'student', desc: 'WebXR simulations, hardware compatibility, 3D math & physics labs' }
];

export function renderScreenExplorer(): string {
  const isOpen = state.screenPickerOpen;

  return `
    <div id="screen-explorer-root-container" class="fixed bottom-20 right-3 sm:bottom-22 sm:right-5 z-50 flex flex-col items-end transition-all duration-300">
      <!-- Screen Palette Popover (3D Glassmorphic Surface) -->
      <div id="screen-explorer-panel" class="${isOpen ? 'flex' : 'hidden'} flex-col w-[360px] max-w-[calc(100vw-1.5rem)] max-h-[60vh] sm:max-h-[460px] glass-panel rounded-2xl shadow-[0_20px_50px_rgba(18,30,36,0.3)] overflow-hidden mb-2.5 sm:mb-3.5 animate-fade-rise border border-white/80">
        <!-- Panel Header -->
        <div class="px-4 py-3 bg-gradient-to-r from-panel via-white to-panel border-b border-line/70 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]"></span>
            <span class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Executive Screen Remote</span>
          </div>
          <button id="close-screen-explorer-btn" class="w-7 h-7 rounded-lg hover:bg-panel flex items-center justify-center text-outline hover:text-ink transition-colors cursor-pointer" title="Close screen remote">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Role Filter Header -->
        <div class="px-4 py-2 border-b border-line/60 bg-white/60 flex items-center justify-between text-xs text-outline font-mono">
          <span>Jump to any screen:</span>
          <span class="text-lagoon font-bold">${screensList.length} total screens</span>
        </div>

        <!-- Screens List (scrollable) -->
        <div class="overflow-y-auto p-2.5 flex flex-col gap-1.5 flex-1 divide-y divide-line/40">
          ${screensList
            .map(s => {
              const isActive = state.screen === s.id;
              const badgeClass =
                s.badge === 'Teacher'
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : s.badge === 'Admin'
                  ? 'text-purple-800 bg-purple-50 border-purple-200'
                  : s.badge === 'LTI Shell'
                  ? 'text-blue-800 bg-blue-50 border-blue-200'
                  : 'text-lagoon bg-lagoon-soft border-lagoon/20';

              return `
                <button
                  class="screen-jump-btn text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-lagoon-soft to-lagoon-soft/40 border-lagoon shadow-sm'
                      : 'border-transparent hover:bg-white hover:border-line hover:shadow-xs'
                  }"
                  data-screen="${s.id}"
                  data-role="${s.role}"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-bold ${isActive ? 'text-lagoon' : 'text-ink'}">${s.label}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider border ${badgeClass}">${s.badge}</span>
                  </div>
                  <p class="text-outline text-[11px] line-clamp-1">${s.desc}</p>
                </button>
              `;
            })
            .join('')}
        </div>
      </div>

      <!-- Tactile Floating Toggle Button (Offset safely above sticky bottom action bars) -->
      <button
        id="toggle-screen-explorer-btn"
        class="h-10 sm:h-11 px-3 sm:px-4 rounded-2xl bg-gradient-to-br from-[#121E24] via-[#1A2D37] to-[#121E24] text-paper shadow-[0_6px_20px_rgba(18,30,36,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_8px_25px_rgba(14,124,102,0.4)] border border-white/20 flex items-center gap-1.5 sm:gap-2.5 text-xs font-bold font-mono tabular-nums transition-all active:scale-95 cursor-pointer hover:border-lagoon/50"
        title="Explore all 15 screens"
      >
        <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-ping"></span>
        <span class="material-symbols-outlined text-[17px] sm:text-[18px] text-emerald-300">${isOpen ? 'close' : 'view_carousel'}</span>
        <span class="hidden sm:inline">Screens</span>
        <span>(${screensList.findIndex(s => s.id === state.screen) + 1}/${screensList.length})</span>
      </button>
    </div>
  `;
}

export function bindScreenExplorerEvents(container: HTMLElement): void {
  const toggleBtn = container.querySelector('#toggle-screen-explorer-btn');
  const closeBtn = container.querySelector('#close-screen-explorer-btn');

  toggleBtn?.addEventListener('click', () => {
    state.screenPickerOpen = !state.screenPickerOpen;
    const panel = container.querySelector('#screen-explorer-panel');
    const icon = toggleBtn?.querySelector('.material-symbols-outlined');
    if (panel) {
      if (state.screenPickerOpen) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
        if (icon) icon.textContent = 'close';
      } else {
        panel.classList.remove('flex');
        panel.classList.add('hidden');
        if (icon) icon.textContent = 'view_carousel';
      }
    }
  });

  closeBtn?.addEventListener('click', () => {
    state.screenPickerOpen = false;
    const panel = container.querySelector('#screen-explorer-panel');
    panel?.classList.add('hidden');
    panel?.classList.remove('flex');
    const icon = toggleBtn?.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = 'view_carousel';
  });

  container.querySelectorAll('.screen-jump-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const scr = (e.currentTarget as HTMLElement).getAttribute('data-screen') as ScreenId;
      const role = (e.currentTarget as HTMLElement).getAttribute('data-role') as UserRole;
      if (scr) {
        if (role && state.role !== role) {
          state.role = role;
        }
        state.screenPickerOpen = false;
        setScreen(scr);
      }
    });
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.screenPickerOpen) {
      state.screenPickerOpen = false;
      const panel = container.querySelector('#screen-explorer-panel');
      panel?.classList.add('hidden');
      panel?.classList.remove('flex');
      const icon = toggleBtn?.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'view_carousel';
    }
  });
}
