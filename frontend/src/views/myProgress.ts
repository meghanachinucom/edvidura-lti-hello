/**
 * View 09: Student Academic Progress & Personalised Learning Engine
 * Modules covered:
 * - Module 5: Competency Assessment Tool (tracking, 4 proficiency levels, assessment evidence, progress reporting)
 * - Module 7: Difference Training Application (competency gap analysis, training recommendations, progress tracking)
 * - Module 9: Personalised Learning Engine (recommendations, learning goals, progress, and suggested activities)
 */
import { getApprenticeship, getContinuity } from '../api';
import { state, setScreen, showToast, notify, learningGoalsList, suggestedActivitiesList } from '../state';
import { classLabel, displayCompetencies, displayName, escapeHtml } from '../boot';
import { hubStat, hubStats } from '../components/hub';

function progressCaps(): Record<string, boolean> {
  const raw = state.liveSession?.capabilities;
  if (raw && typeof raw === 'object' && Object.keys(raw).length) {
    return raw as Record<string, boolean>;
  }
  // Local SPA demo: show Wave C tabs
  return { apprenticeship: true, qualification_continuity: true };
}

export function renderMyProgress(): string {
  const activeTab = state.progressActiveTab || 'roadmap';
  const progressPct = state.liveProgress?.percent ?? 38;
  const caps = progressCaps();

  return `
    <div class="hub-page">
      <div class="studio-grid">
        <section class="hub-hero studio-main">
          <img src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1600&q=80" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">PLE · ${escapeHtml(displayName())}</p>
            <h1>You're ${progressPct}% through Unit 2</h1>
            <p class="hub-hero-sub">Personal plan · skills passport · micro-drills. Scores sync to Moodle.</p>
            <div class="hub-hero-ctas">
              <button id="refresh-sync-btn" class="hub-cta-light progress-sync" type="button">Continue</button>
            </div>
          </div>
        </section>
        <section class="hub-cal studio-rail">
          <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=70" alt="">
          <div class="hub-cal-body">
            <h2 class="text-base font-extrabold">${escapeHtml(classLabel())}</h2>
            <p class="text-sm text-white/75 mt-3">Roadmap, Skills Passport, gap drills, and study goals.</p>
          </div>
        </section>
      </div>
      <div class="hub-seg flex-wrap">
        <button class="progress-tab-btn hub-seg-btn ${activeTab === 'roadmap' ? 'on' : ''}" data-tab="roadmap" type="button"><span class="material-symbols-outlined text-[16px]">map</span> Roadmap</button>
        <button class="progress-tab-btn hub-seg-btn ${activeTab === 'competencies' ? 'on' : ''}" data-tab="competencies" type="button"><span class="material-symbols-outlined text-[16px]">fact_check</span> Skills Passport</button>
        <button class="progress-tab-btn hub-seg-btn ${activeTab === 'difference' ? 'on' : ''}" data-tab="difference" type="button"><span class="material-symbols-outlined text-[16px]">troubleshoot</span> Micro-drills</button>
        <button class="progress-tab-btn hub-seg-btn ${activeTab === 'goals' ? 'on' : ''}" data-tab="goals" type="button"><span class="material-symbols-outlined text-[16px]">psychology_alt</span> Study plan</button>
        ${caps.apprenticeship ? `<button class="progress-tab-btn hub-seg-btn ${activeTab === 'apprentice' ? 'on' : ''}" data-tab="apprentice" type="button"><span class="material-symbols-outlined text-[16px]">handshake</span> Apprentice</button>` : ''}
        ${caps.qualification_continuity ? `<button class="progress-tab-btn hub-seg-btn ${activeTab === 'continuity' ? 'on' : ''}" data-tab="continuity" type="button"><span class="material-symbols-outlined text-[16px]">verified</span> Continuity</button>` : ''}
      </div>
      ${renderProgressActiveContent(activeTab)}
    </div>`;
}

function renderProgressActiveContent(tab: string): string {
  switch (tab) {
    case 'competencies':
      return renderCompetenciesTab();
    case 'difference':
      return renderDifferenceTrainingTab();
    case 'goals':
      return renderGoalsAndRecommendationsTab();
    case 'apprentice':
      return renderApprenticeTab();
    case 'continuity':
      return renderContinuityTab();
    case 'roadmap':
    default:
      return renderRoadmapTab();
  }
}

function renderApprenticeTab(): string {
  const live = state.liveApprenticeship;
  const rows = live?.placements?.length
    ? live.placements
    : [
        { apprentice: displayName(), mentor: 'Faculty lead', role: 'Pathway apprentice', hours_logged: 8, hours_target: 40, status: 'active', next_checkpoint: 'First observed quiz' },
      ];
  return `
    <div class="flex flex-col gap-4">
      <div>
        <p class="hub-kicker-ink">Wave C · thin</p>
        <h2 class="text-lg font-extrabold text-[#111827]">Apprenticeship pathway</h2>
        <p class="text-sm text-slate-500 mt-1">Mentor hours and checkpoints on top of Skills Passport.</p>
      </div>
      ${hubStats(
        hubStat('handshake', 'Placements', String(live?.count ?? rows.length)),
        hubStat('schedule', 'Active', String(live?.active ?? rows.filter(r => r.status === 'active').length))
      )}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${rows.map(r => `
          <article class="hub-card flex flex-col gap-2">
            <p class="hub-kicker-ink">${escapeHtml(r.status)}</p>
            <h3 class="text-sm font-extrabold text-[#111827]">${escapeHtml(r.role)}</h3>
            <p class="text-xs text-slate-600">Mentor: ${escapeHtml(r.mentor)} · You: ${escapeHtml(r.apprentice)}</p>
            <p class="text-xs tabular-nums text-slate-500">${r.hours_logged} / ${r.hours_target} hrs</p>
            ${r.next_checkpoint ? `<p class="text-xs text-slate-600 mt-auto">Next: ${escapeHtml(r.next_checkpoint)}</p>` : ''}
          </article>`).join('')}
      </div>
    </div>`;
}

function renderContinuityTab(): string {
  const live = state.liveContinuity;
  const rows = live?.credentials?.length
    ? live.credentials
    : [
        { label: 'Lockout / Tagout', status: 'current', expires_at: '2027-06-12', days_to_expiry: 585 },
        { label: 'Mechanical seal competency', status: 'due_soon', expires_at: '2026-11-01', days_to_expiry: 30 },
      ];
  return `
    <div class="flex flex-col gap-4">
      <div>
        <p class="hub-kicker-ink">Wave C · thin</p>
        <h2 class="text-lg font-extrabold text-[#111827]">Qualification continuity</h2>
        <p class="text-sm text-slate-500 mt-1">Credential currency — renew before expiry.</p>
      </div>
      ${hubStats(
        hubStat('verified', 'Credentials', String(live?.count ?? rows.length)),
        hubStat('warning', 'Due soon', String(live?.due_soon ?? rows.filter(r => r.status === 'due_soon').length))
      )}
      <div class="hub-card overflow-hidden p-0">
        <table class="w-full text-left text-xs">
          <thead><tr class="bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider font-bold font-mono">
            <th class="py-3 px-4">Credential</th><th class="py-3 px-4">Status</th><th class="py-3 px-4">Expires</th>
          </tr></thead>
          <tbody>
            ${rows.map(c => `
              <tr class="border-t border-[#E2E8F0]">
                <td class="py-3 px-4 font-bold">${escapeHtml(c.label)}</td>
                <td class="py-3 px-4">${escapeHtml(c.status.replace('_', ' '))}</td>
                <td class="py-3 px-4 tabular-nums">${escapeHtml(c.expires_at || '—')}${c.days_to_expiry != null ? ` · ${c.days_to_expiry}d` : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// =========================================================================
// TAB 1: ACADEMIC ROADMAP
// =========================================================================
function renderRoadmapTab(): string {
  const progressPct = state.liveProgress?.percent ?? 38;
  const progressDone = state.liveProgress?.completed_count ?? 3;
  const progressTotal = state.liveProgress?.total_count ?? 8;
  return `
    <section class="hub-stats">
      ${hubStat('trending_up', 'Progress', `${progressPct}%`)}
      ${hubStat('menu_book', 'Lessons', `${progressDone} / ${progressTotal}`)}
      ${hubStat('grade', 'Last quiz', `${state.quizScore.correct} / ${state.quizScore.total || 6}`)}
    </section>

    <article class="hub-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
      <div>
        <p class="hub-kicker-ink">Micro-Learning</p>
        <h2 class="text-base font-extrabold text-[#111827] mt-1">Next short path</h2>
        <p class="text-sm text-slate-600 mt-1">Close one skill gap with a focused drill, then return to the unit roadmap.</p>
      </div>
      <button class="progress-tab-btn hub-cta-dark" data-tab="difference" type="button" style="margin-top:0">Open micro-drills</button>
    </article>

    <div class="flex flex-col gap-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-extrabold text-[#111827]">Unit 2 · Linear functions</h2>
        <button id="ask-dr-martinez-btn" class="hub-cta-light" type="button" style="margin-top:0">Ask Vidura</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <article class="studio-cover">
          <div class="studio-cover-media"><img src="https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=640&q=70" alt=""><span class="hub-pill ok studio-cover-pill">Done</span></div>
          <div class="studio-cover-body">
            <p class="hub-kicker-ink">Lesson 01</p>
            <h3>Linear foundations</h3>
            <p>Ordered pairs</p>
            <button class="jump-lesson-btn hub-cta-dark" data-lesson="01" type="button">Review</button>
          </div>
        </article>
        <article class="studio-cover">
          <div class="studio-cover-media"><img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=640&q=70" alt=""><span class="hub-pill ok studio-cover-pill">Done</span></div>
          <div class="studio-cover-body">
            <p class="hub-kicker-ink">Lesson 02</p>
            <h3>Slope &amp; rate</h3>
            <p>Rise over run</p>
            <button class="jump-lesson-btn hub-cta-dark" data-lesson="02" type="button">Review</button>
          </div>
        </article>
        <article class="studio-cover on">
          <div class="studio-cover-media"><img src="https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=640&q=70" alt=""><span class="hub-pill studio-cover-pill">Now</span></div>
          <div class="studio-cover-body">
            <p class="hub-kicker-ink">Lesson 03 · Lab</p>
            <h3>Graphs &amp; intercepts</h3>
            <p>Try m and b</p>
            <button class="jump-lesson-detail-btn hub-cta-dark" type="button">Open lab</button>
          </div>
        </article>
        <article class="studio-cover">
          <div class="studio-cover-media"><img src="https://images.unsplash.com/photo-1456513080800-7d113dc8c4b2?auto=format&fit=crop&w=640&q=70" alt=""><span class="hub-pill lock studio-cover-pill">Locked</span></div>
          <div class="studio-cover-body">
            <p class="hub-kicker-ink">Lesson 04</p>
            <h3>Slope-intercept</h3>
            <p>After Checkpoint 2</p>
          </div>
        </article>
      </div>
    </div>
  `;
}

// =========================================================================
// TAB 2: MODULE 5 — Competency Assessment Tool
// =========================================================================
function renderCompetenciesTab(): string {
  const comps = displayCompetencies();
  return `
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-lg font-extrabold text-[#111827]">Skills Passport</h2>
        <p class="text-sm text-slate-500 mt-1">Competency levels with evidence · Novice → Advanced</p>
      </div>
      <button id="export-competencies-btn" class="hub-cta-light" type="button" style="margin-top:0">Export</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      ${comps.map(comp => {
        const levelConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
          novice: { label: 'Novice', bg: 'bg-[#FEF2F2]', text: 'text-[#EF4444]', border: 'border-[#FECACA]' },
          developing: { label: 'Developing', bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', border: 'border-[#FDE68A]' },
          proficient: { label: 'Proficient', bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', border: 'border-[#A7F3D0]' },
          advanced: { label: 'Advanced', bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', border: 'border-[#BFDBFE]' }
        };
        const cfg = levelConfig[comp.level];

        return `
          <article class="hub-card flex flex-col gap-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="hub-kicker-ink">${escapeHtml(comp.code)}</p>
                <h3 class="text-base font-extrabold text-[#111827] mt-1">${escapeHtml(comp.name)}</h3>
              </div>
              <div class="text-right shrink-0">
                <p class="text-2xl font-extrabold tabular-nums text-[#111827]">${comp.score}%</p>
                <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}">${cfg.label}</span>
              </div>
            </div>
            <div class="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
              <div class="h-full bg-[#FE580D] rounded-full" style="width: ${comp.score}%;"></div>
            </div>
            <p class="text-xs text-slate-500">${comp.evidenceItems.length} evidence items</p>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

// =========================================================================
// TAB 3: MODULE 7 — Difference Training Application
// =========================================================================
function renderDifferenceTrainingTab(): string {
  const comps = displayCompetencies();
  const gaps = comps.filter(c => c.gap > 0);
  return `
    <div>
      <h2 class="text-lg font-extrabold text-[#111827]">Micro-Learning drills</h2>
      <p class="text-sm text-slate-500 mt-1">Short gap practices — finish one, then return to your roadmap.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      ${gaps.length ? gaps.map(c => `
        <article class="hub-card flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="hub-kicker-ink">−${c.gap}% to target</p>
              <h3 class="text-base font-extrabold text-[#111827] mt-1">${escapeHtml(c.name)}</h3>
            </div>
            <p class="text-sm tabular-nums text-slate-500 shrink-0">${c.score}% → ${c.targetScore}%</p>
          </div>
          <div class="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden relative">
            <div class="absolute top-0 bottom-0 w-0.5 bg-[#111827]" style="left: ${c.targetScore}%;"></div>
            <div class="h-full bg-[#FE580D] rounded-full" style="width: ${c.score}%;"></div>
          </div>
          <div class="flex items-center justify-between gap-3 mt-auto">
            <p class="text-sm text-slate-600">${escapeHtml(c.remediationTitle || 'Practice set')} · ~${c.remediationHours || 1.5}h</p>
            <button class="start-diff-drill-btn hub-cta-dark" data-comp="${c.code}" type="button">Practice</button>
          </div>
        </article>
      `).join('') : `<p class="text-sm text-slate-500">No gaps right now — nice work.</p>`}
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
    <div class="hub-card flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-lg font-extrabold text-[#111827]">PLE study plan</h2>
        <span class="text-xs text-slate-500">${plan?.active ? `${plan.done_count || 0}/${plan.step_count || 0} steps` : 'Waiting for gaps'}</span>
      </div>
      <p class="text-sm text-slate-600">${escapeHtml(plan?.message || 'Take a quiz or ask Vidura — your personal learning plan appears when we see gaps.')}</p>
      <div class="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
        <div class="h-full bg-[#FE580D] rounded-full" style="width: ${plan?.progress_pct || 0}%;"></div>
      </div>
      ${
        planSkills.length
          ? `<div class="flex flex-wrap gap-2">${planSkills
              .map(
                s =>
                  `<span class="px-2.5 py-1 rounded-full bg-[#FFF7ED] text-[#FE580D] text-[11px] font-bold">${escapeHtml(s.label || s.code)}</span>`
              )
              .join('')}</div>`
          : ''
      }
    </div>

    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h2 class="text-lg font-extrabold text-[#111827]">Goals</h2>
      <button id="add-goal-btn" class="hub-cta-light" type="button" style="margin-top:0">Add goal</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      ${learningGoalsList.map(g => `
        <article class="hub-card flex flex-col gap-3">
          <div class="flex items-center justify-between text-xs">
            <span class="hub-kicker-ink">${escapeHtml(g.category)}</span>
            ${g.completed ? '<span class="text-[#10B981] font-bold">Done</span>' : `<span class="text-slate-500">Due ${escapeHtml(g.deadline)}</span>`}
          </div>
          <h3 class="text-sm font-extrabold text-[#111827] leading-snug">${escapeHtml(g.title)}</h3>
          <div class="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
            <div class="h-full ${g.completed ? 'bg-[#62BF8E]' : 'bg-[#FE580D]'} rounded-full" style="width: ${g.currentScore}%;"></div>
          </div>
          <p class="text-xs text-slate-500 tabular-nums">${g.currentScore}% → ${g.targetScore}%</p>
        </article>
      `).join('')}
    </div>

    <div>
      <h2 class="text-lg font-extrabold text-[#111827]">Suggested next</h2>
      <p class="text-sm text-slate-500 mt-1">Based on recent quizzes and pacing.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      ${suggestedActivitiesList.map(act => `
        <article class="hub-card flex flex-col gap-3">
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="font-bold ${act.urgency === 'high' ? 'text-[#FE580D]' : 'text-slate-600'}">${act.urgency === 'high' ? 'Priority' : 'Suggested'}</span>
            <span>·</span>
            <span>~${act.estimatedMinutes} min</span>
          </div>
          <h3 class="text-sm font-extrabold text-[#111827]">${escapeHtml(act.title)}</h3>
          <p class="text-xs text-slate-500 leading-relaxed">${escapeHtml(act.reason)}</p>
          <button class="launch-activity-btn hub-cta-dark mt-auto" data-screen="${act.actionScreen}" type="button">Open</button>
        </article>
      `).join('')}
    </div>
  `;
}

export function bindMyProgressEvents(container: HTMLElement): void {
  if (state.connected) {
    const caps = progressCaps();
    if (caps.apprenticeship && !state.liveApprenticeship) {
      getApprenticeship()
        .then((data) => {
          state.liveApprenticeship = data;
          notify();
        })
        .catch(() => {});
    }
    if (caps.qualification_continuity && !state.liveContinuity) {
      getContinuity()
        .then((data) => {
          state.liveContinuity = data;
          notify();
        })
        .catch(() => {});
    }
  }

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

  const syncMoodle = () => showToast('LTI 1.3 Gradebook Synced with Riverside Moodle Core', 'sync');
  container.querySelector('#refresh-sync-btn')?.addEventListener('click', syncMoodle);
  container.querySelectorAll('.progress-sync').forEach(btn => btn.addEventListener('click', syncMoodle));

  container.querySelector('#ask-dr-martinez-btn')?.addEventListener('click', () => {
    setScreen('ask-vidura');
  });

  // Module 5 Export
  container.querySelector('#export-competencies-btn')?.addEventListener('click', () => {
    const jsonStr = JSON.stringify(displayCompetencies(), null, 2);
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
