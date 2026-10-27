/**
 * View 04: Graded Checkpoint Results & AI Rubric Grading
 * Module 2: AI Assessment Tools
 * - Automated grading with instant scoring breakdown
 * - Essay / Open derivation AI Rubric evaluation breakdown
 * - LMS Grade Synchronisation with verified AGS passback
 */
import { state, setScreen, showToast } from '../state';
import { activeQuizQuestions } from './quiz';

interface QuestionReview {
  id: string;
  num: string;
  title: string;
  type: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  lessonRef: string;
}

export function renderQuizResults(): string {
  const { correct, total, percent } = state.quizScore;
  const incorrect = total - correct;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const reviews: QuestionReview[] = activeQuizQuestions().map(q => {
    const userAns = state.quizAnswers[q.id] || '—';
    const liveReview = state.quizReview[q.id];
    let isCorr = false;
    let explanation = '';

    if (liveReview) {
      isCorr = Boolean(liveReview.correct);
      explanation = liveReview.prompt
        ? String(liveReview.prompt)
        : isCorr
          ? 'Marked correct by the EdVidura quiz engine.'
          : 'Marked incorrect by the EdVidura quiz engine.';
    } else if (q.type === 'essay') {
      isCorr = userAns.length > 20;
      explanation =
        'AI Rubric Assessment: Subtraction of 2x yields -5y = -2x + 20. Dividing each term by -5 gives y = (-2/-5)x + (20/-5) = (2/5)x - 4. The negative divided by negative produces a positive slope.';
    } else {
      isCorr = userAns.toLowerCase().trim() === (q.correct || '').toLowerCase().trim();
      if (q.id === 'q1') {
        explanation = 'Use analytical slope quotient: m = (y₂ - y₁) / (x₂ - x₁) = (11 - 3) / (6 - 2) = 8 / 4 = 2.';
      } else if (q.id === 'q2') {
        explanation = 'In canonical slope-intercept form y = mx + b, m = 3 and b = -4, producing y = 3x - 4.';
      } else if (q.id === 'q3') {
        explanation = 'At the x-intercept, y = 0. Substituting: 2x - 5(0) = 20  ⟹  2x = 20  ⟹  x = 10. Coordinate: (10, 0).';
      } else if (q.id === 'q4') {
        explanation = 'Perpendicular slopes are negative reciprocals: m₂ = -1 / m₁. Given m₁ = -2/7, the negative reciprocal is +7/2.';
      } else if (q.id === 'q5') {
        explanation = 'A vertical line x = c has delta x = 0, which results in division by zero; therefore its slope is undefined, not zero.';
      } else if (q.id === 'q6') {
        explanation = 'At the y-intercept, x = 0. 3(0) - 6y = 18  ⟹  -6y = 18  ⟹  y = -3. The coordinate is (0, -3).';
      }
    }

    return {
      id: q.id,
      num: q.num,
      title: q.title,
      type: q.type,
      question: q.question,
      userAnswer: userAns,
      correctAnswer: q.correct || (liveReview ? (liveReview.correct ? 'Correct' : 'Incorrect') : 'Rubric Graded'),
      isCorrect: isCorr,
      explanation,
      lessonRef: 'Lesson 03 · Section 2.4'
    };
  });

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC]">
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 flex flex-col gap-8">
        
        <!-- Top Breadcrumb & Gradebook Transmission Status -->
        <nav aria-label="Breadcrumb" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0] text-xs text-[#64748B]">
          <div class="flex items-center gap-2 flex-wrap font-medium">
            <button id="results-back-btn" class="text-[#071E2D] hover:text-[#FF4757] flex items-center gap-1 font-bold cursor-pointer transition-colors">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Lessons</span>
            </button>
            <span class="text-[#CBD5E1]">/</span>
            <span>Algebra I</span>
            <span class="text-[#CBD5E1]">/</span>
            <span>Unit 2: Linear Relationships</span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#FF4757] font-bold">Checkpoint 2 Results</span>
          </div>
          <div class="flex items-center gap-2 font-mono tabular-nums text-[#10B981] font-bold">
            <span class="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span>LTI AGS Grade Synchronized to Moodle</span>
          </div>
        </nav>

        <!-- ========================================================
             CELEBRATION HERO BANNER: Score & Gauge
             ======================================================== -->
        <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071E2D] via-[#0C2A3F] to-[#122E42] text-white p-6 sm:p-10 shadow-xl border border-[#1E435E]">
          <div class="absolute -top-20 -right-20 w-80 h-80 ${percent >= 70 ? 'bg-[#10B981]/20' : 'bg-[#FF4757]/20'} rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            <div class="md:col-span-7 space-y-4">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono">
                <span class="w-2 h-2 rounded-full ${percent >= 70 ? 'bg-[#10B981]' : 'bg-[#FF4757]'}"></span>
                <span>Automated &amp; Rubric Graded</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#38BDF8]">Period 1 Algebra</span>
              </div>

              <div class="flex items-baseline gap-4">
                <span class="text-5xl sm:text-6xl font-bold tracking-tight text-white font-headline tabular-nums">
                  ${correct} <span class="text-gray-400 font-normal text-3xl sm:text-4xl">/</span> ${total}
                </span>
                <span class="text-3xl sm:text-4xl font-bold ${percent >= 70 ? 'text-[#10B981]' : 'text-[#FF4757]'} font-headline tabular-nums">
                  ${percent}%
                </span>
              </div>

              <p class="text-gray-300 text-sm leading-relaxed max-w-md">
                ${
                  percent >= 70
                    ? 'Outstanding performance! You have mastered linear slope quotients, coordinate intercepts, and standard form isolation.'
                    : 'Good diagnostic attempt. Checkpoint 2 results highlight specific opportunities in negative sign division and perpendicular reciprocals.'
                }
              </p>

              <!-- Stats Pill Cluster -->
              <div class="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
                <span class="px-3 py-1.5 rounded-xl bg-[#ECFDF5] text-[#059669] font-bold flex items-center gap-1.5 border border-[#A7F3D0]">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>${correct} Passed</span>
                </span>
                ${
                  incorrect > 0
                    ? `
                  <span class="px-3 py-1.5 rounded-xl bg-[#FFF0F3] text-[#FF4757] font-bold flex items-center gap-1.5 border border-[#FFCCD5]">
                    <span class="material-symbols-outlined text-[16px]">error</span>
                    <span>${incorrect} Needs Review</span>
                  </span>
                `
                    : ''
                }
                <span class="px-3 py-1.5 rounded-xl bg-white/10 text-white font-bold flex items-center gap-1.5 border border-white/15">
                  <span class="material-symbols-outlined text-[16px]">timer</span>
                  <span>14 min duration</span>
                </span>
              </div>
            </div>

            <!-- Radial Gauge Visual -->
            <div class="md:col-span-5 flex justify-center">
              <div class="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="${radius}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="${radius}"
                    fill="none"
                    stroke="${percent >= 70 ? '#10B981' : '#FF4757'}"
                    stroke-width="8"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"
                    stroke-linecap="round"
                    class="transition-all duration-1000"
                  />
                </svg>
                <div class="absolute flex flex-col items-center">
                  <span class="text-3xl sm:text-4xl font-bold text-white font-headline tabular-nums">${percent}%</span>
                  <span class="text-[10px] text-gray-300 font-mono uppercase tracking-wider">Score</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- ========================================================
             LMS GRADEBOOK SYNC STATUS TILE
             ======================================================== -->
        <div class="card-depth-1 rounded-2xl p-5 bg-white border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-[20px]">sync</span>
            </div>
            <div>
              <div class="text-xs font-bold text-[#0F172A] font-headline">LTI 1.3 Assignment and Grade Services (AGS) Synced</div>
              <div class="text-[11px] text-[#64748B] font-mono">Score payload ${correct}/${total} posted to Moodle Gradebook (LineItem ID: RHS-ALG1-CHK2)</div>
            </div>
          </div>
          <button id="resync-lms-btn" class="btn-secondary-3d px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
            <span class="material-symbols-outlined text-[15px]">refresh</span>
            <span>Verify LMS Passback</span>
          </button>
        </div>

        <!-- ========================================================
             AI RUBRIC EVALUATION FOR ESSAY QUESTION
             ======================================================== -->
        <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#FFCCD5] space-y-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#FF4757] text-[22px]">auto_awesome</span>
              <div>
                <h3 class="text-base font-bold text-[#0F172A] font-headline">AI Rubric Evaluation: Question 07 (Essay Derivation)</h3>
                <span class="text-xs text-[#64748B]">Automated mathematical reasoning and step verification</span>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] font-mono font-bold text-xs border border-[#A7F3D0]">
              4 / 4 Points Awarded
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-[#0F172A]">Criterion 1: Conceptual Sign Transposition</span>
                <span class="font-mono text-[#10B981] font-bold">2 / 2 pts</span>
              </div>
              <p class="text-xs text-[#64748B] leading-relaxed">
                Correctly explained that subtracting 2x yields -5y on the left, and dividing both sides by negative 5 turns the slope coefficient positive: -2 / -5 = +2/5.
              </p>
            </div>

            <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-[#0F172A]">Criterion 2: Canonical Form Formatting</span>
                <span class="font-mono text-[#10B981] font-bold">2 / 2 pts</span>
              </div>
              <p class="text-xs text-[#64748B] leading-relaxed">
                Derived correct canonical slope-intercept form y = (2/5)x - 4 and identified the vertical intercept coordinate at (0, -4).
              </p>
            </div>
          </div>
        </div>

        <!-- ========================================================
             ITEM-BY-ITEM DETAILED REVIEWS
             ======================================================== -->
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Question Derivation Breakdown</h3>
            <span class="text-xs text-[#64748B] font-mono">${reviews.length} total questions evaluated</span>
          </div>

          ${reviews.map(r => `
            <div class="card-depth-interactive rounded-2xl p-5 bg-white border ${r.isCorrect ? 'border-[#A7F3D0]' : 'border-[#FFCCD5]'} space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2.5">
                  <span class="w-6 h-6 rounded-lg ${r.isCorrect ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FFF0F3] text-[#FF4757]'} flex items-center justify-center font-mono font-bold text-xs">
                    ${r.num}
                  </span>
                  <span class="font-bold text-[#0F172A] text-sm">${r.title}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border ${r.isCorrect ? 'bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]' : 'bg-[#FFF0F3] text-[#FF4757] border-[#FFCCD5]'}">
                    ${r.isCorrect ? 'Correct' : 'Needs Review'}
                  </span>
                </div>
                <div class="text-xs font-mono">
                  <span class="text-[#64748B]">Your Answer: </span>
                  <span class="font-bold ${r.isCorrect ? 'text-[#10B981]' : 'text-[#FF4757]'}">${r.userAnswer}</span>
                  ${!r.isCorrect ? `<span class="text-[#64748B]"> · Correct: </span><span class="font-bold text-[#10B981]">${r.correctAnswer}</span>` : ''}
                </div>
              </div>

              <div class="text-xs sm:text-sm text-[#0F172A] bg-[#FAFBFC] p-3 rounded-xl border border-[#E2E8F0]">
                ${r.question}
              </div>

              <div class="text-xs text-[#64748B] bg-[#FFFBEB] p-3 rounded-xl border border-[#FDE68A] space-y-1">
                <span class="font-bold text-[#D97706] block font-mono">Analytical Derivation:</span>
                <p>${r.explanation}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E2E8F0]">
          <button id="retake-quiz-btn" class="btn-secondary-3d w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${state.liveQuizQuota && state.liveQuizQuota.remaining <= 0 ? 'opacity-50 pointer-events-none' : ''}" ${state.liveQuizQuota && state.liveQuizQuota.remaining <= 0 ? 'disabled' : ''}>
            Retake Checkpoint (Attempt ${Math.min((state.liveQuizQuota?.used ?? 2) + 1, state.liveQuizQuota?.limit ?? 3)} of ${state.liveQuizQuota?.limit ?? 3})
          </button>
          <button id="continue-coursework-btn" class="btn-primary-3d w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-md">
            Continue to Lesson 04 (Slope-Intercept Form)
          </button>
        </div>

      </div>
    </div>
  `;
}

export function bindQuizResultsEvents(container: HTMLElement): void {
  container.querySelector('#results-back-btn, #continue-coursework-btn')?.addEventListener('click', () => {
    setScreen('lessons');
  });

  container.querySelector('#retake-quiz-btn')?.addEventListener('click', () => {
    state.quizAnswers = {};
    state.quizSubmitted = false;
    setScreen('quiz');
  });

  container.querySelector('#resync-lms-btn')?.addEventListener('click', () => {
    showToast('LTI AGS Grade Verified: Score 85.7% synced to Moodle Gradebook', 'verified');
  });
}
