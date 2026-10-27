/**
 * View 01: Lessons Sequence & Interactive Curriculum Stream
 * Styled with radiant coral (#FF4757), deep midnight navy (#071E2D),
 * authentic student photography, colorful metric cards, and tactile lesson physics.
 */
import { state, setScreen, showToast, notify, authoringLessonsList } from '../state';
import { escapeHtml, openLiveLesson } from '../boot';

function renderLiveLessonRows(): string {
  const nextId = state.liveProgress?.next_lesson?.id;
  return state.liveLessons
    .map((lesson, i) => {
      const n = String(lesson.position || i + 1).padStart(2, '0');
      const isQuiz = lesson.lesson_type === 'quiz';
      const done = lesson.completed;
      const isActive = lesson.id === nextId && !done;
      if (isQuiz) {
        return `
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-[#FFFBEB] via-white to-[#FFFBEB] border-2 border-[#F59E0B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group" data-lesson-id="${escapeHtml(lesson.id)}" data-target="quiz">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[26px]">quiz</span>
                </div>
                <div>
                  <div class="text-xs font-mono text-[#D97706] font-bold mb-1">Lesson ${n} · Checkpoint</div>
                  <h3 class="text-lg font-bold text-[#0F172A] font-headline">${escapeHtml(lesson.title)}</h3>
                </div>
              </div>
              <button class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold" type="button">Take Assessment</button>
            </div>`;
      }
      const wrap = isActive
        ? 'active-lesson bg-gradient-to-r from-[#FFF0F3] via-white to-[#FFF0F3] border-2 border-[#FF4757]'
        : 'bg-white';
      return `
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 ${wrap} flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group" data-lesson-id="${escapeHtml(lesson.id)}">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-10 h-10 rounded-xl ${done ? 'bg-[#ECFDF5] text-[#10B981]' : isActive ? 'bg-[#FF4757] text-white' : 'bg-[#EBF4FC] text-[#0284C7]'} flex items-center justify-center font-bold font-mono text-sm shrink-0">
                  ${done ? '<span class="material-symbols-outlined text-[20px]">check</span>' : n}
                </div>
                <div>
                  <div class="text-xs text-[#64748B] mb-1 font-mono">Lesson ${n} · ${escapeHtml(lesson.lesson_type || 'Reading')}</div>
                  <h3 class="text-base font-bold text-[#0F172A] group-hover:text-[#FF4757] font-headline">${escapeHtml(lesson.title)}</h3>
                </div>
              </div>
              <span class="text-xs font-semibold font-mono ${done ? 'text-[#10B981]' : 'text-[#0284C7]'}">${done ? 'Completed' : isActive ? 'Continue' : 'Start'}</span>
            </div>`;
    })
    .join('');
}

export function renderLessons(): string {
  const isAuthoringOpen = state.authoringPlannerOpen;

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC]">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 flex flex-col gap-8">
        
        <!-- ========================================================
             COLORFUL HERO BANNER: Unit Overview with Student Photo
             ======================================================== -->
        <section class="hero-navy-card relative overflow-hidden rounded-3xl text-white p-6 sm:p-10 shadow-xl" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
          <!-- Ambient glowing orbs -->
          <div class="absolute -top-24 -right-24 w-80 h-80 bg-[#FF4757]/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-20 w-72 h-72 bg-[#0284C7]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <!-- Left Info Deck -->
            <div class="lg:col-span-7 space-y-4">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono">
                <span class="w-2 h-2 rounded-full bg-[#FF4757] animate-pulse"></span>
                <span class="text-white font-semibold">Unit 2 Curriculum</span>
                <span class="text-gray-400">·</span>
                <span class="text-gray-300">Riverside High Algebra I</span>
              </div>

              <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-headline leading-tight">
                Linear Relationships &amp; <span class="text-[#FF4757]">Cartesian Modeling</span>
              </h1>

              <p class="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl">
                Master slope-intercept form, coordinate geometry, rate-of-change proofs, and 3D parameter vectors through sequential coursework and real-time interactive sandboxes.
              </p>

              <!-- Quick Action Buttons -->
              <div class="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="hero-launch-active-lesson"
                  class="btn-primary-3d px-6 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <span class="material-symbols-outlined text-[18px]">play_circle</span>
                  <span>Continue Lesson 03 (Active)</span>
                </button>

                <button
                  id="hero-jump-quiz"
                  class="btn-secondary-3d px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <span class="material-symbols-outlined text-[18px] text-[#F59E0B]">quiz</span>
                  <span>Take Checkpoint 2</span>
                </button>

                <button
                  id="open-authoring-planner-btn"
                  class="btn-secondary-3d px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <span class="material-symbols-outlined text-[18px] text-[#38BDF8]">edit_calendar</span>
                  <span>DCT Lesson Planner</span>
                </button>
              </div>
            </div>

            <!-- Right Visual: Student Collaboration Photo with Floating Badges -->
            <div class="lg:col-span-5 relative flex justify-center">
              <div class="relative w-full max-w-md h-64 sm:h-72 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
                  alt="Students Collaborating in Algebra Lab"
                  class="w-full h-full object-cover"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                <!-- Floating Badge 1: Lead Instructor -->
                <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/60 shadow-md flex items-center gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80"
                    alt="Dr. Martinez"
                    class="w-7 h-7 rounded-full object-cover ring-2 ring-[#FF4757]"
                  />
                  <div>
                    <div class="text-[11px] font-bold text-[#0F172A]">Dr. Martinez</div>
                    <div class="text-[9px] text-[#64748B]">Lead STEM Professor</div>
                  </div>
                </div>

                <!-- Floating Badge 2: Progress -->
                <div class="absolute top-3 right-3 bg-[#071E2D]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-md flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  <span class="text-xs font-bold text-white font-mono">2 / 8 Done</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- ========================================================
             COLORFUL METRICS COUNTER RIBBON
             ======================================================== -->
        <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Metric 1 -->
          <div class="card-depth-interactive rounded-2xl p-4 sm:p-5 bg-white flex items-center gap-3.5 border-l-4 border-l-[#FF4757]">
            <div class="w-11 h-11 rounded-xl bg-[#FFF0F3] text-[#FF4757] flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-[#0F172A] font-headline">8 Lessons</div>
              <div class="text-xs text-[#64748B]">Unit Syllabus Scope</div>
            </div>
          </div>

          <!-- Metric 2 -->
          <div class="card-depth-interactive rounded-2xl p-4 sm:p-5 bg-white flex items-center gap-3.5 border-l-4 border-l-[#10B981]">
            <div class="w-11 h-11 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-[24px]">task_alt</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-[#0F172A] font-headline">2 Completed</div>
              <div class="text-xs text-[#64748B]">Pace: Ahead of Target</div>
            </div>
          </div>

          <!-- Metric 3 -->
          <div class="card-depth-interactive rounded-2xl p-4 sm:p-5 bg-white flex items-center gap-3.5 border-l-4 border-l-[#0284C7]">
            <div class="w-11 h-11 rounded-xl bg-[#EBF4FC] text-[#0284C7] flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-[24px]">ssid_chart</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-[#0F172A] font-headline">1 Live Lab</div>
              <div class="text-xs text-[#64748B]">Interactive Cartesian 3D</div>
            </div>
          </div>

          <!-- Metric 4 -->
          <div class="card-depth-interactive rounded-2xl p-4 sm:p-5 bg-white flex items-center gap-3.5 border-l-4 border-l-[#F59E0B]">
            <div class="w-11 h-11 rounded-xl bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-[24px]">military_tech</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-[#0F172A] font-headline">Checkpoint 2</div>
              <div class="text-xs text-[#64748B]">6 Graded Questions Ready</div>
            </div>
          </div>

        </section>

        <!-- ========================================================
             CURRICULUM LESSON CARDS STREAM
             ======================================================== -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#FF4757]"></span>
              <h2 class="text-xl font-bold text-[#0F172A] font-headline">Unit 2 Lesson Stream</h2>
            </div>
            <span class="text-xs text-[#64748B] font-mono">CCSS.MATH.CONTENT.HSA.CED.A.2</span>
          </div>

          <div class="flex flex-col gap-3.5" id="lesson-table" role="feed">
            ${state.connected && state.liveLessons.length ? renderLiveLessonRows() : `
            <!-- Card 01: Completed -->
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-[#10B981] group" data-lesson="01">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold font-mono text-sm shrink-0">
                  <span class="material-symbols-outlined text-[20px]">check</span>
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap text-xs text-[#64748B] mb-1 font-mono">
                    <span class="font-bold text-[#10B981]">Lesson 01</span>
                    <span>·</span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">article</span>
                      <span>Reading</span>
                    </span>
                    <span>·</span>
                    <span>6 min</span>
                  </div>
                  <h3 class="text-base font-bold text-[#0F172A] group-hover:text-[#FF4757] transition-colors font-headline">
                    Foundations of Linear Equations &amp; Cartesian Plane
                  </h3>
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
                <span class="text-xs font-bold text-[#10B981] flex items-center gap-1 font-mono">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Completed · 100%</span>
                </span>
                <button class="btn-secondary-3d px-3 py-1.5 rounded-lg text-xs font-semibold">
                  Review
                </button>
              </div>
            </div>

            <!-- Card 02: Completed -->
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-[#10B981] group" data-lesson="02">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold font-mono text-sm shrink-0">
                  <span class="material-symbols-outlined text-[20px]">check</span>
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap text-xs text-[#64748B] mb-1 font-mono">
                    <span class="font-bold text-[#10B981]">Lesson 02</span>
                    <span>·</span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">smart_display</span>
                      <span>Video Lecture</span>
                    </span>
                    <span>·</span>
                    <span>12 min</span>
                  </div>
                  <h3 class="text-base font-bold text-[#0F172A] group-hover:text-[#FF4757] transition-colors font-headline">
                    Understanding Slope, Rise/Run, and Rate of Change
                  </h3>
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
                <span class="text-xs font-bold text-[#10B981] flex items-center gap-1 font-mono">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Completed · 100%</span>
                </span>
                <button class="btn-secondary-3d px-3 py-1.5 rounded-lg text-xs font-semibold">
                  Review
                </button>
              </div>
            </div>

            <!-- Card 03: ACTIVE STAGE - High Energy Radiant Coral Glow -->
            <div class="lesson-row active-lesson card-depth-interactive rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-[#FFF0F3] via-white to-[#FFF0F3] border-2 border-[#FF4757] shadow-[0_8px_24px_rgba(255,71,87,0.18)] flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group" data-lesson="03">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF5B6B] to-[#FF4757] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0 animate-pulse">
                  <span class="material-symbols-outlined text-[26px]">ssid_chart</span>
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap text-xs mb-1 font-mono">
                    <span class="px-2 py-0.5 rounded-md bg-[#FF4757] text-white font-bold text-[10px] uppercase tracking-wider">Current Active Unit</span>
                    <span class="text-[#FF4757] font-bold">Lesson 03</span>
                    <span class="text-[#64748B]">·</span>
                    <span class="text-[#0284C7] font-semibold flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">tune</span>
                      <span>Interactive 3D Sandbox</span>
                    </span>
                  </div>
                  <h3 class="text-lg font-bold text-[#0F172A] font-headline group-hover:text-[#FF4757] transition-colors">
                    Linear Equations: Dynamic Graphs &amp; Axis Intercepts
                  </h3>
                  <p class="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                    Hands-on vector sliders for slope m and y-intercept b with real-time SVG geometry rendering.
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0">
                <button class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md">
                  <span>Enter Sandbox</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <!-- Card 04: Available -->
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-[#0284C7] group" data-lesson="04">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#EBF4FC] text-[#0284C7] flex items-center justify-center font-bold font-mono text-sm shrink-0">
                  04
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap text-xs text-[#64748B] mb-1 font-mono">
                    <span class="text-[#0284C7] font-bold">Lesson 04</span>
                    <span>·</span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">article</span>
                      <span>Reading</span>
                    </span>
                    <span>·</span>
                    <span>10 min</span>
                  </div>
                  <h3 class="text-base font-bold text-[#0F172A] group-hover:text-[#FF4757] transition-colors font-headline">
                    Slope-Intercept Form in Real-World Systems ($y = mx + b$)
                  </h3>
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
                <span class="text-xs font-semibold text-[#0284C7] font-mono">Available</span>
                <button class="btn-secondary-3d px-3.5 py-1.5 rounded-lg text-xs font-semibold">
                  Start →
                </button>
              </div>
            </div>

            <!-- Card 05: Available -->
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-[#0284C7] group" data-lesson="05">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#EBF4FC] text-[#0284C7] flex items-center justify-center font-bold font-mono text-sm shrink-0">
                  05
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap text-xs text-[#64748B] mb-1 font-mono">
                    <span class="text-[#0284C7] font-bold">Lesson 05</span>
                    <span>·</span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">smart_display</span>
                      <span>Video &amp; Proofs</span>
                    </span>
                    <span>·</span>
                    <span>15 min</span>
                  </div>
                  <h3 class="text-base font-bold text-[#0F172A] group-hover:text-[#FF4757] transition-colors font-headline">
                    Point-Slope &amp; Standard Form Conversions
                  </h3>
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
                <span class="text-xs font-semibold text-[#0284C7] font-mono">Available</span>
                <button class="btn-secondary-3d px-3.5 py-1.5 rounded-lg text-xs font-semibold">
                  Start →
                </button>
              </div>
            </div>

            <!-- Card 06: Graded Checkpoint Gateway (Amber Glow) -->
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-[#FFFBEB] via-white to-[#FFFBEB] border-2 border-[#F59E0B] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group" data-lesson="06" data-target="quiz">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                  <span class="material-symbols-outlined text-[26px]">quiz</span>
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap text-xs mb-1 font-mono">
                    <span class="px-2 py-0.5 rounded-md bg-[#F59E0B] text-white font-bold text-[10px] uppercase tracking-wider">Official Checkpoint</span>
                    <span class="text-[#D97706] font-bold">Lesson 06</span>
                    <span class="text-[#64748B]">·</span>
                    <span class="text-[#D97706]">6 Questions</span>
                    <span class="text-[#64748B]">·</span>
                    <span class="text-[#10B981] font-semibold">Instant Grade Sync</span>
                  </div>
                  <h3 class="text-lg font-bold text-[#0F172A] font-headline group-hover:text-[#D97706] transition-colors">
                    Mid-Unit Knowledge Check: Graded Checkpoint 2
                  </h3>
                  <p class="text-xs text-[#64748B] mt-0.5">
                    Evaluates slope quotient, standard form axis intercepts, and perpendicular line theorems.
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0">
                <button class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-gradient-to-b from-[#F59E0B] to-[#D97706] text-white shadow-md">
                  <span>Take Assessment</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <!-- Card 07: Available -->
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-[#0284C7] group" data-lesson="07">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#EBF4FC] text-[#0284C7] flex items-center justify-center font-bold font-mono text-sm shrink-0">
                  07
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap text-xs text-[#64748B] mb-1 font-mono">
                    <span class="text-[#0284C7] font-bold">Lesson 07</span>
                    <span>·</span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">article</span>
                      <span>Reading</span>
                    </span>
                    <span>·</span>
                    <span>8 min</span>
                  </div>
                  <h3 class="text-base font-bold text-[#0F172A] group-hover:text-[#FF4757] transition-colors font-headline">
                    Parallel and Perpendicular Lines Analysis ($m_1 \\cdot m_2 = -1$)
                  </h3>
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
                <span class="text-xs font-semibold text-[#0284C7] font-mono">Available</span>
                <button class="btn-secondary-3d px-3.5 py-1.5 rounded-lg text-xs font-semibold">
                  Start →
                </button>
              </div>
            </div>

            <!-- Card 08: Locked Unit Assessment -->
            <div class="lesson-row card-depth-interactive rounded-2xl p-5 bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer opacity-75 hover:opacity-100 transition-opacity group" data-target="prerequisite-gate">
              <div class="flex items-start sm:items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold font-mono text-sm shrink-0">
                  <span class="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap text-xs text-[#64748B] mb-1 font-mono">
                    <span>Lesson 08</span>
                    <span>·</span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">school</span>
                      <span>Final Exam</span>
                    </span>
                    <span>·</span>
                    <span>45 min</span>
                  </div>
                  <h3 class="text-base font-bold text-[#0F172A] font-headline">
                    Unit 2 Comprehensive Mastery Examination
                  </h3>
                  <p class="text-xs text-[#64748B] mt-0.5">
                    Unlocks once Checkpoint 2 achieves 80%+ score or prerequisite diagnosis is completed.
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
                <span class="text-xs font-bold text-[#64748B] flex items-center gap-1 font-mono">
                  <span class="material-symbols-outlined text-[16px]">lock_clock</span>
                  <span>Prerequisite Gate</span>
                </span>
                <button class="btn-secondary-3d px-3.5 py-1.5 rounded-lg text-xs font-semibold">
                  Unlock →
                </button>
              </div>
            </div>
            `}

          </div>
        </div>

        <!-- Clean Academic Bottom Spacer -->
        <div class="h-8 w-full"></div>

      </div>

      <!-- Module 6: DCT Content Authoring & Lesson Planner Modal -->
      ${isAuthoringOpen ? renderAuthoringPlannerModal() : ''}

    </div>
  `;
}

function renderAuthoringPlannerModal(): string {
  return `
    <div class="fixed inset-0 z-50 bg-[#071E2D]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="relative w-full max-w-4xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[88vh] overflow-y-auto animate-fade-rise">
        
        <div class="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#FFF0F3] text-[#FF4757] flex items-center justify-center font-bold">
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
                    <span class="w-7 h-7 rounded-lg bg-[#071E2D] text-white flex items-center justify-center font-mono font-bold text-xs">
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
                      <span class="material-symbols-outlined text-[14px] text-[#FF4757]">
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
  // Hero CTA buttons
  container.querySelector('#hero-launch-active-lesson')?.addEventListener('click', () => {
    setScreen('lesson-detail');
    showToast('Launching Cartesian Sandbox Lesson 03', 'insights');
  });

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

