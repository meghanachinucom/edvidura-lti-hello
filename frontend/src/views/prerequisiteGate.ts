/**
 * View 05: Prerequisite Gate Modal
 * Styled with radiant coral (#FF4757), deep midnight navy (#071E2D),
 * student photography, and encouraging pedagogical guidance.
 */
import { setScreen, showToast } from '../state';

export function renderPrerequisiteGate(): string {
  return `
    <div class="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-[#FAFBFC]">
      
      <!-- Underlying Blurred Page Context -->
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 opacity-25 pointer-events-none select-none filter blur-[3px]">
        <div class="flex items-center gap-2 text-[#64748B] text-xs mb-6 font-mono">
          <span>Curriculum</span>
          <span>/</span>
          <span>Unit 2: Linear Relationships</span>
          <span>/</span>
          <span class="text-[#0F172A] font-bold">Checkpoint 2 Graded Quiz</span>
        </div>

        <div class="card-depth-2 rounded-3xl p-8 space-y-6 bg-white">
          <div class="flex items-start justify-between">
            <div class="space-y-2">
              <span class="text-xs uppercase tracking-wider text-[#64748B] font-bold font-mono">Summative Evaluation</span>
              <h1 class="text-2xl font-bold text-[#0F172A]">Checkpoint Assessment 02: Linear Functions &amp; Graphing</h1>
              <p class="text-sm text-[#64748B] max-w-xl">6 questions evaluating slope, rate of change, and standard form conversion.</p>
            </div>
            <div class="w-16 h-16 rounded-2xl bg-[#FFF0F3] text-[#FF4757] flex flex-col items-center justify-center font-bold">
              <span class="text-xl">100</span>
              <span class="text-[10px] font-mono">PTS</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scrim with Centered Modal Card -->
      <div class="absolute inset-0 bg-[#071E2D]/60 backdrop-blur-sm z-30 flex items-center justify-center p-4 overflow-y-auto">
        
        <!-- Centered Editorial Gate Card -->
        <div class="relative w-full max-w-[520px] bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 sm:p-8 my-auto animate-fade-rise" id="quiz-gate-modal">
          
          <!-- Top Utility / Back to Lessons Anchor -->
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E8F0]">
            <button id="gate-return-btn" class="text-xs font-bold text-[#071E2D] hover:text-[#FF4757] flex items-center gap-1 group cursor-pointer transition-colors">
              <span class="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-0.5">arrow_back</span>
              <span>Return to Lessons</span>
            </button>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F3] text-[#FF4757] font-mono text-[11px] font-bold border border-[#FFCCD5]">
              <span class="w-1.5 h-1.5 rounded-full bg-[#FF4757]"></span>
              <span>Prerequisite Milestone</span>
            </span>
          </div>

          <!-- Icon & Header Section with Encouraging Student Photo -->
          <div class="flex items-center gap-4 text-left mb-4">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=140&q=80"
              alt="Ada Chen Student"
              class="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#FF4757] shrink-0 shadow-md"
            />
            <div>
              <p class="text-xs uppercase tracking-wider text-[#FF4757] font-mono font-bold">
                Unit 2 Sequence Check
              </p>
              <h2 class="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight font-headline">
                Almost Ready for Quiz 2!
              </h2>
              <p class="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                Complete Lesson 04 in order to unlock the official Moodle SIS graded checkpoint.
              </p>
            </div>
          </div>

          <!-- Progress Track & Metric Section -->
          <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-2">
            <div class="flex items-baseline justify-between text-xs">
              <span class="font-bold text-[#0F172A]">Foundational Coursework</span>
              <span class="font-bold text-[#FF4757] font-mono tabular-nums">3 of 8 completed</span>
            </div>
            
            <div class="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden p-0.5">
              <div class="h-full bg-gradient-to-r from-[#FF5B6B] to-[#FF4757] rounded-full transition-all duration-700" style="width: 37.5%;"></div>
            </div>
            <div class="flex justify-between items-center text-[#64748B] font-mono text-[11px]">
              <span>Modules 2.1 – 2.3 mastered</span>
              <span class="font-bold text-[#0F172A]">38% Complete</span>
            </div>
          </div>

          <!-- Next Steps List -->
          <div class="mt-4 space-y-2">
            <div class="text-[11px] text-[#64748B] uppercase tracking-wider font-bold font-mono px-1">
              Next step in syllabus:
            </div>

            <!-- Active Next Item -->
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFF0F3] border border-[#FFCCD5] shadow-xs">
              <div class="flex items-center gap-2.5 min-w-0 pr-2">
                <span class="w-7 h-7 rounded-xl bg-[#FF4757] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <div class="truncate">
                  <span class="text-xs font-bold text-[#0F172A] block truncate">
                    Lesson 04: Slope-Intercept Form in Practice
                  </span>
                  <span class="text-[11px] text-[#64748B] font-mono">
                    12 min · Active sequence
                  </span>
                </div>
              </div>
              <span class="px-2.5 py-0.5 rounded-lg bg-white text-[#FF4757] text-xs font-bold font-mono border border-[#FFCCD5] shrink-0">
                Next
              </span>
            </div>
          </div>

          <!-- Call to Actions with 3D Buttons -->
          <div class="mt-6 flex flex-col gap-2.5">
            <button id="gate-continue-btn" class="btn-primary-3d w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md">
              <span>Continue Lesson 04 Now</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
            <button id="gate-practice-btn" class="btn-secondary-3d w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer text-[#071E2D]">
              <span class="material-symbols-outlined text-[#0284C7] text-[16px]">biotech</span>
              <span>Launch Practice Simulation Sandbox</span>
            </button>
          </div>

          <!-- Footer Inscription -->
          <div class="mt-4 text-center">
            <p class="text-xs text-[#64748B] font-mono">
              Questions about prerequisites?
              <button id="gate-contact-btn" class="text-[#FF4757] hover:underline font-bold cursor-pointer font-sans">Ask Vidura Companion</button>.
            </p>
          </div>

        </div>
      </div>

    </div>
  `;
}

export function bindPrerequisiteGateEvents(container: HTMLElement): void {
  container.querySelector('#gate-return-btn')?.addEventListener('click', () => setScreen('lessons'));
  container.querySelector('#gate-continue-btn')?.addEventListener('click', () => setScreen('lesson-detail'));
  container.querySelector('#gate-practice-btn')?.addEventListener('click', () => {
    showToast('Unlocked practice simulation sandbox', 'biotech');
    setScreen('quiz');
  });
  container.querySelector('#gate-contact-btn')?.addEventListener('click', () => {
    setScreen('ask-vidura');
  });
}
