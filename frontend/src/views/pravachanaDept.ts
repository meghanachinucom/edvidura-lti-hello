import { state, setScreen } from '../state';
import { classLabel, escapeHtml, openPravachana } from '../boot';
import { episodeTitle, packLabel } from '../pravachana-ui';

export function renderPravachanaDept(): string {
  const stats = state.livePravachanaStats;
  const rows = stats?.by_episode || [];
  return `
    <div class="flex flex-col w-full bg-[#FAFBFC]">
      <section class="w-full px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div class="max-w-7xl mx-auto">
          <div class="hero-navy-card relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl" style="background-color:#071E2D;">
            <div class="flex items-center gap-2 text-xs font-mono text-[#38BDF8] font-bold uppercase tracking-wider">
              AP Cultural Department
            </div>
            <h1 class="mt-2 text-3xl font-bold text-white font-headline">Pravachana watch counts</h1>
            <p class="mt-2 text-sm text-gray-300 max-w-2xl">
              ${escapeHtml(classLabel())} — plays and completions on this government tenant only. No school roster. No Moodle.
            </p>
            <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              ${kpi('Episodes', stats?.episodes ?? 0)}
              ${kpi('Watches', stats?.watches ?? 0)}
              ${kpi('Completed', stats?.completed ?? 0)}
              ${kpi('Viewers', stats?.viewers ?? 0)}
            </div>
          </div>
        </div>
      </section>
      <section class="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div class="max-w-7xl mx-auto bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-xs">
          <table class="w-full text-sm">
            <thead class="bg-[#F8FAFC] text-left text-[11px] font-mono uppercase text-[#64748B]">
              <tr>
                <th class="px-4 py-3">Episode</th>
                <th class="px-4 py-3">Pack</th>
                <th class="px-4 py-3">Plays</th>
                <th class="px-4 py-3">Viewers</th>
                <th class="px-4 py-3">Completed</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows.length
                  ? rows
                      .map(
                        r => `
                <tr class="border-t border-[#E2E8F0] hover:bg-[#FAFBFC] cursor-pointer dept-ep" data-open="${r.id}">
                  <td class="px-4 py-3 font-semibold text-[#0F172A]">${escapeHtml(episodeTitle(r))}</td>
                  <td class="px-4 py-3 text-[#64748B]">${packLabel(r.pack)}</td>
                  <td class="px-4 py-3 font-mono">${r.plays}</td>
                  <td class="px-4 py-3 font-mono">${r.viewers}</td>
                  <td class="px-4 py-3 font-mono">${r.completed}</td>
                </tr>`
                      )
                      .join('')
                  : `<tr><td class="px-4 py-8 text-[#94A3B8]" colspan="5">No watches yet. Open the library as a citizen first.</td></tr>`
              }
            </tbody>
          </table>
        </div>
        <div class="max-w-7xl mx-auto mt-4">
          <button id="dept-to-library" type="button" class="btn-primary-3d px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">Open public library</button>
        </div>
      </section>
    </div>
  `;
}

function kpi(label: string, n: number): string {
  return `
    <div class="rounded-2xl bg-white/10 border border-white/10 p-4">
      <div class="text-2xl font-bold text-white font-headline">${n}</div>
      <div class="text-[11px] uppercase tracking-wider text-gray-300 font-mono mt-1">${label}</div>
    </div>`;
}

export function bindPravachanaDeptEvents(container: HTMLElement): void {
  container.querySelector('#dept-to-library')?.addEventListener('click', () => {
    setScreen('pravachana-home');
  });
  container.querySelectorAll('[data-open]').forEach(row => {
    row.addEventListener('click', () => {
      const id = (row as HTMLElement).getAttribute('data-open');
      if (id) void openPravachana(id);
    });
  });
}
