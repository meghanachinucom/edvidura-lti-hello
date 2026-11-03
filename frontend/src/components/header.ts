/**
 * Campus-style top bar: search, language, Moodle, avatar.
 * Navigation lives in the left rail.
 */
import { state, setScreen, setRole, showToast, type UserRole } from '../state';
import { classLabel, displayName, escapeHtml, isGovernment } from '../boot';
import { bindLanguageSelect, renderLanguageSelect } from '../i18n';
import { lmsReturnHref, returnToLms } from '../nav';

export function renderHeader(): string {
  const isTeacher = state.role === 'teacher';
  const isAdmin = state.role === 'admin';
  const gov = isGovernment();

  const avatarUrl = isTeacher
    ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80'
    : isAdmin
    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

  return `
    <header class="hub-topbar">
      <button
        aria-label="Open menu"
        id="mobile-menu-btn"
        class="hub-icon-btn lg:hidden"
        type="button"
      >
        <span class="material-symbols-outlined text-[22px]">${state.mobileMenuOpen ? 'close' : 'menu'}</span>
      </button>

      <label class="hub-search">
        <span class="material-symbols-outlined">search</span>
        <input id="hub-search" type="search" placeholder="${isTeacher ? 'Search students, quiz, diagnostics...' : isAdmin ? 'Search teachers, roster, keys...' : gov ? 'Search pravachanam...' : 'Search anything...'}" autocomplete="off" />
      </label>

      <div class="hub-top-actions">
        ${
          state.connected
            ? ''
            : '<span class="hub-demo-pill">Demo</span>'
        }
        ${renderLanguageSelect('app-lang-select', 'hidden md:flex')}

        <button id="hub-bell-btn" class="hub-icon-btn" type="button" aria-label="Notifications">
          <span class="material-symbols-outlined">notifications</span>
        </button>

        ${
          gov
            ? ''
            : state.connected
            ? `<a id="back-to-moodle-btn" class="hub-moodle" href="${escapeHtml(lmsReturnHref())}">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            Moodle
          </a>`
            : `<a id="back-to-moodle-btn" class="sr-only" href="${escapeHtml(lmsReturnHref())}">Moodle</a>`
        }

        <div class="hub-user" id="hub-user-wrap">
          <button type="button" id="hub-user-btn" class="flex items-center gap-2 min-w-0" aria-haspopup="menu" aria-expanded="false">
            <img alt="" src="${avatarUrl}" />
            <div class="hidden sm:block min-w-0 text-left">
              <div class="text-sm font-bold text-[#0F172A] truncate leading-tight">${escapeHtml(displayName())}</div>
              <div class="text-[11px] text-slate-500 truncate">${isAdmin ? 'Admin' : isTeacher ? 'Teacher' : gov ? 'Library' : escapeHtml(classLabel())}</div>
            </div>
            <span class="material-symbols-outlined text-slate-400 text-[18px] hidden sm:inline">expand_more</span>
          </button>
          <div id="hub-role-menu" class="hub-role-menu hidden" role="menu">
            <p class="hub-role-kicker">View as</p>
            ${
              gov
                ? `
              <button type="button" class="hub-role-opt ${state.role === 'student' ? 'on' : ''}" data-role="student" role="menuitem">Student</button>
              <button type="button" class="hub-role-opt ${state.role !== 'student' ? 'on' : ''}" data-role="teacher" role="menuitem">Department</button>`
                : `
              <button type="button" class="hub-role-opt ${state.role === 'student' ? 'on' : ''}" data-role="student" role="menuitem">Student</button>
              <button type="button" class="hub-role-opt ${state.role === 'teacher' ? 'on' : ''}" data-role="teacher" role="menuitem">Teacher</button>
              <button type="button" class="hub-role-opt ${state.role === 'admin' ? 'on' : ''}" data-role="admin" role="menuitem">Admin</button>`
            }
          </div>
        </div>
      </div>
    </header>
  `;
}

export function bindHeaderEvents(container: HTMLElement): void {
  bindLanguageSelect(container, 'app-lang-select');

  container.querySelector('#mobile-menu-btn')?.addEventListener('click', () => {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    const slot = document.getElementById('sidebar-root');
    const rail = slot?.querySelector('.hub-rail');
    const backdrop = slot?.querySelector('#hub-backdrop');
    rail?.classList.toggle('is-open', state.mobileMenuOpen);
    backdrop?.classList.toggle('hidden', !state.mobileMenuOpen);
    const icon = container.querySelector('#mobile-menu-btn .material-symbols-outlined');
    if (icon) icon.textContent = state.mobileMenuOpen ? 'close' : 'menu';
  });

  container.querySelector('#hub-bell-btn')?.addEventListener('click', () => {
    if (state.role === 'teacher') showToast('4 attempts need review before Friday', 'campaign');
    else if (state.role === 'admin') showToast('LTI key rotation is due this month', 'campaign');
    else if (isGovernment()) showToast('New pravachanam is ready in the library', 'campaign');
    else showToast('Finish the graph lab before Friday’s checkpoint', 'campaign');
  });

  const search = container.querySelector('#hub-search') as HTMLInputElement | null;
  search?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = search.value.trim().toLowerCase();
    if (!q) return;
    if (state.role === 'teacher') {
      if (/quiz|preview/.test(q)) setScreen('quiz');
      else if (/diag|xapi|heat|analytic/.test(q)) setScreen('teacher-diagnostics');
      else if (/book|manual|handbook/.test(q)) setScreen('manuals');
      else if (/vr|xr/.test(q)) setScreen('xr-store');
      else if (/ask|vidura/.test(q)) setScreen('ask-vidura');
      else setScreen('teacher-results');
      return;
    }
    if (state.role === 'admin') {
      setScreen('admin-overview');
      return;
    }
    if (isGovernment()) {
      if (/ask|vidura/.test(q)) setScreen('ask-vidura');
      else setScreen('pravachana-home');
      return;
    }
    if (/quiz|checkpoint/.test(q)) setScreen('quiz');
    else if (/grade|progress|score/.test(q)) setScreen('my-progress');
    else if (/vr|xr|lab/.test(q)) setScreen('xr-store');
    else if (/book|manual|handbook/.test(q)) setScreen('manuals');
    else if (/lesson|course|unit/.test(q)) setScreen('lessons');
    else setScreen('ask-vidura');
  });

  const triggerMoodle = (e: Event) => {
    e.preventDefault();
    returnToLms();
  };
  container.querySelector('#back-to-moodle-btn')?.addEventListener('click', triggerMoodle);

  const userBtn = container.querySelector('#hub-user-btn');
  const roleMenu = container.querySelector('#hub-role-menu');
  userBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = roleMenu?.classList.contains('hidden');
    roleMenu?.classList.toggle('hidden', !willOpen);
    userBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) {
      window.setTimeout(() => {
        document.addEventListener('click', () => roleMenu?.classList.add('hidden'), { once: true });
      }, 0);
    }
  });
  roleMenu?.querySelectorAll('[data-role]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const role = (e.currentTarget as HTMLElement).getAttribute('data-role') as UserRole;
      if (role) setRole(role);
    });
  });
}
