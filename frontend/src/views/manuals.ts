/**
 * View 06: Manuals Shelf / Reference Library
 * Styled with radiant coral (#FF4757), deep midnight navy (#071E2D),
 * student photography, and colorful book cards.
 */
import { state, setScreen, showToast } from '../state';
import { escapeHtml, openLiveManual } from '../boot';

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
    title: 'Algebra I Technical Guide & Reference',
    category: 'textbook',
    categoryLabel: 'Primary Course Text',
    edition: 'eBook · v3.2',
    pages: '284 pages',
    desc: 'The official curriculum textbook for Riverside High Algebra I. Covers Cartesian coordinate planes, linear slope derivations, systems of equations, and quadratic polynomials.',
    updated: 'Updated Term 1 2026',
    color: '#FF4757',
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
    title: 'Riverside High Moodle 4.3 Student Handbook',
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
  const palette = ['#FF4757', '#0284C7', '#10B981', '#7C3AED'];
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
  return `
    <div class="flex flex-col w-full bg-[#FAFBFC]">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 flex flex-col gap-8">
        
        <!-- ========================================================
             COLORFUL HERO BANNER: Reference Library
             ======================================================== -->
        <section class="hero-navy-card relative overflow-hidden rounded-3xl text-white p-6 sm:p-10 shadow-xl" style="background-color: #071E2D; background-image: linear-gradient(135deg, #071E2D 0%, #0A2540 50%, #0D2E4A 100%);">
          <!-- Ambient glowing lights -->
          <div class="absolute -top-20 -right-20 w-80 h-80 bg-[#FF4757]/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-20 -left-20 w-72 h-72 bg-[#0284C7]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div class="lg:col-span-7 space-y-4">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono">
                <span class="w-2 h-2 rounded-full bg-[#FF4757] animate-pulse"></span>
                <span>District Certified Library</span>
                <span class="text-gray-400">·</span>
                <span class="text-[#38BDF8]">${items.length} ${state.connected ? 'class manuals' : 'Approved Handbooks'}</span>
              </div>

              <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-headline leading-tight">
                Reference Library &amp; <span class="text-[#FF4757]">Handbooks</span>
              </h1>

              <p class="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl">
                Explore approved digital textbooks, formula reference cheat sheets, and graphing hardware documentation synchronized with Riverside High standards.
              </p>

              <!-- Search Bar -->
              <div class="pt-2 max-w-md">
                <div class="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl px-4 py-2.5 shadow-inner">
                  <span class="material-symbols-outlined text-gray-300 text-[20px]">search</span>
                  <input
                    id="manual-search-input"
                    type="text"
                    placeholder="Search chapters, theorems, or slope formulas..."
                    class="bg-transparent border-none outline-none text-xs sm:text-sm text-white w-full placeholder:text-gray-400 font-sans"
                  />
                </div>
              </div>
            </div>

            <!-- Right Visual: Student Library Photography with Badges -->
            <div class="lg:col-span-5 relative flex justify-center">
              <div class="relative w-full max-w-md h-64 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20">
                <img
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80"
                  alt="Students Studying in Academic Library"
                  class="w-full h-full object-cover"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/60 shadow-md flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-[#FF4757] text-[20px]">auto_stories</span>
                  <div>
                    <div class="text-xs font-bold text-[#0F172A]">Technical Guide § 2.3</div>
                    <div class="text-[10px] text-[#64748B]">Primary Textbook Available Offline</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- ========================================================
             MANUAL CARDS GRID
             ======================================================== -->
        <section class="grid grid-cols-1 md:grid-cols-2 gap-6" id="manuals-grid">
          ${
            liveEmpty
              ? `
                <div class="manual-card card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#E2E8F0] flex flex-col justify-between md:col-span-2">
                  <div class="space-y-3">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md" style="background-color: #FF4757">
                      <span class="material-symbols-outlined text-[26px]">menu_book</span>
                    </div>
                    <h3 class="text-lg font-bold text-[#0F172A] font-headline">No class manuals assigned yet</h3>
                    <p class="text-sm text-[#64748B] leading-relaxed">
                      This class has no published technical manuals linked in EdVidura. The library chrome stays ready — open a handbook here once your teacher publishes one.
                    </p>
                  </div>
                </div>
              `
              : items
            .map(m => {
              return `
                <div class="manual-card card-depth-interactive rounded-3xl p-6 sm:p-7 bg-white border border-[#E2E8F0] hover:border-[#FF4757]/40 flex flex-col justify-between transition-all group" data-id="${escapeHtml(m.id)}">
                  
                  <div class="space-y-4">
                    <div class="flex items-start justify-between gap-4">
                      <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-bold" style="background-color: ${m.color}">
                        <span class="material-symbols-outlined text-[26px]">${m.icon}</span>
                      </div>
                      
                      <div class="flex flex-col items-end">
                        <span class="text-xs font-bold font-mono px-3 py-1 rounded-full text-white" style="background-color: ${m.color}">
                          ${m.categoryLabel}
                        </span>
                        <span class="text-[11px] text-[#64748B] font-mono mt-1">${m.edition}</span>
                      </div>
                    </div>

                    <div>
                      <h3 class="text-lg font-bold text-[#0F172A] font-headline group-hover:text-[#FF4757] transition-colors leading-snug">
                        ${escapeHtml(m.title)}
                      </h3>
                      <p class="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
                        ${escapeHtml(m.desc)}
                      </p>
                    </div>
                  </div>

                  <div class="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
                    <span class="text-[#64748B] flex items-center gap-1">
                      <span class="material-symbols-outlined text-[16px]">menu_book</span>
                      <span>${m.pages}</span>
                    </span>

                    <button class="open-manual-btn btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm" data-id="${escapeHtml(m.id)}">
                      <span>Open Reader</span>
                      <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>

                </div>
              `;
            })
            .join('')}
        </section>

        <!-- Clean Academic Bottom Spacer -->
        <div class="h-8 w-full"></div>

      </div>
    </div>
  `;
}

export function bindManualsEvents(container: HTMLElement): void {
  // Search filter
  const searchInput = container.querySelector('#manual-search-input') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    const val = searchInput.value.toLowerCase();
    container.querySelectorAll('.manual-card').forEach(card => {
      const text = card.textContent?.toLowerCase() || '';
      (card as HTMLElement).style.display = text.includes(val) ? 'flex' : 'none';
    });
  });

  const openManual = (id: string | null) => {
    if (!id) return;
    if (state.connected && state.liveManuals.length) {
      void openLiveManual(id);
      return;
    }
    setScreen('manual-reader');
    showToast('Opening Algebra I Technical Guide eBook Reader', 'menu_book');
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
