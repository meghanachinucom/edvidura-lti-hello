/**
 * Campus-style left rail. Active item is a solid pill.
 */
import { state, setScreen, setAdminTab } from '../state';
import { renderEdViduraLogo } from './logo';
import { isGovernment } from '../boot';

type RailItem = {
  label: string;
  icon: string;
  href: string;
  screen?: string;
  adminTab?: string;
  on: boolean;
};

function items(): RailItem[] {
  const s = state.screen;
  const gov = isGovernment();
  const role = state.role;

  if (gov) {
    return [
      { label: 'Library', icon: 'video_library', href: '#library', screen: 'pravachana-home', on: s === 'pravachana-home' || s === 'pravachana-player' },
      { label: 'Ask Vidura', icon: 'auto_awesome', href: '#ask-vidura', screen: 'ask-vidura', on: s === 'ask-vidura' },
      ...(role === 'student'
        ? []
        : [{ label: 'Department', icon: 'apartment', href: '#dept', screen: 'pravachana-dept', on: s === 'pravachana-dept' }]),
    ];
  }

  if (role === 'teacher') {
    return [
      { label: 'Gradebook', icon: 'home', href: '#teacher-results', screen: 'teacher-results', on: s === 'teacher-results' },
      { label: 'Diagnostics', icon: 'monitor_heart', href: '#teacher-diagnostics', screen: 'teacher-diagnostics', on: s === 'teacher-diagnostics' },
      { label: 'Quiz', icon: 'assignment', href: '#preview-quiz', screen: 'quiz', on: s === 'quiz' },
      { label: 'Ask Vidura', icon: 'auto_awesome', href: '#ask-vidura', screen: 'ask-vidura', on: s === 'ask-vidura' },
      { label: 'Handbook', icon: 'menu_book', href: '#manuals', screen: 'manuals', on: s === 'manuals' || s === 'manual-reader' },
      { label: 'VR lab', icon: 'view_in_ar', href: '#xr-store', screen: 'xr-store', on: s === 'xr-store' },
    ];
  }

  if (role === 'admin') {
    const tab = state.adminTab || 'governance';
    return [
      { label: 'Governance', icon: 'home', href: '#admin', adminTab: 'governance', on: tab === 'governance' },
      { label: 'Teachers', icon: 'group', href: '#admin', adminTab: 'teachers', on: tab === 'teachers' },
      { label: 'Sections', icon: 'calendar_month', href: '#admin', adminTab: 'sections', on: tab === 'sections' },
      { label: 'Roster', icon: 'badge', href: '#admin', adminTab: 'roster', on: tab === 'roster' },
      { label: 'LTI Keys', icon: 'vpn_key', href: '#admin', adminTab: 'keys', on: tab === 'keys' },
      { label: 'Integrations', icon: 'hub', href: '#admin', adminTab: 'lms-integrations', on: tab === 'lms-integrations' },
    ];
  }

  return [
    { label: 'Dashboard', icon: 'home', href: '#home', screen: 'student-home', on: s === 'student-home' },
    { label: 'Lessons', icon: 'menu_book', href: '#lessons', screen: 'lessons', on: s === 'lessons' || s === 'lesson-detail' },
    { label: 'Quiz', icon: 'assignment', href: '#quiz', screen: 'quiz', on: s === 'quiz' || s === 'quiz-results' || s === 'prerequisite-gate' },
    { label: 'Ask Vidura', icon: 'auto_awesome', href: '#ask-vidura', screen: 'ask-vidura', on: s === 'ask-vidura' },
    { label: 'Grades', icon: 'monitoring', href: '#my-progress', screen: 'my-progress', on: s === 'my-progress' },
    { label: 'Handbook', icon: 'auto_stories', href: '#manuals', screen: 'manuals', on: s === 'manuals' || s === 'manual-reader' },
    { label: 'VR lab', icon: 'view_in_ar', href: '#xr-store', screen: 'xr-store', on: s === 'xr-store' },
  ];
}

export function renderSidebar(): string {
  const open = state.mobileMenuOpen ? 'is-open' : '';
  const list = items();
  const gov = isGovernment();
  const role = state.role;

  return `
    <div id="hub-backdrop" class="hub-backdrop ${state.mobileMenuOpen ? '' : 'hidden'} lg:hidden"></div>
    <nav class="hub-rail ${open}" aria-label="Classroom">
      <button class="hub-brand" id="brand-logo-btn" type="button">
        ${renderEdViduraLogo({ size: 34, idSuffix: 'rail' })}
        <span class="font-headline font-bold text-[17px] tracking-tight text-[#0F172A]">Ed<span class="text-[#FE580D]">Vidura</span></span>
      </button>

      <div class="hub-rail-list">
        ${list
          .map(
            item => `
          <a class="hub-rail-link ${item.on ? 'on' : ''}" href="${item.href}" data-screen="${item.screen || ''}" data-admin-tab="${item.adminTab || ''}">
            <span class="material-symbols-outlined">${item.icon}</span>
            ${item.label}
          </a>`
          )
          .join('')}
      </div>

      <div class="hub-rail-card">
        <p class="hub-rail-badge"><i></i> EdVidura</p>
        <h3>One pass.<br><em>More perks.</em></h3>
        <p class="text-xs text-white/80 max-w-[9.5rem]">${
          gov
            ? 'Library and Ask Vidura on this government tenant.'
            : role === 'admin'
              ? 'Keys, roster, and Moodle handshake for this tenant.'
              : role === 'teacher'
                ? 'Quiz preview, handbook, and VR lab for this class.'
                : 'Handbook, XR lab, and Ask Vidura in this course.'
        }</p>
        <a class="hub-rail-round" href="${gov ? '#ask-vidura' : role === 'admin' ? '#admin' : role === 'teacher' ? '#teacher-results' : '#xr-store'}" data-screen="${gov ? 'ask-vidura' : role === 'admin' ? 'admin-overview' : role === 'teacher' ? 'teacher-results' : 'xr-store'}" aria-label="${gov ? 'Open Ask Vidura' : role === 'admin' ? 'Open governance' : role === 'teacher' ? 'Open gradebook' : 'Open VR lab'}">
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        </a>
      </div>
    </nav>
  `;
}

export function bindSidebarEvents(container: HTMLElement): void {
  const goHome = () => {
    if (isGovernment()) setScreen(state.role === 'student' ? 'pravachana-home' : 'pravachana-dept');
    else if (state.role === 'admin') setScreen('admin-overview');
    else if (state.role === 'teacher') setScreen('teacher-results');
    else setScreen('student-home');
  };

  container.querySelector('#brand-logo-btn')?.addEventListener('click', goHome);

  container.querySelector('#hub-backdrop')?.addEventListener('click', () => {
    state.mobileMenuOpen = false;
    container.classList.remove('is-open');
    container.querySelector('.hub-rail')?.classList.remove('is-open');
    container.querySelector('#hub-backdrop')?.classList.add('hidden');
  });

  container.querySelectorAll('.hub-rail-link, .hub-rail-cta, .hub-rail-round').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      const screenId = el.getAttribute('data-screen');
      const tab = el.getAttribute('data-admin-tab');
      state.mobileMenuOpen = false;
      if (tab) {
        setAdminTab(tab as any);
        setScreen('admin-overview');
        return;
      }
      if (screenId) setScreen(screenId as any);
    });
  });
}
