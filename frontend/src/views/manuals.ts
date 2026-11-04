/**
 * View 06: Manuals Shelf / Reference Library
 * Styled with radiant coral (#FE580D), deep midnight navy (#111827),
 * student photography, and colorful book cards.
 */
import { state, setScreen, showToast } from '../state';
import { escapeHtml, openLiveManual } from '../boot';
import { hubBar, studioCover } from '../components/hub';
import { localizeText } from '../i18n';
import { proposeLabPack, publishLabPack, saveLabPack, searchDocuments } from '../api';

function L(input: string): string {
  return escapeHtml(localizeText(input));
}

export interface ManualItem {
  id: string;
  title: string;
  category: 'textbook' | 'calculator' | 'formula' | 'platform';
  categoryLabel: string;
  edition: string;
  pages: string;
  desc: string;
  updated: string;
  color: string;
  icon: string;
  isPrimary?: boolean;
}

const manualsData: ManualItem[] = [
  {
    id: 'm-alg1',
    title: 'Class 8 Mathematics Handbook & Reference',
    category: 'textbook',
    categoryLabel: 'Primary Course Text',
    edition: 'eBook · v3.2',
    pages: '284 pages',
    desc: 'The official curriculum textbook for ZPHS Vijayawada Class 8 Mathematics. Covers Cartesian coordinate planes, linear slope derivations, systems of equations, and quadratic polynomials.',
    updated: 'Updated Term 1 2026',
    color: '#FE580D',
    icon: 'menu_book',
    isPrimary: true
  },
  {
    id: 'm-calc',
    title: 'TI-84 Plus CE Graphing Calculator Manual',
    category: 'calculator',
    categoryLabel: 'Hardware Guide',
    edition: 'Reference Manual',
    pages: '118 pages',
    desc: 'Instructions for window scaling, plotting multivariable linear functions, finding intersections, and verifying matrix determinants.',
    updated: 'Updated Fall 2025',
    color: '#0284C7',
    icon: 'calculate'
  },
  {
    id: 'm-form',
    title: 'Essential Formulas & Axioms Cheat Sheet',
    category: 'formula',
    categoryLabel: 'Formula Sheet',
    edition: 'Quick Ref Card',
    pages: '12 pages',
    desc: 'Canonical slope quotient, standard form Ax + By = C, slope-intercept, point-slope, and perpendicular reciprocal properties in laminated format.',
    updated: 'Approved for Moodle Exams',
    color: '#10B981',
    icon: 'note_alt'
  },
  {
    id: 'm-moodle',
    title: 'ZPHS Vijayawada Moodle Student Handbook',
    category: 'platform',
    categoryLabel: 'Platform Manual',
    edition: 'District Doc v1.4',
    pages: '24 pages',
    desc: 'Guide to LTI Advantage 1.3 assignments, token renewals, mobile notifications, and grade sync verification.',
    updated: 'District Approved',
    color: '#7C3AED',
    icon: 'hub'
  }
];

function activeManuals(): ManualItem[] {
  if (!state.connected) return manualsData;
  const palette = ['#FE580D', '#0284C7', '#10B981', '#7C3AED'];
  const icons = ['menu_book', 'calculate', 'note_alt', 'hub'];
  return state.liveManuals.map((m, i) => ({
    id: m.id,
    title: m.title,
    category: 'textbook' as const,
    categoryLabel: m.status || 'Class Manual',
    edition: m.slug,
    pages: 'PeBL reader',
    desc: m.description || 'Class-linked technical manual from EdVidura.',
    updated: 'Live from API',
    color: palette[i % palette.length],
    icon: icons[i % icons.length],
    isPrimary: i === 0,
  }));
}

export function renderManuals(): string {
  const items = activeManuals();
  const liveEmpty = state.connected && items.length === 0;
  const covers = [
    'https://images.unsplash.com/photo-1456513080800-7d113dc8c4b2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=70',
  ];
  const featured = items[0];
  const grid = `
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="manuals-grid">
          ${
            liveEmpty
              ? `
                <div class="manual-card studio-cover sm:col-span-2 xl:col-span-4">
                  <div class="studio-cover-body py-10">
                    <p class="hub-kicker-ink">${L('Handbook')}</p>
                    <h3>${L('No class manuals assigned yet')}</h3>
                    <p>${L('This class has no published technical manuals linked in EdVidura. The library chrome stays ready — open a handbook here once your teacher publishes one.')}</p>
                  </div>
                </div>
              `
              : items
            .map((m, i) => {
              return `
                <div class="manual-card" data-id="${escapeHtml(m.id)}">
                  ${studioCover({
                    img: covers[i % covers.length],
                    kicker: L(m.categoryLabel),
                    title: L(m.title),
                    meta: L(m.pages),
                    pill: L('Works offline'),
                    pillClass: 'ok',
                    cta: `<button class="open-manual-btn hub-cta-dark" data-id="${escapeHtml(m.id)}" type="button">${L('Open')}</button>`,
                  })}
                </div>
              `;
            })
            .join('')}
        </section>

  `;
  return `
    <div class="hub-page">
      ${
        featured && !liveEmpty
          ? `<div class="studio-grid">
        <section class="hub-hero studio-main">
          <img src="${covers[0]}" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">${L(featured.categoryLabel)}</p>
            <h1>${L(featured.title)}</h1>
            <p class="hub-hero-sub">${L(featured.pages)} · ${L('Works offline')}</p>
            <div class="hub-hero-ctas">
              <button class="hub-cta-light open-manual-btn" data-id="${escapeHtml(featured.id)}" type="button">${L('Open handbook')}</button>
            </div>
          </div>
        </section>
        <section class="hub-cal studio-rail">
          <img src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=70" alt="">
          <div class="hub-cal-body">
            <h2 class="text-base font-extrabold">${L('e-Book reader')}</h2>
            <p class="text-sm text-white/75 mt-3">${L('PeBL handbooks · teachers publish; you read here.')}</p>
          </div>
        </section>
      </div>`
          : ''
      }
      ${hubBar({
        kicker: L('e-Book'),
        title: L('Class manuals'),
        meta: L('Read published handbooks. Teachers can Make interactive from their own book.'),
        actions: `
          ${
            state.connected && (state.role === 'teacher' || state.role === 'admin')
              ? `<button id="make-interactive-btn" class="hub-cta-dark" type="button" style="margin-top:0">${L('Make interactive')}</button>`
              : ''
          }
          <label class="hub-search" style="min-width:14rem;box-shadow:none"><span class="material-symbols-outlined">search</span><input id="manual-search-input" type="search" placeholder="${L('Search…')}" autocomplete="off" /></label>`,
      })}
      ${grid}
    </div>`;
}

export function bindManualsEvents(container: HTMLElement): void {
  // Local card filter + Wave A document search (SME index) when enabled
  const searchInput = container.querySelector('#manual-search-input') as HTMLInputElement;
  let searchTimer: number | undefined;
  const hitsHostId = 'doc-search-hits';
  searchInput?.addEventListener('input', () => {
    const val = searchInput.value.toLowerCase().trim();
    container.querySelectorAll('.manual-card').forEach(card => {
      const text = card.textContent?.toLowerCase() || '';
      (card as HTMLElement).style.display = !val || text.includes(val) ? '' : 'none';
    });
    const caps = (state.liveSession?.capabilities || {}) as Record<string, boolean>;
    if (!state.connected || !caps.document_search) return;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      let host = container.querySelector(`#${hitsHostId}`) as HTMLElement | null;
      if (!host) {
        host = document.createElement('div');
        host.id = hitsHostId;
        host.className = 'hub-card flex flex-col gap-2 mt-3';
        container.querySelector('.hub-page')?.appendChild(host);
      }
      if (val.length < 2) {
        host.innerHTML = '';
        host.hidden = true;
        return;
      }
      host.hidden = false;
      host.innerHTML = `<p class="text-xs text-slate-500">${L('Document Search')}…</p>`;
      searchDocuments(val)
        .then((res) => {
          const hits = res.hits || [];
          host!.innerHTML = hits.length
            ? `<p class="hub-kicker-ink">${L('Document Search')} · Wave A</p>` +
              hits
                .map(
                  (h) =>
                    `<div><p class="text-sm font-bold text-[#111827]">${escapeHtml(h.title || h.slug || 'Hit')}</p><p class="text-xs text-slate-500 line-clamp-2">${escapeHtml((h.body || '').slice(0, 160))}</p></div>`
                )
                .join('')
            : `<p class="text-sm text-slate-500">${L('No handbook hits yet — index manuals for this class.')}</p>`;
        })
        .catch(() => {
          host!.innerHTML = `<p class="text-sm text-slate-500">${L('Document Search unavailable for this tenant.')}</p>`;
        });
    }, 280);
  });

  container.querySelector('#make-interactive-btn')?.addEventListener('click', () => {
    const liveId = state.liveManuals[0]?.id;
    if (!state.connected || !liveId) {
      showToast(localizeText('Connect with a school handbook to make it interactive'), 'menu_book');
      return;
    }
    showToast(localizeText('Drafting interactive lab from this school’s handbook…'), 'auto_awesome');
    proposeLabPack({ manual_id: liveId })
      .then((proposal) =>
        saveLabPack({
          pack: proposal,
          manual_id: liveId,
          chapter_slug: proposal.chapter_slug || 'overview',
          status: 'draft',
        }).then((row) =>
          publishLabPack(row.id).then(() => {
            showToast(
              localizeText('Interactive lab published — open a lesson to try textbook | playground'),
              'view_in_ar'
            );
            setScreen('lesson-detail');
          })
        )
      )
      .catch((err) => {
        showToast(err?.message || localizeText('Could not make interactive'), 'error');
      });
  });

  const openManual = (id: string | null) => {
    if (!id) return;
    if (state.connected && state.liveManuals.length) {
      void openLiveManual(id);
      return;
    }
    setScreen('manual-reader');
    showToast(localizeText('Opening Class 8 Mathematics Handbook eBook Reader'), 'menu_book');
  };

  container.querySelectorAll('.open-manual-btn').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      openManual((e.currentTarget as HTMLElement).getAttribute('data-id'));
    });
  });

  container.querySelectorAll('.manual-card').forEach(el => {
    el.addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('.open-manual-btn')) return;
      openManual((e.currentTarget as HTMLElement).getAttribute('data-id'));
    });
  });
}
