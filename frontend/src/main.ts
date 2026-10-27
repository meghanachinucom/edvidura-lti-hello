/**
 * EdVidura Academic Learning & LTI Classroom Application Entry
 * Built with pure vanilla TypeScript, HTML5, and Tailwind CSS (No React).
 */
import { screenFromHash, setScreen, state, subscribe } from './state';
import { applyI18n, initLocale } from './i18n';
import { hydrateFromApi } from './boot';
import { renderHeader, bindHeaderEvents } from './components/header';
import { renderFooter, bindFooterEvents } from './components/footer';

import { renderStudentHome, bindStudentHomeEvents } from './views/studentHome';
import { renderLessons, bindLessonsEvents } from './views/lessons';
import { renderLessonDetail, bindLessonDetailEvents } from './views/lessonDetail';
import { renderQuiz, bindQuizEvents } from './views/quiz';
import { renderQuizResults, bindQuizResultsEvents } from './views/quizResults';
import { renderPrerequisiteGate, bindPrerequisiteGateEvents } from './views/prerequisiteGate';
import { renderManuals, bindManualsEvents } from './views/manuals';
import { renderManualReader, bindManualReaderEvents } from './views/manualReader';
import { renderAskVidura, bindAskViduraEvents } from './views/askVidura';
import { renderMyProgress, bindMyProgressEvents } from './views/myProgress';
import { renderTeacherResults, bindTeacherResultsEvents } from './views/teacherResults';
import { renderTeacherDiagnostics, bindTeacherDiagnosticsEvents } from './views/teacherDiagnostics';
import { renderAdminOverview, bindAdminOverviewEvents } from './views/adminOverview';
import { renderHomeShell, bindHomeShellEvents } from './views/homeShell';
import { renderXrStore, bindXrStoreEvents } from './views/xrStore';
import { renderPravachanaHome, bindPravachanaHomeEvents } from './views/pravachanaHome';
import { renderPravachanaPlayer, bindPravachanaPlayerEvents } from './views/pravachanaPlayer';
import { renderPravachanaDept, bindPravachanaDeptEvents } from './views/pravachanaDept';

let started = false;

function renderApp(): void {
  const headerRoot = document.getElementById('header-root');
  const viewRoot = document.getElementById('view-root');
  const footerRoot = document.getElementById('footer-root');

  if (!viewRoot) return;

  if (headerRoot) {
    headerRoot.innerHTML = renderHeader();
    bindHeaderEvents(headerRoot);
  }

  let html = '';
  let bindFn: ((container: HTMLElement) => void) | null = null;

  switch (state.screen) {
    case 'student-home':
      html = renderStudentHome();
      bindFn = bindStudentHomeEvents;
      break;
    case 'lessons':
      html = renderLessons();
      bindFn = bindLessonsEvents;
      break;
    case 'lesson-detail':
      html = renderLessonDetail();
      bindFn = bindLessonDetailEvents;
      break;
    case 'quiz':
      html = renderQuiz();
      bindFn = bindQuizEvents;
      break;
    case 'quiz-results':
      html = renderQuizResults();
      bindFn = bindQuizResultsEvents;
      break;
    case 'prerequisite-gate':
      html = renderPrerequisiteGate();
      bindFn = bindPrerequisiteGateEvents;
      break;
    case 'manuals':
      html = renderManuals();
      bindFn = bindManualsEvents;
      break;
    case 'manual-reader':
      html = renderManualReader();
      bindFn = bindManualReaderEvents;
      break;
    case 'ask-vidura':
      html = renderAskVidura();
      bindFn = bindAskViduraEvents;
      break;
    case 'my-progress':
      html = renderMyProgress();
      bindFn = bindMyProgressEvents;
      break;
    case 'teacher-results':
      html = renderTeacherResults();
      bindFn = bindTeacherResultsEvents;
      break;
    case 'teacher-diagnostics':
      html = renderTeacherDiagnostics();
      bindFn = bindTeacherDiagnosticsEvents;
      break;
    case 'admin-overview':
      html = renderAdminOverview();
      bindFn = bindAdminOverviewEvents;
      break;
    case 'home-shell':
      html = renderHomeShell();
      bindFn = bindHomeShellEvents;
      break;
    case 'xr-store':
      html = renderXrStore();
      bindFn = bindXrStoreEvents;
      break;
    case 'pravachana-home':
      html = renderPravachanaHome();
      bindFn = bindPravachanaHomeEvents;
      break;
    case 'pravachana-player':
      html = renderPravachanaPlayer();
      bindFn = bindPravachanaPlayerEvents;
      break;
    case 'pravachana-dept':
      html = renderPravachanaDept();
      bindFn = bindPravachanaDeptEvents;
      break;
    default:
      html = renderStudentHome();
      bindFn = bindStudentHomeEvents;
  }

  viewRoot.innerHTML = html;
  if (bindFn) {
    bindFn(viewRoot);
  }

  if (footerRoot) {
    footerRoot.innerHTML = renderFooter();
    bindFooterEvents(footerRoot);
  }

  applyI18n(document.body);
}

async function start(): Promise<void> {
  if (started) return;
  started = true;
  initLocale();
  await hydrateFromApi();
  const fromHash = screenFromHash();
  if (fromHash) setScreen(fromHash);
  renderApp();
  subscribe(renderApp);
  window.addEventListener('hashchange', () => {
    const next = screenFromHash();
    if (next) setScreen(next);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void start();
  });
} else {
  void start();
}
