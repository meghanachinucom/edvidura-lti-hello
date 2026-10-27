/**
 * View 13: Moodle LTI Advantage Integration Shell
 * Styled with radiant coral (#FF4757), deep midnight navy (#071E2D),
 * student photography, browser chrome simulation, and quick launch pads.
 */
import { setScreen, showToast } from '../state';

export function renderHomeShell(): string {
  return `
    <div class="flex flex-col w-full bg-[#FAFBFC] flex-1 min-h-[calc(100vh-4rem)]">
      
      <!-- Top Moodle LMS Browser Chrome Simulation Header -->
      <section class="w-full bg-[#071E2D] text-white px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs border-b border-[#1E435E] shadow-sm font-mono">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-[#FF4757] inline-block shadow-xs"></span>
          <span class="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block shadow-xs"></span>
          <span class="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block shadow-xs"></span>
          <span class="text-gray-300 ml-2 truncate">moodle.riverside.edu/course/view.php?id=1042</span>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span class="bg-white/10 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-white/15 text-white">LTI 1.3 Advantage Container</span>
          <button id="shell-refresh-btn" class="hover:text-[#FF4757] transition-colors flex items-center gap-1 cursor-pointer font-sans text-xs text-gray-300">
            <span class="material-symbols-outlined text-[15px]">refresh</span>
            <span>Reload Frame</span>
          </button>
        </div>
      </section>

      <!-- Course Container Header -->
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        <!-- Hero Header -->
        <section class="hero-navy-card relative overflow-hidden rounded-3xl text-white p-6 sm:p-10 shadow-xl" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
          <!-- Ambient glowing background lights -->
          <div class="absolute -top-20 -right-20 w-80 h-80 bg-[#FF4757]/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-20 w-72 h-72 bg-[#0284C7]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div class="lg:col-span-7 space-y-4">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono">
                <span class="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span>Riverside Unified School District</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#38BDF8]">Deep Linking 2.0</span>
              </div>

              <h1 class="text-3xl sm:text-4xl font-bold text-white tracking-tight font-headline">
                Moodle 4.3 <span class="text-[#FF4757]">LMS Integration Shell</span>
              </h1>
              <p class="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl">
                Simulates the student and teacher launch envelope from Riverside High School Moodle directly into the EdVidura academic runtime.
              </p>

              <div class="flex items-center gap-3 pt-2">
                <button id="shell-open-home" class="btn-primary-3d px-6 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg">
                  <span>Enter EdVidura Courseware</span>
                  <span class="material-symbols-outlined text-[18px]">launch</span>
                </button>
              </div>
            </div>

            <!-- Right Visual: Student Launch Imagery -->
            <div class="lg:col-span-5 relative flex justify-center">
              <div class="relative w-full max-w-md h-60 sm:h-64 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80"
                  alt="Student Launch Envelope"
                  class="w-full h-full object-cover"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/60 shadow-md flex items-center gap-2 text-xs">
                  <span class="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                  <span class="font-bold text-[#0F172A]">Authenticated: Ada Chen (Student)</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- Embedded LTI Environment Card -->
        <div class="card-depth-interactive rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-8 bg-white border border-[#E2E8F0]">
          <div class="flex-1 space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0F3] text-[#FF4757] text-xs font-bold font-mono border border-[#FFCCD5]">
              <span class="w-2 h-2 rounded-full bg-[#FF4757]"></span>
              <span>LTI Advantage 1.3 Certified Core</span>
            </div>

            <h2 class="text-2xl font-bold text-[#0F172A] tracking-tight font-headline">
              Seamless Grade &amp; Attendance Handshake
            </h2>
            <p class="text-sm text-[#64748B] max-w-xl leading-relaxed">
              EdVidura operates directly inside the district learning management system. Quiz results and checkpoint submissions are signed via RSA-SHA256 and sent via LTI Assignment &amp; Grade Services (AGS) v2.0.
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-xs">
              <div>
                <span class="text-xs text-[#64748B] uppercase font-bold font-mono">Federation</span>
                <div class="font-bold text-[#0F172A] text-sm mt-0.5">Moodle 4.3+</div>
              </div>
              <div>
                <span class="text-xs text-[#64748B] uppercase font-bold font-mono">Security Token</span>
                <div class="font-bold text-[#10B981] text-sm mt-0.5">Verified Active</div>
              </div>
              <div class="col-span-2 sm:col-span-1">
                <span class="text-xs text-[#64748B] uppercase font-bold font-mono">User Persona</span>
                <div class="font-bold text-[#FF4757] text-sm mt-0.5">Learner (Ada Chen)</div>
              </div>
            </div>
          </div>

          <!-- Cartesian Geometric Motif Preview -->
          <div class="w-full lg:w-80 card-depth-interactive rounded-2xl p-5 flex flex-col gap-3 bg-white border border-[#CBD5E1] shrink-0">
            <div class="flex items-center justify-between text-[#64748B] text-xs border-b border-[#E2E8F0] pb-2 font-mono">
              <span class="font-bold text-[#0F172A]">Cartesian Studio</span>
              <span class="text-[#FF4757] font-bold">f(x) = 2x + 1</span>
            </div>
            <div class="w-full h-36 flex items-center justify-center bg-gradient-to-br from-[#071E2D] to-[#0D2538] rounded-xl border border-[#1E435E] overflow-hidden p-2">
              <svg class="w-full h-full" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
                <line stroke="#486D82" stroke-width="1" x1="10" x2="190" y1="90" y2="90"></line>
                <line stroke="#486D82" stroke-width="1" x1="40" x2="40" y1="10" y2="110"></line>
                <line stroke="#1E435E" stroke-dasharray="3 3" stroke-width="0.75" x1="10" x2="190" y1="50" y2="50"></line>
                <line stroke="#1E435E" stroke-dasharray="3 3" stroke-width="0.75" x1="120" x2="120" y1="10" y2="110"></line>
                <path d="M 20 85 L 120 45 L 180 20" stroke="#FF4757" stroke-linecap="round" stroke-width="3"></path>
                <circle cx="40" cy="77" fill="#FF4757" r="4" stroke="#FFFFFF" stroke-width="2"></circle>
                <circle cx="120" cy="45" fill="#38BDF8" r="4" stroke="#FFFFFF" stroke-width="2"></circle>
              </svg>
            </div>
            <div class="flex items-center justify-between text-xs pt-1 border-t border-[#E2E8F0] font-mono">
              <span class="text-[#64748B]">Active Coursework:</span>
              <span class="font-bold text-[#FF4757]">Lesson 03 Sandbox</span>
            </div>
          </div>
        </div>

        <!-- Quick Switch Pathways -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
          <button class="shell-jump-btn card-depth-interactive rounded-2xl p-5 text-left cursor-pointer bg-white border border-[#E2E8F0] hover:border-[#FF4757]/40" data-screen="lessons">
            <span class="material-symbols-outlined text-[#FF4757] text-[28px]">menu_book</span>
            <div class="text-sm font-bold text-[#0F172A] mt-2 font-headline">Lessons Sequence</div>
            <p class="text-xs text-[#64748B] mt-1 leading-normal">Units 1-4 with 8 modules</p>
          </button>
          
          <button class="shell-jump-btn card-depth-interactive rounded-2xl p-5 text-left cursor-pointer bg-white border border-[#E2E8F0] hover:border-[#F59E0B]/40" data-screen="quiz">
            <span class="material-symbols-outlined text-[#F59E0B] text-[28px]">quiz</span>
            <div class="text-sm font-bold text-[#0F172A] mt-2 font-headline">Checkpoint 2 Quiz</div>
            <p class="text-xs text-[#64748B] mt-1 leading-normal">Graded 6-question assessment</p>
          </button>

          <button class="shell-jump-btn card-depth-interactive rounded-2xl p-5 text-left cursor-pointer bg-white border border-[#E2E8F0] hover:border-[#0284C7]/40" data-screen="lesson-detail">
            <span class="material-symbols-outlined text-[#0284C7] text-[28px]">ssid_chart</span>
            <div class="text-sm font-bold text-[#0F172A] mt-2 font-headline">Cartesian Sandbox</div>
            <p class="text-xs text-[#64748B] mt-1 leading-normal">Interactive coordinate grapher</p>
          </button>

          <button class="shell-jump-btn card-depth-interactive rounded-2xl p-5 text-left cursor-pointer bg-white border border-[#E2E8F0] hover:border-[#10B981]/40" data-screen="my-progress">
            <span class="material-symbols-outlined text-[#10B981] text-[28px]">insights</span>
            <div class="text-sm font-bold text-[#0F172A] mt-2 font-headline">Progress Roadmap</div>
            <p class="text-xs text-[#64748B] mt-1 leading-normal">Curriculum mastery sequence</p>
          </button>
        </div>

      </div>
    </div>
  `;
}

export function bindHomeShellEvents(container: HTMLElement): void {
  container.querySelector('#shell-refresh-btn')?.addEventListener('click', () => {
    showToast('Reloading Moodle LTI Advantage 1.3 launch frame...', 'sync');
  });

  container.querySelector('#shell-open-home')?.addEventListener('click', () => {
    setScreen('student-home');
  });

  container.querySelectorAll('.shell-jump-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const scr = (e.currentTarget as HTMLElement).getAttribute('data-screen');
      if (scr) setScreen(scr as any);
    });
  });
}
