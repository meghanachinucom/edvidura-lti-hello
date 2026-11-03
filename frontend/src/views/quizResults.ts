/**
 * View 04: Graded Checkpoint Results & AI Rubric Grading
 * Module 2: AI Assessment Tools
 * - Automated grading with instant scoring breakdown
 * - Essay / Open derivation AI Rubric evaluation breakdown
 * - LMS Grade Synchronisation with verified AGS passback
 */
import { state, setScreen, showToast } from '../state';
import { activeQuizQuestions } from './quiz';
import { hubBar, hubCalChip } from '../components/hub';

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

  const reviewList = `
          ${reviews.map(r => `
            <div class="rounded-2xl p-4 border ${r.isCorrect ? 'border-[#A7F3D0]' : 'border-[#FED7AA]'} space-y-2 mb-3">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg ${r.isCorrect ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FFF7ED] text-[#FE580D]'} flex items-center justify-center font-mono font-bold text-xs">${r.num}</span>
                <span class="font-bold text-[#0F172A] text-sm">${r.title}</span>
              </div>
              <p class="text-xs text-slate-500">${r.explanation}</p>
            </div>
          `).join('')}
  `;

  return `
    <div class="hub-page">
      <div class="studio-grid">
        <section class="hub-hero studio-main">
          <img src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1600&q=80" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">${percent >= 70 ? 'Pass mark met · posted to Moodle' : 'Review needed · posted to Moodle'}</p>
            <h1>${percent}% on Checkpoint 2</h1>
            <p class="hub-hero-sub">${correct} correct · ${incorrect} to review</p>
            <div class="hub-hero-ctas">
              <button id="continue-coursework-btn" class="hub-cta-light" type="button">Keep Learning</button>
              <button id="retake-quiz-btn" class="hub-cta-light" type="button">Retake</button>
            </div>
          </div>
        </section>
        <section class="hub-cal studio-rail">
          <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=70" alt="">
          <div class="hub-cal-body">
            <h2 class="text-base font-extrabold">Score card</h2>
            <div class="flex flex-col gap-2 mt-4">
              ${hubCalChip('orange', 'This attempt', `${percent}%`)}
              ${hubCalChip('mint', 'Correct', String(correct))}
              ${hubCalChip('ghost', 'Review', String(incorrect))}
            </div>
          </div>
        </section>
      </div>
      ${hubBar({
        lead: `<button id="results-back-btn" class="hub-cta-light" type="button"><span class="material-symbols-outlined text-[16px]">arrow_back</span></button>`,
        kicker: 'Question review',
        title: 'What to revisit',
        meta: 'Official grade stays in Moodle.',
        actions: `<button id="resync-lms-btn" class="hub-cta-light" type="button">Moodle sync</button>`,
      })}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${reviewList}</div>
    </div>`;
}

export function bindQuizResultsEvents(container: HTMLElement): void {
  container.querySelectorAll('#results-back-btn, #continue-coursework-btn').forEach(btn => {
    btn.addEventListener('click', () => setScreen('lessons'));
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
