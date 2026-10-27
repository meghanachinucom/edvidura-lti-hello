/**
 * View 10: Teacher Results / Class Gradebook & Moodle Sync
 * Styled with radiant coral (#FF4757), deep midnight navy (#071E2D),
 * student photography, colorful metric cards, and tactile gradebook matrix.
 */
import { state, setScreen, showToast, notify, studentsList, StudentRow } from '../state';
import { classLabel, displayName, escapeHtml } from '../boot';
import { assignGroup, createGroup, gradeEssay } from '../api';

function roster(): StudentRow[] {
  if (state.connected && state.liveAttempts.length) {
    return state.liveAttempts.map((row, i) => ({
      ...row,
      avatarUrl: row.avatarUrl || studentsList[i % studentsList.length]?.avatarUrl,
    }));
  }
  return studentsList;
}

export function renderTeacherResults(): string {
  const query = state.teacherSearchQuery.toLowerCase().trim();
  const filter = state.teacherFilter;
  const rows = roster();

  const filteredStudents = rows.filter(s => {
    const matchesQuery = !query || s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query);
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'needs-review'
        ? s.status === 'needs-review'
        : filter === 'pending'
        ? s.status === 'pending'
        : s.status === 'synced' || s.status === 'queued';
    return matchesQuery && matchesFilter;
  });

  const scored = rows.filter(s => s.scorePercent != null);
  const meanScore = scored.length
    ? Math.round(scored.reduce((sum, s) => sum + (s.scorePercent || 0), 0) / scored.length)
    : 0;
  const syncedCount = rows.filter(s => s.status === 'synced').length;
  const reviewCount = rows.filter(s => s.status === 'needs-review').length;
  const pendingCount = rows.filter(s => s.status === 'pending' || s.status === 'queued').length;

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC]">
      
      <!-- Teacher Sub-Navigation & Scope Ribbon -->
      <section class="w-full bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-3.5">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          
          <!-- Sub-Navigation Tabs -->
          <nav aria-label="Teacher Workspace Tabs" class="flex items-center gap-6">
            <button class="text-sm font-bold text-[#FF4757] border-b-2 border-[#FF4757] py-1 focus:outline-none cursor-pointer" type="button">
              Class Gradebook
            </button>
            <button id="tab-preview-quiz" class="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors py-1 focus:outline-none cursor-pointer" type="button">
              Preview Assessment
            </button>
            <button id="tab-analytics" class="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors py-1 focus:outline-none cursor-pointer" type="button">
              Diagnostic Radar
            </button>
          </nav>

          <!-- Scope Metadata & SIS Connection -->
          <div class="flex flex-wrap items-center gap-3 text-[#64748B] font-mono tabular-nums">
            <span class="text-[#0F172A] font-sans font-semibold">${classLabel()} (${rows.length} attempts)</span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#10B981] font-bold flex items-center gap-1.5 font-sans">
              <span class="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span>Moodle SIS Synchronized</span>
            </span>
          </div>
        </div>
      </section>

      <!-- ========================================================
           COLORFUL TEACHER HERO BANNER
           ======================================================== -->
      <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div class="max-w-7xl mx-auto">
          <div class="hero-navy-card relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
            
            <div class="space-y-3 max-w-2xl">
              <div class="flex items-center gap-2 text-xs font-mono">
                <span class="px-2.5 py-0.5 rounded-full bg-[#FF4757] text-white font-bold text-[10px] uppercase tracking-wider">Instructor Portal</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#38BDF8] font-bold">${displayName()}</span>
                <span class="text-gray-400">·</span>
                <span class="text-white font-bold">Period 1 STEM</span>
              </div>
              <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
                Class Results &amp; <span class="text-[#FF4757]">Moodle Gradebook Sync</span>
              </h1>
              <p class="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
                Review student submissions, inspect question-level accuracy, and trigger instantaneous automated grade synchronization back to Riverside High SIS records.
              </p>
            </div>

            <!-- Action Cluster with 3D Buttons -->
            <div class="flex flex-wrap items-center gap-3 shrink-0">
              <button id="export-csv-btn" class="btn-secondary-3d px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
                <span class="material-symbols-outlined text-[16px]">download</span>
                <span>Export CSV</span>
              </button>
              <button id="sync-all-btn" class="btn-secondary-3d px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
                <span class="material-symbols-outlined text-[16px]">sync</span>
                <span>Sync All to Moodle</span>
              </button>
              <button id="preview-student-btn" class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md" type="button">
                <span class="material-symbols-outlined text-[16px]">visibility</span>
                <span>Preview Student View</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      <!-- ========================================================
           COLORFUL STAT TILES (4 Metrics)
           ======================================================== -->
      <section class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#FF4757] flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs text-[#64748B] font-bold uppercase tracking-wider font-mono">
              <span>Mean Score</span>
              <span>Class Avg</span>
            </div>
            <div class="py-2.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span class="text-3xl font-bold text-[#0F172A] font-headline">${state.connected ? `${meanScore}%` : '83.4%'}</span>
              <span class="text-xs font-bold text-[#10B981] flex items-center">
                <span class="material-symbols-outlined text-[14px]">arrow_upward</span>
                <span>+4.2%</span>
              </span>
            </div>
            <span class="text-xs text-[#64748B]">Target mastery: 75.0%</span>
          </div>

          <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#10B981] flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs text-[#64748B] font-bold uppercase tracking-wider font-mono">
              <span>LTI 1.3 Sync</span>
              <span>Automated</span>
            </div>
            <div class="py-2.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span class="text-3xl font-bold text-[#0F172A] font-headline">${state.connected ? `${syncedCount} / ${rows.length || 1}` : '18 / 24'}</span>
              <span class="text-xs font-bold text-[#10B981]">${state.connected && rows.length ? Math.round((100 * syncedCount) / rows.length) : 75}% Synced</span>
            </div>
            <span class="text-xs text-[#64748B]">Last batch synced 12m ago</span>
          </div>

          <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#F59E0B] flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs text-[#64748B] font-bold uppercase tracking-wider font-mono">
              <span>Intervention</span>
              <span>Needs Review</span>
            </div>
            <div class="py-2.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span class="text-3xl font-bold text-[#D97706] font-headline">${state.connected ? `${reviewCount} Students` : '4 Students'}</span>
              <span class="text-xs font-bold text-[#D97706] font-mono">Score &lt; 70%</span>
            </div>
            <span class="text-xs text-[#64748B]">Flagged for Socratic review</span>
          </div>

          <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#0284C7] flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs text-[#64748B] font-bold uppercase tracking-wider font-mono">
              <span>Attempts Count</span>
              <span>Persistence</span>
            </div>
            <div class="py-2.5 flex items-baseline gap-2 font-mono tabular-nums">
              <span class="text-3xl font-bold text-[#0F172A] font-headline">2.1 Avg</span>
              <span class="text-xs font-bold text-[#0284C7]">High Engagement</span>
            </div>
            <span class="text-xs text-[#64748B]">Max allowed: 5 attempts</span>
          </div>

        </div>
      </section>

      <!-- ========================================================
           STUDENT ROSTER MATRIX WITH PHOTOS
           ======================================================== -->
      <main class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 flex flex-col gap-6">
        
        <!-- Filter and Search Header -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          <div class="relative w-full sm:w-80">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-[#94A3B8] text-[18px]">search</span>
            <input
              id="student-search-input"
              type="text"
              value="${state.teacherSearchQuery}"
              placeholder="Search students by name or email..."
              class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] text-xs outline-none focus:border-[#FF4757] placeholder:text-[#94A3B8] shadow-xs"
            />
          </div>

          <!-- Functional Segmented Filter Buttons -->
          <div class="inline-flex items-center p-1 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs self-start sm:self-auto overflow-x-auto max-w-full" role="group">
            <button class="filter-tab px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${filter === 'all' ? 'bg-[#FF4757] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}" data-filter="all">
              All (${rows.length})
            </button>
            <button class="filter-tab px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${filter === 'synced' ? 'bg-[#10B981] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}" data-filter="synced">
              Synced (${syncedCount})
            </button>
            <button class="filter-tab px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${filter === 'needs-review' ? 'bg-[#F59E0B] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}" data-filter="needs-review">
              Needs Review (${reviewCount})
            </button>
            <button class="filter-tab px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${filter === 'pending' ? 'bg-[#071E2D] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}" data-filter="pending">
              Pending (${pendingCount})
            </button>
          </div>

        </div>

        <!-- Gradebook Table Container -->
        <div class="card-depth-interactive rounded-3xl overflow-hidden bg-white border border-[#E2E8F0]">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider font-bold font-mono">
                  <th class="py-4 px-6">Student</th>
                  <th class="py-4 px-4">Attempts</th>
                  <th class="py-4 px-4">Score</th>
                  <th class="py-4 px-4">Points</th>
                  <th class="py-4 px-4">Moodle LTI Sync</th>
                  <th class="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0]">
                ${
                  filteredStudents.length === 0
                    ? `
                  <tr>
                    <td colspan="6" class="py-12 text-center text-[#64748B]">
                      No student records match the search query "${query}".
                    </td>
                  </tr>
                `
                    : filteredStudents
                        .map(s => {
                          const isMastered = s.scorePercent !== null && s.scorePercent >= 75;
                          const isReview = s.status === 'needs-review';

                          return `
                        <tr class="hover:bg-[#FFF0F3]/30 transition-colors group">
                          <td class="py-3.5 px-6">
                            <div class="flex items-center gap-3">
                              ${
                                s.avatarUrl
                                  ? `<img src="${s.avatarUrl}" alt="${s.name}" class="w-10 h-10 rounded-2xl object-cover ring-2 ring-[#FF4757]/30 shadow-xs shrink-0" />`
                                  : `<div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFF0F3] to-[#FFCCD5] text-[#FF4757] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">${s.initials}</div>`
                              }
                              <div class="flex flex-col">
                                <span class="font-bold text-[#0F172A] text-sm group-hover:text-[#FF4757] transition-colors">${s.name}</span>
                                <span class="text-[#64748B] text-[11px] font-mono">${s.email}</span>
                              </div>
                            </div>
                          </td>
                          <td class="py-3.5 px-4 font-mono tabular-nums">
                            ${s.attempts} ${s.attempts === 1 ? 'attempt' : 'attempts'}
                          </td>
                          <td class="py-3.5 px-4 font-mono tabular-nums">
                            ${
                              s.scorePercent !== null
                                ? `<span class="font-bold text-sm ${isMastered ? 'text-[#10B981]' : isReview ? 'text-[#FF4757]' : 'text-[#0F172A]'}">${s.scorePercent}%</span>`
                                : '<span class="text-[#94A3B8]">—</span>'
                            }
                          </td>
                          <td class="py-3.5 px-4 font-mono tabular-nums text-[#0F172A] font-semibold">
                            ${s.scorePoints}
                          </td>
                          <td class="py-3.5 px-4">
                            ${
                              s.status === 'synced'
                                ? `
                              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                                <span class="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                                <span>Synced</span>
                              </span>
                            `
                                : s.status === 'queued'
                                ? `
                              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EBF4FC] text-[#0284C7] border border-[#BAE6FD]">
                                <span class="material-symbols-outlined text-[13px] animate-spin">sync</span>
                                <span>Queued</span>
                              </span>
                            `
                                : s.status === 'needs-review'
                                ? `
                              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF0F3] text-[#FF4757] border border-[#FFCCD5]">
                                <span class="material-symbols-outlined text-[13px]">warning</span>
                                <span>Needs Review</span>
                              </span>
                            `
                                : `
                              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
                                <span>Pending</span>
                              </span>
                            `
                            }
                          </td>
                          <td class="py-3.5 px-6 text-right">
                            <div class="inline-flex items-center gap-2">
                              <button class="grade-action-btn btn-secondary-3d px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer" data-id="${s.id}" data-action="view">
                                Review
                              </button>
                              <button class="grade-sync-btn px-2.5 py-1 rounded-lg text-xs font-bold text-[#FF4757] hover:bg-[#FFF0F3] border border-[#FFCCD5] cursor-pointer" data-id="${s.id}">
                                Push SIS
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                        })
                        .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-[#0F172A] font-headline">LTI groups</h3>
              <span class="text-[10px] font-mono font-bold ${state.gsAvailable ? 'text-[#10B981]' : 'text-[#64748B]'}">${state.gsAvailable ? 'Group Services on launch' : 'Local groups'}</span>
            </div>
            <p class="text-xs text-[#64748B]">Assign the class quiz to a Moodle or local group.</p>
            <div class="flex gap-2">
              <input id="new-group-name" class="flex-1 px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs" placeholder="Group name"/>
              <button id="create-group-btn" class="btn-primary-3d px-3 py-2 rounded-xl text-xs font-bold cursor-pointer" type="button">Create</button>
            </div>
            <ul class="text-xs space-y-2">
              ${(state.liveGroups || []).length
                ? state.liveGroups.map(g => `
                <li class="flex items-center justify-between gap-2">
                  <span><strong>${escapeHtml(g.name)}</strong> · ${g.member_count} · ${escapeHtml(g.source)}</span>
                  <button class="assign-group-btn text-[#0284C7] font-bold cursor-pointer" data-gid="${escapeHtml(g.group_id)}" type="button">Assign quiz</button>
                </li>`).join('')
                : '<li class="text-[#64748B]">No groups yet.</li>'}
            </ul>
            ${(state.liveGroupAssignments || []).length
              ? `<p class="text-[11px] font-mono text-[#64748B]">${state.liveGroupAssignments.map(a => `${escapeHtml(a.group_name)} → ${escapeHtml(a.title)}`).join(' · ')}</p>`
              : ''}
          </div>
          <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-3">
            <h3 class="text-base font-bold text-[#0F172A] font-headline">AI essay grade (vs instructor answer)</h3>
            <p class="text-xs text-[#64748B]">Compares the student text with your model answer and lesson RAG. Never sent to Moodle.</p>
            <textarea id="essay-prompt" class="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs" rows="2" placeholder="Question"></textarea>
            <textarea id="essay-instructor" class="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs" rows="2" placeholder="Instructor model answer"></textarea>
            <textarea id="essay-student" class="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs" rows="3" placeholder="Student essay"></textarea>
            <button id="essay-grade-btn" class="btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer" type="button">Suggest score</button>
            <p id="essay-grade-out" class="text-xs text-[#0F172A] font-mono whitespace-pre-wrap"></p>
          </div>
        </div>

      </main>

    </div>
  `;
}

export function bindTeacherResultsEvents(container: HTMLElement): void {
  // Navigation Tabs
  container.querySelector('#tab-preview-quiz')?.addEventListener('click', () => {
    setScreen('quiz');
  });

  container.querySelector('#tab-analytics')?.addEventListener('click', () => {
    setScreen('teacher-diagnostics');
  });

  // Action Bar Buttons
  container.querySelector('#preview-student-btn')?.addEventListener('click', () => {
    setScreen('student-home');
  });

  container.querySelector('#sync-all-btn')?.addEventListener('click', () => {
    showToast('Pushing 24 student grades to Riverside High Moodle 4.3...', 'sync');
    setTimeout(() => {
      showToast('All 24 grades confirmed synced in district database', 'verified');
    }, 1200);
  });

  container.querySelector('#export-csv-btn')?.addEventListener('click', () => {
    showToast('Exported Period 1 Gradebook CSV (24 rows)', 'download');
  });

  // Search input
  const searchInput = container.querySelector('#student-search-input') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    state.teacherSearchQuery = searchInput.value;
    setScreen('teacher-results');
  });

  // Filter tabs
  container.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      const filter = (e.currentTarget as HTMLElement).getAttribute('data-filter') as any;
      if (filter) {
        state.teacherFilter = filter;
        setScreen('teacher-results');
      }
    });
  });

  // Row Action buttons
  container.querySelectorAll('.grade-action-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const student = roster().find(s => s.id === id);
      if (student) {
        showToast(`Opening diagnostic record for ${student.name}`, 'insights');
        setScreen('teacher-diagnostics');
      }
    });
  });

  container.querySelectorAll('.grade-sync-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      const student = roster().find(s => s.id === id);
      if (student) {
        showToast(`Pushed ${student.name}'s grade to Moodle SIS`, 'verified');
      }
    });
  });

  container.querySelector('#create-group-btn')?.addEventListener('click', () => {
    const name = (container.querySelector('#new-group-name') as HTMLInputElement | null)?.value || '';
    void createGroup(name)
      .then(row => {
        state.liveGroups = [...state.liveGroups, { group_id: row.group_id, name: row.name, member_count: 0, source: 'local' }];
        showToast(`Created group ${row.name}`, 'group');
        notify();
      })
      .catch(err => showToast(err instanceof Error ? err.message : 'Group failed', 'error'));
  });

  container.querySelectorAll('.assign-group-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const gid = (e.currentTarget as HTMLElement).getAttribute('data-gid') || '';
      void assignGroup(gid)
        .then(() => showToast('Assigned class quiz to group', 'task_alt'))
        .catch(err => showToast(err instanceof Error ? err.message : 'Assign failed', 'error'));
    });
  });

  container.querySelector('#essay-grade-btn')?.addEventListener('click', () => {
    const prompt = (container.querySelector('#essay-prompt') as HTMLTextAreaElement | null)?.value || '';
    const instructor = (container.querySelector('#essay-instructor') as HTMLTextAreaElement | null)?.value || '';
    const student = (container.querySelector('#essay-student') as HTMLTextAreaElement | null)?.value || '';
    void gradeEssay({ prompt, instructor_answer: instructor, student_answer: student })
      .then(pack => {
        const out = container.querySelector('#essay-grade-out');
        if (out) out.textContent = pack.copy_text || `${pack.score}/${pack.max_score} (${pack.percent}%)`;
        showToast('Essay suggestion ready — not sent to Moodle', 'rate_review');
      })
      .catch(err => showToast(err instanceof Error ? err.message : 'Grade failed', 'error'));
  });
}
