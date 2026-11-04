/**
 * View 01: Lessons Sequence & Interactive Curriculum Stream
 * Styled with radiant coral (#FE580D), deep midnight navy (#111827),
 * authentic student photography, colorful metric cards, and tactile lesson physics.
 */
import { state, setScreen, showToast, notify, authoringLessonsList } from '../state';
import { escapeHtml, openLiveLesson } from '../boot';
import { hubCalChip, studioCover } from '../components/hub';
import { disposeSpatialLab, mountSpatialLab } from '../components/spatialLessonLab';

const LESSON_SHOTS = [
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1456513080800-7d113dc8c4b2?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?auto=format&fit=crop&w=800&q=70',
];

type ShotStatus = 'done' | 'now' | 'quiz' | 'lock' | 'go';

function lessonShot(opts: {
  n: number;
  title: string;
  kicker: string;
  meta: string;
  status: ShotStatus;
  lesson?: string;
  lessonId?: string;
  target?: string;
  extraClass?: string;
}): string {
  const pill =
    opts.status === 'done' ? ['ok', 'Completed'] :
    opts.status === 'now' ? ['', 'Now'] :
    opts.status === 'quiz' ? ['amber', 'Checkpoint'] :
    opts.status === 'lock' ? ['lock', 'Locked'] :
    ['sky', 'Open'];
  const cta =
    opts.status === 'done' ? 'Review' :
    opts.status === 'now' ? 'Enter lab' :
    opts.status === 'quiz' ? 'Take quiz' :
    opts.status === 'lock' ? 'Unlock' :
    'Start';
  return studioCover({
    img: LESSON_SHOTS[(opts.n - 1) % LESSON_SHOTS.length],
    kicker: escapeHtml(opts.kicker),
    title: opts.title,
    meta: escapeHtml(opts.meta),
    pill: pill[1],
    pillClass: pill[0],
    cta: `<span class="hub-cta-dark">${cta}</span>`,
    extraClass: `lesson-row ${opts.extraClass || ''} ${opts.status === 'now' ? 'on' : ''}`,
    attrs: `data-lesson="${opts.lesson || ''}" data-lesson-id="${escapeHtml(opts.lessonId || '')}" ${opts.target ? `data-target="${opts.target}"` : ''}`,
  });
}

function renderLiveLessonRows(): string {
  const nextId = state.liveProgress?.next_lesson?.id;
  return state.liveLessons
    .map((lesson, i) => {
      const n = lesson.position || i + 1;
      const isQuiz = lesson.lesson_type === 'quiz';
      const done = lesson.completed;
      const isActive = lesson.id === nextId && !done;
      const status: ShotStatus = isQuiz ? 'quiz' : done ? 'done' : isActive ? 'now' : 'go';
      return lessonShot({
        n,
        title: escapeHtml(lesson.title),
        kicker: `Lesson ${String(n).padStart(2, '0')} · ${lesson.lesson_type || 'Reading'}`,
        meta: isQuiz ? 'Graded checkpoint' : done ? 'Completed · 100%' : isActive ? 'Interactive lab' : 'Ready to start',
        status,
        lessonId: lesson.id,
        target: isQuiz ? 'quiz' : undefined,
      });
    })
    .join('');
}

function renderDemoLessonCards(): string {
  return [
    lessonShot({ n: 1, lesson: '01', title: 'Foundations of Linear Equations &amp; Cartesian Plane', kicker: 'Lesson 01 · Reading', meta: '6 min · Completed', status: 'done' }),
    lessonShot({ n: 2, lesson: '02', title: 'Understanding Slope, Rise/Run, and Rate of Change', kicker: 'Lesson 02 · Video', meta: '12 min · Completed', status: 'done' }),
    lessonShot({ n: 3, lesson: '03', title: 'Linear Equations: Dynamic Graphs &amp; Axis Intercepts', kicker: 'Lesson 03 · Lab', meta: 'Interactive 3D sandbox', status: 'now' }),
    lessonShot({ n: 4, lesson: '04', title: 'Slope-Intercept Form in Real-World Systems', kicker: 'Lesson 04 · Reading', meta: '10 min · Available', status: 'go' }),
    lessonShot({ n: 5, lesson: '05', title: 'Point-Slope &amp; Standard Form Conversions', kicker: 'Lesson 05 · Video', meta: '15 min · Available', status: 'go' }),
    lessonShot({ n: 6, lesson: '06', title: 'Mid-Unit Knowledge Check: Graded Checkpoint 2', kicker: 'Lesson 06 · Quiz', meta: '6 questions · Moodle sync', status: 'quiz', target: 'quiz' }),
    lessonShot({ n: 7, lesson: '07', title: 'Parallel and Perpendicular Lines Analysis', kicker: 'Lesson 07 · Reading', meta: '8 min · Available', status: 'go' }),
    lessonShot({ n: 8, lesson: '08', title: 'Unit 2 Comprehensive Mastery Examination', kicker: 'Lesson 08 · Exam', meta: 'Unlocks after Checkpoint 2', status: 'lock', target: 'prerequisite-gate' }),
  ].join('');
}

export function renderLessons(): string {
  const isAuthoringOpen = state.authoringPlannerOpen;
  const done = state.liveProgress?.completed_count ?? 2;
  const total = state.liveProgress?.total_count ?? 8;
  const course = escapeHtml(state.liveCourseTitle || 'Class 8 Mathematics');
  const rows = state.connected && state.liveLessons.length ? renderLiveLessonRows() : renderDemoLessonCards();

  return `
    <div class="hub-page">
      <div class="studio-grid">
        <section class="hub-hero studio-main">
          <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=80" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">${course}</p>
            <h1>Continue Lesson 03</h1>
            <p class="hub-hero-sub">${done} of ${total} done · Checkpoint Friday.</p>
            <div class="hub-hero-ctas">
              <button id="hero-launch-active-lesson" class="hub-cta-light" type="button">Open lab <span class="material-symbols-outlined text-[16px]">play_arrow</span></button>
            </div>
          </div>
        </section>
        <section class="hub-cal studio-rail">
          <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=70" alt="">
          <div class="hub-cal-body">
            <h2 class="text-base font-extrabold">Up next</h2>
            <div class="flex flex-col gap-2.5 mt-4">
              ${hubCalChip('orange', 'Cartesian lab', 'Now', 'id="hero-continue-chip"')}
              ${hubCalChip('ghost', 'Checkpoint 2', 'Fri')}
              ${hubCalChip('mint', 'Handbook', 'Offline')}
            </div>
          </div>
        </section>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="hub-seg">
          <span class="hub-seg-btn on"><span class="material-symbols-outlined text-[16px]">ssid_chart</span> Unit 2</span>
          <span class="hub-seg-btn"><span class="material-symbols-outlined text-[16px]">lock</span> Unit 3</span>
        </div>
        <div class="flex items-center gap-2">
          <button id="hero-jump-quiz" class="hub-cta-light" type="button" style="margin-top:0">Checkpoint</button>
          <button id="open-authoring-planner-btn" class="hub-cta-light" type="button" style="margin-top:0">Planner</button>
        </div>
      </div>

      <section class="spatial-lab-panel" id="student-spatial-lab-section" aria-label="Interactive 3D lesson lab">
        <div class="flex flex-wrap items-end justify-between gap-2 mb-2">
          <div>
            <p class="hub-kicker-ink">Spatial lesson · Techartist-style</p>
            <h2 class="text-lg font-extrabold text-[#111827]">Cartesian 3D lab</h2>
            <p class="text-sm text-slate-500 mt-0.5">Predict → try → explain. Orbit the plane, tune slope, drop points.</p>
          </div>
          <button id="spatial-lab-focus-btn" class="hub-cta-dark" type="button" style="margin-top:0">Focus lab</button>
        </div>
        <div id="student-spatial-lab"></div>
      </section>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5" id="lesson-table" role="feed">${rows}</div>
    </div>
    ${isAuthoringOpen ? renderAuthoringPlannerModal() : ''}
  `;
}

function renderAuthoringPlannerModal(): string {
  return `
    <div class="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="relative w-full max-w-4xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[88vh] overflow-y-auto animate-fade-rise">
        
        <div class="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#FFF7ED] text-[#FE580D] flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-[22px]">edit_calendar</span>
            </div>
            <div>
              <h3 class="text-xl font-bold text-[#0F172A] font-headline">DCT Content Authoring &amp; Lesson Planner</h3>
              <p class="text-xs text-[#64748B]">Create, edit learning objectives, attach STEM lab resources, and publish to Moodle / Canvas LTI courseware.</p>
            </div>
          </div>
          <button id="close-planner-btn" class="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Authoring Action Strip -->
        <div class="flex items-center justify-between flex-wrap gap-3 bg-[#FAFBFC] p-4 rounded-2xl border border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
              ${authoringLessonsList.filter(l => l.status === 'published').length} Published
            </span>
            <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              ${authoringLessonsList.filter(l => l.status === 'in-review').length} In-Review
            </span>
            <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
              ${authoringLessonsList.filter(l => l.status === 'draft').length} Draft
            </span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button id="btn-ada-check" class="btn-secondary-3d px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white border border-[#CBD5E1]" title="Section 508 & WCAG 2.1 AA Accessibility Assessment">
              <span class="material-symbols-outlined text-[16px] text-[#10B981]">accessibility_new</span>
              <span>ADA Checker</span>
            </button>
            <button id="btn-etims-sync" class="btn-secondary-3d px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white border border-[#CBD5E1]" title="Enhanced Technical Information Management System Webhook Sync">
              <span class="material-symbols-outlined text-[16px] text-[#0284C7]">sync</span>
              <span>ETIMS Refresh</span>
            </button>
            <button id="btn-create-lesson" class="btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm">
              <span class="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Create New Module</span>
            </button>
          </div>
        </div>

        <!-- List of Authoring Lessons -->
        <div class="space-y-4">
          ${authoringLessonsList.map(lesson => {
            const statusBadge =
              lesson.status === 'published'
                ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                : lesson.status === 'in-review'
                ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]';

            return `
              <div class="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-lg bg-[#111827] text-white flex items-center justify-center font-mono font-bold text-xs">
                      ${lesson.num}
                    </span>
                    <div>
                      <h4 class="text-base font-bold text-[#0F172A]">${lesson.title}</h4>
                      <span class="text-xs text-[#64748B] font-mono">Pacing: ~${lesson.durationMinutes} mins · Last edited ${lesson.updatedAt}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase border ${statusBadge}">
                      ${lesson.status}
                    </span>
                    <button class="publish-to-lti-btn btn-secondary-3d px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer" data-lesson-id="${lesson.id}">
                      <span class="material-symbols-outlined text-[15px] text-[#10B981]">publish</span>
                      <span>Publish to LTI</span>
                    </button>
                  </div>
                </div>

                <!-- Learning Objectives with Bloom's Taxonomy & Standards -->
                <div class="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                  <span class="text-xs font-bold text-[#64748B] font-mono block">Learning Objectives &amp; Alignment:</span>
                  <div class="space-y-1 text-xs">
                    ${lesson.objectives.map(obj => `
                      <div class="flex items-center justify-between p-2 rounded-lg bg-[#FAFBFC] border border-[#E2E8F0]">
                        <span class="text-[#0F172A] font-medium">${obj.text}</span>
                        <div class="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                          <span class="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0284C7] font-semibold">${obj.taxonomy}</span>
                          <span class="text-[#64748B]">${obj.standard}</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Associated Resources -->
                <div class="flex items-center gap-2 flex-wrap pt-1 text-xs font-mono">
                  <span class="text-[#64748B]">Attachments (${lesson.resources.length}):</span>
                  ${lesson.resources.map(res => `
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A]">
                      <span class="material-symbols-outlined text-[14px] text-[#FE580D]">
                        ${res.type === 'lab3d' ? 'view_in_ar' : res.type === 'video' ? 'play_circle' : 'description'}
                      </span>
                      <span>${res.title}</span>
                    </span>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="pt-4 border-t border-[#E2E8F0] flex justify-end">
          <button id="close-planner-btn-2" class="btn-navy-3d px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">
            Close Planner
          </button>
        </div>

      </div>
    </div>
  `;
}

export function bindLessonsEvents(container: HTMLElement): void {
  const labHost = container.querySelector('#student-spatial-lab') as HTMLElement | null;
  if (labHost) {
    mountSpatialLab({
      host: labHost,
      onExplain: (msg) => showToast(msg.slice(0, 120), 'insights'),
    });
  } else {
    disposeSpatialLab();
  }

  // Hero CTA → scroll to embedded 3D lab on this page
  const openLab = () => {
    const section = container.querySelector('#student-spatial-lab-section');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Cartesian 3D lab ready — Predict, Try, Explain', 'view_in_ar');
  };
  container.querySelector('#hero-launch-active-lesson')?.addEventListener('click', openLab);
  container.querySelectorAll('.hero-launch-active-lesson').forEach(btn => btn.addEventListener('click', openLab));
  container.querySelector('#spatial-lab-focus-btn')?.addEventListener('click', openLab);
  container.querySelector('#hero-continue-chip')?.addEventListener('click', openLab);

  container.querySelector('#hero-jump-quiz')?.addEventListener('click', () => {
    setScreen('quiz');
    showToast('Opening Checkpoint 2 Graded Quiz', 'insights');
  });

  // DCT Authoring Planner Open / Close
  container.querySelector('#open-authoring-planner-btn')?.addEventListener('click', () => {
    state.authoringPlannerOpen = true;
    notify();
  });

  container.querySelectorAll('#close-planner-btn, #close-planner-btn-2').forEach(btn => {
    btn.addEventListener('click', () => {
      state.authoringPlannerOpen = false;
      notify();
    });
  });

  // Publish to LTI Course Cartridge
  container.querySelectorAll('.publish-to-lti-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-lesson-id');
      const found = authoringLessonsList.find(l => l.id === id);
      if (found) {
        found.status = 'published';
        found.updatedAt = 'Just now';
        showToast(`Published "${found.title}" to Moodle 4.3 LTI Course Cartridge`, 'verified');
        notify();
      }
    });
  });

  container.querySelector('#btn-ada-check')?.addEventListener('click', () => {
    showToast('ADA Section 508 & WCAG 2.1 AA Assessment: 100% compliant (0 contrast or aria errors)', 'accessibility_new');
  });

  container.querySelector('#btn-etims-sync')?.addEventListener('click', () => {
    showToast('ETIMS Webhook Sync: Synchronized 3 technical manuals and curriculum outlines', 'sync');
  });

  container.querySelector('#btn-create-lesson')?.addEventListener('click', () => {
    showToast('Authoring Studio: Created draft module "Lesson 06: Quadratic Polynomials"', 'add_circle');
  });

  // Individual Lesson Rows
  container.querySelectorAll('.lesson-row').forEach(row => {
    row.addEventListener('click', e => {
      const el = e.currentTarget as HTMLElement;
      const target = el.getAttribute('data-target');
      const lesson = el.getAttribute('data-lesson');
      const liveId = el.getAttribute('data-lesson-id');
      if (state.connected && liveId && target !== 'quiz') {
        void openLiveLesson(liveId);
        return;
      }
      if (target === 'prerequisite-gate') {
        setScreen('prerequisite-gate');
      } else if (target === 'quiz' || lesson === '06') {
        setScreen('quiz');
      } else {
        setScreen('lesson-detail');
      }
    });
  });
}

