/**
 * View 02: Lesson Detail (Lesson 03: Linear Equations · Graphs & Intercepts)
 * Styled with radiant coral (#FE580D), deep midnight navy (#111827),
 * student & educator photography, luminous SVG Cartesian sandbox, and tactile controls.
 */
import { state, setScreen, showToast } from '../state';
import { escapeHtml, markLiveLessonComplete } from '../boot';
import { hubStat } from '../components/hub';
import { mountSpatialLab, type SpatialLabHandle } from '../components/spatialLessonLab';

let detailLab: SpatialLabHandle | null = null;

export function renderLessonDetail(): string {
  const live = state.liveLessonDetail;
  const lessonTitle = live?.title || 'Linear Equations: Graphs & Intercepts';
  const lessonPos = String(live?.position || 3).padStart(2, '0');
  const lessonDone = Boolean(live?.completed);
  return `
    <div class="hub-page">
      <div class="studio-grid">
        <section class="hub-hero studio-main">
          <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=80" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">Lesson ${lessonPos}${live ? (lessonDone ? ' · Complete' : '') : ' of 08'}</p>
            <h1>${escapeHtml(lessonTitle)}</h1>
            <p class="hub-hero-sub">Move slope m and intercept b. Watch the line change.</p>
            <div class="hub-hero-ctas">
              <button id="back-to-lessons-btn" class="hub-cta-light" type="button"><span class="material-symbols-outlined text-[16px]">arrow_back</span> Lessons</button>
            </div>
          </div>
        </section>
        <section class="hub-cal studio-rail">
          <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=70" alt="">
          <div class="hub-cal-body">
            <h2 class="text-base font-extrabold">Cartesian lab</h2>
            <p class="text-sm text-white/75 mt-2">Drag m and b. The graph updates live.</p>
          </div>
        </section>
      </div>
      <div class="hub-stats">
        ${hubStat('menu_book', 'Textbook', 'Left')}
        ${hubStat('view_in_ar', 'Playground', 'Right')}
        ${hubStat(lessonDone ? 'task_alt' : 'pending', 'Status', lessonDone ? 'Done' : 'In progress')}
        ${hubStat('sync', 'Moodle', 'Synced')}
      </div>

      ${live?.body_html ? `
      <section class="mb-4">
        <article class="hub-card text-sm text-[#0F172A] leading-relaxed space-y-3">
          ${live.body_html}
        </article>
      </section>
      ` : ''}

      <!-- Techartist pattern: textbook (left) | playground (right) -->
      <section class="textbook-playground" aria-label="Textbook and playground">
        <aside class="tp-book">
          <p class="hub-kicker-ink">Textbook</p>
          <h2 class="text-xl font-extrabold text-[#111827] mt-1">Slope-intercept form</h2>
          <p class="text-sm text-slate-600 mt-2 leading-relaxed">
            Every non-vertical line is <strong>y = mx + b</strong>. Tap a callout — the playground on the right lights the matching idea.
          </p>
          <div class="tp-formula" id="tp-live-formula">y = <span class="text-[#FE580D]">m</span>x + <span class="text-[#0284C7]">b</span></div>
          <ol class="tp-steps">
            <li>
              <button type="button" class="tp-callout" data-focus="line">
                <strong>1 · The line</strong>
                <span>The graph is all points (x, mx + b).</span>
              </button>
            </li>
            <li>
              <button type="button" class="tp-callout" data-focus="rise">
                <strong>2 · Rise (Δy)</strong>
                <span>How much y changes when x increases.</span>
              </button>
            </li>
            <li>
              <button type="button" class="tp-callout" data-focus="run">
                <strong>3 · Run (Δx)</strong>
                <span>Horizontal step. Slope m = rise ÷ run.</span>
              </button>
            </li>
            <li>
              <button type="button" class="tp-callout" data-focus="b">
                <strong>4 · Intercept b</strong>
                <span>Where the line crosses the y-axis (x = 0).</span>
              </button>
            </li>
          </ol>
          <div class="tp-presets">
            <button type="button" class="tp-preset" data-m="1" data-b="0">m=1, b=0</button>
            <button type="button" class="tp-preset" data-m="2" data-b="-1">Steep</button>
            <button type="button" class="tp-preset" data-m="-1.5" data-b="2">Negative</button>
            <button type="button" class="tp-preset" data-m="0" data-b="2">Flat</button>
          </div>
          <p class="text-xs text-slate-500 mt-3">Pattern: read left → try right → explain back on the left.</p>
        </aside>
        <div class="tp-play">
          <p class="hub-kicker-ink" style="color:#c8f542">Playground</p>
          <h2 class="text-lg font-extrabold text-white mt-1 mb-2">Cartesian 3D lab</h2>
          <div id="lesson-spatial-lab"></div>
        </div>
      </section>

      <!-- ========================================================
           STUDENT STUDY INSIGHTS & MATHEMATICAL DERIVATION
           ======================================================== -->
      <main class="w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <!-- Left Column: Math Theory & Worked Examples -->
          <article class="lg:col-span-8 space-y-6">
            
            <!-- Mathematical Definition Card -->
            <div class="card-depth-interactive rounded-3xl p-6 sm:p-8 bg-white border border-[#E2E8F0] space-y-4">
              <div class="tagline-kicker">
                <span>—— Section 2.3 Theory ——</span>
              </div>
              <h2 class="text-2xl font-bold text-[#0F172A] font-headline">
                The Anatomy of <span class="text-[#FE580D]">Slope-Intercept Form</span>
              </h2>
              <p class="text-sm text-[#475569] leading-relaxed">
                In Cartesian coordinates, every non-vertical straight line can be uniquely specified by two real constants: the rate of steepness (slope <code class="font-mono text-[#FE580D]">m</code>) and the point where it crosses the vertical axis (<code class="font-mono text-[#0284C7]">b</code>).
              </p>

              <!-- Large Formula Display Card -->
              <div class="p-6 rounded-2xl bg-gradient-to-r from-[#FFF7ED] via-white to-[#EBF4FC] border border-[#FED7AA] text-center my-4">
                <div class="text-3xl sm:text-4xl font-bold font-headline tracking-wider text-[#0F172A]">
                  f(x) = <span class="text-[#FE580D]">m</span>x + <span class="text-[#0284C7]">b</span>
                </div>
                <div class="flex items-center justify-center gap-6 mt-3 text-xs font-mono text-[#64748B]">
                  <span class="flex items-center gap-1">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#FE580D]"></span>
                    <strong>m = Slope (Rise/Run)</strong>
                  </span>
                  <span class="flex items-center gap-1">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#0284C7]"></span>
                    <strong>b = y-intercept (0, b)</strong>
                  </span>
                </div>
              </div>
            </div>

            <!-- Worked Step-by-Step Example -->
            <div class="card-depth-interactive rounded-3xl p-6 sm:p-8 bg-white border border-[#E2E8F0] space-y-4">
              <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span class="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#FE580D] text-[20px]">assignment_turned_in</span>
                  <span>Worked Example 2.3: Given Two Coordinates</span>
                </span>
                <span class="text-xs font-mono text-[#10B981] font-bold">Standard Proof</span>
              </div>

              <p class="text-sm text-[#0F172A] font-semibold">
                Find the linear equation passing through points <span class="font-mono text-[#FE580D] bg-[#FFF7ED] px-2 py-0.5 rounded">P₁(1, 3)</span> and <span class="font-mono text-[#0284C7] bg-[#EBF4FC] px-2 py-0.5 rounded">P₂(4, 9)</span>.
              </p>

              <div class="space-y-3 pt-2">
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span class="w-6 h-6 rounded-lg bg-[#FE580D] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                  <div>
                    <strong class="text-xs text-[#0F172A]">Calculate Slope (m):</strong>
                    <div class="font-mono text-xs text-[#FE580D] font-bold mt-0.5">m = (y₂ - y₁) / (x₂ - x₁) = (9 - 3) / (4 - 1) = 6 / 3 = 2</div>
                  </div>
                </div>

                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span class="w-6 h-6 rounded-lg bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                  <div>
                    <strong class="text-xs text-[#0F172A]">Solve for Intercept (b):</strong>
                    <div class="font-mono text-xs text-[#0284C7] font-bold mt-0.5">3 = 2(1) + b  ⟹  b = 3 - 2 = 1</div>
                  </div>
                </div>

                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                  <span class="w-6 h-6 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                  <div>
                    <strong class="text-xs text-[#059669]">Resulting Canonical Equation:</strong>
                    <div class="font-mono text-sm text-[#0F172A] font-bold mt-0.5">y = 2x + 1</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Navigation Bar -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4">
              <button
                id="lesson-ask-vidura"
                class="btn-secondary-3d h-12 px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span class="material-symbols-outlined text-[18px] text-[#FE580D]">auto_awesome</span>
                <span>Ask Vidura Socratic Companion</span>
              </button>

              <div class="flex flex-col sm:flex-row gap-3">
                ${state.connected && live ? `
                <button
                  id="lesson-complete-btn"
                  class="btn-secondary-3d h-12 px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs ${lessonDone ? 'opacity-70' : ''}"
                  type="button"
                  ${lessonDone ? 'disabled' : ''}
                >
                  <span class="material-symbols-outlined text-[18px]">${lessonDone ? 'check_circle' : 'task_alt'}</span>
                  <span>${lessonDone ? 'Lesson complete' : 'Mark lesson complete'}</span>
                </button>
                ` : ''}
                <button
                  id="lesson-take-quiz"
                  class="btn-primary-3d h-12 px-7 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
                >
                  <span>Take Checkpoint 2 Quiz</span>
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>

          </article>

          <aside class="lg:col-span-4 space-y-4">
            <div class="lms-note">
              <span class="material-symbols-outlined text-coral text-[22px] shrink-0">campaign</span>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-wider text-coral">Lab tip</p>
                <p class="text-sm text-navy mt-0.5">Drag <span class="font-bold text-coral">m</span> below 0. The line tilts down — that is the slope on Friday’s quiz.</p>
              </div>
            </div>
            <div class="lms-panel p-5 space-y-3">
              <p class="text-[11px] font-bold uppercase tracking-wider text-coral">Due Friday</p>
              <h3 class="text-base font-bold text-navy">Checkpoint 2</h3>
              <p class="text-xs text-[#475569] leading-relaxed">Perpendicular lines: <code class="text-[#0284C7] font-mono">m₁ · m₂ = -1</code>. Question 4 tests this.</p>
              <button id="sidebar-quiz-jump" class="btn-primary-3d w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer" type="button">
                Open quiz
              </button>
            </div>
          </aside>

        </div>
      </main>

    </div>
  `;
}

export function bindLessonDetailEvents(container: HTMLElement): void {
  container.querySelector('#back-to-lessons-btn')?.addEventListener('click', () => setScreen('lessons'));
  container.querySelector('#lesson-ask-vidura')?.addEventListener('click', () => setScreen('ask-vidura'));
  container.querySelector('#lesson-take-quiz')?.addEventListener('click', () => setScreen('quiz'));
  container.querySelector('#sidebar-quiz-jump')?.addEventListener('click', () => setScreen('quiz'));
  container.querySelector('#lesson-complete-btn')?.addEventListener('click', () => {
    void markLiveLessonComplete();
  });

  const formula = container.querySelector('#tp-live-formula');
  const labHost = container.querySelector('#lesson-spatial-lab') as HTMLElement | null;
  if (labHost) {
    detailLab = mountSpatialLab({
      host: labHost,
      onParams: (m, b) => {
        if (!formula) return;
        const bPart = b >= 0 ? `+ ${b.toFixed(2)}` : `- ${Math.abs(b).toFixed(2)}`;
        formula.innerHTML = `y = <span class="text-[#FE580D]">${m.toFixed(2)}</span>x ${bPart}`;
      },
    });
  }

  container.querySelectorAll('.tp-callout').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const focus = (e.currentTarget as HTMLElement).getAttribute('data-focus') as
        | 'rise'
        | 'run'
        | 'b'
        | 'line'
        | null;
      container.querySelectorAll('.tp-callout').forEach((el) => el.classList.remove('on'));
      (e.currentTarget as HTMLElement).classList.add('on');
      if (focus) detailLab?.focusConcept(focus);
    });
  });

  container.querySelectorAll('.tp-preset').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLElement;
      const m = parseFloat(el.getAttribute('data-m') || '1');
      const b = parseFloat(el.getAttribute('data-b') || '0');
      detailLab?.setSlope(m);
      detailLab?.setIntercept(b);
      showToast(`Playground: y = ${m}x + ${b}`, 'view_in_ar');
    });
  });
}
