/**
 * Header and Navigation Component
 * Adheres strictly to the Senior Designer 3-Zone Top Bar Contract,
 * elevated with Apple/Linear-grade glassmorphism, multi-stop shadows,
 * and a high-impact Executive Client Showcase Ribbon for sales demonstrations.
 */
import { state, setScreen, setAdminTab, showToast } from '../state';
import { renderEdViduraLogo } from './logo';
import { classLabel, displayName, escapeHtml, isGovernment } from '../boot';
import { bindLanguageSelect, renderLanguageSelect } from '../i18n';
import { lmsReturnHref, returnToLms } from '../nav';

export function renderHeader(): string {
  const isStudent = state.role === 'student';
  const isTeacher = state.role === 'teacher';
  const isAdmin = state.role === 'admin';

  const avatarUrl = isTeacher
    ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80'
    : isAdmin
    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

  const gov = isGovernment();

  // Zone 2: Navigation Links (Clean single-line text links with subtle hover/active underline)
  let navItemsHtml = '';
  if (gov) {
    const isLib = state.screen === 'pravachana-home';
    const isPlayer = state.screen === 'pravachana-player';
    const isVidura = state.screen === 'ask-vidura';
    const isDept = state.screen === 'pravachana-dept';
    navItemsHtml = `
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isLib || isPlayer ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="pravachana-home" href="#library">Library</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isVidura ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="ask-vidura" href="#ask-vidura">Ask Vidura</a>
      ${
        isStudent
          ? ''
          : `<a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isDept ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="pravachana-dept" href="#dept">Department</a>`
      }
    `;
  } else if (isStudent) {
    const isHome = state.screen === 'student-home';
    const isLessons = state.screen === 'lessons' || state.screen === 'lesson-detail';
    const isQuiz = state.screen === 'quiz' || state.screen === 'quiz-results' || state.screen === 'prerequisite-gate';
    const isManuals = state.screen === 'manuals' || state.screen === 'manual-reader';
    const isVidura = state.screen === 'ask-vidura';
    const isProgress = state.screen === 'my-progress';
    const isXr = state.screen === 'xr-store';

    navItemsHtml = `
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isHome ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="student-home" href="#home">Home</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isLessons ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="lessons" href="#lessons">Lessons</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isQuiz ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="quiz" href="#quiz">Checkpoint Quiz</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isManuals ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="manuals" href="#manuals">Reference Library</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isVidura ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="ask-vidura" href="#ask-vidura">Ask Vidura</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isProgress ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="my-progress" href="#my-progress">Progress</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isXr ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="xr-store" href="#xr-store">XR Labs</a>
    `;
  } else if (isTeacher) {
    const isResults = state.screen === 'teacher-results';
    const isDiagnostics = state.screen === 'teacher-diagnostics';
    const isPreview = state.screen === 'quiz';
    const isManuals = state.screen === 'manuals' || state.screen === 'manual-reader';
    const isXr = state.screen === 'xr-store';

    navItemsHtml = `
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isResults ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="teacher-results" href="#teacher-results">Class Gradebook</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isDiagnostics ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="teacher-diagnostics" href="#teacher-diagnostics">Diagnostics</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isPreview ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="quiz" href="#preview-quiz">Preview Assessment</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isManuals ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="manuals" href="#manuals">Course Handbooks</a>
      <a class="nav-link whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 ${isXr ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-screen="xr-store" href="#xr-store">XR Labs</a>
    `;
  } else {
    const currentTab = state.adminTab || 'governance';
    const isGov = currentTab === 'governance';
    const isTeach = currentTab === 'teachers';
    const isSec = currentTab === 'sections';
    const isRoster = currentTab === 'roster';
    const isKeys = currentTab === 'keys';

    navItemsHtml = `
      <button class="nav-admin-tab whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 cursor-pointer ${isGov ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-admin-tab="governance" type="button">Governance</button>
      <button class="nav-admin-tab whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 cursor-pointer ${isTeach ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-admin-tab="teachers" type="button">Teachers</button>
      <button class="nav-admin-tab whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 cursor-pointer ${isSec ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-admin-tab="sections" type="button">Sections</button>
      <button class="nav-admin-tab whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 cursor-pointer ${isRoster ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-admin-tab="roster" type="button">Roster Vault</button>
      <button class="nav-admin-tab whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 cursor-pointer ${isKeys ? 'text-lagoon font-bold border-b-2 border-lagoon drop-shadow-xs' : 'text-on-surface-variant hover:text-ink'}" data-admin-tab="keys" type="button">LTI 1.3 Keys</button>
    `;
  }

  return `
    <!-- Main Glassmorphic Top Navigation Header -->
    <header class="sticky top-0 z-50 w-full glass-panel border-b border-line/70">
      <div class="h-16 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3 lg:gap-6 xl:gap-8">
        
        <!-- Zone 1: EdVidura Brand Logo with Scholar Hat & EV Monogram -->
        <div class="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none shrink-0 group" id="brand-logo-btn">
          ${renderEdViduraLogo({ size: 38, idSuffix: 'hdr', className: 'group-hover:scale-105 transition-transform' })}
          <div class="flex items-baseline gap-1.5 sm:gap-2">
            <span class="font-bold tracking-tight text-ink text-lg sm:text-xl font-headline">Ed<span class="text-[#FF4757]">Vidura</span></span>
            <span class="hidden xl:inline text-xs text-outline font-normal font-mono">${gov ? 'Pravachanalu' : 'Academic Cloud'}</span>
          </div>
        </div>

        <!-- Zone 2: 4-5 clean single-line nav links with whitespace-nowrap -->
        <nav class="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-6 text-xs lg:text-sm overflow-x-auto no-scrollbar shrink">
          ${navItemsHtml}
        </nav>

        <!-- Zone 3: primary action -->
        <div class="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">

          ${renderLanguageSelect('app-lang-select')}

          ${
            gov
              ? ''
              : `
          <!-- Moodle Return Action -->
          <a id="back-to-moodle-btn" class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-line/80 text-xs font-semibold text-harbor hover:text-ink hover:border-harbor/40 shadow-xs transition-all cursor-pointer" href="${escapeHtml(lmsReturnHref())}">
            <span class="material-symbols-outlined text-[15px]">arrow_back</span>
            <span>Moodle</span>
          </a>`
          }

          <!-- User Avatar & Identity with ring highlight -->
          <div class="flex items-center gap-2 pl-1.5 lg:pl-2 border-l border-line/70">
            <img alt="User profile" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-line/60" src="${avatarUrl}" />
            <span class="hidden 2xl:inline text-xs font-bold text-ink">
              ${displayName()}
            </span>
          </div>

          <!-- Mobile Drawer Hamburger Toggle Button -->
          <button
            aria-label="Toggle Navigation Menu"
            id="mobile-menu-btn"
            class="md:hidden min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border border-line bg-panel text-ink hover:bg-paper transition-colors shadow-xs"
            type="button"
          >
            <span class="material-symbols-outlined text-[20px]">${state.mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Drawer -->
      <div class="${state.mobileMenuOpen ? 'block' : 'hidden'} md:hidden w-full bg-paper/95 backdrop-blur-xl border-b border-line px-4 py-4 animate-fade-in shadow-xl" id="mobile-drawer">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-line">
          <div class="flex items-center gap-2.5">
            <img alt="User profile" class="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" src="${avatarUrl}" />
            <div class="flex flex-col">
              <span class="text-sm font-bold text-ink">${displayName()}</span>
              <span class="text-xs text-outline font-mono">${isAdmin ? 'Mandal Education Officer' : classLabel()}</span>
            </div>
          </div>
        </div>

        <nav class="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
          ${gov ? `
            <a class="mobile-nav-link text-sm ${state.screen === 'pravachana-home' || state.screen === 'pravachana-player' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="pravachana-home" href="#library">Library</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'ask-vidura' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="ask-vidura" href="#ask-vidura">Ask Vidura</a>
            ${isStudent ? '' : `<a class="mobile-nav-link text-sm ${state.screen === 'pravachana-dept' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="pravachana-dept" href="#dept">Department</a>`}
          ` : isStudent ? `
            <a class="mobile-nav-link text-sm ${state.screen === 'student-home' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="student-home" href="#home">Home</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'lessons' || state.screen === 'lesson-detail' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="lessons" href="#lessons">Lessons</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'quiz' || state.screen === 'quiz-results' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="quiz" href="#quiz">Checkpoint Quiz</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'manuals' || state.screen === 'manual-reader' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="manuals" href="#manuals">Reference Library</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'ask-vidura' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="ask-vidura" href="#ask-vidura">Ask Vidura</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'my-progress' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="my-progress" href="#my-progress">Progress</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'xr-store' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="xr-store" href="#xr-store">XR Labs</a>
          ` : isTeacher ? `
            <a class="mobile-nav-link text-sm ${state.screen === 'teacher-results' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="teacher-results" href="#teacher-results">Class Gradebook</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'teacher-diagnostics' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="teacher-diagnostics" href="#teacher-diagnostics">Diagnostics</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'quiz' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="quiz" href="#preview-quiz">Preview Assessment</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'manuals' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="manuals" href="#manuals">Course Handbooks</a>
            <a class="mobile-nav-link text-sm ${state.screen === 'xr-store' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors" data-screen="xr-store" href="#xr-store">XR Labs</a>
          ` : `
            <button class="mobile-admin-tab text-left text-sm ${state.adminTab === 'governance' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors cursor-pointer w-full" data-admin-tab="governance" type="button">Governance</button>
            <button class="mobile-admin-tab text-left text-sm ${state.adminTab === 'teachers' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors cursor-pointer w-full" data-admin-tab="teachers" type="button">Teachers</button>
            <button class="mobile-admin-tab text-left text-sm ${state.adminTab === 'sections' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors cursor-pointer w-full" data-admin-tab="sections" type="button">Sections</button>
            <button class="mobile-admin-tab text-left text-sm ${state.adminTab === 'roster' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors cursor-pointer w-full" data-admin-tab="roster" type="button">Roster Vault</button>
            <button class="mobile-admin-tab text-left text-sm ${state.adminTab === 'keys' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors cursor-pointer w-full" data-admin-tab="keys" type="button">LTI 1.3 Keys</button>
            <button class="mobile-admin-tab text-left text-sm ${state.adminTab === 'lms-integrations' ? 'bg-lagoon-soft text-lagoon font-bold' : 'text-on-surface-variant hover:text-ink'} px-3 py-2 rounded-lg transition-colors cursor-pointer w-full" data-admin-tab="lms-integrations" type="button">LMS Integrations</button>
          `}
        </nav>

        <div class="mt-4 pt-3 border-t border-line flex flex-col gap-3">
          ${renderLanguageSelect('app-lang-select-mobile', 'w-full justify-between')}
          ${
            gov
              ? ''
              : `
          <a id="mobile-back-to-moodle-btn" class="min-h-[42px] w-full rounded-xl bg-harbor text-white flex items-center justify-center text-sm font-semibold shadow-sm hover:bg-[#15385A] transition-colors" href="${escapeHtml(lmsReturnHref())}">
            ← Return to Moodle Course
          </a>`
          }
        </div>
      </div>
    </header>
  `;
}

export function bindHeaderEvents(container: HTMLElement): void {
  bindLanguageSelect(container, 'app-lang-select');
  bindLanguageSelect(container, 'app-lang-select-mobile');

  // Brand Click
  container.querySelector('#brand-logo-btn')?.addEventListener('click', () => {
    if (isGovernment()) {
      setScreen(state.role === 'student' ? 'pravachana-home' : 'pravachana-dept');
    } else if (state.role === 'admin') setScreen('admin-overview');
    else if (state.role === 'teacher') setScreen('teacher-results');
    else setScreen('student-home');
  });

  // Admin Tabs (Desktop & Mobile)
  container.querySelectorAll('[data-admin-tab]').forEach(tabBtn => {
    tabBtn.addEventListener('click', e => {
      e.preventDefault();
      const tab = (e.currentTarget as HTMLElement).getAttribute('data-admin-tab') as any;
      if (tab) {
        state.mobileMenuOpen = false;
        setAdminTab(tab);
        const titles: Record<string, string> = {
          governance: 'Academic Governance & SIS Federation',
          teachers: 'Faculty Directory & Assignments',
          sections: 'Course Cohorts & Section Schedule',
          roster: 'District Scholar Roster Vault',
          keys: 'Enterprise LTI 1.3 Advantage Keyset'
        };
        showToast(titles[tab] || 'Admin Console', 'admin_panel_settings');
      }
    });
  });

  // Desktop Nav Links
  container.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const screenId = (e.currentTarget as HTMLElement).getAttribute('data-screen');
      const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
      if (screenId) {
        setScreen(screenId as any);
      } else if (action) {
        showToast(`Navigated to ${action.replace('admin-', '').toUpperCase()} console`, 'verified');
      }
    });
  });

  // Mobile Nav Links
  container.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const screenId = (e.currentTarget as HTMLElement).getAttribute('data-screen');
      const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
      state.mobileMenuOpen = false;
      if (screenId) {
        setScreen(screenId as any);
      } else if (action) {
        showToast(`Navigated to ${action.replace('admin-', '').toUpperCase()} console`, 'verified');
      }
    });
  });

  const triggerMoodle = (e: Event) => {
    e.preventDefault();
    returnToLms();
  };
  container.querySelector('#back-to-moodle-btn')?.addEventListener('click', triggerMoodle);
  container.querySelector('#mobile-back-to-moodle-btn')?.addEventListener('click', triggerMoodle);

  // Mobile Hamburger Toggle
  container.querySelector('#mobile-menu-btn')?.addEventListener('click', () => {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    const drawer = container.querySelector('#mobile-drawer');
    const icon = container.querySelector('#mobile-menu-btn span');
    if (drawer && icon) {
      if (state.mobileMenuOpen) {
        drawer.classList.remove('hidden');
        drawer.classList.add('block');
        icon.textContent = 'close';
      } else {
        drawer.classList.remove('block');
        drawer.classList.add('hidden');
        icon.textContent = 'menu';
      }
    }
  });
}
