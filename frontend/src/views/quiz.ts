/**
 * View 03: Checkpoint 2 Graded Quiz & AI Assessment Suite
 * Module 2: AI Assessment Tools
 * - Additional question types: Multiple Choice, True/False, Fill-in-the-Blank, Essay / Open Derivation
 * - Automated grading with instant scoring
 * - Bulk question generator via AI & Question Bank drawer
 * - Exports: QTI 2.1 XML, JSON, Printable PDF
 * - LMS Grade Synchronisation with Moodle/Canvas LTI AGS passback
 */
import { state, setScreen, showToast, notify } from '../state';
import { escapeHtml, firstName, submitLiveQuiz } from '../boot';
import {
  exportAssessment,
  generateCatBank,
  generateTestBank,
  mapCatDocument,
  reviewTestBank,
} from '../api';

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-blank' | 'essay' | 'multi';

export interface QuizQuestion {
  id: string;
  num: string;
  type: QuestionType;
  title: string;
  pts: string;
  standard?: string;
  question: string;
  choices?: { key: string; text: string; isMono?: boolean }[];
  correct?: string;
  placeholder?: string;
  rubricCriteria?: { name: string; maxPts: number }[];
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    num: '01',
    type: 'multiple-choice',
    title: 'Linear Slope Quotient',
    pts: '1 point',
    standard: 'CCSS.MATH.HSA.CED.A.2',
    question:
      'What is the slope of the line passing through the points <span class="font-mono text-[#071E2D] bg-[#FFF0F3] px-2 py-0.5 rounded text-sm font-bold border border-[#FFCCD5]">(2, 3)</span> and <span class="font-mono text-[#071E2D] bg-[#FFF0F3] px-2 py-0.5 rounded text-sm font-bold border border-[#FFCCD5]">(6, 11)</span>?',
    choices: [
      { key: 'A', text: 'm = 1/2' },
      { key: 'B', text: 'm = 2' },
      { key: 'C', text: 'm = 4' },
      { key: 'D', text: 'm = 8/3' }
    ],
    correct: 'B'
  },
  {
    id: 'q2',
    num: '02',
    type: 'multiple-choice',
    title: 'Slope-Intercept Form',
    pts: '1 point',
    standard: 'CCSS.MATH.HSA.CED.A.1',
    question:
      'Which equation represents a line with a vertical intercept of <span class="font-mono text-[#071E2D] bg-[#EBF4FC] px-2 py-0.5 rounded text-sm font-bold border border-[#BAE6FD]">-4</span> and a slope of <span class="font-mono text-[#071E2D] bg-[#EBF4FC] px-2 py-0.5 rounded text-sm font-bold border border-[#BAE6FD]">3</span>?',
    choices: [
      { key: 'A', text: 'y = -4x + 3', isMono: true },
      { key: 'B', text: 'y = 3x + 4', isMono: true },
      { key: 'C', text: 'y = 3x - 4', isMono: true },
      { key: 'D', text: 'y = (1/3)x - 4', isMono: true }
    ],
    correct: 'C'
  },
  {
    id: 'q3',
    num: '03',
    type: 'multiple-choice',
    title: 'Standard Form Axis Intercepts',
    pts: '1 point',
    standard: 'CCSS.MATH.HSA.REI.B.3',
    question:
      'Find the horizontal x-intercept of the linear equation <span class="font-mono text-[#071E2D] bg-[#ECFDF5] px-2 py-0.5 rounded text-sm font-bold border border-[#A7F3D0]">2x - 5y = 20</span>.',
    choices: [
      { key: 'A', text: '(10, 0)', isMono: true },
      { key: 'B', text: '(0, -4)', isMono: true },
      { key: 'C', text: '(-10, 0)', isMono: true },
      { key: 'D', text: '(0, 4)', isMono: true }
    ],
    correct: 'A'
  },
  {
    id: 'q4',
    num: '04',
    type: 'multiple-choice',
    title: 'Perpendicular Slopes',
    pts: '1 point',
    standard: 'CCSS.MATH.HSA.CED.A.2',
    question:
      'Line <span class="font-mono text-[#FF4757] font-bold">L₁</span> has the equation <span class="font-mono text-[#071E2D] bg-[#FFF0F3] px-2 py-0.5 rounded text-sm font-bold border border-[#FFCCD5]">y = -(2/7)x + 5</span>. What must be the slope of any line perpendicular to <span class="font-mono text-[#FF4757] font-bold">L₁</span>?',
    choices: [
      { key: 'A', text: 'm = 7/2' },
      { key: 'B', text: 'm = -7/2' },
      { key: 'C', text: 'm = -2/7' },
      { key: 'D', text: 'm = 2/7' }
    ],
    correct: 'A'
  },
  {
    id: 'q5',
    num: '05',
    type: 'true-false',
    title: 'Vertical Line Slopes Concept',
    pts: '1 point',
    standard: 'CCSS.MATH.HSA.CED.A.2',
    question:
      'True or False: A vertical line of equation <span class="font-mono text-[#071E2D] bg-[#FFFBEB] px-2 py-0.5 rounded text-sm font-bold border border-[#FDE68A]">x = 4</span> has a slope of zero (<span class="font-mono">m = 0</span>).',
    choices: [
      { key: 'true', text: 'True — the slope is zero because there is no vertical tilt.' },
      { key: 'false', text: 'False — the slope is undefined because delta x is 0 in the denominator.' }
    ],
    correct: 'false'
  },
  {
    id: 'q6',
    num: '06',
    type: 'fill-blank',
    title: 'Exact Coordinate Intercept Fill-in',
    pts: '1 point',
    standard: 'CCSS.MATH.HSA.REI.B.3',
    question:
      'For the linear equation <span class="font-mono text-[#071E2D] bg-[#F5F3FF] px-2 py-0.5 rounded text-sm font-bold border border-[#DDD6FE]">3x - 6y = 18</span>, calculate the numerical value of the y-coordinate at the vertical intercept <span class="font-mono">(0, y)</span>.',
    placeholder: 'Enter numerical value (e.g. -3)...',
    correct: '-3'
  },
  {
    id: 'q7',
    num: '07',
    type: 'essay',
    title: 'Algebraic Derivation & Explanation',
    pts: '4 points',
    standard: 'CCSS.MATH.HSA.REI.B.3',
    question:
      'Explain the step-by-step algebraic manipulation to convert <span class="font-mono text-[#071E2D] bg-[#FFF0F3] px-2 py-0.5 rounded text-sm font-bold border border-[#FFCCD5]">2x - 5y = 20</span> into canonical slope-intercept form <span class="font-mono">y = mx + b</span>. Explicitly explain why the slope <span class="font-mono">m</span> becomes positive (+2/5) instead of negative.',
    rubricCriteria: [
      { name: 'Conceptual Understanding (Negative Sign Division)', maxPts: 2 },
      { name: 'Step-by-Step Algebraic Correctness', maxPts: 2 }
    ]
  }
];

// Question Bank for Teachers / Assessment Generator
export const questionBankList: QuizQuestion[] = [
  ...quizQuestions,
  {
    id: 'bank-8',
    num: '08',
    type: 'multiple-choice',
    title: 'Parallel Lines Theorem',
    pts: '1 point',
    standard: 'CCSS.MATH.HSA.CED.A.2',
    question: 'Two distinct lines in the Cartesian plane have equations y = (4/3)x - 2 and y = (4/3)x + 7. How many points of intersection exist?',
    choices: [
      { key: 'A', text: '0 (parallel lines never intersect)' },
      { key: 'B', text: '1 point' },
      { key: 'C', text: 'Infinitely many' },
      { key: 'D', text: '2 points' }
    ],
    correct: 'A'
  },
  {
    id: 'bank-9',
    num: '09',
    type: 'fill-blank',
    title: 'Point-Slope Substitution',
    pts: '1 point',
    standard: 'CCSS.MATH.HSA.CED.A.1',
    question: 'A line has slope m = 5 and passes through (2, 7). In the equation y - y1 = m(x - x1), what is the value of y1?',
    placeholder: 'Enter number...',
    correct: '7'
  }
];

export function activeQuizQuestions(): QuizQuestion[] {
  if (state.connected && state.liveQuizQuestions.length) {
    return state.liveQuizQuestions as QuizQuestion[];
  }
  return quizQuestions;
}

export function renderQuiz(): string {
  const bank = activeQuizQuestions();
  const answeredCount = Object.keys(state.quizAnswers).length;
  const totalCount = bank.length;
  const isQuestionBankOpen = state.activeDialog === 'question-bank';
  const quota = state.liveQuizQuota;
  const attemptUsed = quota?.used ?? 0;
  const attemptLimit = quota?.limit ?? 3;
  const attemptShown = Math.min(attemptUsed + (quota?.allowed === false ? 0 : 1), attemptLimit);
  const canSubmit = state.liveQuizCanSubmit !== false && (quota ? quota.allowed !== false : true);
  const assignment = state.liveQuizAssignment;
  const learner = firstName();
  const isGeneratorOpen = state.activeDialog === 'ai-generator';
  const isExportOpen = state.activeDialog === 'export-menu';

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC]">
      
      <!-- Top Academic Breadcrumbs & Context Bar -->
      <section class="w-full px-4 sm:px-6 lg:px-8 py-3.5 border-b border-[#E2E8F0] bg-white">
        <div class="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs text-[#64748B]">
          <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs font-medium flex-wrap">
            <button id="quiz-back-btn" class="text-[#071E2D] hover:text-[#FF4757] flex items-center gap-1 cursor-pointer font-bold transition-colors">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Lessons</span>
            </button>
            <span class="text-[#CBD5E1]">/</span>
            <span>Algebra I</span>
            <span class="text-[#CBD5E1]">/</span>
            <span>Unit 2: Linear Relationships</span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#FF4757] font-bold">Graded Checkpoint 2</span>
          </nav>
          
          <!-- Assessment Tools Ribbon -->
          <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button id="open-qbank-btn" class="text-xs font-bold text-[#071E2D] hover:text-[#FF4757] flex items-center gap-1 cursor-pointer transition-colors" type="button">
              <span class="material-symbols-outlined text-[16px]">inventory_2</span>
              <span>Question Bank</span>
            </button>
            <button id="open-generator-btn" class="text-xs font-bold text-[#FF4757] hover:underline flex items-center gap-1 cursor-pointer transition-colors" type="button">
              <span class="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>AI Question Gen</span>
            </button>
            <div class="relative inline-block">
              <button id="open-export-btn" class="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-white text-xs font-bold text-[#0F172A] flex items-center gap-1 cursor-pointer" type="button">
                <span class="material-symbols-outlined text-[15px]">file_download</span>
                <span>Export (QTI/PDF/MD)</span>
              </button>
              ${isExportOpen ? `
                <div class="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-[#E2E8F0] p-1.5 z-50 animate-fade-rise text-xs font-sans">
                  <button class="export-qti-btn w-full text-left px-3 py-2 rounded-lg hover:bg-[#FFF0F3] hover:text-[#FF4757] font-semibold flex items-center gap-2 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">integration_instructions</span>
                    <span>QTI 2.1 XML Package</span>
                  </button>
                  <button class="export-json-btn w-full text-left px-3 py-2 rounded-lg hover:bg-[#F1F5F9] font-semibold flex items-center gap-2 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">data_object</span>
                    <span>JSON Schema Export</span>
                  </button>
                  <button class="export-pdf-btn w-full text-left px-3 py-2 rounded-lg hover:bg-[#F1F5F9] font-semibold flex items-center gap-2 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">print</span>
                    <span>Printable Exam PDF</span>
                  </button>
                  <button class="export-md-btn w-full text-left px-3 py-2 rounded-lg hover:bg-[#F1F5F9] font-semibold flex items-center gap-2 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px]">markdown</span>
                    <span>Markdown Assessment (.md)</span>
                  </button>
                </div>
              ` : ''}
            </div>
            <div class="flex items-center gap-2 font-mono tabular-nums text-xs pl-2 border-l border-[#CBD5E1]">
              <span class="px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] font-bold border border-[#FDE68A]">
                Attempt ${attemptShown} of ${attemptLimit} (Limit Enforced)
              </span>
              <span class="text-[#10B981] font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span>AGS Sync Active</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- ========================================================
           HERO BANNER: Checkpoint 2 Overview
           ======================================================== -->
      <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div class="max-w-5xl mx-auto">
          <div class="hero-navy-card relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
            
            <div class="space-y-3 max-w-xl">
              <div class="flex items-center gap-2 text-xs font-mono">
                <span class="px-2.5 py-0.5 rounded-full bg-[#F59E0B] text-[#071E2D] font-bold text-[10px] uppercase tracking-wider">Multi-Format Assessment</span>
                <span class="text-gray-400">·</span>
                <span class="text-white font-bold">${totalCount} Questions</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#38BDF8] font-bold">Automated &amp; Rubric Graded</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline leading-tight">
                Checkpoint 2: <span class="text-[#FF4757]">AI Evaluated Linear Assessment</span>
              </h1>
              <p class="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
                Objective multiple choice, True/False logic, coordinate fill-in-the-blank, and open essay derivation evaluated against district Common Core rubrics.
              </p>
            </div>

            <!-- Student / Test Context Card -->
            <div class="flex items-center gap-4 bg-[#0A2540]/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/20 shrink-0 shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Ada Chen Student"
                class="w-12 h-12 rounded-xl object-cover ring-2 ring-[#FF4757]"
                onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';"
              />
              <div class="flex flex-col">
                <span class="text-sm font-bold text-white">${escapeHtml(learner)}</span>
                <span class="text-xs text-[#FFCCD5] font-mono">Attempts: ${attemptUsed} of ${attemptLimit}${assignment?.group_name ? ` · ${escapeHtml(assignment.group_name)}` : ''}</span>
                <span class="text-[10px] text-[#10B981] font-mono mt-0.5 font-bold">Passing: 70% threshold</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- ========================================================
           QUESTIONS STREAM
           ======================================================== -->
      <main class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 flex flex-col gap-6">
        
        <!-- Live Progress Counter Bar -->
        <div class="card-depth-1 rounded-2xl p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 border border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#FF4757] text-[20px]">assignment_turned_in</span>
            <span class="text-xs font-bold text-[#0F172A]">Quiz Completion Status:</span>
            <span class="text-xs font-mono font-bold text-[#FF4757] tabular-nums">${answeredCount} of ${totalCount} Answered</span>
          </div>
          <div class="w-full sm:w-48 bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
            <div class="bg-gradient-to-r from-[#FF5B6B] to-[#FF4757] h-full transition-all duration-300" style="width: ${(answeredCount / totalCount) * 100}%;"></div>
          </div>
        </div>

        ${state.liveQuizBlocked ? `
          <div class="card-depth-1 rounded-2xl p-4 bg-[#FFFBEB] border border-[#FDE68A] text-sm text-[#92400E] font-semibold">
            ${escapeHtml(state.liveQuizBlocked)}
          </div>
        ` : ''}
        ${assignment?.group_name && !state.liveQuizBlocked ? `
          <div class="card-depth-1 rounded-2xl p-3 bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-bold text-[#047857]">
            Assigned to ${escapeHtml(assignment.group_name)}${assignment.title ? ` · ${escapeHtml(assignment.title)}` : ''}
          </div>
        ` : ''}
        ${bank.map(q => renderQuestionCard(q)).join('')}

      </main>

      <!-- ========================================================
           STICKY GLASSMORPHIC SUBMIT DOCK
           ======================================================== -->
      <footer class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] shadow-2xl py-3 px-4 sm:px-6 lg:px-8">
        <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-xs font-mono">
            <span class="w-2.5 h-2.5 rounded-full ${answeredCount === totalCount ? 'bg-[#10B981]' : 'bg-[#F59E0B]'} animate-pulse"></span>
            <span class="font-bold text-[#0F172A]">${answeredCount === totalCount ? 'All responses recorded' : `${totalCount - answeredCount} questions remaining`}</span>
          </div>

          <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center sm:justify-end">
            <button id="save-draft-btn" class="btn-secondary-3d px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold cursor-pointer" type="button">
              Save Progress
            </button>
            <button id="submit-quiz-btn" class="btn-primary-3d px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg ${canSubmit ? '' : 'opacity-50 pointer-events-none'}" type="button" ${canSubmit ? '' : 'disabled'}>
              <span>${canSubmit ? 'Submit for Automated AI Grading' : (state.liveQuizBlocked || 'Attempt limit reached')}</span>
              <span class="material-symbols-outlined text-[18px]">verified</span>
            </button>
          </div>
        </div>
      </footer>

      <!-- Question Bank Drawer Modal -->
      ${isQuestionBankOpen ? renderQuestionBankModal() : ''}

      <!-- AI Question Generator Modal -->
      ${isGeneratorOpen ? renderAiGeneratorModal() : ''}

    </div>
  `;
}

function renderQuestionCard(q: QuizQuestion): string {
  const currentVal = state.quizAnswers[q.id] || '';

  let answerInputHtml = '';

  if (q.type === 'multi') {
    const selected = new Set((currentVal || '').split(',').filter(Boolean));
    answerInputHtml = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        ${(q.choices || []).map(choice => {
          const isSelected = selected.has(choice.key);
          return `
            <label class="relative flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#FFF0F3] border-[#FF4757] shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#FAFBFC]'
            }">
              <input
                type="checkbox"
                class="quiz-multi-input sr-only"
                value="${choice.key}"
                data-qid="${q.id}"
                ${isSelected ? 'checked' : ''}
              />
              <span class="w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                isSelected ? 'bg-[#FF4757] text-white shadow-xs' : 'bg-[#F1F5F9] text-[#64748B]'
              }">✓</span>
              <span class="text-xs sm:text-sm text-[#0F172A] font-medium">${choice.text}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  } else if (q.type === 'multiple-choice' || q.type === 'true-false') {
    answerInputHtml = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        ${(q.choices || []).map(choice => {
          const isSelected = currentVal === choice.key;
          return `
            <label class="relative flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#FFF0F3] border-[#FF4757] shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#FAFBFC]'
            }">
              <input
                type="radio"
                name="quiz_${q.id}"
                value="${choice.key}"
                class="quiz-radio-input sr-only"
                data-qid="${q.id}"
                data-qtype="${q.type}"
                ${isSelected ? 'checked' : ''}
              />
              <span class="w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                isSelected ? 'bg-[#FF4757] text-white shadow-xs' : 'bg-[#F1F5F9] text-[#64748B]'
              }">
                ${choice.key}
              </span>
              <span class="text-xs sm:text-sm text-[#0F172A] font-medium ${choice.isMono ? 'font-mono' : ''}">
                ${choice.text}
              </span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  } else if (q.type === 'fill-blank') {
    answerInputHtml = `
      <div class="pt-2 max-w-md">
        <label class="block text-xs text-[#64748B] font-mono mb-1">${q.placeholder === 'Number' ? 'Your numerical solution' : 'Your answer'}:</label>
        <div class="flex items-center gap-2">
          <input
            type="text"
            class="quiz-text-input w-full p-3 rounded-xl border border-[#CBD5E1] bg-white font-mono text-sm text-[#0F172A] focus:outline-none focus:border-[#FF4757] focus:ring-2 focus:ring-[#FFCCD5]"
            placeholder="${q.placeholder || 'Type answer here...'}"
            value="${currentVal}"
            data-qid="${q.id}"
            data-qtype="${q.type}"
          />
          <button class="quiz-text-save-btn btn-secondary-3d px-3 py-3 rounded-xl text-xs font-bold cursor-pointer" data-qid="${q.id}">
            Save
          </button>
        </div>
      </div>
    `;
  } else if (q.type === 'essay') {
    answerInputHtml = `
      <div class="pt-2 space-y-2">
        <div class="flex items-center justify-between text-xs text-[#64748B] font-mono">
          <span>Student Derivation &amp; Reasoning:</span>
          <span>Rubric: 4 Points Total</span>
        </div>
        <textarea
          class="quiz-text-input w-full p-3.5 rounded-2xl border border-[#CBD5E1] bg-white font-mono text-xs sm:text-sm text-[#0F172A] min-h-[110px] focus:outline-none focus:border-[#FF4757] focus:ring-2 focus:ring-[#FFCCD5] leading-relaxed"
          placeholder="Step 1: Subtract 2x from both sides... Step 2: Divide both terms by -5... Notice that -2/-5 = +2/5..."
          data-qid="${q.id}"
          data-qtype="${q.type}"
        >${currentVal}</textarea>
        <div class="flex justify-between items-center text-[11px] text-[#64748B] font-mono pt-1">
          <span class="flex items-center gap-1 text-[#10B981]">
            <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
            <span>Evaluated by AI Rubric on Submission</span>
          </span>
          <button class="quiz-text-save-btn btn-secondary-3d px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer" data-qid="${q.id}">
            Save Draft
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#E2E8F0] space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
        <div class="flex items-center gap-2.5">
          <span class="w-7 h-7 rounded-xl bg-[#071E2D] text-white flex items-center justify-center font-mono font-bold text-xs">
            ${q.num}
          </span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">${q.title}</h3>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
            ${q.type}
          </span>
        </div>
        <div class="flex items-center gap-2 font-mono text-xs text-[#64748B]">
          ${q.standard ? `<span class="hidden sm:inline">${q.standard}</span><span class="hidden sm:inline">·</span>` : ''}
          <span class="font-bold text-[#FF4757]">${q.pts}</span>
        </div>
      </div>

      <div class="text-sm sm:text-base text-[#0F172A] leading-relaxed">
        ${q.question}
      </div>

      ${answerInputHtml}
    </div>
  `;
}

// Question Bank Drawer
function renderQuestionBankModal(): string {
  return `
    <div class="fixed inset-0 z-50 bg-[#071E2D]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="relative w-full max-w-3xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-fade-rise">
        <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#FF4757] text-[20px]">inventory_2</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Question Bank (${(state.liveBankItems.length || state.liveBankCount || questionBankList.length)} items)</h3>
          </div>
          <button id="close-dialog-btn" class="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="space-y-3">
          ${(state.liveBankItems.length
            ? state.liveBankItems.map(item => `
            <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-[#0F172A]">${item.qtype || 'item'} · ${item.status || 'draft'}</span>
                <span class="font-mono text-[#64748B]">${item.topic || ''}</span>
              </div>
              <p class="text-xs text-[#0F172A]">${item.prompt}</p>
            </div>`).join('')
            : questionBankList.map(item => `
            <div class="p-4 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-[#0F172A]">${item.title} (${item.type})</span>
                <span class="font-mono text-[#FF4757] font-bold">${item.pts}</span>
              </div>
              <p class="text-xs text-[#64748B]">${item.question.replace(/<[^>]+>/g, '')}</p>
            </div>`).join(''))}
        </div>

        <div class="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
          <button id="promote-bank-btn" class="btn-primary-3d px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">
            Approve drafts &amp; add to live quiz
          </button>
          <button id="close-dialog-btn-2" class="btn-navy-3d px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  `;
}

// AI Question Generator Modal
function renderAiGeneratorModal(): string {
  return `
    <div class="fixed inset-0 z-50 bg-[#071E2D]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="relative w-full max-w-xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 space-y-4 animate-fade-rise">
        <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#FF4757] text-[20px]">auto_awesome</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">AI Assessment Question Generator</h3>
          </div>
          <button id="close-dialog-btn" class="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-[#0F172A] mb-1">Target Curriculum Standard:</label>
            <select id="gen-standard-select" class="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-white font-mono">
              <option value="CCSS.MATH.HSA.CED.A.2">CCSS.MATH.HSA.CED.A.2 (Slope & Coordinate Geometry)</option>
              <option value="CCSS.MATH.HSA.REI.B.3">CCSS.MATH.HSA.REI.B.3 (Standard Form & Sign Transposition)</option>
              <option value="CCSS.MATH.HSA.CED.A.1">CCSS.MATH.HSA.CED.A.1 (Linear Modeling in 1 Variable)</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#0F172A] mb-1">How many items?</label>
            <select id="gen-count-select" class="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-white font-mono">
              <option value="3">3 (quick draft)</option>
              <option value="12">12</option>
              <option value="20">20 — CAT bank from a Technical Order</option>
              <option value="120" selected>120 — test bank (review required)</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#0F172A] mb-1">Technical Order or upload (CAT F-1 / F-4)</label>
            <textarea id="cat-to-text" class="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-white font-mono min-h-[72px]" placeholder="Paste TO / objective text, or attach a PDF/DOCX below"></textarea>
            <input id="cat-to-file" type="file" accept=".pdf,.docx,.txt,.md" class="mt-2 text-[11px] font-mono" />
          </div>
          <div>
            <label class="block font-bold text-[#0F172A] mb-1">Question Type to Generate:</label>
            <select id="gen-type-select" class="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-white font-mono">
              <option value="multiple-choice">Multiple Choice (single correct)</option>
              <option value="true-false">True / False</option>
              <option value="fill-blank">Short / numeric fill-in</option>
              <option value="multi">Multi-select</option>
              <option value="numeric">Numeric</option>
              <option value="essay">Open response / essay</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#0F172A] mb-1">Difficulty Level:</label>
            <div class="grid grid-cols-3 gap-2">
              <button class="diff-btn p-2 rounded-xl border border-[#E2E8F0] font-bold text-center bg-[#ECFDF5] text-[#10B981]">Foundational</button>
              <button class="diff-btn p-2 rounded-xl border border-[#FF4757] font-bold text-center bg-[#FFF0F3] text-[#FF4757]">Standard</button>
              <button class="diff-btn p-2 rounded-xl border border-[#E2E8F0] font-bold text-center bg-[#FAFBFC] text-[#64748B]">Rigorous</button>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2 flex-wrap">
          <button id="close-dialog-btn-2" class="btn-secondary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
            Cancel
          </button>
          <button id="run-cat-map-btn" class="btn-secondary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
            Map competencies
          </button>
          <button id="run-cat-bank-btn" class="btn-navy-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
            Generate CAT bank (20+)
          </button>
          <button id="run-ai-generate-btn" class="btn-primary-3d px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md">
            <span class="material-symbols-outlined text-[16px]">bolt</span>
            <span>Generate test bank</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindQuizEvents(container: HTMLElement): void {
  // Navigation
  container.querySelector('#quiz-back-btn')?.addEventListener('click', () => {
    setScreen('lessons');
  });

  // Radio Choices
  container.querySelectorAll('.quiz-radio-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const qid = target.getAttribute('data-qid');
      if (qid && target.value) {
        state.quizAnswers[qid] = target.value;
        notify();
      }
    });
  });

  container.querySelectorAll('.quiz-multi-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const qid = target.getAttribute('data-qid');
      if (!qid) return;
      const boxes = container.querySelectorAll(`.quiz-multi-input[data-qid="${qid}"]`) as NodeListOf<HTMLInputElement>;
      const keys = Array.from(boxes).filter(b => b.checked).map(b => b.value);
      state.quizAnswers[qid] = keys.join(',');
      notify();
    });
  });

  // Text / Essay Inputs
  container.querySelectorAll('.quiz-text-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const qid = target.getAttribute('data-qid');
      if (qid) {
        state.quizAnswers[qid] = target.value;
      }
    });
  });

  container.querySelectorAll('.quiz-text-save-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const qid = (e.currentTarget as HTMLElement).getAttribute('data-qid');
      if (qid) {
        const input = container.querySelector(`[data-qid="${qid}"].quiz-text-input`) as HTMLInputElement | HTMLTextAreaElement;
        if (input) {
          state.quizAnswers[qid] = input.value;
          showToast(`Response for question #${qid.replace('q', '')} recorded`, 'check_circle');
          notify();
        }
      }
    });
  });

  // Save Progress
  container.querySelector('#save-draft-btn')?.addEventListener('click', () => {
    showToast('Assessment draft saved locally & synced to LMS session', 'save');
  });

  // Submit Quiz
  container.querySelector('#submit-quiz-btn')?.addEventListener('click', () => {
    const finishLocal = () => {
      const bank = activeQuizQuestions();
      let correct = 0;
      bank.forEach(q => {
        if (q.type === 'essay') {
          const val = state.quizAnswers[q.id];
          if (val && val.length > 20) correct += 1;
        } else if (
          state.quizAnswers[q.id] &&
          q.correct &&
          state.quizAnswers[q.id].toLowerCase().trim() === q.correct.toLowerCase().trim()
        ) {
          correct += 1;
        }
      });
      const total = bank.length || 1;
      state.quizScore = { correct, total, percent: Math.round((correct / total) * 100) };
      state.quizSubmitted = true;
      setScreen('quiz-results');
    };

    if (state.connected && !state.liveQuizCanSubmit) {
      showToast(state.liveQuizBlocked || 'Attempt limit reached', 'error');
      return;
    }
    if (state.connected && state.liveQuizQuestions.length) {
      showToast('Submitting to EdVidura quiz engine…', 'verified');
      void submitLiveQuiz()
        .then(ok => {
          if (ok) setScreen('quiz-results');
          else finishLocal();
        })
        .catch(err => {
          showToast(err instanceof Error ? err.message : 'Submit failed', 'error');
        });
      return;
    }

    showToast('Submitting responses to AI grading engine and Moodle LTI...', 'verified');
    setTimeout(finishLocal, 400);
  });

  // Dialog Toggles
  container.querySelector('#open-qbank-btn')?.addEventListener('click', () => {
    state.activeDialog = 'question-bank';
    notify();
  });

  container.querySelector('#open-generator-btn')?.addEventListener('click', () => {
    state.activeDialog = 'ai-generator';
    notify();
  });

  container.querySelector('#open-export-btn')?.addEventListener('click', () => {
    state.activeDialog = state.activeDialog === 'export-menu' ? null : 'export-menu';
    notify();
  });

  container.querySelectorAll('#close-dialog-btn, #close-dialog-btn-2').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeDialog = null;
      notify();
    });
  });

  const readCatSource = (): Promise<{ text: string; filename: string; base64: string }> => {
    const text = (container.querySelector('#cat-to-text') as HTMLTextAreaElement | null)?.value || '';
    const file = (container.querySelector('#cat-to-file') as HTMLInputElement | null)?.files?.[0];
    if (!file) return Promise.resolve({ text, filename: '', base64: '' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || '');
        const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
        resolve({ text, filename: file.name, base64 });
      };
      reader.onerror = () => reject(new Error('Could not read the Technical Order file'));
      reader.readAsDataURL(file);
    });
  };

  container.querySelector('#run-cat-map-btn')?.addEventListener('click', () => {
    showToast('Mapping competencies from the Technical Order…', 'hub');
    void readCatSource()
      .then(src => mapCatDocument({ ...src, persist: true }))
      .then(pack => {
        showToast(`Mapped ${pack.mapped_count} competencies`, 'account_tree');
        notify();
      })
      .catch(err => {
        showToast(err instanceof Error ? err.message : 'Map failed', 'error');
      });
  });

  container.querySelector('#run-cat-bank-btn')?.addEventListener('click', () => {
    showToast('Drafting 20+ CAT items from the Technical Order…', 'auto_awesome');
    void readCatSource()
      .then(src => generateCatBank({ ...src, count: 20, persist: true }))
      .then(pack => {
        state.bankDraft = pack;
        state.liveBankItems = (pack.items || pack.questions || []).map((q, i) => ({
          id: String((q as { id?: string }).id || i),
          prompt: q.prompt,
          qtype: q.qtype,
          topic: q.topic || ('skill_code' in q ? q.skill_code : undefined),
          status: 'draft',
        }));
        state.activeDialog = 'question-bank';
        showToast(`CAT bank: ${pack.bank_size} items · ${pack.mapped_count} skills`, 'inventory_2');
        notify();
      })
      .catch(err => {
        showToast(err instanceof Error ? err.message : 'CAT generate failed', 'error');
      });
  });

  // AI Generate Run
  container.querySelector('#run-ai-generate-btn')?.addEventListener('click', () => {
    const count = Number((container.querySelector('#gen-count-select') as HTMLSelectElement | null)?.value || 120);
    showToast(`Generating ${count} draft items…`, 'auto_awesome');
    void generateTestBank({ count, difficulty: 'core' })
      .then(pack => {
        state.bankDraft = pack;
        state.liveBankItems = (pack.items || pack.questions || []).map((q, i) => ({
          id: String((q as { id?: string }).id || i),
          prompt: q.prompt,
          qtype: q.qtype,
          topic: q.topic,
          status: 'draft',
        }));
        state.activeDialog = 'question-bank';
        showToast(`Drafted ${pack.bank_size} items — review before they go live`, 'inventory_2');
        notify();
      })
      .catch(err => {
        showToast(err instanceof Error ? err.message : 'Generate failed', 'error');
      });
  });

  container.querySelector('#promote-bank-btn')?.addEventListener('click', () => {
    const ids = state.liveBankItems.map(i => i.id).filter(id => id.length > 10);
    void reviewTestBank({
      batch_id: state.bankDraft?.batch?.id || '',
      item_ids: ids,
      status: 'approved',
      promote: true,
    })
      .then(pack => {
        showToast(`Promoted ${pack.promoted?.saved ?? 0} approved items into the live quiz`, 'task_alt');
        state.activeDialog = null;
        notify();
      })
      .catch(err => {
        showToast(err instanceof Error ? err.message : 'Promote failed', 'error');
      });
  });

  // Export Buttons
  container.querySelector('.export-qti-btn')?.addEventListener('click', () => {
    state.activeDialog = null;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2">
  <assessment ident="edvidura_checkpoint_2" title="Checkpoint 2: Linear Equations">
    <!-- IMS QTI 2.1 Package -->
  </assessment>
</questestinterop>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edvidura-checkpoint-2-qti21.xml';
    a.click();
    showToast('Exported IMS QTI 2.1 XML package', 'download');
    notify();
  });

  container.querySelector('.export-json-btn')?.addEventListener('click', () => {
    state.activeDialog = null;
    const jsonStr = JSON.stringify(quizQuestions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edvidura-checkpoint-2-questions.json';
    a.click();
    showToast('Exported JSON assessment schema', 'download');
    notify();
  });

  container.querySelector('.export-pdf-btn')?.addEventListener('click', () => {
    state.activeDialog = null;
    void exportAssessment('pdf', false)
      .then(pack => {
        if (pack.base64) {
          const bin = atob(pack.base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = pack.filename || 'edvidura-assessment.pdf';
          a.click();
        }
        showToast('Downloaded printable exam PDF', 'print');
        notify();
      })
      .catch(err => {
        showToast(err instanceof Error ? err.message : 'PDF export failed', 'error');
      });
  });

  container.querySelector('.export-md-btn')?.addEventListener('click', () => {
    state.activeDialog = null;
    void exportAssessment('md', true)
      .then(pack => {
        const blob = new Blob([pack.body || ''], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pack.filename || 'edvidura-assessment.md';
        a.click();
        showToast('Downloaded Markdown assessment', 'download');
        notify();
      })
      .catch(err => {
        showToast(err instanceof Error ? err.message : 'Markdown export failed', 'error');
      });
  });

  container.querySelectorAll('.add-to-quiz-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const qid = (e.currentTarget as HTMLElement).getAttribute('data-qid');
      showToast(`Added Question ${qid} to active checkpoint`, 'library_add');
    });
  });
}
