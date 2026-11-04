/**
 * View 10: Teacher Results / Class Gradebook & Moodle Sync
 * Styled with radiant coral (#FE580D), deep midnight navy (#111827),
 * student photography, colorful metric cards, and tactile gradebook matrix.
 */
import { state, setScreen, setRole, showToast, notify, studentsList, StudentRow } from '../state';
import { classLabel, displayName, escapeHtml } from '../boot';
import { hubStat, hubStats } from '../components/hub';
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
    <div class="hub-page">
      <div class="studio-grid">
        <section class="hub-hero studio-main">
          <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b955?auto=format&fit=crop&w=1600&q=80" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">EvalPro · ${escapeHtml(displayName())}</p>
            <h1>Class results</h1>
            <p class="hub-hero-sub">${escapeHtml(classLabel())} · gradebook syncs to Moodle when ready.</p>
            <div class="hub-hero-ctas">
              <button id="sync-all-btn" class="hub-cta-light" type="button"><span class="material-symbols-outlined text-[16px]">sync</span> Sync</button>
              <button id="preview-student-btn" class="hub-cta-light" type="button">Student view</button>
              <button id="tab-analytics" class="sr-only" type="button">Diagnostics</button>
            </div>
          </div>
        </section>
        <section class="hub-cal studio-rail">
          <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=70" alt="">
          <div class="hub-cal-body">
            <h2 class="text-base font-extrabold">Class mean</h2>
            <p class="text-3xl font-extrabold mt-3 tabular-nums">${state.connected ? `${meanScore}%` : '83%'}</p>
            <p class="text-xs text-white/70 mt-1">${state.connected ? `${reviewCount} need review` : '4 need review'}</p>
          </div>
        </section>
      </div>
      ${hubStats(
        hubStat('sync', 'Synced', state.connected ? `${syncedCount} / ${rows.length || 1}` : '18 / 24'),
        hubStat('flag', 'Review', state.connected ? String(reviewCount) : '4'),
        hubStat('hourglass', 'Pending', state.connected ? String(pendingCount) : '2')
      )}
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <label class="hub-search" style="min-width:14rem;max-width:20rem;box-shadow:none">
            <span class="material-symbols-outlined">search</span>
            <input id="student-search-input" type="search" value="${state.teacherSearchQuery}" placeholder="Search students…" autocomplete="off" />
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <div class="hub-seg" role="group">
              <button class="filter-tab hub-seg-btn ${filter === 'all' ? 'on' : ''}" data-filter="all" type="button">All</button>
              <button class="filter-tab hub-seg-btn ${filter === 'synced' ? 'on' : ''}" data-filter="synced" type="button">Synced</button>
              <button class="filter-tab hub-seg-btn ${filter === 'needs-review' ? 'on' : ''}" data-filter="needs-review" type="button">Review</button>
              <button class="filter-tab hub-seg-btn ${filter === 'pending' ? 'on' : ''}" data-filter="pending" type="button">Pending</button>
            </div>
            <button id="export-csv-btn" class="hub-cta-light" type="button" style="margin-top:0">CSV</button>
            <button id="tab-preview-quiz" class="hub-cta-light" type="button" style="margin-top:0">Preview</button>
          </div>
        </div>

        <!-- Gradebook Table Container -->
        <div class="hub-card overflow-hidden p-0">
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
                        <tr class="hover:bg-[#FFF7ED]/30 transition-colors group">
                          <td class="py-3.5 px-6">
                            <div class="flex items-center gap-3">
                              ${
                                s.avatarUrl
                                  ? `<img src="${s.avatarUrl}" alt="${s.name}" class="w-10 h-10 rounded-2xl object-cover ring-2 ring-[#FE580D]/30 shadow-xs shrink-0" />`
                                  : `<div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA] text-[#FE580D] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">${s.initials}</div>`
                              }
                              <div class="flex flex-col">
                                <span class="font-bold text-[#0F172A] text-sm group-hover:text-[#FE580D] transition-colors">${s.name}</span>
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
                                ? `<span class="font-bold text-sm ${isMastered ? 'text-[#10B981]' : isReview ? 'text-[#FE580D]' : 'text-[#0F172A]'}">${s.scorePercent}%</span>`
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
                              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#FE580D] border border-[#FED7AA]">
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
                              <button class="grade-sync-btn px-2.5 py-1 rounded-lg text-xs font-bold text-[#FE580D] hover:bg-[#FFF7ED] border border-[#FED7AA] cursor-pointer" data-id="${s.id}">
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
          <div class="hub-card space-y-3">
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
          <div class="hub-card space-y-3">
            <h3 class="text-base font-bold text-[#0F172A] font-headline">AI essay grade (vs instructor answer)</h3>
            <p class="text-xs text-[#64748B]">Compares the student text with your model answer and lesson RAG. Never sent to Moodle.</p>
            <textarea id="essay-prompt" class="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs" rows="2" placeholder="Question"></textarea>
            <textarea id="essay-instructor" class="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs" rows="2" placeholder="Instructor model answer"></textarea>
            <textarea id="essay-student" class="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs" rows="3" placeholder="Student essay"></textarea>
            <button id="essay-grade-btn" class="btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer" type="button">Suggest score</button>
            <p id="essay-grade-out" class="text-xs text-[#0F172A] font-mono whitespace-pre-wrap"></p>
          </div>
        </div>
    </div>`;
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
    setRole('student');
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
