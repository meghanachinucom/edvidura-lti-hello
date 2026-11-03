import { state, setScreen } from '../state';
import { classLabel, escapeHtml, openPravachana } from '../boot';
import { episodeTitle, packLabel } from '../pravachana-ui';
import { hubHeroBanner, hubPageHead, hubStat } from '../components/hub';

export function renderPravachanaDept(): string {
  const stats = state.livePravachanaStats;
  const rows = stats?.by_episode || [];
  return `
    <div class="hub-page">
      <section>
        <div class="flex flex-col gap-4">
          ${hubPageHead({
            icon: 'apartment',
            kicker: 'AP Cultural Department',
            title: 'Pravachana watch counts',
            sub: `${escapeHtml(classLabel())} — plays and completions on this government tenant only. No school roster. No Moodle.`,
          })}
          ${hubHeroBanner({
            img: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1600&q=80',
            kicker: 'Department console',
            title: 'Watch counts for this tenant',
            sub: 'No school roster. No Moodle.',
          })}
          <div class="mt-5 hub-stats">
            ${hubStat('video_library', 'Episodes', String(stats?.episodes ?? 0))}
            ${hubStat('play_circle', 'Watches', String(stats?.watches ?? 0))}
            ${hubStat('task_alt', 'Completed', String(stats?.completed ?? 0))}
            ${hubStat('groups', 'Viewers', String(stats?.viewers ?? 0))}
          </div>
        </div>
      </section>
      <section>
        <div class="hub-card overflow-hidden p-0">
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
        <div class="mt-4">
          <button id="dept-to-library" type="button" class="hub-cta-dark">Open public library</button>
        </div>
      </section>
    </div>
  `;
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
