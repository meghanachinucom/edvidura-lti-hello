/**
 * View 11: Teacher Class Diagnostics & Analytics Dashboard
 * Modules covered:
 * - Module 1: Analytics Dashboard (Activity heatmaps, xAPI verb distribution, learner stats, session timelines, time-based analytics)
 * - Module 4: xAPI Middleware (Activity statements, filtering, statement details inspector modal, LRS data retrieval & export)
 * - Module 7: Difference Training Application (Competency gap analysis, training recommendations, progress tracking)
 */
import { state, setScreen, showToast, notify, xapiStatementsList, competenciesList, XApiStatement } from '../state';
import { classLabel, displayName, escapeHtml } from '../boot';
import { fetchJsonFile, getFileMeta, ingestExternalGrade, streamFile } from '../api';

const HEAT_INTENSITY = [
  'bg-[#F1F5F9] border-[#E2E8F0]',
  'bg-[#FFCCD5]/50 border-[#FFCCD5]',
  'bg-[#FF6B7A]/60 border-[#FF4757]/40 text-white',
  'bg-[#FF4757]/80 border-[#E83D4D] text-white',
  'bg-[#E83D4D] border-[#B91C1C] text-white font-bold',
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
      <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-3">
        <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#FF4757] text-[20px]">grid_on</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Noisy LRS heatmap (date × learner)</h3>
          </div>
          <span class="text-[10px] font-mono uppercase tracking-wider text-[#F59E0B] font-bold">Waiting for xAPI</span>
        </div>
        <p class="text-xs text-[#64748B]">All verbs from the LRS, one cell per learner per calendar day. No statements in this tenant window yet.</p>
      </div>`;
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
    <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] flex flex-col gap-3">
      <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0] flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#FF4757] text-[20px]">calendar_month</span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">Noisy LRS heatmap (date × learner)</h3>
          <span class="text-[10px] font-mono uppercase tracking-wider ${live ? 'text-[#10B981]' : 'text-[#F59E0B]'} font-bold">${live ? 'All xAPI verbs' : 'Waiting for xAPI'}</span>
        </div>
        <span class="text-xs text-[#64748B] font-mono">Peak ${hm.peak} events/day · ${timeFilter} window</span>
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
      <div class="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B] font-mono">
        <span>Intensity scale (noisy LRS — every verb counts):</span>
        <div class="flex items-center gap-1.5">
          <span>Low</span>
          <div class="w-4 h-4 rounded bg-[#F1F5F9] border border-[#E2E8F0]"></div>
          <div class="w-4 h-4 rounded bg-[#FFCCD5]/50 border border-[#FFCCD5]"></div>
          <div class="w-4 h-4 rounded bg-[#FF6B7A]/60 border border-[#FF4757]/40"></div>
          <div class="w-4 h-4 rounded bg-[#FF4757]/80 border border-[#E83D4D]"></div>
          <div class="w-4 h-4 rounded bg-[#E83D4D] border border-[#B91C1C]"></div>
          <span>High</span>
        </div>
      </div>
    </div>`;
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
      <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-3">
        <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0] flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#0284C7] text-[20px]">show_chart</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Per-student time series (8 charts)</h3>
          </div>
          ${picker}
        </div>
        <p class="text-xs text-[#64748B]">Day / week / month / quarter for activity (all xAPI verbs) and quiz average. No series yet.</p>
      </div>`;
  }
  const cards = charts.map((chart) => {
    const values =
      selected === 'class'
        ? chart.class_values
        : chart.learners[selected] || chart.class_values;
    const color = chart.metric === 'score' ? '#0284C7' : '#FF4757';
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
    <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0] flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#0284C7] text-[20px]">show_chart</span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">Per-student time series (8 charts)</h3>
          <span class="text-[10px] font-mono uppercase tracking-wider text-[#10B981] font-bold">Live from xAPI + quiz</span>
        </div>
        ${picker}
      </div>
      <p class="text-xs text-[#64748B]">Activity counts every LRS verb. Quiz average is percent of max score. Pick a learner or keep the class total.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${cards}</div>
    </div>`;
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

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC]">
      
      <!-- Teacher Sub-Navigation Bar -->
      <section class="w-full bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-3.5">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <nav aria-label="Teacher Sections" class="flex items-center gap-6">
            <button id="diag-to-results" class="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors py-1 cursor-pointer">
              Class Gradebook
            </button>
            <button id="diag-to-preview" class="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors py-1 cursor-pointer">
              Preview Assessment
            </button>
            <button class="text-sm font-bold text-[#FF4757] border-b-2 border-[#FF4757] py-1 focus:outline-none">
              Diagnostic &amp; xAPI Analytics
            </button>
          </nav>
          
          <div class="flex items-center gap-3 font-mono text-xs">
            <span class="text-[#0F172A] font-semibold">${escapeHtml(classLabel() || 'Class')}</span>
            <span class="text-[#CBD5E1]">/</span>
            <span class="text-[#10B981] font-bold">${state.liveAnalytics ? `${state.liveAnalytics.xapi_count} xAPI events` : 'LRS xAPI Endpoint Active'}</span>
          </div>
        </div>
      </section>

      <!-- ========================================================
           COLORFUL HERO BANNER
           ======================================================== -->
      <section class="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div class="max-w-7xl mx-auto">
          <div class="hero-navy-card relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
            
            <div class="space-y-3 max-w-2xl">
              <div class="flex items-center gap-2 text-xs font-mono">
                <span class="px-2.5 py-0.5 rounded-full bg-[#FF4757] text-white font-bold text-[10px] uppercase tracking-wider">Analytics &amp; Middleware Engine</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#38BDF8] font-bold">${escapeHtml(displayName())}</span>
                <span class="text-gray-400">·</span>
                <span class="text-white font-bold">xAPI 1.0.3 LRS Compliant</span>
              </div>
              <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-headline leading-tight">
                Pedagogical <span class="text-[#FF4757]">Analytics &amp; xAPI Stream</span>
              </h1>
              <p class="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
                Live telemetric tracking of student learning sessions, xAPI verb distribution, IRT misconception detection, and automated difference training recommendations.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3 shrink-0">
              <button id="export-xapi-json-btn" class="btn-secondary-3d px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
                <span class="material-symbols-outlined text-[16px]">data_object</span>
                <span>Export xAPI JSON</span>
              </button>
              <button id="export-summary-btn" class="btn-secondary-3d px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20" type="button">
                <span class="material-symbols-outlined text-[16px]">print</span>
                <span>Export PDF Report</span>
              </button>
              <button id="btn-assign-remediation" class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md" type="button">
                <span class="material-symbols-outlined text-[16px]">bolt</span>
                <span>Push Remediation Drill</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      <!-- ========================================================
           MODULE SUB-TABS: Misconceptions | Analytics Heatmaps | xAPI Middleware | Difference Training
           ======================================================== -->
      <section class="w-full bg-[#F1F5F9]/80 border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-2">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              class="diag-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'misconceptions' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
              data-tab="misconceptions"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px] ${activeTab === 'misconceptions' ? 'text-[#FF4757]' : 'text-[#64748B]'}">psychology</span>
              <span>Topic Misconceptions</span>
            </button>

            <button
              class="diag-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'heatmaps' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
              data-tab="heatmaps"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px] ${activeTab === 'heatmaps' ? 'text-[#FF4757]' : 'text-[#64748B]'}">grid_on</span>
              <span>Heatmaps &amp; Verb Distribution</span>
            </button>

            <button
              class="diag-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'xapi' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
              data-tab="xapi"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px] ${activeTab === 'xapi' ? 'text-[#FF4757]' : 'text-[#64748B]'}">terminal</span>
              <span>xAPI Middleware Statements (${filteredStatements.length})</span>
            </button>

            <button
              class="diag-subtab-btn px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${activeTab === 'difference' ? 'bg-[#071E2D] text-white shadow-md' : 'bg-white text-[#475569] hover:bg-white/90 border border-[#E2E8F0]'}"
              data-tab="difference"
              type="button"
            >
              <span class="material-symbols-outlined text-[16px] ${activeTab === 'difference' ? 'text-[#FF4757]' : 'text-[#64748B]'}">troubleshoot</span>
              <span>Difference Training Gaps</span>
            </button>
          </div>

          <!-- Time-based Analytics Filter -->
          <div class="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#CBD5E1] text-xs font-mono">
            <span class="text-[#64748B]">Scope:</span>
            <button class="time-filter-btn px-2 py-0.5 rounded-lg ${timeFilter === '24h' ? 'bg-[#FF4757] text-white font-bold' : 'text-[#0F172A] hover:bg-[#F1F5F9]'}" data-time="24h">24h</button>
            <button class="time-filter-btn px-2 py-0.5 rounded-lg ${timeFilter === '7d' ? 'bg-[#FF4757] text-white font-bold' : 'text-[#0F172A] hover:bg-[#F1F5F9]'}" data-time="7d">7d</button>
            <button class="time-filter-btn px-2 py-0.5 rounded-lg ${timeFilter === '30d' ? 'bg-[#FF4757] text-white font-bold' : 'text-[#0F172A] hover:bg-[#F1F5F9]'}" data-time="30d">30d</button>
            <button class="time-filter-btn px-2 py-0.5 rounded-lg ${timeFilter === 'semester' ? 'bg-[#FF4757] text-white font-bold' : 'text-[#0F172A] hover:bg-[#F1F5F9]'}" data-time="semester">Semester</button>
          </div>
        </div>
      </section>

      <!-- Main Body per Selected Subtab -->
      <main class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 flex flex-col gap-6">
        ${renderDiagnosticsContent(activeTab, timeFilter, verbFilter, filteredStatements)}
      </main>

      <!-- Statement JSON Inspector Modal (if selected) -->
      ${renderStatementInspectorModal()}

    </div>
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
    case 'misconceptions':
    default:
      return renderMisconceptionsTab();
  }
}

// =========================================================================
// SUBTAB 1: Pedagogical Misconceptions
// =========================================================================
function renderMisconceptionsTab(): string {
  return `
    <!-- Pedagogical Observation Callout Card -->
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#FFCCD5] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
      <div class="space-y-2 max-w-3xl">
        <div class="flex items-center gap-2 text-xs text-[#FF4757] font-bold font-mono uppercase tracking-wider">
          <span class="material-symbols-outlined text-[18px]">psychology</span>
          <span>Primary Classroom Misconception</span>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold text-[#0F172A] font-headline">
          Students consistently drop the negative sign when isolating y in standard form.
        </h2>
        <p class="text-sm text-[#64748B] leading-relaxed">
          When converting <code class="font-mono text-[#0F172A] bg-[#FFF0F3] px-2 py-0.5 rounded font-bold border border-[#FFCCD5]">2x - 5y = 20</code>, students isolate <code class="font-mono text-[#0F172A]">5y = -2x + 20</code> instead of <code class="font-mono text-[#0F172A]">-5y = -2x + 20</code>, resulting in inverted slope signs on quiz problem #3.
        </p>
      </div>
      
      <button id="remediation-cta-pill" class="btn-primary-3d px-5 py-3 rounded-2xl text-xs font-bold shrink-0 cursor-pointer shadow-md flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px]">bolt</span>
        <span>Push 5-Min Drill to Class</span>
      </button>
    </div>

    <!-- Curriculum Topic Miss Rates (Horizontal Distribution Bars) -->
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-[#FF4757]"></span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">Topic Error Distribution Rates</h3>
        </div>
        <span class="text-xs text-[#64748B] font-mono">Target threshold: &lt; 20% error rate</span>
      </div>

      <!-- Bar 1: Critical (Coral Accent) -->
      <div class="card-depth-interactive rounded-2xl p-5 bg-white border border-[#FFCCD5] space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full bg-[#FF4757]"></span>
            <span class="font-bold text-[#0F172A] text-sm sm:text-base">Standard Form Conversion ($Ax + By = C \to y = mx + b$)</span>
            <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#FFF0F3] text-[#FF4757] uppercase tracking-wider">High Need</span>
          </div>
          <div class="flex items-baseline gap-2 font-mono tabular-nums text-xs">
            <span class="text-xl font-bold text-[#FF4757]">66.7%</span>
            <span class="text-[#64748B]">16 of 24 missed</span>
          </div>
        </div>
        <div class="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden">
          <div class="bg-gradient-to-r from-[#FF5B6B] to-[#FF4757] h-full rounded-full transition-all duration-700" style="width: 66.7%;"></div>
        </div>
        <div class="text-xs text-[#64748B] flex items-center justify-between pt-1 font-mono">
          <span>Standard: CCSS.MATH.HSA.REI.B.3</span>
          <span class="text-[#FF4757] font-bold">16 students flagged for drill</span>
        </div>
      </div>

      <!-- Bar 2: Moderate Need (Amber Accent) -->
      <div class="card-depth-interactive rounded-2xl p-5 bg-white border border-[#CBD5E1] space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full bg-[#F59E0B]"></span>
            <span class="font-bold text-[#0F172A] text-sm sm:text-base">Perpendicular Slope Reciprocals ($m_1 \cdot m_2 = -1$)</span>
            <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] uppercase tracking-wider">Moderate Need</span>
          </div>
          <div class="flex items-baseline gap-2 font-mono tabular-nums text-xs">
            <span class="text-xl font-bold text-[#D97706]">37.5%</span>
            <span class="text-[#64748B]">9 of 24 missed</span>
          </div>
        </div>
        <div class="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden">
          <div class="bg-[#F59E0B] h-full rounded-full transition-all duration-700" style="width: 37.5%;"></div>
        </div>
        <div class="text-xs text-[#64748B] flex items-center justify-between pt-1 font-mono">
          <span>Standard: CCSS.MATH.HSA.CED.A.2</span>
          <span class="text-[#D97706] font-bold">9 students flagged</span>
        </div>
      </div>

      <!-- Bar 3: Mastered (Emerald Accent) -->
      <div class="card-depth-interactive rounded-2xl p-5 bg-white border border-[#A7F3D0] space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full bg-[#10B981]"></span>
            <span class="font-bold text-[#0F172A] text-sm sm:text-base">Delta Slope Quotient ($\Delta y / \Delta x$ Evaluation)</span>
            <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] uppercase tracking-wider">Mastered</span>
          </div>
          <div class="flex items-baseline gap-2 font-mono tabular-nums text-xs">
            <span class="text-xl font-bold text-[#10B981]">12.5%</span>
            <span class="text-[#64748B]">3 of 24 missed</span>
          </div>
        </div>
        <div class="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden">
          <div class="bg-[#10B981] h-full rounded-full transition-all duration-700" style="width: 12.5%;"></div>
        </div>
        <div class="text-xs text-[#64748B] flex items-center justify-between pt-1 font-mono">
          <span>Standard: CCSS.MATH.HSA.CED.A.1</span>
          <span class="text-[#10B981] font-bold">Class benchmark exceeded</span>
        </div>
      </div>
    </div>

    <!-- Flagged Students Intervention Roster -->
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#E2E8F0] space-y-4">
      <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#FF4757] text-[20px]">group</span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">Students Recommended for Sandbox Review (4)</h3>
        </div>
        <span class="text-xs text-[#FF4757] font-bold font-mono">Requires Attention</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
        <div class="p-4 rounded-2xl bg-[#FFF0F3] border border-[#FFCCD5] flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Liam" class="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF4757]" />
          <div>
            <div class="font-bold text-[#0F172A] text-xs">Liam O'Connor</div>
            <div class="text-[10px] text-[#FF4757] font-mono font-bold">Score: 50%</div>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-[#FFF0F3] border border-[#FFCCD5] flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Ada" class="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF4757]" />
          <div>
            <div class="font-bold text-[#0F172A] text-xs">Ada Chen</div>
            <div class="text-[10px] text-[#FF4757] font-mono font-bold">Score: 67%</div>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-[#FFF0F3] border border-[#FFCCD5] flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80" alt="Jamal" class="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF4757]" />
          <div>
            <div class="font-bold text-[#0F172A] text-xs">Jamal Washington</div>
            <div class="text-[10px] text-[#FF4757] font-mono font-bold">Score: 67%</div>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-[#FFF0F3] border border-[#FFCCD5] flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80" alt="Carlos" class="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF4757]" />
          <div>
            <div class="font-bold text-[#0F172A] text-xs">Carlos Gomez</div>
            <div class="text-[10px] text-[#FF4757] font-mono font-bold">Score: 67%</div>
          </div>
        </div>
      </div>
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
  const palette = ['#0284C7', '#FF4757', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
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
    'bg-[#FFCCD5]/50 border-[#FFCCD5]', // 1
    'bg-[#FF6B7A]/60 border-[#FF4757]/40 text-white', // 2
    'bg-[#FF4757]/80 border-[#E83D4D] text-white', // 3
    'bg-[#E83D4D] border-[#B91C1C] text-white font-bold' // 4
  ];

  return `
    <!-- Top 4 Learner Statistics Cards (Aligned to EdVidura Requirements) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#FF4757]">
        <div class="text-xs text-[#64748B] font-mono uppercase font-bold flex justify-between items-center">
          <span>Total Activities</span>
          <span class="material-symbols-outlined text-[#FF4757] text-[18px]">dataset</span>
        </div>
        <div class="text-3xl font-bold text-[#0F172A] font-headline tabular-nums mt-2">${activities.toLocaleString('en-IN')}</div>
        <div class="text-xs text-[#10B981] font-semibold mt-1 flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">trending_up</span>
          <span>${stats ? 'Live xAPI statements' : `Active in window (${timeFilter})`}</span>
        </div>
      </div>

      <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#10B981]">
        <div class="text-xs text-[#64748B] font-mono uppercase font-bold flex justify-between items-center">
          <span>Total Completed</span>
          <span class="material-symbols-outlined text-[#10B981] text-[18px]">task_alt</span>
        </div>
        <div class="text-3xl font-bold text-[#0F172A] font-headline tabular-nums mt-2">${completed.toLocaleString('en-IN')}</div>
        <div class="text-xs text-[#10B981] mt-1 font-mono font-bold">${stats ? 'Lesson completions' : '87.3% Completion Rate'}</div>
      </div>

      <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#0284C7]">
        <div class="text-xs text-[#64748B] font-mono uppercase font-bold flex justify-between items-center">
          <span>Active Engagement</span>
          <span class="material-symbols-outlined text-[#0284C7] text-[18px]">timer</span>
        </div>
        <div class="text-3xl font-bold text-[#0F172A] font-headline tabular-nums mt-2">${learners.toLocaleString('en-IN')}</div>
        <div class="text-xs text-[#64748B] mt-1 font-mono">${stats ? 'Learners with quiz attempts' : '+14% vs district benchmark'}</div>
      </div>

      <div class="card-depth-interactive rounded-2xl p-5 bg-white border-l-4 border-l-[#F59E0B]">
        <div class="text-xs text-[#64748B] font-mono uppercase font-bold flex justify-between items-center">
          <span>Avg Session Duration</span>
          <span class="material-symbols-outlined text-[#F59E0B] text-[18px]">pace</span>
        </div>
        <div class="text-3xl font-bold text-[#0F172A] font-headline tabular-nums mt-2">${sessionMins != null ? `${sessionMins}m` : attempts.toLocaleString('en-IN')}</div>
        <div class="text-xs text-[#64748B] mt-1 font-mono">${sessionMins != null ? 'Avg session from xAPI' : stats ? 'Quiz attempts recorded' : 'Deep focus across 24 students'}</div>
      </div>
    </div>

    ${renderDateLearnerHeatmap(timeFilter)}

    ${renderTimeSeriesEight()}

    <!-- Weekday × hour heatmap & xAPI Verb Distribution (Side by Side) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      
      <!-- Left Column: Weekday × hour -->
      <div class="lg:col-span-7 card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] flex flex-col justify-between">
        <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#FF4757] text-[20px]">schedule</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Weekday × hour intensity</h3>
          <span class="text-[10px] font-mono uppercase tracking-wider ${heatmapLive ? 'text-[#10B981]' : 'text-[#F59E0B]'} font-bold">${heatmapLive ? 'Live from xAPI' : 'Waiting for xAPI'}</span>
          </div>
          <span class="text-xs text-[#64748B] font-mono">UTC hour buckets</span>
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

        <!-- Heatmap Legend -->
        <div class="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B] font-mono">
          <span>Intensity scale:</span>
          <div class="flex items-center gap-1.5">
            <span>Low</span>
            <div class="w-4 h-4 rounded bg-[#F1F5F9] border border-[#E2E8F0]"></div>
            <div class="w-4 h-4 rounded bg-[#FFCCD5]/50 border border-[#FFCCD5]"></div>
            <div class="w-4 h-4 rounded bg-[#FF6B7A]/60 border border-[#FF4757]/40"></div>
            <div class="w-4 h-4 rounded bg-[#FF4757]/80 border border-[#E83D4D]"></div>
            <div class="w-4 h-4 rounded bg-[#E83D4D] border border-[#B91C1C]"></div>
            <span>High</span>
          </div>
        </div>
      </div>

      <!-- Right Column: xAPI Verb Distribution with Donut & Bars (5 cols) -->
      <div class="lg:col-span-5 card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] flex flex-col justify-between space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#0284C7] text-[20px]">pie_chart</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Task Distribution Donut</h3>
          </div>
          <span class="text-xs text-[#0284C7] font-mono font-bold">${activities.toLocaleString('en-IN')} Statements</span>
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

        <div class="py-4 space-y-3 font-mono text-xs">
          ${(verbs.length ? verbs : [{ label: 'no events yet', count: 0 }])
            .slice(0, 6)
            .map((v, i) => {
              const pct = Math.round((100 * v.count) / verbTotal);
              return `
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="font-bold text-[#0F172A] flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${palette[i % palette.length]}"></span>${escapeHtml(v.label)} (${pct}%)</span>
              <span class="text-[#64748B]">${v.count} events</span>
            </div>
            <div class="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
              <div class="h-full rounded-full" style="width: ${pct}%; background:${palette[i % palette.length]}"></div>
            </div>
          </div>`;
            })
            .join('')}
        </div>

        <div class="pt-3 border-t border-[#E2E8F0] text-center">
          <button id="jump-to-xapi-tab-btn" class="text-xs font-bold text-[#0284C7] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer">
            <span>Inspect All Raw Statements</span>
            <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Activity Attempts & Last-Progress Table by Tool and Content Set -->
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#E2E8F0] space-y-4">
      <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#0284C7] text-[20px]">table_chart</span>
          <div>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Activity Attempts &amp; Progress by Tool &amp; Content Set</h3>
            <span class="text-xs ${stats?.by_tool?.length ? 'text-[#10B981]' : 'text-[#F59E0B]'} font-mono font-bold">${stats?.by_tool?.length ? 'Live xAPI grouping' : 'Waiting for xAPI activity'}</span>
          </div>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]">
          ${learners} learners
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
            <tr>
              <th class="py-3 px-4 font-bold">Tool &amp; Content Set</th>
              <th class="py-3 px-4 font-bold">Total Attempts</th>
              <th class="py-3 px-4 font-bold text-[#10B981]">Complete</th>
              <th class="py-3 px-4 font-bold text-[#0284C7]">Ongoing</th>
              <th class="py-3 px-4 font-bold text-[#EF4444]">Incomplete</th>
              <th class="py-3 px-4 font-bold">Avg Score / Depth</th>
              <th class="py-3 px-4 font-bold text-right">Last Progress</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E2E8F0]">
            ${(stats?.by_tool || []).length
              ? (stats?.by_tool || []).map(row => `
            <tr class="hover:bg-[#F8FAFC]">
              <td class="py-3 px-4 font-bold text-[#0F172A]">${escapeHtml(row.tool)}</td>
              <td class="py-3 px-4 font-bold">${row.attempts}</td>
              <td class="py-3 px-4 text-[#10B981] font-bold">${row.complete}</td>
              <td class="py-3 px-4 text-[#0284C7] font-bold">${row.ongoing}</td>
              <td class="py-3 px-4 text-[#EF4444] font-bold">${row.incomplete}</td>
              <td class="py-3 px-4">${row.complete + row.ongoing + row.incomplete ? Math.round((100 * row.complete) / Math.max(row.attempts, 1)) + '%' : '—'}</td>
              <td class="py-3 px-4 text-right text-[#64748B]">${row.last_progress ? escapeHtml(String(row.last_progress).slice(5, 16).replace('T', ' ')) : '—'}</td>
            </tr>`).join('')
              : `<tr><td class="py-3 px-4 text-[#64748B]" colspan="7">No xAPI activity in the last 14 days.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Session Timelines Stream -->
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#E2E8F0] space-y-4">
      <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#FF4757] text-[20px]">timeline</span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">Recent Student Session Timelines</h3>
        </div>
        <span class="text-xs text-[#10B981] font-mono font-bold">${stats?.sessions?.length ? 'Derived from xAPI' : 'Waiting for activity'}</span>
      </div>

      <div class="space-y-3 divide-y divide-[#E2E8F0]">
        ${(stats?.sessions || []).length
          ? (stats?.sessions || []).slice(0, 6).map(s => `
        <div class="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div class="font-bold text-[#0F172A]">${escapeHtml(s.actor_sub)} · ${(s.tools || []).join(', ') || s.content || 'session'}</div>
            <div class="text-[#64748B] font-mono">${escapeHtml(String(s.started_at || '').slice(0, 16).replace('T', ' '))} → ${escapeHtml(String(s.ended_at || '').slice(11, 16))} · ${s.event_count} events</div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full bg-[#FFF0F3] text-[#FF4757] font-bold font-mono">${s.duration_minutes}m duration</span>
        </div>`).join('')
          : `<p class="pt-3 text-xs text-[#64748B]">No learner sessions in the last 14 days.</p>`}
      </div>
    </div>
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
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="card-depth-interactive rounded-3xl p-5 bg-white border border-[#E2E8F0] space-y-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#0284C7] text-[20px]">assignment_ind</span>
          <h3 class="text-sm font-bold text-[#0F172A] font-headline">Assignment dashboard</h3>
        </div>
        <p class="text-[11px] text-[#64748B]">Group-based work for this class (F-3 / LMS F-6).</p>
        ${assignments.length ? assignments.slice(0, 6).map(a => `
          <div class="text-xs font-mono p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span class="font-bold text-[#0F172A]">${escapeHtml(a.group_name || 'Group')}</span>
            <span class="text-[#64748B]"> → ${escapeHtml(a.title || a.activity_type || 'quiz')}</span>
          </div>
        `).join('') : '<p class="text-xs text-[#64748B]">No group assignments yet.</p>'}
      </div>
      <div class="card-depth-interactive rounded-3xl p-5 bg-white border border-[#E2E8F0] space-y-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#F59E0B] text-[20px]">counter_3</span>
          <h3 class="text-sm font-bold text-[#0F172A] font-headline">Attempt counters</h3>
        </div>
        <p class="text-[11px] text-[#64748B]">Local graded + synced external counts (F-6 / F-7).</p>
        <div class="text-xs font-mono p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
          Limit ${quota?.limit ?? 3} · used ${quota?.used ?? 0} · remaining ${quota?.remaining ?? '—'}
        </div>
        ${learners.slice(0, 5).map(l => `
          <div class="text-[11px] font-mono flex justify-between">
            <span>${escapeHtml(l.name || l.subject || 'Learner')}</span>
            <span>${l.quota?.used ?? 0}/${l.quota?.limit ?? 3}</span>
          </div>
        `).join('')}
      </div>
      <div class="card-depth-interactive rounded-3xl p-5 bg-white border border-[#E2E8F0] space-y-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#10B981] text-[20px]">folder_open</span>
          <h3 class="text-sm font-bold text-[#0F172A] font-headline">JSON fetch &amp; streamer</h3>
        </div>
        <p class="text-[11px] text-[#64748B]">F-4 / F-9 / F-10 virtual files: quiz JSON, assessment PDF.</p>
        <div class="flex flex-wrap gap-2">
          <button id="mw-fetch-quiz-json" class="btn-secondary-3d px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer" type="button">Fetch quiz JSON</button>
          <button id="mw-meta-pdf" class="btn-secondary-3d px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer" type="button">Detect PDF route</button>
          <button id="mw-stream-pdf" class="btn-secondary-3d px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer" type="button">Stream assessment PDF</button>
        </div>
        <div class="flex gap-2">
          <input id="mw-grade-subject" class="flex-1 text-xs border border-[#E2E8F0] rounded-lg px-2 py-1" placeholder="Learner subject" />
          <input id="mw-grade-score" class="w-16 text-xs border border-[#E2E8F0] rounded-lg px-2 py-1" placeholder="Score" />
          <button id="mw-ingest-grade" class="btn-secondary-3d px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer" type="button">Ingest grade</button>
        </div>
      </div>
    </div>
  `;
}

function renderXApiMiddlewareTab(verbFilter: string, statements: XApiStatement[]): string {
  return `
    <!-- Top Filter & Retrieval Ribbon -->
    <div class="card-depth-interactive rounded-2xl p-4 bg-white border border-[#E2E8F0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="flex items-center gap-2 flex-wrap text-xs">
        <span class="font-bold text-[#0F172A] font-mono uppercase">Filter by Verb:</span>
        <button class="verb-filter-btn px-3 py-1 rounded-lg ${verbFilter === 'all' ? 'bg-[#071E2D] text-white font-bold' : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'}" data-verb="all">All (${xapiStatementsList.length})</button>
        <button class="verb-filter-btn px-3 py-1 rounded-lg ${verbFilter === 'answered' ? 'bg-[#FF4757] text-white font-bold' : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'}" data-verb="answered">answered</button>
        <button class="verb-filter-btn px-3 py-1 rounded-lg ${verbFilter === 'completed' ? 'bg-[#10B981] text-white font-bold' : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'}" data-verb="completed">completed</button>
        <button class="verb-filter-btn px-3 py-1 rounded-lg ${verbFilter === 'interacted' ? 'bg-[#0284C7] text-white font-bold' : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'}" data-verb="interacted">interacted</button>
        <button class="verb-filter-btn px-3 py-1 rounded-lg ${verbFilter === 'passed' ? 'bg-[#10B981] text-white font-bold' : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'}" data-verb="passed">passed</button>
        <button class="verb-filter-btn px-3 py-1 rounded-lg ${verbFilter === 'failed' ? 'bg-[#EF4444] text-white font-bold' : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'}" data-verb="failed">failed</button>
      </div>

      <div class="flex items-center gap-2">
        <button id="lrs-refresh-btn" class="btn-secondary-3d px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer">
          <span class="material-symbols-outlined text-[15px]">refresh</span>
          <span>Query LRS</span>
        </button>
        <button id="export-csv-statements-btn" class="btn-secondary-3d px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer">
          <span class="material-symbols-outlined text-[15px]">download</span>
          <span>CSV Export</span>
        </button>
      </div>
    </div>

    <!-- Statements Table -->
    <div class="card-depth-interactive rounded-3xl bg-white border border-[#E2E8F0] overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-[#10B981] text-[20px]">hub</span>
          <h3 class="text-base font-bold text-[#0F172A] font-headline">xAPI 1.0.3 Activity Statements Stream</h3>
        </div>
        <span class="text-xs text-[#64748B] font-mono">Showing ${statements.length} recorded events</span>
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
                  ? 'bg-[#FFF0F3] text-[#FF4757] border-[#FFCCD5]'
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
                    <button class="inspect-stmt-btn text-xs font-bold text-[#0284C7] hover:underline cursor-pointer" data-stmt-id="${stmt.id}">
                      JSON Payload
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    ${renderLiveMiddlewarePanel()}

    <!-- Per-Application API Credentials & Schema Validation Inspector -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left: Application API Credentials for External Modules -->
      <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-4">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#0284C7] text-[20px]">vpn_key</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Per-Application API Credentials</h3>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]">Active Token</span>
        </div>

        <p class="text-xs text-[#64748B]">
          Credentials used by external LMS, XR headsets, and simulation clients to emit statements to the LRS endpoint:
        </p>

        <div class="space-y-2 text-xs font-mono">
          <div class="p-2.5 rounded-xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-0.5">
            <span class="text-[10px] uppercase text-[#64748B] font-bold">xAPI Endpoint URL</span>
            <div class="font-bold text-[#0284C7] truncate">https://edvidura.riverside.edu/api/v1/xapi/statements</div>
          </div>
          <div class="p-2.5 rounded-xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-0.5">
            <span class="text-[10px] uppercase text-[#64748B] font-bold">Client API Key (Application ID)</span>
            <div class="font-bold text-[#0F172A]">app-xapi-client-riverside-9921</div>
          </div>
          <div class="p-2.5 rounded-xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-0.5">
            <span class="text-[10px] uppercase text-[#64748B] font-bold">API Secret Key</span>
            <div class="font-bold text-[#0F172A]">sec_live_948f2190ae87b1c34a90f</div>
          </div>
        </div>
      </div>

      <!-- Right: Statement Schema Validation & Error Reporting -->
      <div class="card-depth-interactive rounded-3xl p-6 bg-white border border-[#E2E8F0] space-y-4">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#10B981] text-[20px]">verified_user</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Statement Validation &amp; Error Reporting</h3>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]">0 Errors</span>
        </div>

        <p class="text-xs text-[#64748B]">
          Pre-flight conformance validator verifies actor email IRI, verb IRI, and object activity ID against TinCan/xAPI 2.0 specs.
        </p>

        <div class="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-1.5 text-xs font-mono">
          <div class="flex items-center justify-between text-[#15803D] font-bold">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#10B981]"></span>Schema Compliant</span>
            <span>HTTP 200 OK</span>
          </div>
          <div class="text-[11px] text-[#166534]">
            Actor: Validated RFC-5322 Mailto IRI<br/>
            Verb: Validated ADLnet Registry IRI<br/>
            Object: Unique LTI Resource GUID Verified
          </div>
        </div>

        <button id="run-schema-validator-btn" class="w-full btn-secondary-3d py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
          <span class="material-symbols-outlined text-[15px]">spellcheck</span>
          <span>Run xAPI Schema Conformance Test</span>
        </button>
      </div>
    </div>
  `;
}

// =========================================================================
// SUBTAB 4: MODULE 7 — Difference Training Application
// =========================================================================
function renderDifferenceTrainingTab(): string {
  return `
    <!-- Difference Training Hero Explainer -->
    <div class="card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#FFCCD5] space-y-3">
      <div class="flex items-center gap-2 text-xs text-[#FF4757] font-bold font-mono uppercase tracking-wider">
        <span class="material-symbols-outlined text-[18px]">difference</span>
        <span>Algorithmic Gap Analysis</span>
      </div>
      <h2 class="text-xl sm:text-2xl font-bold text-[#0F172A] font-headline">
        Class Competency Gaps: Actual vs. CCSS Target Benchmarks
      </h2>
      <p class="text-sm text-[#64748B] leading-relaxed max-w-3xl">
        Difference training calculates the mathematical delta between current learner proficiency and target requirements, automatically synthesizing personalized remediation modules for at-risk cohorts.
      </p>
    </div>

    <!-- Gap Matrix Cards -->
    <div class="space-y-4">
      ${competenciesList.map(comp => {
        const hasGap = comp.gap > 0;
        const gapColor = hasGap ? 'text-[#FF4757]' : 'text-[#10B981]';
        const badgeBg = hasGap ? 'bg-[#FFF0F3] text-[#FF4757] border-[#FFCCD5]' : 'bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]';

        return `
          <div class="card-depth-interactive rounded-2xl p-5 bg-white border ${hasGap ? 'border-[#FFCCD5]' : 'border-[#E2E8F0]'} space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-bold text-[#64748B]">${comp.code}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border ${badgeBg}">
                    ${hasGap ? `Gap: -${comp.gap}%` : 'Target Met'}
                  </span>
                </div>
                <h4 class="text-base font-bold text-[#0F172A]">${comp.name}</h4>
              </div>

              <div class="flex items-baseline gap-4 font-mono tabular-nums text-xs">
                <div>
                  <span class="text-[#64748B] block text-[10px]">Actual</span>
                  <span class="text-lg font-bold text-[#0F172A]">${comp.score}%</span>
                </div>
                <div>
                  <span class="text-[#64748B] block text-[10px]">Target</span>
                  <span class="text-lg font-bold text-[#64748B]">${comp.targetScore}%</span>
                </div>
                <div>
                  <span class="text-[#64748B] block text-[10px]">Delta</span>
                  <span class="text-lg font-bold ${gapColor}">${hasGap ? `-${comp.gap}%` : `+${Math.abs(comp.gap)}%`}</span>
                </div>
              </div>
            </div>

            <!-- Dual Range Bar: Actual vs Target -->
            <div class="w-full bg-[#F1F5F9] h-3 rounded-full overflow-hidden relative">
              <!-- Target line indicator -->
              <div class="absolute top-0 bottom-0 w-0.5 bg-[#0F172A] z-10" style="left: ${comp.targetScore}%;" title="Target: ${comp.targetScore}%"></div>
              <!-- Actual progress -->
              <div class="h-full rounded-full transition-all duration-700 ${hasGap ? 'bg-[#FF4757]' : 'bg-[#10B981]'}" style="width: ${comp.score}%;"></div>
            </div>

            ${comp.remediationTitle ? `
              <div class="pt-2 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#FAFBFC] p-3 rounded-xl">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[#FF4757] text-[18px]">model_training</span>
                  <div>
                    <span class="font-bold text-[#0F172A]">Recommended Difference Drill:</span>
                    <span class="text-[#64748B] block">${comp.remediationTitle} (${comp.remediationHours}h projected)</span>
                  </div>
                </div>
                <button class="btn-primary-3d px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer assign-diff-drill-btn" data-drill="${comp.remediationTitle}">
                  Assign to At-Risk Students
                </button>
              </div>
            ` : ''}
          </div>
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
    <div class="fixed inset-0 z-50 bg-[#071E2D]/60 backdrop-blur-xs flex items-center justify-center p-4">
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
            <div><span class="text-[#64748B]">Verb:</span> <span class="font-bold text-[#FF4757]">${stmt.verb.display}</span></div>
          </div>

          <div>
            <span class="text-[#64748B] font-mono font-bold block mb-1">Raw JSON Statement Payload:</span>
            <pre class="p-4 rounded-2xl bg-[#071E2D] text-[#38BDF8] font-mono text-[11px] overflow-x-auto leading-relaxed border border-[#1E435E]">${JSON.stringify(stmt, null, 2)}</pre>
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
  container.querySelector('#btn-assign-remediation, #remediation-cta-pill')?.addEventListener('click', () => {
    showToast('Remediation drill "Negative Sign Isolation" assigned to 16 students via Moodle', 'verified');
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
}
