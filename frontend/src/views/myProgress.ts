/**
 * View 09: Student Academic Progress & Personalised Learning Engine
 * Modules covered:
 * - Module 5: Competency Assessment Tool (tracking, 4 proficiency levels, assessment evidence, progress reporting)
 * - Module 7: Difference Training Application (competency gap analysis, training recommendations, progress tracking)
 * - Module 9: Personalised Learning Engine (recommendations, learning goals, progress, and suggested activities)
 */
import { state, setScreen, showToast, notify, competenciesList, learningGoalsList, suggestedActivitiesList, CompetencyItem } from '../state';
import { classLabel, displayName, escapeHtml } from '../boot';

export function renderMyProgress(): string {
  const activeTab = state.progressActiveTab || 'roadmap';

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC]">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 flex flex-col gap-8">
        
        <!-- ========================================================
             STUDENT PROFILE HERO BANNER
             ======================================================== -->
        <section class="hero-navy-card relative overflow-hidden rounded-3xl text-white p-6 sm:p-8 shadow-xl" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
          <div class="absolute -top-20 -right-20 w-80 h-80 bg-[#FF4757]/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-20 w-72 h-72 bg-[#0284C7]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            <div class="flex items-center gap-5">
              <div class="relative shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80"
                  alt="${escapeHtml(displayName())}"
                  class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-[#FF4757] shadow-xl"
                />
                <span class="absolute -bottom-2 -right-2 bg-[#10B981] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#071E2D] flex items-center gap-1 shadow-xs">
                  <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Active
                </span>
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2.5 py-0.5 rounded-full bg-[#FF4757] text-white text-[10px] font-bold uppercase tracking-wider font-mono">Honors Scholar</span>
                  <span class="text-xs text-gray-300 font-mono">ID: RHS-2026-9401</span>
                </div>
                <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline">
                  ${escapeHtml(displayName())}
                </h1>
                <p class="text-xs sm:text-sm text-gray-300">
                  ${escapeHtml(classLabel())}
                </p>
              </div>
            </div>

            <!-- Gradebook SIS Status Pill -->
            <div class="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shrink-0 self-stretch md:self-auto justify-between md:justify-start">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold">
                  <span class="material-symbols-outlined text-[20px]">sync_saved_locally</span>
                </div>
                <div class="flex flex-col text-left">
                  <span class="text-xs font-bold text-white">Moodle 4.3 Synced</span>
                  <span class="text-[10px] text-gray-300 font-mono">Last push: 4m ago</span>
                </div>
              </div>
              <button id="refresh-sync-btn" class="btn-primary-3d px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer" type="button">
                Sync Now
              </button>
            </div>

          </div>
        </section>

        <!-- ========================================================
             SUB-NAV TABS: Roadmap | Competencies (Mod 5) | Difference Training (Mod 7) | Personalised Goals (Mod 9)
             ======================================================== -->
        <section class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            class="progress-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'roadmap' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-tab="roadmap"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'roadmap' ? 'text-[#FF4757]' : 'text-[#64748B]'}">map</span>
            <span>Academic Roadmap</span>
          </button>

          <button
            class="progress-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'competencies' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-tab="competencies"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'competencies' ? 'text-[#FF4757]' : 'text-[#64748B]'}">fact_check</span>
            <span>Competencies &amp; Evidence (Mod 5)</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'competencies' ? 'bg-[#FF4757] text-white' : 'bg-[#E2E8F0] text-[#475569]'} font-mono">${competenciesList.length}</span>
          </button>

          <button
            class="progress-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'difference' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-tab="difference"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'difference' ? 'text-[#FF4757]' : 'text-[#64748B]'}">troubleshoot</span>
            <span>Difference Training Gaps (Mod 7)</span>
          </button>

          <button
            class="progress-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'goals' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
            data-tab="goals"
            type="button"
          >
            <span class="material-symbols-outlined text-[16px] ${activeTab === 'goals' ? 'text-[#FF4757]' : 'text-[#64748B]'}">psychology_alt</span>
            <span>Personalised Learning Engine (Mod 9)</span>
          </button>
        </section>

        <!-- ========================================================
             RENDER ACTIVE TAB CONTENT
             ======================================================== -->
        ${renderProgressActiveContent(activeTab)}

      </div>
    </div>
  `;
}

function renderProgressActiveContent(tab: string): string {
  switch (tab) {
    case 'competencies':
      return renderCompetenciesTab();
    case 'difference':
      return renderDifferenceTrainingTab();
    case 'goals':
      return renderGoalsAndRecommendationsTab();
    case 'roadmap':
    default:
      return renderRoadmapTab();
  }
}

// =========================================================================
// TAB 1: ACADEMIC ROADMAP
// =========================================================================
function renderRoadmapTab(): string {
  const progressPct = state.liveProgress?.percent ?? 38;
  const progressDone = state.liveProgress?.completed_count ?? 3;
  const progressTotal = state.liveProgress?.total_count ?? 8;
  return `
    <!-- COLORFUL KEY METRICS CARDS -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#FF4757] flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-[#64748B] mb-2 font-mono">
          <span>Curriculum Scope</span>
          <span class="material-symbols-outlined text-[#FF4757] text-[18px]">trending_up</span>
        </div>
        <div class="text-3xl font-bold text-[#0F172A] font-headline tabular-nums">${progressPct}%</div>
        <div class="text-xs text-[#64748B] mt-1">${progressDone} of ${progressTotal} lessons mastered</div>
      </div>

      <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#10B981] flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-[#64748B] mb-2 font-mono">
          <span>Checkpoint Tests</span>
          <span class="material-symbols-outlined text-[#10B981] text-[18px]">fact_check</span>
        </div>
        <div class="text-3xl font-bold text-[#0F172A] font-headline tabular-nums">4 Taken</div>
        <div class="text-xs text-[#64748B] mt-1">1 graded, 3 diagnostic drills</div>
      </div>

      <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#0284C7] flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-[#64748B] mb-2 font-mono">
          <span>Last Quiz Grade</span>
          <span class="material-symbols-outlined text-[#0284C7] text-[18px]">grade</span>
        </div>
        <div class="text-3xl font-bold text-[#0F172A] font-headline tabular-nums">${state.quizScore.correct} / ${state.quizScore.total}</div>
        <div class="text-xs text-[#64748B] mt-1">${state.quizScore.percent}% on Checkpoint 2</div>
      </div>

      <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#F59E0B] flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs text-[#64748B] mb-2 font-mono">
          <span>District Percentile</span>
          <span class="material-symbols-outlined text-[#F59E0B] text-[18px]">military_tech</span>
        </div>
        <div class="text-3xl font-bold text-[#0F172A] font-headline tabular-nums">Top 8%</div>
        <div class="text-xs text-[#64748B] mt-1">Ahead of district timeline</div>
      </div>
    </section>

    <!-- Visual Sequential Roadmap -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <section class="lg:col-span-8 flex flex-col gap-6">
        <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#FF4757]"></span>
            <h2 class="text-xl font-bold text-[#0F172A] font-headline">Unit 2: Linear Functions Mastery Track</h2>
          </div>
          <span class="text-xs text-[#64748B] font-mono">CCSS.MATH.HSA.CED</span>
        </div>

        <div class="relative pl-6 md:pl-8 flex flex-col gap-y-5">
          <div class="absolute left-2.5 md:left-3.5 top-3 h-[48%] w-[3px] bg-gradient-to-b from-[#10B981] via-[#FF4757] to-[#0284C7]"></div>
          <div class="absolute left-2.5 md:left-3.5 top-[48%] bottom-6 w-[2px] border-l-2 border-dashed border-[#CBD5E1]"></div>

          <!-- Module 01: Completed -->
          <div class="relative card-depth-interactive rounded-2xl p-5 bg-white border border-[#A7F3D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="absolute -left-[1.85rem] md:-left-[2.35rem] top-4 sm:top-auto w-7 h-7 rounded-full bg-[#ECFDF5] border-2 border-[#10B981] flex items-center justify-center text-[#10B981] shadow-xs">
              <span class="material-symbols-outlined text-[16px] font-bold">check</span>
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-[#10B981]">LESSON 01</span>
                <span class="text-xs text-[#64748B]">·</span>
                <span class="text-xs text-[#64748B]">Mastered</span>
              </div>
              <h3 class="text-base font-bold text-[#0F172A]">Linear Relationships &amp; Foundations</h3>
              <p class="text-xs text-[#64748B]">Coordinate geometry, ordered pairs, and discrete linear tables.</p>
            </div>
            <button class="jump-lesson-btn btn-secondary-3d px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0" data-lesson="01">
              Review
            </button>
          </div>

          <!-- Module 02: Completed -->
          <div class="relative card-depth-interactive rounded-2xl p-5 bg-white border border-[#A7F3D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="absolute -left-[1.85rem] md:-left-[2.35rem] top-4 sm:top-auto w-7 h-7 rounded-full bg-[#ECFDF5] border-2 border-[#10B981] flex items-center justify-center text-[#10B981] shadow-xs">
              <span class="material-symbols-outlined text-[16px] font-bold">check</span>
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-[#10B981]">LESSON 02</span>
                <span class="text-xs text-[#64748B]">·</span>
                <span class="text-xs text-[#64748B]">Mastered</span>
              </div>
              <h3 class="text-base font-bold text-[#0F172A]">Rate of Change &amp; Delta Slope Proofs</h3>
              <p class="text-xs text-[#64748B]">Formula m = (y2 - y1) / (x2 - x1) derived from Cartesian right triangles.</p>
            </div>
            <button class="jump-lesson-btn btn-secondary-3d px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0" data-lesson="02">
              Review
            </button>
          </div>

          <!-- Module 03: In Progress (Active) -->
          <div class="relative card-depth-interactive rounded-2xl p-5 bg-white border-2 border-[#FF4757] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div class="absolute -left-[1.85rem] md:-left-[2.35rem] top-4 sm:top-auto w-7 h-7 rounded-full bg-[#FF4757] text-white flex items-center justify-center shadow-xs">
              <span class="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-[#FF4757]">LESSON 03 (ACTIVE)</span>
                <span class="text-xs text-[#64748B]">·</span>
                <span class="text-xs text-[#FF4757] font-semibold">Interactive 3D Lab</span>
              </div>
              <h3 class="text-base font-bold text-[#0F172A]">Linear Equations: Graphs &amp; Intercepts</h3>
              <p class="text-xs text-[#64748B]">Slope parameter m and vertical intercept b in dynamic SVG canvas.</p>
            </div>
            <button class="jump-lesson-detail-btn btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shrink-0">
              Launch Lab 03
            </button>
          </div>

          <!-- Module 04: Locked -->
          <div class="relative card-depth-1 rounded-2xl p-5 bg-[#FAFBFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
            <div class="absolute -left-[1.85rem] md:-left-[2.35rem] top-4 sm:top-auto w-7 h-7 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center text-[#94A3B8]">
              <span class="material-symbols-outlined text-[15px]">lock</span>
            </div>
            <div class="space-y-1">
              <span class="font-mono text-xs font-bold text-[#64748B]">LESSON 04 · PREREQUISITE</span>
              <h3 class="text-base font-bold text-[#475569]">Slope-Intercept Form in Practice</h3>
              <p class="text-xs text-[#64748B]">Unlocks upon achieving 70% threshold on Checkpoint 2.</p>
            </div>
            <button class="btn-secondary-3d px-3 py-1.5 rounded-xl text-xs font-bold cursor-not-allowed opacity-60">
              Locked
            </button>
          </div>
        </div>
      </section>

      <!-- Right Column: Instructor Feedback & Badges -->
      <section class="lg:col-span-4 space-y-6">
        <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-4">
          <div class="flex items-center gap-3">
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" alt="Dr. Martinez" class="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#FF4757]" />
            <div>
              <h4 class="text-sm font-bold text-[#0F172A]">Dr. Elena Martinez</h4>
              <span class="text-xs text-[#FF4757] font-mono">Lead Instructor Feedback</span>
            </div>
          </div>
          <p class="text-xs text-[#475569] leading-relaxed bg-[#FAFBFC] p-4 rounded-2xl border border-[#E2E8F0]">
            "Ada's conceptual mastery of linear coordinate vectors is very strong. I recommend 10 minutes reviewing standard form division signs before our next summative exam."
          </p>
          <button id="ask-dr-martinez-btn" class="btn-secondary-3d w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-[16px] text-[#FF4757]">chat</span>
            <span>Ask Dr. Martinez or Vidura</span>
          </button>
        </div>
      </section>
    </div>
  `;
}

// =========================================================================
// TAB 2: MODULE 5 — Competency Assessment Tool
// =========================================================================
function renderCompetenciesTab(): string {
  return `
    <!-- Hero Banner for Competencies -->
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#CBD5E1] space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2 text-xs text-[#10B981] font-bold font-mono uppercase tracking-wider">
          <span class="material-symbols-outlined text-[18px]">verified</span>
          <span>Common Core Mathematical Standards Track</span>
        </div>
        <button id="export-competencies-btn" class="btn-secondary-3d px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer">
          <span class="material-symbols-outlined text-[15px]">download</span>
          <span>Export Competency Record</span>
        </button>
      </div>
      <h2 class="text-xl sm:text-2xl font-bold text-[#0F172A] font-headline">
        Competency Assessment Matrix &amp; Evidence Artifacts
      </h2>
      <p class="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-3xl">
        Every skill is measured across 4 standardized proficiency tiers: Novice, Developing, Proficient, and Advanced. Scores are backed by verifiable evidence items emitted through quizzes, labs, and interactive drills.
      </p>
    </div>

    <!-- Competencies List with 4-Level Visual Indicator -->
    <div class="space-y-4">
      ${competenciesList.map(comp => {
        const levelConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
          novice: { label: 'Novice (0-59%)', bg: 'bg-[#FEF2F2]', text: 'text-[#EF4444]', border: 'border-[#FECACA]' },
          developing: { label: 'Developing (60-74%)', bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', border: 'border-[#FDE68A]' },
          proficient: { label: 'Proficient (75-89%)', bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', border: 'border-[#A7F3D0]' },
          advanced: { label: 'Advanced (90-100%)', bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', border: 'border-[#BFDBFE]' }
        };
        const cfg = levelConfig[comp.level];

        return `
          <div class="card-depth-interactive rounded-2xl p-5 bg-white border border-[#E2E8F0] space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-bold text-[#64748B]">${comp.code}</span>
                  <span class="text-xs text-[#CBD5E1]">·</span>
                  <span class="text-xs text-[#0284C7] font-semibold">${comp.domain}</span>
                </div>
                <h4 class="text-base font-bold text-[#0F172A]">${comp.name}</h4>
              </div>

              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-full text-xs font-mono font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}">
                  ${cfg.label}
                </span>
                <span class="text-xl font-bold font-mono tabular-nums text-[#0F172A]">${comp.score}%</span>
              </div>
            </div>

            <!-- 4-Level Progress Bar with Tier Marks -->
            <div class="space-y-1">
              <div class="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden relative">
                <div class="h-full bg-gradient-to-r from-[#FF5B6B] via-[#F59E0B] to-[#10B981] rounded-full transition-all duration-700" style="width: ${comp.score}%;"></div>
              </div>
              <div class="flex justify-between text-[10px] text-[#94A3B8] font-mono">
                <span>Novice</span>
                <span>Developing (60%)</span>
                <span>Proficient (75%)</span>
                <span>Advanced (90%)</span>
              </div>
            </div>

            <!-- Verified Assessment Evidence Artifacts -->
            <div class="pt-2 border-t border-[#E2E8F0] space-y-2">
              <span class="text-xs font-bold text-[#64748B] font-mono flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px] text-[#10B981]">fact_check</span>
                <span>Linked Assessment Evidence (${comp.evidenceItems.length} Verified Artifacts):</span>
              </span>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                ${comp.evidenceItems.map(ev => `
                  <div class="p-2.5 rounded-xl bg-[#FAFBFC] border border-[#E2E8F0] flex items-center justify-between font-mono">
                    <span class="text-[#0F172A] font-sans font-medium">${ev.title}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-[#64748B] text-[11px]">${ev.date}</span>
                      <span class="font-bold text-[#10B981]">${ev.score}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// =========================================================================
// TAB 3: MODULE 7 — Difference Training Application
// =========================================================================
function renderDifferenceTrainingTab(): string {
  return `
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#FFCCD5] space-y-3">
      <div class="flex items-center gap-2 text-xs text-[#FF4757] font-bold font-mono uppercase tracking-wider">
        <span class="material-symbols-outlined text-[18px]">troubleshoot</span>
        <span>Personalized Gap Analysis &amp; Remediation Trajectory</span>
      </div>
      <h2 class="text-xl sm:text-2xl font-bold text-[#0F172A] font-headline">
        Difference Training: Target Mastery vs. Current Competency Gaps
      </h2>
      <p class="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-3xl">
        Algorithmic difference modeling maps your performance against Riverside High district benchmarks. Bridge identified gaps through targeted 5 to 15 minute micro-remediations.
      </p>
    </div>

    <!-- Gap Trajectory Cards -->
    <div class="space-y-4">
      ${competenciesList.filter(c => c.gap > 0).map(c => `
        <div class="card-depth-interactive rounded-2xl p-6 bg-white border border-[#FFCCD5] space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span class="text-xs font-mono font-bold text-[#FF4757] uppercase tracking-wider">Gap Identified · Delta: -${c.gap}%</span>
              <h3 class="text-lg font-bold text-[#0F172A] mt-0.5">${c.name} (${c.code})</h3>
            </div>
            <div class="flex items-baseline gap-3 font-mono text-xs">
              <span class="text-[#64748B]">Current: <strong>${c.score}%</strong></span>
              <span class="text-[#10B981]">Target: <strong>${c.targetScore}%</strong></span>
            </div>
          </div>

          <!-- Dual Slider Visual -->
          <div class="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden relative">
            <div class="absolute top-0 bottom-0 w-0.5 bg-[#0F172A] z-10" style="left: ${c.targetScore}%;" title="Target Benchmark"></div>
            <div class="h-full bg-[#FF4757] rounded-full" style="width: ${c.score}%;"></div>
          </div>

          <!-- Recommended Remediation Box -->
          <div class="p-4 rounded-2xl bg-[#FFF0F3] border border-[#FFCCD5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <span class="text-xs font-bold text-[#FF4757] uppercase font-mono">Recommended Difference Drill</span>
              <div class="text-sm font-bold text-[#0F172A]">${c.remediationTitle || 'Targeted Practice Set'}</div>
              <p class="text-xs text-[#64748B]">Estimated time to bridge gap: ${c.remediationHours || 1.5} hours</p>
            </div>
            <button class="start-diff-drill-btn btn-primary-3d px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-md" data-comp="${c.code}">
              Start Remediation Drill
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// =========================================================================
// TAB 4: MODULE 9 — Personalised Learning Engine
// =========================================================================
function renderGoalsAndRecommendationsTab(): string {
  const plan = state.livePlan;
  const planSkills = plan?.skills || [];
  return `
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#CBD5E1] space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E2E8F0]">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#0284C7] text-[22px]">flag</span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">Live study plan</h3>
        </div>
        <span class="text-xs font-mono text-[#64748B]">${plan?.active ? `${plan.done_count || 0}/${plan.step_count || 0} steps` : 'Waiting for gaps'}</span>
      </div>
      <p class="text-sm text-[#475569]">${escapeHtml(plan?.message || 'Take a quiz or ask Vidura — your plan appears when we see gaps.')}</p>
      <div class="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
        <div class="h-full bg-[#0284C7] rounded-full" style="width: ${plan?.progress_pct || 0}%;"></div>
      </div>
      ${
        planSkills.length
          ? `<div class="flex flex-wrap gap-2">${planSkills
              .map(
                s =>
                  `<span class="px-2 py-1 rounded-lg bg-[#EBF4FC] text-[#0284C7] text-[11px] font-mono font-bold">${escapeHtml(s.label || s.code)}</span>`
              )
              .join('')}</div>`
          : ''
      }
      ${plan?.risk ? `<p class="text-xs font-mono text-[#64748B]">Risk ${plan.risk.band || 'low'} (${plan.risk.score ?? 0}) · Trend ${escapeHtml(plan.trend || 'stable')}</p>` : ''}
      ${
        (plan?.interventions || []).length
          ? `<ul class="text-sm text-[#0F172A] space-y-1">${(plan?.interventions || [])
              .map(i => `<li>• ${escapeHtml(i.label)}</li>`)
              .join('')}</ul>`
          : ''
      }
    </div>

    <!-- Top Learning Goals Card -->
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#CBD5E1] space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E2E8F0]">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#0284C7] text-[22px]">flag</span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">Personal Learning Goals</h3>
        </div>
        <button id="add-goal-btn" class="btn-secondary-3d px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer">
          <span class="material-symbols-outlined text-[15px]">add</span>
          <span>Set New Goal</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${learningGoalsList.map(g => `
          <div class="p-4 rounded-2xl bg-[#FAFBFC] border ${g.completed ? 'border-[#A7F3D0]' : 'border-[#E2E8F0]'} space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="font-mono text-[10px] text-[#64748B] uppercase font-bold">${g.category}</span>
              ${g.completed ? '<span class="text-[#10B981] font-bold font-mono">Completed</span>' : `<span class="text-[#FF4757] font-mono">Due ${g.deadline}</span>`}
            </div>
            <h4 class="text-sm font-bold text-[#0F172A] leading-snug">${g.title}</h4>
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] font-mono">
                <span>Progress: ${g.currentScore}%</span>
                <span>Target: ${g.targetScore}%</span>
              </div>
              <div class="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                <div class="h-full ${g.completed ? 'bg-[#10B981]' : 'bg-[#0284C7]'} rounded-full" style="width: ${g.currentScore}%;"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Suggested Activities by AI Engine -->
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#E2E8F0] space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#FF4757] text-[22px]">auto_awesome</span>
          <div>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">AI Recommended Next-Best-Action Activities</h3>
            <span class="text-xs text-[#64748B]">Personalized based on recent checkpoint errors and syllabus pacing</span>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        ${suggestedActivitiesList.map(act => {
          const urgencyColor =
            act.urgency === 'high' ? 'bg-[#FFF0F3] text-[#FF4757] border-[#FFCCD5]' : 'bg-[#EBF4FC] text-[#0284C7] border-[#BAE6FD]';

          return `
            <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${urgencyColor}">
                    ${act.urgency} Priority
                  </span>
                  <span class="text-xs font-mono text-[#64748B]">~${act.estimatedMinutes} mins</span>
                </div>
                <h4 class="text-sm font-bold text-[#0F172A]">${act.title}</h4>
                <p class="text-xs text-[#64748B]">${act.reason}</p>
              </div>

              <button class="launch-activity-btn btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs" data-screen="${act.actionScreen}">
                Launch Activity
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function bindMyProgressEvents(container: HTMLElement): void {
  // Tabs
  container.querySelectorAll('.progress-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = (e.currentTarget as HTMLElement).getAttribute('data-tab') as any;
      if (tab) {
        state.progressActiveTab = tab;
        notify();
      }
    });
  });

  // Roadmap jumps
  container.querySelectorAll('.jump-lesson-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setScreen('lessons');
    });
  });

  container.querySelector('.jump-lesson-detail-btn')?.addEventListener('click', () => {
    setScreen('lesson-detail');
  });

  container.querySelector('#refresh-sync-btn')?.addEventListener('click', () => {
    showToast('LTI 1.3 Gradebook Synced with Riverside Moodle Core', 'sync');
  });

  container.querySelector('#ask-dr-martinez-btn')?.addEventListener('click', () => {
    setScreen('ask-vidura');
  });

  // Module 5 Export
  container.querySelector('#export-competencies-btn')?.addEventListener('click', () => {
    const jsonStr = JSON.stringify(competenciesList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edvidura-ada-chen-competency-record.json';
    a.click();
    showToast('Exported Competency Matrix & Evidence Transcript', 'download');
  });

  // Module 7 Difference Drills
  container.querySelectorAll('.start-diff-drill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setScreen('quiz');
      showToast('Launching targeted Difference Remediation Drill', 'bolt');
    });
  });

  // Module 9 Goals & Activities
  container.querySelector('#add-goal-btn')?.addEventListener('click', () => {
    showToast('Add Custom Goal: Target 90% on Slope Transformations', 'add_circle');
  });

  container.querySelectorAll('.launch-activity-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scr = (e.currentTarget as HTMLElement).getAttribute('data-screen') as any;
      if (scr) {
        setScreen(scr);
      }
    });
  });
}
