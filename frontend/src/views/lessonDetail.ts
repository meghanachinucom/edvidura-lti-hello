/**
 * View 02: Lesson Detail (Lesson 03: Linear Equations · Graphs & Intercepts)
 * Styled with radiant coral (#FE580D), deep midnight navy (#111827),
 * student & educator photography, luminous SVG Cartesian sandbox, and tactile controls.
 */
import { state, setScreen, showToast } from '../state';
import { escapeHtml, markLiveLessonComplete } from '../boot';
import { hubStat } from '../components/hub';

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
        ${hubStat('ssid_chart', 'Lab', 'Open')}
        ${hubStat('schedule', 'Read', '8 min')}
        ${hubStat(lessonDone ? 'task_alt' : 'pending', 'Status', lessonDone ? 'Done' : 'In progress')}
        ${hubStat('sync', 'Moodle', 'Synced')}
      </div>

      ${live?.body_html ? `
      <section class="w-full px-4 sm:px-6 lg:px-8 pt-2">
        <div class="max-w-7xl mx-auto">
          <article class="card-depth-interactive rounded-3xl p-6 sm:p-8 bg-white border border-[#E2E8F0] text-sm text-[#0F172A] leading-relaxed space-y-3">
            ${live.body_html}
          </article>
        </div>
      </section>
      ` : ''}

      <!-- ========================================================
           INTERACTIVE CARTESIAN 3D STUDIO (Side-by-Side on Laptop)
           ======================================================== -->
      <section class="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div class="max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-6 items-stretch">
          
          <!-- Outer Chassis Container with Deep Midnight Navy & Glowing SVG (7 cols on lg, 8 cols on xl) -->
          <div class="lg:col-span-7 xl:col-span-8 relative w-full h-[340px] sm:h-[400px] lg:h-[460px] hub-studio overflow-hidden select-none group" id="graph-wrapper">
            
            <!-- Cartographic Coordinate Grid with Glow Filter -->
            <svg id="interactive-svg-plot" class="absolute inset-0 w-full h-full transition-all" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="svg-neon-glow-full" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <pattern height="20" id="graph-minor-neon" patternUnits="userSpaceOnUse" width="20">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" stroke-width="0.5"></path>
                </pattern>
                <pattern height="100" id="graph-major-neon" patternUnits="userSpaceOnUse" width="100">
                  <rect fill="url(#graph-minor-neon)" height="100" width="100"></rect>
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#475569" stroke-width="1.2"></path>
                </pattern>
              </defs>
              
              <!-- Background Grids -->
              <rect fill="#111827" height="100%" width="100%"></rect>
              <rect fill="url(#graph-major-neon)" height="100%" width="100%"></rect>
              
              <!-- X & Y Axes with Crisp Illumination -->
              <line stroke="#56829E" stroke-width="2.5" x1="6%" x2="94%" y1="65%" y2="65%"></line>
              <line stroke="#56829E" stroke-width="2.5" x1="40%" x2="40%" y1="8%" y2="92%"></line>
              
              <!-- Coordinate Axis Labels -->
              <text fill="#93C5FD" font-family="Outfit" font-size="14" font-weight="700" x="93%" y="62%">x</text>
              <text fill="#93C5FD" font-family="Outfit" font-size="14" font-weight="700" x="41.5%" y="13%">y</text>
              <text fill="#64748B" font-family="Outfit" font-size="11" x="37%" y="70%">(0, 0)</text>
              
              <!-- Luminous Function Vector Line with Neon Filter in EdVidura Coral -->
              <line id="svg-function-line" stroke="#FE580D" stroke-linecap="round" stroke-width="5" filter="url(#svg-neon-glow-full)" x1="16%" x2="84%" y1="78%" y2="35%"></line>
              
              <!-- Triangle Rise/Run Visualization in Glowing Sky -->
              <path id="svg-rise-run-path" d="M 40% 58% L 64% 58% L 64% 42%" fill="none" stroke="#38BDF8" stroke-dasharray="4 3" stroke-width="2.5"></path>
              <text id="svg-run-text" fill="#38BDF8" font-family="Outfit" font-size="11" font-weight="700" x="48%" y="62.5%">Δx = +3 (Run)</text>
              <text id="svg-rise-text" fill="#38BDF8" font-family="Outfit" font-size="11" font-weight="700" x="65.5%" y="50%">Δy = +2 (Rise)</text>
              
              <!-- Intercept Point A: (0, b) with Pulsing Halo -->
              <circle id="svg-intercept-circle" cx="40%" cy="58%" fill="#FE580D" r="7.5" stroke="#FFFFFF" stroke-width="2.5" class="shadow-lg"></circle>
              <text id="svg-intercept-text" fill="#FFEDD5" font-family="Outfit" font-size="11" font-weight="700" x="22%" y="57%">y-intercept (0, 1)</text>
              
              <!-- Point B: (x2, y2) -->
              <circle id="svg-point2-circle" cx="64%" cy="42%" fill="#38BDF8" r="7.5" stroke="#FFFFFF" stroke-width="2.5"></circle>
              <text id="svg-point2-text" fill="#E0F2FE" font-family="Outfit" font-size="11" font-weight="700" x="66%" y="40%">P₂ (3, 3)</text>
            </svg>

            <!-- Top Floating Status Overlay in Glassmorphism -->
            <div class="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between pointer-events-none gap-2">
              <span class="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#111827]/95 backdrop-blur-md rounded-xl border border-white/20 text-white text-xs font-mono shadow-lg truncate">
                <span class="w-2.5 h-2.5 rounded-full bg-[#FE580D] animate-pulse shrink-0"></span>
                <span id="live-equation-badge" class="truncate">Live Equation: <strong class="text-[#FE580D] font-bold">f(x) = (2/3)x + 1</strong></span>
              </span>
              <span class="text-[10px] sm:text-[11px] font-mono bg-[#111827]/95 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-white/80 uppercase tracking-wider font-bold shadow-lg shrink-0">
                Cartesian Studio
              </span>
            </div>
          </div>

          <!-- Sandbox Controls Deck: 3D Sliders & Presets (5 cols on lg, 4 cols on xl) -->
          <div class="lg:col-span-5 xl:col-span-4 card-depth-interactive rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6 bg-white border border-[#E2E8F0]">
            <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[#FE580D] text-[20px]">tune</span>
                <span class="text-xs font-bold text-[#0F172A] uppercase tracking-wider font-mono">Parameters Deck</span>
              </div>
              <span class="text-[11px] font-mono text-[#10B981] font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-[#10B981]"></span>
                Live Render
              </span>
            </div>

            <!-- Sliders for m and b -->
            <div class="space-y-5">
              <!-- Slope Slider (m) in Radiant Coral -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs font-semibold">
                  <span class="text-[#0F172A]">Slope Parameter (m):</span>
                  <span class="font-mono font-bold text-[#FE580D] text-xs sm:text-sm tabular-nums bg-[#FFF7ED] px-2.5 py-0.5 rounded-lg border border-[#FED7AA]" id="slider-m-val">+0.67 (2/3)</span>
                </div>
                <input
                  id="slider-slope-m"
                  type="range"
                  min="-3"
                  max="3"
                  step="0.25"
                  value="0.67"
                  class="w-full accent-[#FE580D] cursor-pointer"
                />
                <div class="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>-3.00 (Steep Neg)</span>
                  <span>0.00 (Horizontal)</span>
                  <span>+3.00 (Steep Pos)</span>
                </div>
              </div>

              <!-- Intercept Slider (b) in Sky Blue -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs font-semibold">
                  <span class="text-[#0F172A]">Vertical Intercept (b):</span>
                  <span class="font-mono font-bold text-[#0284C7] text-xs sm:text-sm tabular-nums bg-[#EBF4FC] px-2.5 py-0.5 rounded-lg border border-[#BAE6FD]" id="slider-b-val">+1.0</span>
                </div>
                <input
                  id="slider-intercept-b"
                  type="range"
                  min="-4"
                  max="4"
                  step="0.5"
                  value="1"
                  class="w-full accent-[#0284C7] cursor-pointer"
                />
                <div class="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>-4.0 (Lower Quadrant)</span>
                  <span>0.0 (Origin)</span>
                  <span>+4.0 (Upper Quadrant)</span>
                </div>
              </div>
            </div>

            <!-- Preset Scenarios -->
            <div class="space-y-2.5 pt-2 border-t border-[#E2E8F0]">
              <span class="text-[10px] uppercase tracking-wider text-[#64748B] font-bold font-mono">Standard Algebra Scenarios:</span>
              <div class="grid grid-cols-2 gap-2">
                <button class="preset-btn px-2.5 py-1.5 rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#FE580D] border border-[#FED7AA] text-xs font-bold transition-all cursor-pointer text-center" data-m="0.67" data-b="1" id="btn-preset-std">
                  Standard f(x)
                </button>
                <button class="preset-btn px-2.5 py-1.5 rounded-xl bg-[#EBF4FC] hover:bg-[#D9EDFB] text-[#0284C7] border border-[#BAE6FD] text-xs font-bold transition-all cursor-pointer text-center" data-m="2" data-b="-1" id="btn-preset-steep">
                  Steep Rise (m=2)
                </button>
                <button class="preset-btn px-2.5 py-1.5 rounded-xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] text-xs font-bold transition-all cursor-pointer text-center" data-m="-1.5" data-b="2" id="btn-preset-neg">
                  Negative Slope
                </button>
                <button class="preset-btn px-2.5 py-1.5 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] text-xs font-bold transition-all cursor-pointer text-center" data-m="0" data-b="2" id="btn-preset-flat">
                  Zero Slope Line
                </button>
              </div>
            </div>

            <!-- Reset Button -->
            <button id="reset-cartesian-btn" class="w-full py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#CBD5E1] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset Default Baseline</span>
            </button>

          </div>

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

  // Live Cartesian Plotter Sandbox logic
  const sliderM = container.querySelector('#slider-slope-m') as HTMLInputElement;
  const sliderB = container.querySelector('#slider-intercept-b') as HTMLInputElement;
  const mVal = container.querySelector('#slider-m-val');
  const bVal = container.querySelector('#slider-b-val');
  const equationBadge = container.querySelector('#live-equation-badge');

  const lineEl = container.querySelector('#svg-function-line');
  const circleIntercept = container.querySelector('#svg-intercept-circle');
  const textIntercept = container.querySelector('#svg-intercept-text');
  const circleP2 = container.querySelector('#svg-point2-circle');
  const textP2 = container.querySelector('#svg-point2-text');
  const riseRunPath = container.querySelector('#svg-rise-run-path');
  const riseText = container.querySelector('#svg-rise-text');
  const runText = container.querySelector('#svg-run-text');

  const updateGraph = (m: number, b: number) => {
    if (mVal) mVal.textContent = (m >= 0 ? '+' : '') + m.toFixed(2);
    if (bVal) bVal.textContent = (b >= 0 ? '+' : '') + b.toFixed(1);

    const bSign = b >= 0 ? `+ ${b.toFixed(1)}` : `- ${Math.abs(b).toFixed(1)}`;
    if (equationBadge) {
      equationBadge.innerHTML = `Live Equation: <strong class="text-[#FE580D] font-bold">f(x) = ${m.toFixed(2)}x ${bSign}</strong>`;
    }

    // Origin in SVG coordinates: X_0 = 40%, Y_0 = 65%
    // Scale: 1 unit = 7% on X, 7% on Y
    const originX = 40;
    const originY = 65;
    const unitScale = 7;

    // y = mx + b
    // Intercept Point (0, b)
    const interceptY = originY - b * unitScale;
    const clampY = Math.max(12, Math.min(88, interceptY));

    circleIntercept?.setAttribute('cx', `${originX}%`);
    circleIntercept?.setAttribute('cy', `${clampY}%`);
    if (textIntercept) {
      textIntercept.setAttribute('x', `${originX - 16}%`);
      textIntercept.setAttribute('y', `${clampY - 1}%`);
      textIntercept.textContent = `(0, ${b.toFixed(1)})`;
    }

    // Point P2 at x = +3
    const x2 = 3;
    const y2 = m * x2 + b;
    const p2X = originX + x2 * unitScale;
    const p2Y = originY - y2 * unitScale;
    const clampP2Y = Math.max(12, Math.min(88, p2Y));

    circleP2?.setAttribute('cx', `${p2X}%`);
    circleP2?.setAttribute('cy', `${clampP2Y}%`);
    if (textP2) {
      textP2.setAttribute('x', `${p2X + 2}%`);
      textP2.setAttribute('y', `${clampP2Y - 1}%`);
      textP2.textContent = `P₂ (3, ${y2.toFixed(1)})`;
    }

    // Line endpoints (x = -3 to x = +6)
    const lineX1 = originX - 3 * unitScale;
    const lineY1 = Math.max(12, Math.min(88, originY - (m * -3 + b) * unitScale));
    const lineX2 = originX + 6 * unitScale;
    const lineY2 = Math.max(12, Math.min(88, originY - (m * 6 + b) * unitScale));

    lineEl?.setAttribute('x1', `${lineX1}%`);
    lineEl?.setAttribute('y1', `${lineY1}%`);
    lineEl?.setAttribute('x2', `${lineX2}%`);
    lineEl?.setAttribute('y2', `${lineY2}%`);

    // Rise / Run Triangle from (0, b) to (3, y2)
    riseRunPath?.setAttribute('d', `M ${originX}% ${clampY}% L ${p2X}% ${clampY}% L ${p2X}% ${clampP2Y}%`);
    if (runText) {
      runText.setAttribute('x', `${(originX + p2X) / 2 - 5}%`);
      runText.setAttribute('y', `${clampY + 4}%`);
    }
    if (riseText) {
      riseText.setAttribute('x', `${p2X + 2}%`);
      riseText.setAttribute('y', `${(clampY + clampP2Y) / 2}%`);
      const deltaY = y2 - b;
      riseText.textContent = `Δy = ${deltaY >= 0 ? '+' : ''}${deltaY.toFixed(1)}`;
    }
  };

  sliderM?.addEventListener('input', () => {
    const m = parseFloat(sliderM.value);
    const b = parseFloat(sliderB.value);
    updateGraph(m, b);
  });

  sliderB?.addEventListener('input', () => {
    const m = parseFloat(sliderM.value);
    const b = parseFloat(sliderB.value);
    updateGraph(m, b);
  });

  container.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const m = parseFloat((e.currentTarget as HTMLElement).getAttribute('data-m') || '0.67');
      const b = parseFloat((e.currentTarget as HTMLElement).getAttribute('data-b') || '1');
      if (sliderM) sliderM.value = m.toString();
      if (sliderB) sliderB.value = b.toString();
      updateGraph(m, b);
      showToast(`Graph updated: f(x) = ${m}x + ${b}`, 'insights');
    });
  });

  container.querySelector('#reset-cartesian-btn')?.addEventListener('click', () => {
    if (sliderM) sliderM.value = '0.67';
    if (sliderB) sliderB.value = '1';
    updateGraph(0.67, 1);
    showToast('Reset to Lesson 03 standard form: f(x) = (2/3)x + 1', 'restart_alt');
  });
}
