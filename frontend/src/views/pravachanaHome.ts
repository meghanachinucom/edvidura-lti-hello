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
    <div class="flex flex-col w-full bg-[#FAFBFC] text-ink">
      <section class="relative w-full overflow-hidden pt-8 pb-10 bg-gradient-to-b from-white via-[#FAFBFC] to-[#F8FAFC]">
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-[#FF4757]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div class="lg:col-span-7 flex flex-col items-start gap-5">
              <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0F3] border border-[#FFCCD5] text-[#FF4757] text-xs font-bold uppercase tracking-wider font-mono">
                <span class="w-2 h-2 rounded-full bg-[#FF4757] animate-pulse"></span>
                <span>AP Government · Pravachanalu</span>
              </div>
              <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-[#0F172A] leading-[1.12] font-headline">
                Namaskaram, ${escapeHtml(firstName())}:
                <span class="text-[#FF4757]">Chaganti Gari Pravachanalu</span>
              </h1>
              <p class="text-base text-[#475569] max-w-xl leading-relaxed">
                Official Andhra Pradesh cultural library — Telugu-first, no school, no Moodle.
                Clips here are <strong>demo placeholders</strong> until the department licences the real discourses.
              </p>
              <div class="flex flex-wrap items-center gap-3 pt-1">
                ${
                  featured
                    ? `<button id="hero-play-featured" class="btn-primary-3d px-7 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md" type="button">
                        <span>Today's pravachanam</span>
                        <span class="material-symbols-outlined text-[18px]">play_circle</span>
                      </button>`
                    : ''
                }
                <button id="hero-ask-vidura" class="btn-navy-3d px-7 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md" type="button">
                  <span>Ask Vidura</span>
                  <span class="material-symbols-outlined text-[18px]">forum</span>
                </button>
              </div>
              <div class="flex items-center gap-4 pt-3 border-t border-[#E2E8F0] w-full max-w-lg text-sm">
                <span class="text-[#0F172A] font-bold">${pct}% watched</span>
                <span class="text-[#94A3B8]">·</span>
                <span class="text-[#475569]">${done} of ${total} episodes</span>
                <span class="text-[#94A3B8]">·</span>
                <span class="text-[#475569]">${escapeHtml(classLabel())}</span>
              </div>
            </div>
            <div class="lg:col-span-5">
              <div class="relative rounded-3xl overflow-hidden shadow-xl border border-[#E2E8F0] aspect-[16/10] bg-[#071E2D]">
                <img alt="" class="w-full h-full object-cover opacity-90" src="${escapeHtml(featured?.cover_url || 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1200&q=80')}" />
                <div class="absolute inset-0 bg-gradient-to-t from-[#071E2D] via-transparent to-transparent"></div>
                <div class="absolute bottom-4 left-4 right-4 text-white">
                  <div class="text-[10px] font-mono uppercase tracking-wider text-[#FF4757] font-bold">ఈ రోజు ప్రవచనం</div>
                  <div class="text-lg font-bold font-headline">${escapeHtml(episodeTitle(featured))}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="w-full px-4 sm:px-6 lg:px-8 pb-4">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div class="flex-1 relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">search</span>
            <input id="prav-search" value="${escapeHtml(state.pravachanaQuery)}" placeholder="Search title or Telugu meaning" class="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm outline-none focus:border-[#FF4757]" />
          </div>
          <div class="flex flex-wrap gap-2">
            ${packs
              .map(
                p => `
              <button type="button" data-pack="${p.id}" class="prav-pack px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${pack === p.id ? 'bg-[#071E2D] text-white' : 'bg-white border border-[#E2E8F0] text-[#475569]'}">${p.label}</button>`
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
                <div class="h-28 bg-[#071E2D] overflow-hidden"><img class="w-full h-full object-cover" alt="" src="${escapeHtml(r.cover_url)}" /></div>
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
                <div class="relative h-40 bg-[#071E2D]">
                  <img class="w-full h-full object-cover" alt="" src="${escapeHtml(ep.cover_url)}" />
                  <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold uppercase">${packLabel(ep.pack)}</span>
                  ${ep.demo ? '<span class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#FF4757] text-white text-[10px] font-bold">DEMO</span>' : ''}
                  <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono">${fmtClock(ep.duration_sec)}</span>
                </div>
                <div class="p-4">
                  <div class="text-sm font-bold text-[#0F172A] leading-snug">${escapeHtml(episodeTitle(ep))}</div>
                  <div class="mt-3 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div class="h-full bg-[#FF4757]" style="width:${pctEp}%"></div>
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
