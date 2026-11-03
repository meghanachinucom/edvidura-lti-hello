/**
 * Light CampusHub footer — same canvas as every role.
 */
import { setAdminTab, setScreen, state } from '../state';
import { renderEdViduraLogo } from './logo';
import { classLabel, isGovernment } from '../boot';

function goHome(): void {
  if (isGovernment()) setScreen(state.role === 'student' ? 'pravachana-home' : 'pravachana-dept');
  else if (state.role === 'admin') setScreen('admin-overview');
  else if (state.role === 'teacher') setScreen('teacher-results');
  else setScreen('student-home');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function renderFooter(): string {
  const currentYear = new Date().getFullYear();
  const gov = isGovernment();
  const role = state.role;

  const links = gov
    ? `
      <button id="footer-nav-home" type="button">Library</button>
      <button id="footer-nav-vidura" type="button">Ask Vidura</button>
      ${role !== 'student' ? '<button id="footer-nav-dept" type="button">Department</button>' : ''}`
    : role === 'admin'
      ? `
      <button id="footer-nav-admin" type="button">Governance</button>
      <button id="footer-nav-teachers" type="button">Teachers</button>
      <button id="policy-ferpa-link" type="button">Privacy</button>`
      : role === 'teacher'
        ? `
      <button id="footer-nav-teacher" type="button">Gradebook</button>
      <button id="footer-nav-diagnostics" type="button">Diagnostics</button>
      <button id="footer-nav-quiz" type="button">Quiz</button>
      <button id="footer-nav-handbooks" type="button">Handbook</button>
      <button id="policy-ferpa-link" type="button">Privacy</button>`
        : `
      <button id="footer-nav-home" type="button">Course</button>
      <button id="footer-nav-lessons" type="button">Lessons</button>
      <button id="footer-nav-quiz" type="button">Quiz</button>
      <button id="footer-nav-vidura" type="button">Ask Vidura</button>
      <button id="footer-nav-handbooks" type="button">Handbook</button>
      <button id="policy-ferpa-link" type="button">Privacy</button>`;

  return `
    <footer class="print:hidden">
      <div class="hub-foot">
        <button id="footer-logo-btn" class="flex items-center gap-2.5 text-left cursor-pointer min-w-0" type="button">
          ${renderEdViduraLogo({ size: 28, idSuffix: 'ftr' })}
          <span class="min-w-0">
            <span class="block text-sm font-bold font-headline text-[#0F172A]">Ed<span class="text-[#FE580D]">Vidura</span></span>
            <span class="block text-[11px] text-slate-400 truncate">${classLabel()}</span>
          </span>
        </button>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
          ${links}
          <span class="text-slate-400">© ${currentYear}</span>
        </div>
      </div>

      <div id="academic-policy-modal" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white text-[#0F172A] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#CBD5E1] overflow-hidden animate-fade-rise flex flex-col max-h-[85vh]">
          <div class="px-6 py-4 bg-white text-[#0F172A] flex items-center justify-between border-b border-[#EEF2F6]">
            <div class="flex items-center gap-2.5">
              <span class="hub-ico"><span class="material-symbols-outlined text-[20px]">policy</span></span>
              <h3 class="font-bold text-base font-headline" id="policy-modal-title">District Academic Policies &amp; Compliance</h3>
            </div>
            <button id="close-policy-modal-btn" class="hub-icon-btn" type="button">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div class="p-6 overflow-y-auto space-y-5 text-sm text-[#334155] leading-relaxed" id="policy-modal-body"></div>
          <div class="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end">
            <button id="acknowledge-policy-btn" class="hub-cta-dark" type="button">I Understand</button>
          </div>
        </div>
      </div>
    </footer>
  `;
}

export function bindFooterEvents(container: HTMLElement): void {
  container.querySelector('#footer-logo-btn')?.addEventListener('click', goHome);
  container.querySelector('#footer-nav-home')?.addEventListener('click', goHome);
  container.querySelector('#footer-nav-lessons')?.addEventListener('click', () => setScreen('lessons'));
  container.querySelector('#footer-nav-quiz')?.addEventListener('click', () => setScreen('quiz'));
  container.querySelector('#footer-nav-vidura')?.addEventListener('click', () => setScreen('ask-vidura'));
  container.querySelector('#footer-nav-handbooks')?.addEventListener('click', () => setScreen('manuals'));
  container.querySelector('#footer-nav-teacher')?.addEventListener('click', () => setScreen('teacher-results'));
  container.querySelector('#footer-nav-diagnostics')?.addEventListener('click', () => setScreen('teacher-diagnostics'));
  container.querySelector('#footer-nav-admin')?.addEventListener('click', () => setScreen('admin-overview'));
  container.querySelector('#footer-nav-dept')?.addEventListener('click', () => setScreen('pravachana-dept'));
  container.querySelector('#footer-nav-teachers')?.addEventListener('click', () => setAdminTab('teachers'));

  const modal = container.querySelector('#academic-policy-modal') as HTMLElement | null;
  const modalTitle = container.querySelector('#policy-modal-title') as HTMLElement | null;
  const modalBody = container.querySelector('#policy-modal-body') as HTMLElement | null;

  const openPolicy = () => {
    if (!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = 'Family Educational Rights and Privacy Act (FERPA) Statement';
    modalBody.innerHTML = `
      <div class="space-y-3">
        <p>Quiz submissions, lab work, and competency records stay inside this tenant. Official grades of record remain in Moodle.</p>
        <p>Authentication uses LTI 1.3 JWTs. No student PII is sold or shared with advertising networks.</p>
      </div>`;
    modal.classList.remove('hidden');
  };
  const closeModal = () => modal?.classList.add('hidden');

  container.querySelector('#policy-ferpa-link')?.addEventListener('click', openPolicy);
  container.querySelector('#close-policy-modal-btn')?.addEventListener('click', closeModal);
  container.querySelector('#acknowledge-policy-btn')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
}
