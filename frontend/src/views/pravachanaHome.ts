import { state, notify, showToast } from '../state';
import {
  classLabel,
  escapeHtml,
  firstName,
  loadPravachanaCatalog,
  openPravachana,
} from '../boot';
import { episodeTitle, fmtClock, packLabel, progressPct } from '../pravachana-ui';
import { setScreen } from '../state';
import { hubPageHead } from '../components/hub';

export function renderPravachanaHome(): string {
  const featured = state.livePravachanas.featured;
  const mine = state.livePravachanas.mine;
  const series = state.livePravachanas.series;
  const pct = mine?.percent ?? 0;
  const done = mine?.completed_count ?? 0;
  const total = mine?.total_count ?? 0;
  const pack = state.pravachanaPack;
  const packs: Array<{ id: typeof pack; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'public', label: 'Public' },
    { id: 'no_bag_day', label: 'No Bag Day' },
    { id: 'library_hour', label: 'Library hour' },
  ];

  return `
    <div class="hub-page">
      <div class="flex flex-col gap-5">
        ${hubPageHead({
          icon: 'video_library',
          kicker: 'AP Government · Pravachanalu',
          title: `Namaskaram, ${escapeHtml(firstName())}`,
          sub: `${escapeHtml(classLabel())} · ${pct}% watched · ${done} of ${total} episodes. Telugu-first library — no school, no Moodle.`,
          actions: `
            ${featured ? `<button id="hero-play-featured" class="hub-cta-dark" type="button">Today’s pravachanam <span class="material-symbols-outlined text-[16px]">play_circle</span></button>` : ''}
            <button id="hero-ask-vidura" class="hub-cta-light" type="button">Ask Vidura</button>`,
        })}
        <section class="hub-hero">
          <img alt="" src="${escapeHtml(featured?.cover_url || 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1200&q=80')}">
          <div class="hub-hero-body">
            <p class="hub-kicker">ఈ రోజు ప్రవచనం</p>
            <h1>${escapeHtml(episodeTitle(featured))}</h1>
          </div>
        </section>
      </div>

      <section class="w-full px-4 sm:px-6 lg:px-8 pb-4">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div class="flex-1 relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">search</span>
            <input id="prav-search" value="${escapeHtml(state.pravachanaQuery)}" placeholder="Search title or Telugu meaning" class="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm outline-none focus:border-[#FE580D]" />
          </div>
          <div class="flex flex-wrap gap-2">
            ${packs
              .map(
                p => `
              <button type="button" data-pack="${p.id}" class="prav-pack px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${pack === p.id ? 'bg-[#111827] text-white' : 'bg-white border border-[#E2E8F0] text-[#475569]'}">${p.label}</button>`
              )
              .join('')}
          </div>
        </div>
      </section>

      ${
        mine?.recent?.length
          ? `
      <section class="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div class="max-w-7xl mx-auto">
          <h2 class="text-sm font-bold text-[#0F172A] mb-3">Continue watching</h2>
          <div class="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            ${mine.recent
              .map(
                r => `
              <button type="button" data-open="${r.episode_id}" class="prav-open shrink-0 w-56 text-left rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white shadow-xs cursor-pointer">
                <div class="h-28 bg-[#111827] overflow-hidden"><img class="w-full h-full object-cover" alt="" src="${escapeHtml(r.cover_url)}" /></div>
                <div class="p-3">
                  <div class="text-xs font-bold text-[#0F172A] line-clamp-2">${escapeHtml(episodeTitle(r))}</div>
                  <div class="text-[10px] text-[#64748B] mt-1 font-mono">${r.completed ? 'Completed' : fmtClock(r.position_sec)}</div>
                </div>
              </button>`
              )
              .join('')}
          </div>
        </div>
      </section>`
          : ''
      }

      ${series
        .map(
          s => `
      <section class="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-end justify-between mb-4">
            <div>
              <h2 class="text-2xl font-bold font-headline text-[#0F172A]">${escapeHtml(episodeTitle({ title_te: s.title_te, title_en: s.title_en }))}</h2>
              <p class="text-sm text-[#64748B]">${escapeHtml(getLocaleDesc(s))}</p>
            </div>
            <span class="text-xs font-mono text-[#94A3B8]">${s.episode_count} episodes</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${s.episodes
              .map(ep => {
                const pctEp = progressPct(ep);
                return `
              <button type="button" data-open="${ep.id}" class="prav-open text-left rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white shadow-xs hover:shadow-md transition-shadow cursor-pointer">
                <div class="relative h-40 bg-[#111827]">
                  <img class="w-full h-full object-cover" alt="" src="${escapeHtml(ep.cover_url)}" />
                  <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold uppercase">${packLabel(ep.pack)}</span>
                  ${ep.demo ? '<span class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#FE580D] text-white text-[10px] font-bold">DEMO</span>' : ''}
                  <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono">${fmtClock(ep.duration_sec)}</span>
                </div>
                <div class="p-4">
                  <div class="text-sm font-bold text-[#0F172A] leading-snug">${escapeHtml(episodeTitle(ep))}</div>
                  <div class="mt-3 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div class="h-full bg-[#FE580D]" style="width:${pctEp}%"></div>
                  </div>
                </div>
              </button>`;
              })
              .join('')}
          </div>
        </div>
      </section>`
        )
        .join('')}

      ${
        !series.length
          ? `<section class="max-w-7xl mx-auto px-4 py-16 text-center text-[#64748B]">No episodes match this search.</section>`
          : ''
      }
    </div>
  `;
}

function getLocaleDesc(s: { description_te: string; description_en: string }): string {
  return episodeTitle({ title_te: s.description_te, title_en: s.description_en });
}

export function bindPravachanaHomeEvents(container: HTMLElement): void {
  container.querySelector('#hero-play-featured')?.addEventListener('click', () => {
    const id = state.livePravachanas.featured?.id;
    if (id) void openPravachana(id);
  });
  container.querySelector('#hero-ask-vidura')?.addEventListener('click', () => {
    setScreen('ask-vidura');
  });
  container.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).getAttribute('data-open');
      if (id) void openPravachana(id);
    });
  });
  container.querySelectorAll('[data-pack]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).getAttribute('data-pack') as typeof state.pravachanaPack;
      if (!id) return;
      state.pravachanaPack = id;
      void loadPravachanaCatalog().then(() => notify());
    });
  });
  const search = container.querySelector('#prav-search') as HTMLInputElement | null;
  search?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      state.pravachanaQuery = search.value.trim();
      void loadPravachanaCatalog().then(() => notify());
    }
  });
  search?.addEventListener('change', () => {
    state.pravachanaQuery = search.value.trim();
    void loadPravachanaCatalog().then(() => notify());
  });
}
