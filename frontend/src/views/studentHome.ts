/**
 * View 00: EdVidura Flagship Academic Experience & Student Hub
 * Inspired by the radiant coral & midnight navy aesthetic (Screenshot_2026-10-21_051149_2ac561ab.png)
 * Applied directly to EdVidura's existing STEM features, Cartesian workbench, and LTI 1.3 tools.
 *
 * Senior Designer Craft:
 * - Signature EdVidura Radiant Coral (#FF4757) and Deep Midnight Navy (#071E2D)
 * - Hero with student visual, pastel polygon backdrop & floating interactive chips
 * - Direct feature quick-launch dock: Cartesian Sandbox, Ask Vidura AI, Checkpoint Quiz, Teacher Analytics, Moodle LTI
 * - 50k+ Midnight Navy Stats Ribbon
 * - 3-Step Connected Journey: "Check How We Work in Easy Steps"
 * - Multi-feature "Why Choose EdVidura E-Learning Experience"
 * - "Most Popular Courses" showcase with category pills & star ratings
 * - "Featured topics by Category" (Midnight Navy Showcase card)
 * - "EdVidura's Mission: Democratize Intuitive STEM Education"
 * - Student Testimonials carousel
 * - "Latest from the Blog" editorial cards
 */
import { state, setScreen, showToast } from '../state';
import { classLabel, escapeHtml, firstName, openLiveLesson } from '../boot';

export function renderStudentHome(): string {
  const pct = state.liveProgress?.percent ?? (state.quizScore.total ? state.quizScore.percent : 88);
  const done = state.liveProgress?.completed_count ?? 6;
  const total = state.liveProgress?.total_count ?? 8;
  const nextLesson = state.liveProgress?.next_lesson || state.liveLessons.find(l => !l.completed);
  const resumeLabel = nextLesson ? `Resume ${nextLesson.title}` : 'Resume Lesson 03';
  const courseName = state.liveCourseTitle || 'Algebra I';
  return `
    <div class="flex flex-col w-full bg-[#FAFBFC] text-ink selection:bg-[#FFF0F3] selection:text-[#FF4757]">
      
      <!-- ========================================================
           HERO SECTION: Class-Grounded Student Dashboard
           ======================================================== -->
      <section class="relative w-full overflow-hidden pt-8 pb-12 lg:py-14 bg-gradient-to-b from-white via-[#FAFBFC] to-[#F8FAFC]">
        
        <!-- Subtle Coral/Navy Atmospheric Ambient Blobs -->
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-[#FF4757]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute top-1/2 right-0 w-[32rem] h-[32rem] bg-[#0A2540]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            <!-- Left Column: Class Scope, Student Status & CTAs -->
            <div class="lg:col-span-7 flex flex-col items-start gap-6">
              
              <!-- Class Badge Pill -->
              <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0F3] border border-[#FFCCD5] text-[#FF4757] text-xs font-bold uppercase tracking-wider font-mono shadow-xs">
                <span class="w-2 h-2 rounded-full bg-[#FF4757] animate-pulse"></span>
                <span>${classLabel()}</span>
              </div>

              <!-- Main Display Headline -->
              <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F172A] leading-[1.12] font-headline" style="text-wrap: balance;">
                Welcome Back, ${firstName()}: <span class="text-[#FF4757] relative inline-block">
                  ${escapeHtml(courseName)}
                  <svg class="absolute -bottom-2 left-0 w-full h-3 text-[#FF4757]/30" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 9.5C50 2.5 150 2.5 198 9.5" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
                  </svg>
                </span> Learning Hub
              </h1>

              <!-- Class Subtitle Copy -->
              <p class="text-base sm:text-lg text-[#475569] max-w-xl leading-relaxed">
                Active Module: <strong class="text-[#0F172A]">Unit 2 · Linear Functions, Cartesian Graphs &amp; Slope Dynamics</strong>. Period 1 · Room 204 · Instructor: Dr. Elena Martinez. Moodle LTI gradebook synchronization active.
              </p>

              <!-- Action Buttons Deck -->
              <div class="flex flex-wrap items-center gap-4 pt-2">
                <button
                  id="hero-view-courses-btn"
                  class="btn-primary-3d px-7 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  <span>${escapeHtml(resumeLabel)}</span>
                  <span class="material-symbols-outlined text-[18px]">play_circle</span>
                </button>

                <button
                  id="hero-join-now-btn"
                  class="btn-navy-3d px-7 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  <span>Cartesian Graph Sandbox</span>
                  <span class="material-symbols-outlined text-[18px]">ssid_chart</span>
                </button>
              </div>

              <!-- Academic Status Strip -->
              <div class="flex items-center gap-4 pt-4 border-t border-[#E2E8F0] w-full max-w-lg">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-[#10B981]"></span>
                  <span class="text-xs font-mono font-bold text-[#0F172A]">Grade: ${pct}% ${state.connected ? '' : '(Proficient)'}</span>
                </div>
                <span class="text-[#CBD5E1]">·</span>
                <div class="text-xs font-mono text-[#64748B]">
                  Next Deadline: <strong class="text-[#FF4757]">${
                    (state.liveGroupAssignments || [])[0]
                      ? escapeHtml(state.liveGroupAssignments[0].title || 'Group quiz')
                      : 'Checkpoint 2 Quiz'
                  }</strong>
                </div>
                <span class="text-[#CBD5E1]">·</span>
                <div class="text-xs font-mono text-[#10B981] font-semibold flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Moodle Synced</span>
                </div>
              </div>
              ${(state.liveGroupAssignments || []).length ? `
              <div class="flex flex-wrap gap-2 pt-2">
                ${state.liveGroupAssignments.map(a => `
                  <button class="home-assigned-quiz-btn px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-bold text-[#047857] cursor-pointer" type="button">
                    ${escapeHtml(a.group_name || 'Group')} · ${escapeHtml(a.title || 'Assigned quiz')}
                  </button>
                `).join('')}
              </div>
              ` : ''}

            </div>

            <!-- Right Column: Visual Hero Card with Courseware Preview -->
            <div class="lg:col-span-5 relative flex items-center justify-center">
              
              <!-- Background Stylized Coral Polygon Backdrop -->
              <div class="absolute w-[92%] h-[92%] bg-gradient-to-tr from-[#FF5B6B]/20 via-[#FF4757]/15 to-transparent rounded-[2.5rem] transform rotate-3 blur-xs"></div>
              
              <!-- Main Card Container -->
              <div class="relative w-full max-w-md bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
                
                <!-- Main Image -->
                <div class="w-full h-80 sm:h-96 rounded-2xl overflow-hidden relative bg-gradient-to-br from-[#FFF0F3] to-[#F1F5F9]">
                  <img
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80"
                    alt="Ada Chen studying Algebra I"
                    class="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                  />
                  <!-- Gradient overlay for text contrast -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  <!-- Tag inside photo -->
                  <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/60 shadow-md flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></span>
                    <span class="text-xs font-bold text-[#0F172A]">Unit 2: Linear Functions &amp; Intercepts</span>
                  </div>
                </div>

                <!-- Floating Badge 1: 6 of 8 Lessons (Bottom Left) -->
                <div class="absolute -bottom-3 sm:-bottom-5 left-1 sm:-left-6 bg-white rounded-2xl p-2.5 sm:p-3.5 border border-[#E2E8F0] shadow-[0_12px_28px_rgba(15,23,42,0.12)] flex items-center gap-2 sm:gap-3 animate-fade-in scale-90 sm:scale-100 origin-bottom-left">
                  <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF0F3] text-[#FF4757] flex items-center justify-center font-bold shrink-0">
                    <span class="material-symbols-outlined text-[20px] sm:text-[22px]">auto_stories</span>
                  </div>
                  <div>
                    <div class="text-[11px] sm:text-xs text-[#64748B] font-medium">Unit 2 Progress</div>
                    <div class="text-base sm:text-lg font-bold text-[#0F172A] font-headline tabular-nums">${done} / ${total} Completed</div>
                  </div>
                </div>

                <!-- Floating Badge 2: Ask Vidura Socratic AI (Top Left) -->
                <div class="absolute -top-3 sm:-top-4 left-1 sm:-left-6 bg-white rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 border border-[#E2E8F0] shadow-[0_10px_24px_rgba(15,23,42,0.1)] flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:border-[#FF4757] hover:scale-105 transition-all group scale-90 sm:scale-100 origin-top-left" id="hero-ask-vidura-badge">
                  <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#FF4757] to-[#071E2D] text-white flex items-center justify-center shadow-xs shrink-0">
                    <span class="material-symbols-outlined text-[16px] sm:text-[18px]">auto_awesome</span>
                  </div>
                  <div>
                    <div class="text-[11px] sm:text-xs font-bold text-[#0F172A] group-hover:text-[#FF4757] transition-colors">Ask Vidura</div>
                    <div class="text-[9px] sm:text-[10px] text-[#64748B]">Socratic Algebra Guide</div>
                  </div>
                  <span class="material-symbols-outlined text-[#FF4757] text-[14px] sm:text-[16px]">arrow_forward</span>
                </div>

                <!-- Floating Badge 3: Interactive Cartesian Sandbox (Top Right) -->
                <div class="absolute -top-3 sm:-top-5 right-1 sm:-right-5 bg-white rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 border border-[#E2E8F0] shadow-[0_10px_24px_rgba(15,23,42,0.1)] flex items-center gap-2 cursor-pointer hover:border-[#0284C7] hover:scale-105 transition-all group scale-90 sm:scale-100 origin-top-right" id="hero-cartesian-badge">
                  <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#EBF4FC] text-[#0284C7] flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[15px] sm:text-[16px]">ssid_chart</span>
                  </div>
                  <div>
                    <span class="text-[11px] sm:text-xs font-bold text-[#0F172A] group-hover:text-[#0284C7] transition-colors">Cartesian</span>
                    <span class="text-[10px] sm:text-[11px] text-[#0284C7] font-semibold ml-1 hidden xs:inline">Sandbox</span>
                  </div>
                </div>

                <!-- Floating Badge 4: Lead Instructor (Bottom Right) -->
                <div class="absolute -bottom-3 sm:-bottom-4 right-1 sm:-right-5 bg-white rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 border border-[#E2E8F0] shadow-[0_10px_24px_rgba(15,23,42,0.1)] flex items-center gap-2 scale-90 sm:scale-100 origin-bottom-right">
                  <img class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-[#FF4757]/30 shrink-0" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" alt="Instructor" />
                  <div class="flex flex-col">
                    <span class="text-[11px] sm:text-xs font-bold text-[#0F172A]">Dr. Martinez</span>
                    <span class="text-[9px] sm:text-[10px] text-[#FF4757] font-semibold">Chair</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- ========================================================
           CLASSROOM STUDY WORKBENCHES BAR:
           Direct access to enrolled Algebra I course features
           ======================================================== -->
      <section class="w-full bg-white border-b border-[#E2E8F0] py-4 sm:py-5 shadow-xs">
        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-2 shrink-0">
              <span class="w-2.5 h-2.5 rounded-full bg-[#FF4757] animate-pulse"></span>
              <span class="text-xs font-bold uppercase tracking-wider text-[#0F172A] font-mono">Algebra I Classroom Tools:</span>
            </div>
            
            <div class="flex flex-wrap items-center justify-center lg:justify-end gap-2 sm:gap-3 w-full lg:w-auto">
              <button id="dock-cartesian-btn" class="px-3.5 py-2 rounded-xl bg-[#FFF0F3] hover:bg-[#FFE0E6] text-[#FF4757] border border-[#FFCCD5] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs">
                <span class="material-symbols-outlined text-[17px]">ssid_chart</span>
                <span>Cartesian Sandbox</span>
              </button>

              <button id="dock-ask-vidura-btn" class="px-3.5 py-2 rounded-xl bg-[#071E2D] hover:bg-[#0A2B40] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs">
                <span class="material-symbols-outlined text-[17px] text-[#FF4757]">auto_awesome</span>
                <span>Ask Vidura AI</span>
              </button>

              <button id="dock-quiz-btn" class="px-3.5 py-2 rounded-xl bg-[#EBF4FC] hover:bg-[#D9EDFB] text-[#0284C7] border border-[#BAE6FD] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs">
                <span class="material-symbols-outlined text-[17px]">quiz</span>
                <span>Checkpoint Quiz</span>
              </button>

              <button id="dock-manuals-btn" class="px-3.5 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs">
                <span class="material-symbols-outlined text-[17px]">menu_book</span>
                <span>Handbook Reader</span>
              </button>

              <button id="dock-xr-btn" class="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs">
                <span class="material-symbols-outlined text-[17px] text-[#8B5CF6]">view_in_ar</span>
                <span>3D Spatial WebXR</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================================
           STUDENT PROGRESS METRICS RIBBON (Class-Specific)
           ======================================================== -->
      <section class="w-full bg-[#071E2D] text-white py-10 shadow-lg border-y border-[#122E42]">
        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 items-center">
            
            <!-- Metric 1: Current Score -->
            <div class="flex items-center gap-4 justify-start sm:justify-center">
              <div class="w-12 h-12 rounded-2xl bg-[#FF4757]/15 border border-[#FF4757]/30 text-[#FF4757] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[26px]">workspace_premium</span>
              </div>
              <div class="flex flex-col">
                <div class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline tabular-nums">${pct}%</div>
                <div class="text-xs text-gray-300 font-medium">${state.connected ? 'Lesson progress' : 'Unit 2 Mastery Score'}</div>
              </div>
            </div>

            <!-- Metric 2: Lessons Completed -->
            <div class="flex items-center gap-4 justify-start sm:justify-center">
              <div class="w-12 h-12 rounded-2xl bg-[#0284C7]/15 border border-[#0284C7]/30 text-[#38BDF8] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[26px]">task_alt</span>
              </div>
              <div class="flex flex-col">
                <div class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline tabular-nums">${done} / ${total}</div>
                <div class="text-xs text-gray-300 font-medium">Lessons Completed</div>
              </div>
            </div>

            <!-- Metric 3: Active Lab Time -->
            <div class="flex items-center gap-4 justify-start sm:justify-center">
              <div class="w-12 h-12 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#34D399] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[26px]">timer</span>
              </div>
              <div class="flex flex-col">
                <div class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline tabular-nums">4.8 hrs</div>
                <div class="text-xs text-gray-300 font-medium">Cartesian Lab Time</div>
              </div>
            </div>

            <!-- Metric 4: SIS Gradebook Status -->
            <div class="flex items-center gap-4 justify-start sm:justify-center">
              <div class="w-12 h-12 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#FBBF24] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[26px]">hub</span>
              </div>
              <div class="flex flex-col">
                <div class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline tabular-nums">100%</div>
                <div class="text-xs text-gray-300 font-medium">Moodle Grade Passback</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- ========================================================
           STUDENT ACADEMIC MASTERY CYCLE: 3 Connected Steps
           ======================================================== -->
      <section class="w-full py-14 sm:py-16 bg-white border-b border-[#E2E8F0]">
        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <!-- Section Heading -->
          <div class="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <div class="tagline-kicker justify-center">
              <span>—— Learning Cycle ——</span>
            </div>
            <h2 class="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight font-headline">
              Your Algebra I <span class="text-[#FF4757]">Mastery Pathway</span>
            </h2>
            <p class="text-sm sm:text-base text-[#64748B]">
              How to complete Unit 2: Linear Functions and prepare for the district midterm examination.
            </p>
          </div>

          <!-- 3 Connected Steps Grid -->
          <div class="relative grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            
            <!-- Step 1: Interactive Concept Exploration -->
            <div class="card-depth-interactive rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative group">
              <div class="w-14 h-14 rounded-full bg-[#FFF0F3] border-2 border-[#FFCCD5] text-[#FF4757] font-bold text-lg flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                01
              </div>
              <h3 class="text-xl font-bold text-[#0F172A] mb-2 font-headline">Explore in Sandbox</h3>
              <p class="text-sm text-[#64748B] leading-relaxed mb-4">
                Manipulate slope $m$ and intercept $b$ on the dynamic Cartesian coordinate plane to build geometric intuition.
              </p>
              <div class="mt-auto inline-flex items-center gap-1 text-xs font-bold text-[#FF4757] hover:underline cursor-pointer" id="step-choose-course">
                <span>Open Cartesian Sandbox</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>

            <!-- Step 2: Socratic Guidance -->
            <div class="card-depth-interactive rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative group border-[#FFCCD5]">
              <div class="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF5B6B] to-[#FF4757] text-white font-bold text-lg flex items-center justify-center mb-6 shadow-[0_4px_12px_rgba(255,71,87,0.35)] group-hover:scale-110 transition-transform">
                02
              </div>
              <h3 class="text-xl font-bold text-[#0F172A] mb-2 font-headline">Consult Ask Vidura</h3>
              <p class="text-sm text-[#64748B] leading-relaxed mb-4">
                Resolve misconceptions on negative reciprocal slopes or standard form isolation with step-by-step Socratic logic.
              </p>
              <div class="mt-auto inline-flex items-center gap-1 text-xs font-bold text-[#FF4757] hover:underline cursor-pointer" id="step-consult-vidura">
                <span>Ask Socratic Guide</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>

            <!-- Step 3: Checkpoint & Grade Sync -->
            <div class="card-depth-interactive rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative group">
              <div class="w-14 h-14 rounded-full bg-[#FFF0F3] border-2 border-[#FFCCD5] text-[#FF4757] font-bold text-lg flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                03
              </div>
              <h3 class="text-xl font-bold text-[#0F172A] mb-2 font-headline">Submit Checkpoint</h3>
              <p class="text-sm text-[#64748B] leading-relaxed mb-4">
                Complete the formative quiz checkpoint. Instant automated grading passes your score directly to Dr. Martinez's gradebook.
              </p>
              <div class="mt-auto inline-flex items-center gap-1 text-xs font-bold text-[#FF4757] hover:underline cursor-pointer" id="step-start-learning">
                <span>Take Checkpoint 2</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- ========================================================
           CURRICULUM UNITS: Enrolled Algebra I Units & Courseware
           ======================================================== -->
      <section class="w-full py-14 sm:py-16 bg-[#FAFBFC] border-b border-[#E2E8F0]">
        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div class="space-y-2">
              <div class="tagline-kicker">
                <span>—— Syllabus Units ——</span>
              </div>
              <h2 class="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight font-headline">
                Algebra I <span class="text-[#FF4757]">Course Units</span>
              </h2>
              <p class="text-sm sm:text-base text-[#64748B]">
                Your sequential curriculum pathway for Riverside High Grade 10 Mathematics.
              </p>
            </div>

            <div class="inline-flex items-center gap-2 text-xs font-mono text-[#64748B]">
              <span class="px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold">Period 1 &amp; 2 Roster</span>
            </div>
          </div>

          <!-- Unit Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <!-- Unit Card 1: Completed Unit 1 -->
            <div class="card-depth-interactive rounded-2xl overflow-hidden bg-white flex flex-col group cursor-pointer" id="course-card-unit1">
              <div class="relative h-44 w-full bg-[#ECFDF5] p-4 flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80"
                  alt="Unit 1 Foundations"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <span class="absolute top-3 left-3 bg-[#10B981] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Unit 1 · Completed
                </span>
                <span class="absolute top-3 right-3 bg-white/95 text-[#10B981] text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Grade: 92%
                </span>
              </div>

              <div class="p-6 flex flex-col flex-1">
                <div class="flex items-center justify-between text-xs text-[#64748B] mb-2 font-mono">
                  <span>8 Lessons</span>
                  <span>·</span>
                  <span>CCSS.MATH.HSA.CED.A.1</span>
                  <span>·</span>
                  <span class="text-[#10B981] font-bold">Passed</span>
                </div>
                <h3 class="text-lg font-bold text-[#0F172A] mb-2 font-headline group-hover:text-[#FF4757] transition-colors">
                  Foundations of Real Numbers &amp; Linear Equations
                </h3>
                <p class="text-xs text-[#64748B] leading-relaxed mb-4 line-clamp-2">
                  Properties of equality, interval notation, single-variable operations, and rate of change fundamentals.
                </p>
                <div class="mt-auto pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span class="text-xs font-mono text-[#10B981] font-bold">Review Notes</span>
                  <button class="btn-secondary-3d px-3.5 py-1.5 rounded-lg text-xs font-bold">
                    View Recap →
                  </button>
                </div>
              </div>
            </div>

            <!-- Unit Card 2: Active Unit 2 (Current Focus) -->
            <div class="card-depth-interactive rounded-2xl overflow-hidden bg-white flex flex-col group cursor-pointer border-2 border-[#FFCCD5] shadow-md" id="course-card-algebra">
              <div class="relative h-44 w-full bg-gradient-to-br from-[#121E24] to-[#1E303A] p-4 flex items-center justify-center overflow-hidden">
                <svg class="w-full h-full opacity-90" viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg">
                  <line stroke="#334B58" stroke-width="1" x1="10" x2="230" y1="90" y2="90"></line>
                  <line stroke="#334B58" stroke-width="1" x1="60" x2="60" y1="10" y2="130"></line>
                  <line stroke="#233642" stroke-dasharray="3 3" x1="10" x2="230" y1="50" y2="50"></line>
                  <line stroke="#233642" stroke-dasharray="3 3" x1="150" x2="150" y1="10" y2="130"></line>
                  <path d="M 20 110 L 120 60 L 220 10" stroke="#FF4757" stroke-linecap="round" stroke-width="3"></path>
                  <circle cx="120" cy="60" r="5" fill="#FF4757" stroke="#FFFFFF" stroke-width="2"></circle>
                  <circle cx="60" cy="90" r="4" fill="#38BDF8"></circle>
                </svg>
                <span class="absolute top-3 left-3 bg-[#FF4757] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Active Unit · In Progress
                </span>
                <span class="absolute top-3 right-3 bg-white/95 text-[#FF4757] text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  68% Complete
                </span>
              </div>

              <div class="p-6 flex flex-col flex-1">
                <div class="flex items-center justify-between text-xs text-[#64748B] mb-2 font-mono">
                  <span>8 Lessons</span>
                  <span>·</span>
                  <span>CCSS.MATH.HSA.CED.A.2</span>
                  <span>·</span>
                  <span class="text-[#FF4757] font-bold">Checkpoint 2</span>
                </div>
                <h3 class="text-lg font-bold text-[#0F172A] mb-2 font-headline group-hover:text-[#FF4757] transition-colors">
                  Linear Functions, Cartesian Graphs &amp; Slope Dynamics
                </h3>
                <p class="text-xs text-[#64748B] leading-relaxed mb-4 line-clamp-2">
                  Slope-intercept form $y = mx + b$, perpendicular negative reciprocals, and standard form transformations.
                </p>
                <div class="mt-auto pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span class="text-xs font-mono text-[#0F172A] font-bold">Lesson 03 Active</span>
                  <button class="btn-primary-3d px-3.5 py-1.5 rounded-lg text-xs font-bold">
                    Resume Lesson →
                  </button>
                </div>
              </div>
            </div>

            <!-- Unit Card 3: Upcoming Unit 3 -->
            <div class="card-depth-interactive rounded-2xl overflow-hidden bg-white flex flex-col group cursor-pointer opacity-90 hover:opacity-100" id="course-card-unit3">
              <div class="relative h-44 w-full bg-[#FFF0F3] p-4 flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80"
                  alt="Unit 3 Systems"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                />
                <span class="absolute top-3 left-3 bg-[#64748B] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Unit 3 · Locked
                </span>
                <span class="absolute top-3 right-3 bg-white/95 text-[#64748B] text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Requires 80%+ on Chk 2
                </span>
              </div>

              <div class="p-6 flex flex-col flex-1">
                <div class="flex items-center justify-between text-xs text-[#64748B] mb-2 font-mono">
                  <span>10 Lessons</span>
                  <span>·</span>
                  <span>CCSS.MATH.HSA.REI.C.5</span>
                  <span>·</span>
                  <span>Next Unit</span>
                </div>
                <h3 class="text-lg font-bold text-[#0F172A] mb-2 font-headline group-hover:text-[#FF4757] transition-colors">
                  Systems of Linear Equations &amp; Inequalities
                </h3>
                <p class="text-xs text-[#64748B] leading-relaxed mb-4 line-clamp-2">
                  Substitution, elimination matrices, coordinate intersections, and feasible region inequality graphs.
                </p>
                <div class="mt-auto pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span class="text-xs font-mono text-[#64748B]">Prerequisite Gate</span>
                  <button class="btn-secondary-3d px-3.5 py-1.5 rounded-lg text-xs font-bold">
                    View Prerequisites →
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      <!-- ========================================================
           CLASS-RELEVANT TOPIC DOMAINS:
           Only Algebra I topics (No generic Web Dev or UI/UX)
           ======================================================== -->
      <section class="w-full py-14 sm:py-16 bg-white border-b border-[#E2E8F0]">
        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            <!-- Left Midnight Navy Feature Card -->
            <div class="lg:col-span-5 bg-[#071E2D] text-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div class="space-y-4">
                <div class="tagline-kicker text-[#FF4757]">
                  <span>—— Algebra I Core Domains ——</span>
                </div>
                <h3 class="text-3xl sm:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
                  Curriculum Topics in <span class="text-[#FF4757]">Algebra I</span>
                </h3>
                <p class="text-sm text-gray-300 leading-relaxed max-w-sm">
                  Master the foundational mathematical disciplines defined by Riverside High's Common Core State Standards (CCSS).
                </p>
              </div>

              <div class="pt-8">
                <button
                  id="all-categories-btn"
                  class="btn-primary-3d px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore Lesson Sequence</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <!-- Right Grid: Crisp Class-Relevant Topic Tiles -->
            <div class="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
              
              <!-- Topic 1: Linear Slope Quotients -->
              <div class="card-depth-interactive rounded-2xl p-5 bg-white flex flex-col items-center text-center group cursor-pointer border hover:border-[#FF4757]" data-category="slope">
                <div class="w-12 h-12 rounded-2xl bg-[#FFF0F3] text-[#FF4757] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-[26px]">calculate</span>
                </div>
                <h4 class="text-sm font-bold text-[#0F172A] group-hover:text-[#FF4757] transition-colors">Slope &amp; Rate of Change</h4>
                <span class="text-xs text-[#64748B] font-mono mt-1">$m = \\Delta y / \\Delta x$</span>
                <span class="text-[10px] font-bold text-[#10B981] mt-1">Lessons 01–03</span>
              </div>

              <!-- Topic 2: Standard Form Conversions -->
              <div class="card-depth-interactive rounded-2xl p-5 bg-white flex flex-col items-center text-center group cursor-pointer border hover:border-[#0284C7]" data-category="standard-form">
                <div class="w-12 h-12 rounded-2xl bg-[#EBF4FC] text-[#0284C7] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-[26px]">swap_horiz</span>
                </div>
                <h4 class="text-sm font-bold text-[#0F172A] group-hover:text-[#0284C7] transition-colors">Standard Form</h4>
                <span class="text-xs text-[#64748B] font-mono mt-1">$Ax + By = C$</span>
                <span class="text-[10px] font-bold text-[#D97706] mt-1">Lesson 05 (High Need)</span>
              </div>

              <!-- Topic 3: Cartesian Geometry -->
              <div class="card-depth-interactive rounded-2xl p-5 bg-white flex flex-col items-center text-center group cursor-pointer border hover:border-[#10B981]" data-category="cartesian">
                <div class="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-[26px]">grid_4x4</span>
                </div>
                <h4 class="text-sm font-bold text-[#0F172A] group-hover:text-[#10B981] transition-colors">Cartesian Coordinate Plane</h4>
                <span class="text-xs text-[#64748B] font-mono mt-1">Orthogonal Axes</span>
                <span class="text-[10px] font-bold text-[#10B981] mt-1">Lab 03 Sandbox</span>
              </div>

              <!-- Topic 4: Perpendicular & Parallel Lines -->
              <div class="card-depth-interactive rounded-2xl p-5 bg-white flex flex-col items-center text-center group cursor-pointer border hover:border-[#8B5CF6]" data-category="perpendicular">
                <div class="w-12 h-12 rounded-2xl bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-[26px]">straighten</span>
                </div>
                <h4 class="text-sm font-bold text-[#0F172A] group-hover:text-[#8B5CF6] transition-colors">Perpendicular Slopes</h4>
                <span class="text-xs text-[#64748B] font-mono mt-1">$m_1 \\cdot m_2 = -1$</span>
                <span class="text-[10px] font-bold text-[#8B5CF6] mt-1">Lesson 07 &amp; Proof</span>
              </div>

              <!-- Topic 5: Linear Inequalities -->
              <div class="card-depth-interactive rounded-2xl p-5 bg-white flex flex-col items-center text-center group cursor-pointer border hover:border-[#F59E0B]" data-category="inequalities">
                <div class="w-12 h-12 rounded-2xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-[26px]">texture</span>
                </div>
                <h4 class="text-sm font-bold text-[#0F172A] group-hover:text-[#D97706] transition-colors">Linear Inequalities</h4>
                <span class="text-xs text-[#64748B] font-mono mt-1">Half-Plane Shading</span>
                <span class="text-[10px] font-bold text-[#64748B] mt-1">Upcoming Unit 3</span>
              </div>

              <!-- Topic 6: Systems of Equations -->
              <div class="card-depth-interactive rounded-2xl p-5 bg-white flex flex-col items-center text-center group cursor-pointer border hover:border-[#FF4757]" data-category="systems">
                <div class="w-12 h-12 rounded-2xl bg-[#FFF0F3] text-[#FF4757] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-[26px]">hub</span>
                </div>
                <h4 class="text-sm font-bold text-[#0F172A] group-hover:text-[#FF4757] transition-colors">Linear Systems</h4>
                <span class="text-xs text-[#64748B] font-mono mt-1">Intersection $(x, y)$</span>
                <span class="text-[10px] font-bold text-[#64748B] mt-1">Midterm Examination</span>
              </div>

            </div>

          </div>

        </div>
      </section>

      <!-- Clean Academic Bottom Spacer -->
      <div class="h-12 sm:h-16 w-full"></div>

    </div>
  `;
}

export function bindStudentHomeEvents(container: HTMLElement): void {
  // Hero CTAs
  container.querySelector('#hero-view-courses-btn')?.addEventListener('click', () => {
    const next = state.liveProgress?.next_lesson || state.liveLessons.find(l => !l.completed);
    if (state.connected && next) {
      if (next.lesson_type === 'quiz') setScreen('quiz');
      else void openLiveLesson(next.id);
      return;
    }
    setScreen('lessons');
  });

  container.querySelectorAll('.home-assigned-quiz-btn').forEach(btn => {
    btn.addEventListener('click', () => setScreen('quiz'));
  });

  container.querySelector('#hero-join-now-btn')?.addEventListener('click', () => {
    setScreen('lesson-detail');
    showToast('Launched Cartesian Coordinate Interactive Sandbox', 'insights');
  });

  // Hero Floating Badges
  container.querySelector('#hero-ask-vidura-badge')?.addEventListener('click', () => {
    setScreen('ask-vidura');
    showToast('Launched Ask Vidura Socratic Math Companion', 'insights');
  });

  container.querySelector('#hero-cartesian-badge')?.addEventListener('click', () => {
    setScreen('lesson-detail');
    showToast('Launched Cartesian Coordinate Interactive Sandbox', 'insights');
  });

  // EdVidura Core Workbenches Dock
  container.querySelector('#dock-cartesian-btn')?.addEventListener('click', () => {
    setScreen('lesson-detail');
    showToast('Switched to Cartesian Coordinate Lab', 'insights');
  });

  container.querySelector('#dock-ask-vidura-btn')?.addEventListener('click', () => {
    setScreen('ask-vidura');
  });

  container.querySelector('#dock-quiz-btn')?.addEventListener('click', () => {
    setScreen('quiz');
  });

  container.querySelector('#dock-manuals-btn')?.addEventListener('click', () => {
    setScreen('manual-reader');
    showToast('Opened Algebra I Course Handbook & Reference Guide', 'menu_book');
  });

  container.querySelector('#dock-xr-btn')?.addEventListener('click', () => {
    setScreen('xr-store');
    showToast('Opened 3D Spatial Geometry & WebXR Catalog', 'view_in_ar');
  });

  container.querySelector('#dock-analytics-btn')?.addEventListener('click', () => {
    setScreen('teacher-diagnostics');
  });

  container.querySelector('#dock-moodle-btn')?.addEventListener('click', () => {
    setScreen('home-shell');
  });

  // Step Journey buttons
  container.querySelector('#step-choose-course')?.addEventListener('click', () => {
    setScreen('lesson-detail');
    showToast('Launched Cartesian Sandbox exploration', 'ssid_chart');
  });

  container.querySelector('#step-consult-vidura')?.addEventListener('click', () => {
    setScreen('ask-vidura');
    showToast('Opened Socratic Algebra Guide', 'auto_awesome');
  });

  container.querySelector('#step-start-learning')?.addEventListener('click', () => {
    setScreen('quiz');
    showToast('Opening Unit 2 Checkpoint Assessment', 'quiz');
  });

  // Syllabus Unit Cards
  container.querySelector('#course-card-unit1')?.addEventListener('click', () => {
    setScreen('lessons');
    showToast('Viewing Unit 1 Foundations review notes', 'task_alt');
  });

  container.querySelector('#course-card-algebra')?.addEventListener('click', () => {
    setScreen('lesson-detail');
  });

  container.querySelector('#course-card-unit3')?.addEventListener('click', () => {
    setScreen('prerequisite-gate');
    showToast('Unit 3 Prerequisite Gate: 80% on Checkpoint 2 required', 'lock');
  });

  // Category & Core Domains
  container.querySelector('#all-categories-btn')?.addEventListener('click', () => {
    setScreen('lessons');
  });

  container.querySelectorAll('[data-category]').forEach(tile => {
    tile.addEventListener('click', () => {
      const topic = tile.getAttribute('data-category') || 'topic';
      setScreen('lessons');
      showToast(`Filtered Algebra I lessons for: ${topic}`, 'insights');
    });
  });
}
