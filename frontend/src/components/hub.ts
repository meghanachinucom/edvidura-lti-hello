/**
 * CampusHub chrome.
 *
 * hubDash — Home (and Lessons): photo hero 8 + calendar 4, pair cards, 7+5, streak.
 * hubShell — every other screen: pagehead + optional compact photo + stats + body.
 * Same orange/black/mint cards. Do not paste the home calendar onto work surfaces.
 */

export type HubCardSlot = {
  icon: string;
  title: string;
  sub?: string;
  week?: string;
  body: string;
  extraClass?: string;
};

export type HubDashOpts = {
  hero: {
    img: string;
    kicker: string;
    title: string;
    sub?: string;
    cta?: string;
    icon?: string;
    quote?: string;
  };
  side: {
    title: string;
    today?: string;
    body: string;
    img?: string;
  };
  pair?: [HubCardSlot, HubCardSlot];
  main?: HubCardSlot;
  aside?: HubCardSlot;
  streak?: {
    title: string;
    sub?: string;
    extra?: string;
    cta?: string;
  };
  after?: string;
};

const SIDE_IMG =
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=70';

export function hubCardHead(opts: { icon: string; title: string; sub?: string; week?: string }): string {
  return `
    <div class="hub-card-head">
      <span class="hub-ico"><span class="material-symbols-outlined text-[18px]">${opts.icon}</span></span>
      <div class="min-w-0">
        <h2>${opts.title}</h2>
        ${opts.sub ? `<p>${opts.sub}</p>` : ''}
      </div>
      ${
        opts.week
          ? `<button class="hub-week" type="button">${opts.week} <span class="material-symbols-outlined text-[14px]">expand_more</span></button>`
          : ''
      }
    </div>`;
}

function card(slot: HubCardSlot, span = ''): string {
  return `
    <section class="hub-card ${span} ${slot.extraClass || ''}">
      ${hubCardHead(slot)}
      ${slot.body}
    </section>`;
}

export function hubDash(opts: HubDashOpts): string {
  const h = opts.hero;
  const s = opts.side;
  return `
    <div class="w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col gap-5">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section class="hub-hero lg:col-span-8">
          <img src="${h.img}" alt="">
          ${
            h.icon
              ? `<div class="hub-float hub-float-cap"><span class="material-symbols-outlined text-[30px]" style="font-variation-settings:'FILL' 1">${h.icon}</span></div>`
              : ''
          }
          ${h.quote ? `<aside class="hub-float hub-float-quote">${h.quote}</aside>` : ''}
          <div class="hub-hero-body">
            <p class="hub-kicker">${h.kicker}</p>
            <h1>${h.title}</h1>
            ${h.sub ? `<p class="hub-hero-sub">${h.sub}</p>` : ''}
            ${h.cta ? `<div class="hub-hero-ctas">${h.cta}</div>` : ''}
          </div>
        </section>
        <section class="hub-cal lg:col-span-4">
          <img src="${s.img || SIDE_IMG}" alt="">
          <div class="hub-cal-body">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-base font-extrabold">${s.title}</h2>
              ${
                s.today
                  ? `<span class="hub-cal-today">${s.today} <span class="material-symbols-outlined text-[14px]">chevron_right</span></span>`
                  : ''
              }
            </div>
            ${s.body}
          </div>
        </section>
      </div>

      ${
        opts.pair
          ? `<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">${card(opts.pair[0])}${card(opts.pair[1])}</div>`
          : ''
      }

      ${
        opts.main || opts.aside
          ? `<div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        ${opts.main ? card(opts.main, 'lg:col-span-7') : ''}
        ${opts.aside ? card(opts.aside, 'lg:col-span-5') : ''}
      </div>`
          : ''
      }

      ${
        opts.streak
          ? `
      <section class="hub-card hub-streak justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <span class="hub-ico"><span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1">emoji_events</span></span>
          <div class="min-w-0">
            <h2 class="text-sm font-extrabold text-[#111827]">${opts.streak.title}</h2>
            ${opts.streak.sub ? `<p class="text-xs text-slate-500">${opts.streak.sub}</p>` : ''}
          </div>
        </div>
        ${opts.streak.extra || ''}
        ${opts.streak.cta || ''}
      </section>`
          : ''
      }

      ${opts.after || ''}
    </div>`;
}

export function hubCalChip(cls: string, title: string, meta: string, attrs = ''): string {
  return `<button class="hub-cal-chip ${cls}" type="button" ${attrs}><span>${title}</span><span>${meta}</span></button>`;
}

export function hubMetric(value: string, delta?: string): string {
  return `<p class="text-[1.85rem] font-extrabold text-[#111827] tabular-nums leading-none mt-1">${value}${
    delta ? ` <span class="text-sm font-bold text-emerald-600">${delta}</span>` : ''
  }</p>`;
}

/** Compact page chrome for readers, players, and lesson labs. */
export function hubPageHead(opts: {
  icon: string;
  kicker: string;
  title: string;
  sub?: string;
  actions?: string;
}): string {
  return `
    <header class="hub-pagehead">
      <div class="hub-pagehead-main">
        <span class="hub-ico"><span class="material-symbols-outlined text-[18px]">${opts.icon}</span></span>
        <div class="min-w-0">
          <p class="hub-kicker-ink">${opts.kicker}</p>
          <h1>${opts.title}</h1>
          ${opts.sub ? `<p class="hub-pagehead-sub">${opts.sub}</p>` : ''}
        </div>
      </div>
      ${opts.actions ? `<div class="hub-pagehead-actions">${opts.actions}</div>` : ''}
    </header>`;
}

/** Slim inline toolbar — for quiz, chat, and other task screens. Not a white page card. */
export function hubBar(opts: {
  kicker?: string;
  title: string;
  meta?: string;
  lead?: string;
  actions?: string;
}): string {
  return `
    <div class="hub-bar">
      <div class="hub-bar-main">
        ${opts.lead || ''}
        <div class="min-w-0">
          ${opts.kicker ? `<p class="hub-kicker-ink">${opts.kicker}</p>` : ''}
          <h1>${opts.title}</h1>
          ${opts.meta ? `<p class="hub-bar-meta">${opts.meta}</p>` : ''}
        </div>
      </div>
      ${opts.actions ? `<div class="hub-bar-actions">${opts.actions}</div>` : ''}
    </div>`;
}

/** Compact photo strip — not the full 8+4 home hero. */
export function hubHeroBanner(opts: {
  img: string;
  kicker: string;
  title: string;
  sub?: string;
  cta?: string;
}): string {
  return `
    <section class="hub-hero hub-hero-compact">
      <img src="${opts.img}" alt="">
      <div class="hub-hero-body">
        <p class="hub-kicker">${opts.kicker}</p>
        <h1>${opts.title}</h1>
        ${opts.sub ? `<p class="hub-hero-sub">${opts.sub}</p>` : ''}
        ${opts.cta ? `<div class="hub-hero-ctas">${opts.cta}</div>` : ''}
      </div>
    </section>`;
}

/** Work-surface layout: pagehead, optional photo strip, optional stats, then the real content. */
export function hubShell(opts: {
  icon: string;
  kicker: string;
  title: string;
  sub?: string;
  actions?: string;
  banner?: {
    img: string;
    kicker: string;
    title: string;
    sub?: string;
    cta?: string;
  };
  stats?: string;
  body: string;
}): string {
  return `
    <div class="hub-page">
      ${hubPageHead({
        icon: opts.icon,
        kicker: opts.kicker,
        title: opts.title,
        sub: opts.sub,
        actions: opts.actions,
      })}
      ${opts.banner ? hubHeroBanner(opts.banner) : ''}
      ${opts.stats || ''}
      ${opts.body}
    </div>`;
}

export function hubStat(icon: string, label: string, value: string): string {
  return `
    <div class="hub-stat">
      <span class="hub-ico"><span class="material-symbols-outlined text-[18px]">${icon}</span></span>
      <div class="min-w-0">
        <p class="hub-stat-label">${label}</p>
        <p class="hub-stat-value">${value}</p>
      </div>
    </div>`;
}

export function hubStats(...items: string[]): string {
  return `<div class="hub-stats">${items.join('')}</div>`;
}

export function studioSplit(main: string, rail: string): string {
  return `<div class="studio-grid"><div class="studio-main flex flex-col gap-5">${main}</div><div class="studio-rail flex flex-col gap-5">${rail}</div></div>`;
}

export function studioCover(opts: {
  img: string;
  kicker: string;
  title: string;
  meta?: string;
  pill?: string;
  pillClass?: string;
  cta?: string;
  extraClass?: string;
  attrs?: string;
}): string {
  return `
    <article class="studio-cover ${opts.extraClass || ''}" ${opts.attrs || ''}>
      <div class="studio-cover-media">
        <img src="${opts.img}" alt="">
        ${opts.pill ? `<span class="hub-pill ${opts.pillClass || ''} studio-cover-pill">${opts.pill}</span>` : ''}
      </div>
      <div class="studio-cover-body">
        <p class="hub-kicker-ink">${opts.kicker}</p>
        <h3>${opts.title}</h3>
        ${opts.meta ? `<p>${opts.meta}</p>` : ''}
        ${opts.cta || ''}
      </div>
    </article>`;
}
