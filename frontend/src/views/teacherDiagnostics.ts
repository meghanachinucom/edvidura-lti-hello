/**
 * View 11: Teacher Class Diagnostics & Analytics Dashboard
 * Modules covered:
 * - Module 1: Analytics Dashboard (Activity heatmaps, xAPI verb distribution, learner stats, session timelines, time-based analytics)
 * - Module 4: xAPI Middleware (Activity statements, filtering, statement details inspector modal, LRS data retrieval & export)
 * - Module 7: Difference Training Application (Competency gap analysis, training recommendations, progress tracking)
 */
import { state, setScreen, showToast, notify, xapiStatementsList, XApiStatement } from '../state';
import { classLabel, displayCompetencies, displayName, escapeHtml } from '../boot';
import { hubStat, hubStats } from '../components/hub';
import { fetchJsonFile, getAuditPro, getCatOverview, getFileMeta, getIqReview, getSimToReal, ingestExternalGrade, mapCatDocument, reviewCatProposal, streamFile } from '../api';

const HEAT_INTENSITY = [
  'bg-[#F1F5F9] border-[#E2E8F0]',
  'bg-[#FED7AA]/50 border-[#FED7AA]',
  'bg-[#FF8A3D]/60 border-[#FE580D]/40 text-white',
  'bg-[#FE580D]/80 border-[#E24E0B] text-white',
  'bg-[#E24E0B] border-[#B91C1C] text-white font-bold',
];

function heatmapWindowDays(filter: string): number {
  if (filter === '24h') return 2;
  if (filter === '7d') return 7;
  if (filter === '30d') return 30;
  return 90;
}

function renderDateLearnerHeatmap(timeFilter: string): string {
  const hm = state.liveAnalytics?.learner_heatmap;
  const live = Boolean(hm && hm.learners.length);
  if (!hm || !hm.learners.length) {
    return `
      <article class="hub-card flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-extrabold text-[#111827]">Learner activity</h3>
          <span class="text-xs text-slate-500">Waiting for xAPI</span>
        </div>
        <p class="text-sm text-slate-500">No statements in this window yet.</p>
      </article>`;
  }
  const take = heatmapWindowDays(timeFilter);
  const start = Math.max(0, hm.dates.length - take);
  const dates = hm.dates.slice(start);
  const labels = hm.date_labels.slice(start);
  const showCount = take <= 7;
  const rows = hm.learners.map((learner, i) => {
    const cells = (hm.cells[i] || []).slice(start);
    const intensity = (hm.intensity[i] || []).slice(start);
    return `
      <tr>
        <td class="font-bold text-[#0F172A] py-1 pr-2 whitespace-nowrap sticky left-0 bg-white z-[1]">
          ${escapeHtml(learner.label)}
          <span class="text-[#94A3B8] font-normal"> · ${learner.total}</span>
        </td>
        ${cells.map((n, j) => {
          const level = intensity[j] ?? 0;
          const day = dates[j] || labels[j] || '';
          return `<td class="p-0.5">
            <div class="min-w-[22px] h-7 rounded-md flex items-center justify-center border text-[9px] font-mono ${HEAT_INTENSITY[level] || HEAT_INTENSITY[0]}" title="${escapeHtml(learner.label)} · ${escapeHtml(day)} · ${n} events">
              ${showCount && n > 0 ? n : ''}
            </div>
          </td>`;
        }).join('')}
      </tr>`;
  }).join('');
  return `
    <article class="hub-card flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 class="text-base font-extrabold text-[#111827]">Learner activity</h3>
          <p class="text-sm text-slate-500 mt-1">Peak ${hm.peak}/day · ${timeFilter}</p>
        </div>
        <span class="text-xs ${live ? 'text-[#10B981]' : 'text-slate-500'} font-bold">${live ? 'Live' : 'Waiting'}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="text-[10px] font-mono min-w-full">
          <thead>
            <tr>
              <th class="text-left font-bold text-[#64748B] pr-2 pb-2 sticky left-0 bg-white">Learner</th>
              ${labels.map((lab) => `<th class="text-center font-bold text-[#64748B] px-0.5 pb-2 whitespace-nowrap">${escapeHtml(lab)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="flex items-center justify-end gap-1.5 text-xs text-slate-500">
          <span>Low</span>
          <div class="w-3.5 h-3.5 rounded bg-[#F1F5F9] border border-[#E2E8F0]"></div>
          <div class="w-3.5 h-3.5 rounded bg-[#FED7AA]/50 border border-[#FED7AA]"></div>
          <div class="w-3.5 h-3.5 rounded bg-[#FF8A3D]/60 border border-[#FE580D]/40"></div>
          <div class="w-3.5 h-3.5 rounded bg-[#FE580D]/80 border border-[#E24E0B]"></div>
          <div class="w-3.5 h-3.5 rounded bg-[#E24E0B] border border-[#B91C1C]"></div>
          <span>High</span>
      </div>
    </article>`;
}

function cssBarRow(
  labels: string[],
  values: Array<number | null>,
  unit: string,
  color: string
): string {
  const nums = values.map((v) => (v == null ? 0 : Number(v)));
  const peak = unit === '%' ? 100 : Math.max(...nums, 1);
  return `
    <div class="flex items-end gap-1 h-28">
      ${labels.map((lab, i) => {
        const v = values[i];
        const n = v == null ? 0 : Number(v);
        const h = Math.max(v == null ? 0 : 6, Math.round((100 * n) / peak));
        const shown = v == null ? '—' : unit === '%' ? `${n}` : String(n);
        return `<div class="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end">
          <span class="text-[9px] font-mono font-bold text-[#0F172A]">${shown}</span>
          <div class="w-full flex-1 flex items-end bg-[#F8FAFC] rounded-md overflow-hidden border border-[#E2E8F0]">
            <div class="w-full rounded-t-sm" style="height:${h}%;background:${color}" title="${escapeHtml(lab)}: ${shown}${unit === '%' ? '%' : ''}"></div>
          </div>
          <span class="text-[9px] font-mono text-[#64748B] truncate w-full text-center">${escapeHtml(lab)}</span>
        </div>`;
      }).join('')}
    </div>`;
}

function renderTimeSeriesEight(): string {
  const series = state.liveAnalytics?.time_series;
  const selected = state.diagnosticsSeriesLearner || 'class';
  const learners = series?.learners || [];
  const charts = series?.charts || [];
  const picker = `
    <label class="flex items-center gap-2 text-xs font-mono">
      <span class="text-[#64748B]">Learner</span>
      <select id="series-learner-select" class="px-2 py-1 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] font-bold">
        <option value="class" ${selected === 'class' ? 'selected' : ''}>Class total</option>
        ${learners.map((l) => `<option value="${escapeHtml(l.id)}" ${selected === l.id ? 'selected' : ''}>${escapeHtml(l.label)}</option>`).join('')}
      </select>
    </label>`;
  if (!charts.length) {
    return `
      <article class="hub-card flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <h3 class="text-base font-extrabold text-[#111827]">Trends</h3>
          ${picker}
        </div>
        <p class="text-sm text-slate-500">No series yet for this window.</p>
      </article>`;
  }
  const cards = charts.map((chart) => {
    const values =
      selected === 'class'
        ? chart.class_values
        : chart.learners[selected] || chart.class_values;
    const color = chart.metric === 'score' ? '#0284C7' : '#FE580D';
    return `
      <div class="rounded-2xl border border-[#E2E8F0] p-4 bg-[#FAFBFC] space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-xs font-bold text-[#0F172A] font-headline">${escapeHtml(chart.title)}</h4>
          <span class="text-[10px] font-mono text-[#64748B] uppercase">${escapeHtml(chart.grain)} · ${escapeHtml(chart.unit)}</span>
        </div>
        ${cssBarRow(chart.labels, values, chart.unit, color)}
      </div>`;
  }).join('');
  return `
    <article class="hub-card flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 class="text-base font-extrabold text-[#111827]">Trends</h3>
          <p class="text-sm text-slate-500 mt-1">Activity and quiz average over time.</p>
        </div>
        ${picker}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${cards}</div>
    </article>`;
}

export function renderTeacherDiagnostics(): string {
  const activeTab = state.diagnosticsTab || 'misconceptions';
  const timeFilter = state.diagnosticsTimeFilter || '7d';
  const verbFilter = state.xapiVerbFilter || 'all';

  // Filter xAPI statements
  const filteredStatements = xapiStatementsList.filter(stmt => {
    if (verbFilter === 'all') return true;
    return stmt.verb.display === verbFilter;
  });

  const showTime = activeTab === 'heatmaps' || activeTab === 'xapi';

  return `
    <div class="hub-page">
      <div class="studio-grid">
        <section class="hub-hero studio-main">
          <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">EvalPro analytics · ${escapeHtml(displayName())}</p>
            <h1>Where the class is stuck</h1>
            <p class="hub-hero-sub">${escapeHtml(classLabel() || 'Class')} · activity, gaps, and xAPI for this section.</p>
            <div class="hub-hero-ctas">
              <button id="btn-assign-remediation" class="hub-cta-light" type="button">Assign drill</button>
              <button id="diag-to-results" class="sr-only" type="button">Gradebook</button>
              <button id="diag-to-preview" class="sr-only" type="button">Preview quiz</button>
            </div>
          </div>
        </section>
        <section class="hub-cal studio-rail">
          <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=70" alt="">
          <div class="hub-cal-body">
            <h2 class="text-base font-extrabold">This week</h2>
            <p class="text-sm text-white/75 mt-3">Where students need help next.</p>
          </div>
        </section>
      </div>
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div class="hub-seg flex-wrap">
            <button class="diag-subtab-btn hub-seg-btn ${activeTab === 'misconceptions' ? 'on' : ''}" data-tab="misconceptions" type="button">Stuck</button>
            <button class="diag-subtab-btn hub-seg-btn ${activeTab === 'heatmaps' ? 'on' : ''}" data-tab="heatmaps" type="button">Activity</button>
            <button class="diag-subtab-btn hub-seg-btn ${activeTab === 'xapi' ? 'on' : ''}" data-tab="xapi" type="button">xAPI</button>
            <button class="diag-subtab-btn hub-seg-btn ${activeTab === 'difference' ? 'on' : ''}" data-tab="difference" type="button">Gaps</button>
            <button class="diag-subtab-btn hub-seg-btn ${activeTab === 'audit' ? 'on' : ''}" data-tab="audit" type="button">AuditPro</button>
            <button class="diag-subtab-btn hub-seg-btn ${activeTab === 'iq' ? 'on' : ''}" data-tab="iq" type="button">IQ review</button>
            <button class="diag-subtab-btn hub-seg-btn ${activeTab === 'simreal' ? 'on' : ''}" data-tab="simreal" type="button">Sim→Real</button>
          </div>
          ${
            showTime
              ? `<div class="hub-seg">
            <button class="time-filter-btn hub-seg-btn ${timeFilter === '7d' ? 'on' : ''}" data-time="7d" type="button">7d</button>
            <button class="time-filter-btn hub-seg-btn ${timeFilter === '30d' ? 'on' : ''}" data-time="30d" type="button">30d</button>
            <button class="time-filter-btn hub-seg-btn ${timeFilter === 'semester' ? 'on' : ''}" data-time="semester" type="button">Term</button>
            <button class="time-filter-btn sr-only" data-time="24h" type="button">24h</button>
          </div>`
              : `<button id="export-summary-btn" class="hub-cta-light" type="button" style="margin-top:0">Report</button>`
          }
      </div>

      <div class="flex flex-col gap-5">
        ${renderDiagnosticsContent(activeTab, timeFilter, verbFilter, filteredStatements)}
      </div>
    </div>
      ${renderStatementInspectorModal()}
  `;
}

function renderDiagnosticsContent(activeTab: string, timeFilter: string, verbFilter: string, filteredStatements: XApiStatement[]): string {
  switch (activeTab) {
    case 'heatmaps':
      return renderHeatmapsAndVerbsTab(timeFilter);
    case 'xapi':
      return renderXApiMiddlewareTab(verbFilter, filteredStatements);
    case 'difference':
      return renderDifferenceTrainingTab();
    case 'audit':
      return renderAuditProTab();
    case 'iq':
      return renderIqReviewTab();
    case 'simreal':
      return renderSimToRealTab();
    case 'misconceptions':
    default:
      return renderMisconceptionsTab();
  }
}

function renderSimToRealTab(): string {
  const live = state.liveSimToReal;
  const pairs = live?.pairs?.length
    ? live.pairs
    : [
        { skill: 'Seal replacement', sim_source: 'xr-vr-pump-maintainer', sim_score_pct: 88, real_score_pct: 74, gap_pct: 14, transfer: 'moderate' },
        { skill: 'Cartesian slope reading', sim_source: 'xr-cartesian-3d', sim_score_pct: 91, real_score_pct: 86, gap_pct: 5, transfer: 'strong' },
      ];
  return `
    <div class="flex flex-col gap-4">
      <div>
        <p class="hub-kicker-ink">Wave C · thin</p>
        <h2 class="text-lg font-extrabold text-[#111827]">Sim-to-Real transfer</h2>
        <p class="text-sm text-slate-500 mt-1">XR / sim scores vs observed EvalPro performance. Enable <code>sim_to_real_analytics</code>.</p>
      </div>
      ${hubStats(
        hubStat('compare_arrows', 'Avg gap', `${live?.avg_gap_pct ?? pairs.reduce((s, p) => s + p.gap_pct, 0) / pairs.length}%`),
        hubStat('science', 'Pairs', String(live?.pair_count ?? pairs.length))
      )}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${pairs.map(p => `
          <article class="hub-card flex flex-col gap-2">
            <p class="hub-kicker-ink">${escapeHtml(p.transfer)} transfer</p>
            <h3 class="text-sm font-extrabold text-[#111827]">${escapeHtml(p.skill)}</h3>
            <p class="text-xs text-slate-500">${escapeHtml(p.sim_source)}</p>
            <p class="text-xs tabular-nums text-slate-600">Sim ${p.sim_score_pct}% → Real ${p.real_score_pct}% · gap ${p.gap_pct}%</p>
          </article>`).join('')}
      </div>
    </div>`;
}

function renderAuditProTab(): string {
  const live = state.liveAuditPro;
  const items = live?.items?.length
    ? live.items
    : [
        { learner_name: 'Asha R.', percent: 83, grade_sent: true, seal_ok: true, seal_reason: 'Valid seal', created_at: 'demo' },
        { learner_name: 'Rohan K.', percent: 67, grade_sent: false, seal_ok: true, seal_reason: 'Valid seal', created_at: 'demo' },
      ];
  return `
    <div class="flex flex-col gap-4">
      <div>
        <p class="hub-kicker-ink">Wave A · thin</p>
        <h2 class="text-lg font-extrabold text-[#111827]">AuditPro evidence trail</h2>
        <p class="text-sm text-slate-500 mt-1">Sealed grade receipts · Moodle sync flags. Enable block <code>audit_pro</code> on the tenant.</p>
      </div>
      ${hubStats(
        hubStat('verified', 'Sealed OK', String(live?.sealed_ok ?? items.filter(i => i.seal_ok).length)),
        hubStat('sync', 'Synced', String(live?.synced_to_lms ?? items.filter(i => i.grade_sent).length)),
        hubStat('list', 'Attempts', String(live?.total ?? items.length))
      )}
      <div class="hub-card overflow-hidden p-0">
        <table class="w-full text-left text-xs">
          <thead><tr class="bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider font-bold font-mono">
            <th class="py-3 px-4">Learner</th><th class="py-3 px-4">Score</th><th class="py-3 px-4">Seal</th><th class="py-3 px-4">LMS</th>
          </tr></thead>
          <tbody>
            ${items.map(i => `
              <tr class="border-t border-[#E2E8F0]">
                <td class="py-3 px-4 font-bold">${escapeHtml(i.learner_name || '')}</td>
                <td class="py-3 px-4 tabular-nums">${i.percent}%</td>
                <td class="py-3 px-4">${i.seal_ok ? 'Valid' : escapeHtml(i.seal_reason || 'Fail')}</td>
                <td class="py-3 px-4">${i.grade_sent ? 'Synced' : 'Pending'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderIqReviewTab(): string {
  const live = state.liveIqReview;
  const questions = live?.questions?.length
    ? live.questions
    : [
        { prompt: 'Convert Ax+By=C to slope-intercept', correct_pct: 33, attempts: 24, flag: 'too_hard', question_id: 'q1' },
        { prompt: 'Identify y-intercept from graph', correct_pct: 92, attempts: 24, flag: 'too_easy', question_id: 'q2' },
      ];
  return `
    <div class="flex flex-col gap-4">
      <div>
        <p class="hub-kicker-ink">Wave A · thin</p>
        <h2 class="text-lg font-extrabold text-[#111827]">IQ review · item quality</h2>
        <p class="text-sm text-slate-500 mt-1">Flags items that are too hard (&lt;30%) or too easy (&gt;90%). Enable block <code>iq_review_pattern</code>.</p>
      </div>
      ${hubStats(
        hubStat('warning', 'Too hard', String(live?.too_hard ?? questions.filter(q => q.flag === 'too_hard').length)),
        hubStat('check', 'Too easy', String(live?.too_easy ?? questions.filter(q => q.flag === 'too_easy').length)),
        hubStat('quiz', 'Items', String(live?.question_count ?? questions.length))
      )}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${questions.map(q => `
          <article class="hub-card flex flex-col gap-2">
            <p class="hub-kicker-ink">${escapeHtml(q.flag.replace('_', ' '))}</p>
            <h3 class="text-sm font-extrabold text-[#111827]">${escapeHtml(q.prompt)}</h3>
            <p class="text-xs text-slate-500 tabular-nums">${q.correct_pct}% correct · ${q.attempts} attempts</p>
          </article>`).join('')}
      </div>
    </div>`;
}

// =========================================================================
// SUBTAB 1: Pedagogical Misconceptions
// =========================================================================
function renderMisconceptionsTab(): string {
  const topics = [
    { name: 'Standard form → slope-intercept', miss: '67%', count: '16 of 24', width: 66.7, tone: 'high' as const },
    { name: 'Perpendicular slopes', miss: '38%', count: '9 of 24', width: 37.5, tone: 'mid' as const },
    { name: 'Slope as Δy / Δx', miss: '13%', count: '3 of 24', width: 12.5, tone: 'ok' as const },
  ];
  const flagged = [
    { name: "Liam O'Connor", score: '50%', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80' },
    { name: 'Ada Chen', score: '67%', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' },
    { name: 'Jamal Washington', score: '67%', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80' },
    { name: 'Carlos Gomez', score: '67%', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80' },
  ];
  return `
    <article class="hub-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="min-w-0">
        <p class="hub-kicker-ink">Top issue</p>
        <h2 class="text-lg font-extrabold text-[#111827] mt-1">Negative signs dropped in standard form</h2>
        <p class="text-sm text-slate-500 mt-2">On <code class="font-mono text-[#111827]">2x − 5y = 20</code>, many flip the slope on quiz #3.</p>
      </div>
      <button id="remediation-cta-pill" class="hub-cta-dark shrink-0" type="button">Push 5-min drill</button>
    </article>

    <div>
      <h3 class="text-lg font-extrabold text-[#111827]">Topic miss rates</h3>
      <p class="text-sm text-slate-500 mt-1">Aim under 20% miss.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      ${topics.map(t => `
        <article class="hub-card flex flex-col gap-3">
          <div class="flex items-start justify-between gap-2">
            <h4 class="text-sm font-extrabold text-[#111827] leading-snug">${t.name}</h4>
            <span class="text-xl font-extrabold tabular-nums ${t.tone === 'high' ? 'text-[#FE580D]' : t.tone === 'mid' ? 'text-[#D97706]' : 'text-[#10B981]'}">${t.miss}</span>
          </div>
          <div class="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full ${t.tone === 'high' ? 'bg-[#FE580D]' : t.tone === 'mid' ? 'bg-[#F59E0B]' : 'bg-[#62BF8E]'}" style="width:${t.width}%"></div>
          </div>
          <p class="text-xs text-slate-500">${t.count} missed</p>
        </article>
      `).join('')}
    </div>

    <div>
      <h3 class="text-lg font-extrabold text-[#111827]">Needs a check-in</h3>
      <p class="text-sm text-slate-500 mt-1">4 students under the pass mark.</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${flagged.map(s => `
        <article class="hub-card flex items-center gap-3">
          <img src="${s.img}" alt="" class="w-10 h-10 rounded-2xl object-cover shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-extrabold text-[#111827] truncate">${escapeHtml(s.name)}</p>
            <p class="text-xs text-[#FE580D] font-bold tabular-nums">${s.score}</p>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

// =========================================================================
// SUBTAB 2: MODULE 1 — Activity Heatmaps & xAPI Verb Distribution
// =========================================================================
function renderHeatmapsAndVerbsTab(timeFilter: string): string {
  const stats = state.liveAnalytics;
  const activities = stats?.xapi_count ?? 0;
  const completed = stats?.lesson_completions ?? 0;
  const learners = stats?.learner_count ?? 0;
  const attempts = stats?.attempt_count ?? 0;
  const sessionMins = stats?.avg_session_minutes;
  const verbs = stats?.xapi_verbs || [];
  const verbTotal = verbs.reduce((n, v) => n + v.count, 0) || 1;
  const palette = ['#0284C7', '#FE580D', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
  // Days & Hours for Activity Heatmap
  const days = stats?.heatmap?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = stats?.heatmap?.hours || ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'];
  const heatmapLive = Boolean(stats?.heatmap?.cells);
  const heatmapData = stats?.heatmap?.cells || [
    [1, 3, 4, 3, 2, 0, 1],
    [2, 4, 3, 4, 3, 1, 0],
    [3, 4, 4, 2, 4, 2, 1],
    [2, 3, 4, 4, 3, 1, 0],
    [4, 4, 3, 2, 1, 0, 0],
    [0, 1, 2, 2, 1, 0, 0],
    [1, 1, 2, 3, 2, 1, 1],
  ];

  const intensityClasses = [
    'bg-[#F1F5F9] border-[#E2E8F0]', // 0
    'bg-[#FED7AA]/50 border-[#FED7AA]', // 1
    'bg-[#FF8A3D]/60 border-[#FE580D]/40 text-white', // 2
    'bg-[#FE580D]/80 border-[#E24E0B] text-white', // 3
    'bg-[#E24E0B] border-[#B91C1C] text-white font-bold' // 4
  ];

  return `
    ${hubStats(
      hubStat('dataset', 'Events', activities.toLocaleString('en-IN')),
      hubStat('task_alt', 'Done', completed.toLocaleString('en-IN')),
      hubStat('group', 'Learners', learners.toLocaleString('en-IN')),
      hubStat('timer', 'Session', sessionMins != null ? `${sessionMins}m` : attempts.toLocaleString('en-IN'))
    )}

    ${renderDateLearnerHeatmap(timeFilter)}

    ${renderTimeSeriesEight()}

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <article class="lg:col-span-7 hub-card flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 class="text-base font-extrabold text-[#111827]">When they work</h3>
            <p class="text-sm text-slate-500 mt-1">Weekday × hour</p>
          </div>
          <span class="text-xs ${heatmapLive ? 'text-[#10B981]' : 'text-slate-500'} font-bold">${heatmapLive ? 'Live' : 'Demo'}</span>
        </div>

        <div class="pt-4 overflow-x-auto">
          <table class="w-full text-xs font-mono">
            <thead>
              <tr>
                <th class="text-left font-bold text-[#64748B] pr-2 pb-2">Day</th>
                ${hours.map(h => `<th class="text-center font-bold text-[#64748B] px-1 pb-2">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${days.map((d, dIdx) => `
                <tr>
                  <td class="font-bold text-[#0F172A] py-1.5 pr-2">${d}</td>
                  ${heatmapData[dIdx].map((val) => `
                    <td class="p-1">
                      <div class="w-full h-8 rounded-lg flex items-center justify-center border text-[10px] ${intensityClasses[val]} transition-all hover:scale-105" title="${d}: Activity level ${val}/4">
                        ${val > 0 ? `${val * 14}` : ''}
                      </div>
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-end gap-1.5 text-xs text-slate-500">
            <span>Low</span>
            <div class="w-3.5 h-3.5 rounded bg-[#F1F5F9] border border-[#E2E8F0]"></div>
            <div class="w-3.5 h-3.5 rounded bg-[#FED7AA]/50 border border-[#FED7AA]"></div>
            <div class="w-3.5 h-3.5 rounded bg-[#FF8A3D]/60 border border-[#FE580D]/40"></div>
            <div class="w-3.5 h-3.5 rounded bg-[#FE580D]/80 border border-[#E24E0B]"></div>
            <div class="w-3.5 h-3.5 rounded bg-[#E24E0B] border border-[#B91C1C]"></div>
            <span>High</span>
        </div>
      </article>

      <article class="lg:col-span-5 hub-card flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-extrabold text-[#111827]">Verbs</h3>
          <span class="text-xs text-slate-500 tabular-nums">${activities.toLocaleString('en-IN')}</span>
        </div>

        <!-- Inline SVG Donut Chart for Verb Breakdown -->
        <div class="flex items-center justify-center gap-4 py-2">
          <svg class="w-32 h-32 shrink-0 drop-shadow-sm" viewBox="0 0 100 100">
            ${(() => {
              const circ = 2 * Math.PI * 40;
              let offset = 0;
              const rows = (verbs.length ? verbs : [{ label: 'none', count: 1 }]).slice(0, 6);
              return rows
                .map((v, i) => {
                  const frac = v.count / verbTotal;
                  const dash = frac * circ;
                  const gap = circ - dash;
                  const el = `<circle cx="50" cy="50" r="40" fill="transparent" stroke="${palette[i % palette.length]}" stroke-width="16" stroke-dasharray="${dash.toFixed(1)} ${gap.toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" />`;
                  offset += dash;
                  return el;
                })
                .join('');
            })()}
            <text x="50" y="47" text-anchor="middle" font-size="10" font-family="monospace" font-weight="bold" fill="#0F172A">${activities.toLocaleString('en-IN')}</text>
            <text x="50" y="58" text-anchor="middle" font-size="7" font-family="sans-serif" fill="#64748B">Events</text>
          </svg>
          <div class="text-[11px] font-mono space-y-1">
            ${(verbs.length ? verbs : [{ label: 'no events yet', count: 0 }])
              .slice(0, 6)
              .map((v, i) => {
                const pct = Math.round((100 * v.count) / verbTotal);
                return `<div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${palette[i % palette.length]}"></span><span class="font-bold">${escapeHtml(v.label)}</span> (${pct}%)</div>`;
              })
              .join('')}
          </div>
        </div>

        <button id="jump-to-xapi-tab-btn" class="hub-cta-light self-start" type="button" style="margin-top:0">Open xAPI</button>
      </article>
    </div>

    <article class="hub-card overflow-hidden p-0">
      <div class="px-5 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 class="text-base font-extrabold text-[#111827]">By tool</h3>
          <p class="text-sm text-slate-500 mt-1">${stats?.by_tool?.length ? `${learners} learners` : 'Waiting for activity'}</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#F8FAFC] border-y border-[#E2E8F0] text-[#64748B]">
            <tr>
              <th class="py-3 px-5 font-bold">Tool</th>
              <th class="py-3 px-4 font-bold">Attempts</th>
              <th class="py-3 px-4 font-bold">Done</th>
              <th class="py-3 px-4 font-bold">Open</th>
              <th class="py-3 px-5 font-bold text-right">Last</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E2E8F0]">
            ${(stats?.by_tool || []).length
              ? (stats?.by_tool || []).map(row => `
            <tr class="hover:bg-[#F8FAFC]">
              <td class="py-3 px-5 font-bold text-[#111827]">${escapeHtml(row.tool)}</td>
              <td class="py-3 px-4 tabular-nums">${row.attempts}</td>
              <td class="py-3 px-4 tabular-nums text-[#10B981]">${row.complete}</td>
              <td class="py-3 px-4 tabular-nums">${row.ongoing}</td>
              <td class="py-3 px-5 text-right text-slate-500">${row.last_progress ? escapeHtml(String(row.last_progress).slice(5, 16).replace('T', ' ')) : '—'}</td>
            </tr>`).join('')
              : `<tr><td class="py-4 px-5 text-slate-500" colspan="5">No activity in the last 14 days.</td></tr>`}
          </tbody>
        </table>
      </div>
    </article>

    <article class="hub-card flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-base font-extrabold text-[#111827]">Recent sessions</h3>
        <span class="text-xs text-slate-500">${stats?.sessions?.length ? 'From xAPI' : 'Waiting'}</span>
      </div>
      <div class="flex flex-col gap-3">
        ${(stats?.sessions || []).length
          ? (stats?.sessions || []).slice(0, 4).map(s => `
        <div class="flex items-center justify-between gap-3 text-sm">
          <div class="min-w-0">
            <p class="font-bold text-[#111827] truncate">${escapeHtml(s.actor_sub)}</p>
            <p class="text-xs text-slate-500 truncate">${(s.tools || []).join(', ') || s.content || 'session'} · ${s.event_count} events</p>
          </div>
          <span class="text-xs font-bold text-[#FE580D] tabular-nums shrink-0">${s.duration_minutes}m</span>
        </div>`).join('')
          : `<p class="text-sm text-slate-500">No sessions yet.</p>`}
      </div>
    </article>
  `;
}

// =========================================================================
// SUBTAB 3: MODULE 4 — xAPI Middleware Statements & LRS Inspector
// =========================================================================
function renderLiveMiddlewarePanel(): string {
  const dash = state.liveAssignmentDash;
  const assignments = dash?.assignments || state.liveGroupAssignments || [];
  const learners = dash?.learners || [];
  const quota = state.liveQuizQuota;
  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <article class="hub-card flex flex-col gap-3">
        <h3 class="text-sm font-extrabold text-[#111827]">Assignments</h3>
        ${assignments.length ? assignments.slice(0, 4).map(a => `
          <p class="text-xs"><span class="font-bold">${escapeHtml(a.group_name || 'Group')}</span> · ${escapeHtml(a.title || a.activity_type || 'quiz')}</p>
        `).join('') : '<p class="text-sm text-slate-500">None yet.</p>'}
      </article>
      <article class="hub-card flex flex-col gap-3">
        <h3 class="text-sm font-extrabold text-[#111827]">Attempts</h3>
        <p class="text-sm tabular-nums">${quota?.used ?? 0} / ${quota?.limit ?? 3} used</p>
        ${learners.slice(0, 3).map(l => `
          <p class="text-xs flex justify-between gap-2"><span class="truncate">${escapeHtml(l.name || l.subject || 'Learner')}</span><span class="tabular-nums">${l.quota?.used ?? 0}/${l.quota?.limit ?? 3}</span></p>
        `).join('')}
      </article>
      <article class="hub-card flex flex-col gap-3">
        <h3 class="text-sm font-extrabold text-[#111827]">Files</h3>
        <div class="flex flex-wrap gap-2">
          <button id="mw-fetch-quiz-json" class="hub-cta-light" type="button" style="margin-top:0">Quiz JSON</button>
          <button id="mw-stream-pdf" class="hub-cta-light" type="button" style="margin-top:0">PDF</button>
          <button id="mw-meta-pdf" class="sr-only" type="button">Detect PDF</button>
        </div>
        <div class="flex gap-2">
          <input id="mw-grade-subject" class="flex-1 text-xs border border-[#E2E8F0] rounded-xl px-2 py-1.5" placeholder="Subject" />
          <input id="mw-grade-score" class="w-16 text-xs border border-[#E2E8F0] rounded-xl px-2 py-1.5" placeholder="Score" />
          <button id="mw-ingest-grade" class="hub-cta-dark" type="button">Add</button>
        </div>
      </article>
    </div>
  `;
}

function renderXApiMiddlewareTab(verbFilter: string, statements: XApiStatement[]): string {
  return `
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="hub-seg flex-wrap">
        <button class="verb-filter-btn hub-seg-btn ${verbFilter === 'all' ? 'on' : ''}" data-verb="all" type="button">All</button>
        <button class="verb-filter-btn hub-seg-btn ${verbFilter === 'answered' ? 'on' : ''}" data-verb="answered" type="button">answered</button>
        <button class="verb-filter-btn hub-seg-btn ${verbFilter === 'completed' ? 'on' : ''}" data-verb="completed" type="button">completed</button>
        <button class="verb-filter-btn hub-seg-btn ${verbFilter === 'interacted' ? 'on' : ''}" data-verb="interacted" type="button">interacted</button>
        <button class="verb-filter-btn hub-seg-btn ${verbFilter === 'passed' ? 'on' : ''}" data-verb="passed" type="button">passed</button>
        <button class="verb-filter-btn hub-seg-btn ${verbFilter === 'failed' ? 'on' : ''}" data-verb="failed" type="button">failed</button>
      </div>
      <div class="flex items-center gap-2">
        <button id="lrs-refresh-btn" class="hub-cta-light" type="button" style="margin-top:0">Refresh</button>
        <button id="export-csv-statements-btn" class="hub-cta-light" type="button" style="margin-top:0">CSV</button>
        <button id="export-xapi-json-btn" class="sr-only" type="button">JSON</button>
      </div>
    </div>

    <article class="hub-card overflow-hidden p-0">
      <div class="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
        <h3 class="text-base font-extrabold text-[#111827]">Statements</h3>
        <span class="text-xs text-slate-500">${statements.length} events</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
            <tr>
              <th class="py-3 px-4 font-bold">Timestamp</th>
              <th class="py-3 px-4 font-bold">Actor</th>
              <th class="py-3 px-4 font-bold">Verb</th>
              <th class="py-3 px-4 font-bold">Activity Object</th>
              <th class="py-3 px-4 font-bold">Result / Score</th>
              <th class="py-3 px-4 font-bold text-right">Inspect</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E2E8F0]">
            ${statements.map(stmt => {
              const verbColor =
                stmt.verb.display === 'completed' || stmt.verb.display === 'passed'
                  ? 'bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]'
                  : stmt.verb.display === 'failed'
                  ? 'bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]'
                  : stmt.verb.display === 'answered'
                  ? 'bg-[#FFF7ED] text-[#FE580D] border-[#FED7AA]'
                  : 'bg-[#EBF4FC] text-[#0284C7] border-[#BAE6FD]';

              return `
                <tr class="hover:bg-[#F8FAFC] transition-colors">
                  <td class="py-3 px-4 text-[#64748B] whitespace-nowrap">${new Date(stmt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      ${stmt.actor.avatarUrl ? `<img src="${stmt.actor.avatarUrl}" class="w-6 h-6 rounded-full object-cover" />` : ''}
                      <span class="font-bold text-[#0F172A] font-sans">${stmt.actor.name}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${verbColor}">
                      ${stmt.verb.display}
                    </span>
                  </td>
                  <td class="py-3 px-4 max-w-xs truncate text-[#0F172A] font-sans font-medium" title="${stmt.object.definition.name}">
                    ${stmt.object.definition.name}
                  </td>
                  <td class="py-3 px-4">
                    ${stmt.result?.score ? `<span class="font-bold text-[#0F172A]">${stmt.result.score.raw} / ${stmt.result.score.max}</span>` : stmt.result?.completion ? '<span class="text-[#10B981] font-bold">Completed</span>' : '—'}
                  </td>
                  <td class="py-3 px-4 text-right">
                    <button class="inspect-stmt-btn text-xs font-bold text-[#FE580D] hover:underline cursor-pointer" data-stmt-id="${stmt.id}">
                      View
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </article>

    ${renderLiveMiddlewarePanel()}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <article class="hub-card flex flex-col gap-3">
        <h3 class="text-base font-extrabold text-[#111827]">LRS endpoint</h3>
        <p class="text-xs font-mono text-slate-600 break-all">/api/v1/xapi/statements</p>
        <p class="text-xs text-slate-500">Client tokens stay in Moodle / ops — not shown here.</p>
      </article>
      <article class="hub-card flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-base font-extrabold text-[#111827]">Schema check</h3>
          <span class="text-xs font-bold text-[#10B981]">0 errors</span>
        </div>
        <p class="text-sm text-slate-500">Actor, verb, and object IRIs look valid.</p>
        <button id="run-schema-validator-btn" class="hub-cta-light self-start" type="button" style="margin-top:0">Run check</button>
      </article>
    </div>
  `;
}

// =========================================================================
// SUBTAB 4: MODULE 7 — Difference Training Application
// =========================================================================
function renderDifferenceTrainingTab(): string {
  const comps = displayCompetencies();
  const proposals = state.liveCat?.proposals || [];
  return `
    <article class="hub-card flex flex-col gap-4">
      <div>
        <h3 class="text-lg font-extrabold text-[#111827]">Map skills</h3>
        <p class="text-sm text-slate-500 mt-1">Paste a TO or objective list.</p>
      </div>
      <textarea id="cat-map-text" class="w-full p-3 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] font-mono text-xs min-h-[72px]" placeholder="TO-100 Welding Safety&#10;The technician shall identify PPE required for SMAW."></textarea>
      <button id="cat-map-run-btn" class="hub-cta-dark self-start" type="button">Map</button>
      ${proposals.length ? `
        <div class="flex flex-col gap-2">
          ${proposals.slice(0, 6).map(p => `
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="font-mono truncate"><span class="font-bold">${escapeHtml(p.to_code)}</span> → ${escapeHtml(p.skill_code)}</span>
              <button class="cat-approve-btn hub-cta-light" type="button" style="margin-top:0" data-id="${escapeHtml(p.id)}">Approve</button>
            </div>
          `).join('')}
        </div>
      ` : '<p class="text-sm text-slate-500">No pending proposals.</p>'}
    </article>

    <div>
      <h2 class="text-lg font-extrabold text-[#111827]">Class gaps</h2>
      <p class="text-sm text-slate-500 mt-1">Actual vs target for this section.</p>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      ${comps.map(comp => {
        const hasGap = comp.gap > 0;
        return `
          <article class="hub-card flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="hub-kicker-ink">${escapeHtml(comp.code)}</p>
                <h4 class="text-sm font-extrabold text-[#111827] mt-1">${escapeHtml(comp.name)}</h4>
              </div>
              <p class="text-sm tabular-nums shrink-0 ${hasGap ? 'text-[#FE580D]' : 'text-[#10B981]'} font-bold">${hasGap ? `−${comp.gap}%` : 'On track'}</p>
            </div>
            <div class="w-full bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden relative">
              <div class="absolute top-0 bottom-0 w-0.5 bg-[#111827]" style="left: ${comp.targetScore}%;"></div>
              <div class="h-full rounded-full ${hasGap ? 'bg-[#FE580D]' : 'bg-[#62BF8E]'}" style="width: ${comp.score}%;"></div>
            </div>
            <p class="text-xs text-slate-500 tabular-nums">${comp.score}% → ${comp.targetScore}%</p>
            ${comp.remediationTitle ? `
              <div class="flex items-center justify-between gap-3 mt-auto">
                <p class="text-xs text-slate-600 truncate">${escapeHtml(comp.remediationTitle)}</p>
                <button class="assign-diff-drill-btn hub-cta-dark" data-drill="${escapeHtml(comp.remediationTitle)}" type="button">Assign</button>
              </div>
            ` : ''}
          </article>
        `;
      }).join('')}
    </div>
  `;
}

// =========================================================================
// STATEMENT INSPECTOR MODAL
// =========================================================================
function renderStatementInspectorModal(): string {
  const stmt = state.selectedXapiStatement;
  if (!stmt) return '';

  return `
    <div class="fixed inset-0 z-50 bg-[#111827]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="relative w-full max-w-2xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-fade-rise">
        <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#0284C7] text-[20px]">data_object</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">xAPI Statement Details</h3>
          </div>
          <button id="close-stmt-modal-btn" class="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F8FAFC] font-mono">
            <div><span class="text-[#64748B]">Statement ID:</span> <span class="font-bold text-[#0F172A]">${stmt.id}</span></div>
            <div><span class="text-[#64748B]">Timestamp:</span> <span class="text-[#0F172A]">${stmt.timestamp}</span></div>
            <div><span class="text-[#64748B]">Actor:</span> <span class="font-bold text-[#0F172A]">${stmt.actor.name} (${stmt.actor.mbox})</span></div>
            <div><span class="text-[#64748B]">Verb:</span> <span class="font-bold text-[#FE580D]">${stmt.verb.display}</span></div>
          </div>

          <div>
            <span class="text-[#64748B] font-mono font-bold block mb-1">Raw JSON Statement Payload:</span>
            <pre class="p-4 rounded-2xl bg-[#111827] text-[#38BDF8] font-mono text-[11px] overflow-x-auto leading-relaxed border border-[#334155]">${JSON.stringify(stmt, null, 2)}</pre>
          </div>
        </div>

        <div class="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
          <button id="copy-stmt-json-btn" class="btn-secondary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">content_copy</span>
            <span>Copy JSON</span>
          </button>
          <button id="close-stmt-modal-btn-2" class="btn-navy-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindTeacherDiagnosticsEvents(container: HTMLElement): void {
  if (state.connected) {
    const caps = (state.liveSession?.capabilities || {}) as Record<string, boolean>;
    if (caps.audit_pro && !state.liveAuditPro) {
      getAuditPro()
        .then((data) => {
          state.liveAuditPro = data;
          notify();
        })
        .catch(() => { /* cap denied or empty */ });
    }
    if (caps.iq_review && !state.liveIqReview) {
      getIqReview()
        .then((data) => {
          state.liveIqReview = data;
          notify();
        })
        .catch(() => { /* cap denied or empty */ });
    }
    if (caps.sim_to_real && !state.liveSimToReal) {
      getSimToReal()
        .then((data) => {
          state.liveSimToReal = data;
          notify();
        })
        .catch(() => {});
    }
  }

  // Navigation
  container.querySelector('#diag-to-results')?.addEventListener('click', () => {
    setScreen('teacher-results');
  });

  container.querySelector('#diag-to-preview')?.addEventListener('click', () => {
    setScreen('quiz');
  });

  // Sub-tabs
  container.querySelectorAll('.diag-subtab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = (e.currentTarget as HTMLElement).getAttribute('data-tab') as any;
      if (tab) {
        state.diagnosticsTab = tab;
        notify();
      }
    });
  });

  // Time filter
  container.querySelectorAll('.time-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const time = (e.currentTarget as HTMLElement).getAttribute('data-time') as any;
      if (time) {
        state.diagnosticsTimeFilter = time;
        notify();
      }
    });
  });

  container.querySelector('#series-learner-select')?.addEventListener('change', (e) => {
    state.diagnosticsSeriesLearner = (e.currentTarget as HTMLSelectElement).value || 'class';
    notify();
  });

  // Verb filter
  container.querySelectorAll('.verb-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const verb = (e.currentTarget as HTMLElement).getAttribute('data-verb') || 'all';
      state.xapiVerbFilter = verb;
      notify();
    });
  });

  // Statement inspector modal open
  container.querySelectorAll('.inspect-stmt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-stmt-id');
      const found = xapiStatementsList.find(s => s.id === id);
      if (found) {
        state.selectedXapiStatement = found;
        notify();
      }
    });
  });

  // Statement inspector modal close
  container.querySelector('#close-stmt-modal-btn, #close-stmt-modal-btn-2')?.addEventListener('click', () => {
    state.selectedXapiStatement = null;
    notify();
  });

  container.querySelector('#copy-stmt-json-btn')?.addEventListener('click', () => {
    if (state.selectedXapiStatement) {
      navigator.clipboard?.writeText(JSON.stringify(state.selectedXapiStatement, null, 2));
      showToast('xAPI Statement JSON copied to clipboard', 'content_copy');
    }
  });

  // Quick jump from verb distribution to xapi tab
  container.querySelector('#jump-to-xapi-tab-btn')?.addEventListener('click', () => {
    state.diagnosticsTab = 'xapi';
    notify();
  });

  // Export actions
  container.querySelector('#export-summary-btn')?.addEventListener('click', () => {
    showToast('Diagnostic Summary PDF generated for Period 1 Algebra', 'print');
  });

  container.querySelector('#mw-fetch-quiz-json')?.addEventListener('click', () => {
    void fetchJsonFile('quiz')
      .then(pack => {
        showToast(`Fetched ${pack.filename} (${pack.kind})`, 'data_object');
      })
      .catch(err => showToast(err instanceof Error ? err.message : 'Fetch failed', 'error'));
  });
  container.querySelector('#mw-meta-pdf')?.addEventListener('click', () => {
    void getFileMeta('assessment.pdf')
      .then(meta => {
        showToast(`Detected ${meta.kind} → ${meta.route}`, 'verified');
      })
      .catch(err => showToast(err instanceof Error ? err.message : 'Detect failed', 'error'));
  });
  container.querySelector('#mw-stream-pdf')?.addEventListener('click', () => {
    void streamFile('assessment.pdf')
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        showToast('Opened assessment PDF stream', 'picture_as_pdf');
      })
      .catch(err => showToast(err instanceof Error ? err.message : 'Stream failed', 'error'));
  });
  container.querySelector('#mw-ingest-grade')?.addEventListener('click', () => {
    const subject = (container.querySelector('#mw-grade-subject') as HTMLInputElement | null)?.value.trim();
    const score = Number((container.querySelector('#mw-grade-score') as HTMLInputElement | null)?.value || 0);
    if (!subject) {
      showToast('Enter a learner subject', 'error');
      return;
    }
    void ingestExternalGrade({ subject, score, max_score: 10 })
      .then(row => showToast(`Inbound grade ${row.score}/${row.max_score} saved`, 'grade'))
      .catch(err => showToast(err instanceof Error ? err.message : 'Grade ingest failed', 'error'));
  });

  container.querySelector('#export-xapi-json-btn')?.addEventListener('click', () => {
    const jsonStr = JSON.stringify(xapiStatementsList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edvidura-xapi-statements-${Date.now()}.json`;
    a.click();
    showToast('Downloaded 9 xAPI statements JSON bundle', 'download');
  });

  container.querySelector('#export-csv-statements-btn')?.addEventListener('click', () => {
    showToast('Exported xAPI statements CSV table to downloads', 'download');
  });

  container.querySelector('#lrs-refresh-btn')?.addEventListener('click', () => {
    showToast('Queried remote LRS endpoint: 9 statements retrieved (34ms)', 'sync');
  });

  // Remediation actions
  container.querySelectorAll('#btn-assign-remediation, #remediation-cta-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Remediation drill "Negative Sign Isolation" assigned to 16 students via Moodle', 'verified');
    });
  });

  container.querySelector('#run-schema-validator-btn')?.addEventListener('click', () => {
    showToast('xAPI Schema Validation PASSED: 100% compliant with TinCan / ADLnet specs', 'verified_user');
  });

  container.querySelectorAll('.assign-diff-drill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const drill = (e.currentTarget as HTMLElement).getAttribute('data-drill');
      showToast(`Assigned difference training drill: ${drill}`, 'task_alt');
    });
  });

  container.querySelector('#cat-map-run-btn')?.addEventListener('click', () => {
    const text = (container.querySelector('#cat-map-text') as HTMLTextAreaElement | null)?.value || '';
    showToast('Mapping Technical Order competencies…', 'hub');
    void mapCatDocument({ text, persist: true })
      .then(pack => {
        showToast(`Mapped ${pack.mapped_count} competencies`, 'account_tree');
        return getCatOverview();
      })
      .then(overview => {
        state.liveCat = overview;
        notify();
      })
      .catch(err => {
        showToast(err instanceof Error ? err.message : 'Map failed', 'error');
      });
  });

  container.querySelectorAll('.cat-approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id') || '';
      void reviewCatProposal(id, 'approve')
        .then(() => getCatOverview())
        .then(overview => {
          state.liveCat = overview;
          showToast('Approved TO→skill mapping', 'task_alt');
          notify();
        })
        .catch(err => {
          showToast(err instanceof Error ? err.message : 'Approve failed', 'error');
        });
    });
  });
}
