/**
 * View 07: Manual Reader & Interactive eBook Workspace
 * Module 8: Interactive eBook
 * - Reading progress tracking & live progress update
 * - Bookmarks management (add, remove, jump)
 * - Text highlighting (yellow, green, coral swatches)
 * - Chapter navigation (TOC sidebar, jump to chapter, prev/next chapter pagination)
 * - Margin notes & discussions (private vs shared with class)
 */
import { state, setScreen, showToast, notify, bookChaptersList, BookChapter } from '../state';
import { displayName, escapeHtml, noteManualChapterTime, postLiveDiscussion } from '../boot';

const fontScales = ['80%', '90%', '100%', '110%', '120%'];
const fontClasses = ['text-sm', 'text-[0.9375rem]', 'text-base', 'text-lg', 'text-xl'];

export function renderManualReader(): string {
  const currentScale = fontScales[state.manualFontScaleIndex] || '100%';
  const bodyTextClass = fontClasses[state.manualFontScaleIndex] || 'text-base';
  const isFocus = state.manualFocusMode;
  const isNotesOpen = state.manualNotesOpen;
  const activeChapterId = state.manualActiveChapterId || 'ch4';
  const progressPercent = state.manualReadingProgress || 42;

  const live = state.liveManualDetail;
  const currentChapter = bookChaptersList.find(c => c.id === activeChapterId) || bookChaptersList[3];
  const chapterIdx = bookChaptersList.findIndex(c => c.id === currentChapter.id);
  const prevChapter = chapterIdx > 0 ? bookChaptersList[chapterIdx - 1] : null;
  const nextChapter = chapterIdx < bookChaptersList.length - 1 ? bookChaptersList[chapterIdx + 1] : null;
  const readerTitle = live?.title || `Chapter ${currentChapter.num}: ${currentChapter.title}`;

  const isBookmarkModalOpen = state.activeDialog === 'ebook-bookmarks';
  const isHighlightToolActive = state.activeDialog === 'ebook-highlight';

  return `
    <div class="flex flex-col w-full bg-paper min-h-[calc(100vh-4rem)]">
      
      <!-- Interactive Reading Progress Bar -->
      <div aria-label="Reading progress" class="w-full bg-line/40 h-1.5" role="progressbar">
        <div class="h-full bg-gradient-to-r from-[#FF5B6B] to-[#FF4757] transition-all duration-300" style="width: ${progressPercent}%;" id="reading-progress-fill"></div>
      </div>

      <!-- Editorial Hero Band -->
      <section class="w-full bg-paper px-4 sm:px-6 lg:px-8 pt-6 pb-6 border-b border-line">
        <div class="max-w-7xl mx-auto flex flex-col gap-4">
          
          <!-- Top Action Strip & Breadcrumb -->
          <div class="flex flex-wrap items-center justify-between gap-4 text-xs text-outline font-medium">
            <div class="flex items-center gap-2 flex-wrap">
              <button id="reader-back-btn" class="text-harbor hover:underline flex items-center gap-1 cursor-pointer font-semibold">
                <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Manuals</span>
              </button>
              <span class="text-line">/</span>
              <span>${escapeHtml(live?.title || 'Algebra I Technical Guide')}</span>
              <span class="text-line">/</span>
              <span class="text-ink font-semibold">${escapeHtml(readerTitle)}</span>
            </div>

            <!-- Reader Utility Suite -->
            <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
              <!-- Focus Mode Toggle -->
              <button
                class="flex items-center gap-1.5 px-3 py-1 ${isFocus ? 'bg-lagoon text-white font-bold' : 'bg-panel hover:bg-paper text-ink'} rounded-lg border border-line transition-colors cursor-pointer text-xs font-semibold shadow-xs"
                id="toggle-focus-mode-btn"
                type="button"
                title="Toggle distraction-free reading"
              >
                <span class="material-symbols-outlined text-[15px]">${isFocus ? 'fullscreen_exit' : 'fullscreen'}</span>
                <span>${isFocus ? 'Exit Focus' : 'Focus'}</span>
              </button>

              <!-- Font Scale Adjuster -->
              <div aria-label="Typography Scale" class="flex items-center bg-panel rounded-lg p-0.5 border border-line">
                <button class="px-2.5 py-1 text-ink hover:bg-paper rounded transition-colors cursor-pointer font-bold text-xs" id="btn-font-decrease" title="Decrease font size" type="button">
                  A−
                </button>
                <span class="px-2 text-outline text-[11px] font-mono font-bold" id="current-text-scale">${currentScale}</span>
                <button class="px-2.5 py-1 text-ink hover:bg-paper rounded transition-colors cursor-pointer font-bold text-xs" id="btn-font-increase" title="Increase font size" type="button">
                  A+
                </button>
              </div>

              <!-- Highlighting Tool Toggle -->
              <button
                id="toggle-highlight-tool-btn"
                class="flex items-center gap-1.5 px-3 py-1 ${isHighlightToolActive ? 'bg-[#FFFBEB] text-[#D97706] font-bold border-[#FDE68A]' : 'bg-panel hover:bg-paper text-ink border-line'} rounded-lg border transition-colors cursor-pointer text-xs font-semibold"
                type="button"
                title="Text highlighter"
              >
                <span class="material-symbols-outlined text-[15px] text-[#F59E0B]">brush</span>
                <span>Highlight (${state.highlights.length})</span>
              </button>

              <!-- Bookmarks Drawer Button -->
              <button
                id="toggle-bookmarks-btn"
                class="flex items-center gap-1.5 px-3 py-1 bg-panel hover:bg-paper text-ink rounded-lg border border-line transition-colors cursor-pointer text-xs font-semibold"
                type="button"
                title="Manage bookmarks"
              >
                <span class="material-symbols-outlined text-[15px] text-[#FF4757]">bookmark</span>
                <span>Bookmarks (${state.bookmarks.length})</span>
              </button>

              <!-- Progress Indicator with Slider -->
              <div class="hidden md:flex items-center gap-2 px-3 py-1 bg-panel rounded-lg border border-line text-ink font-mono tabular-nums text-xs">
                <span class="material-symbols-outlined text-[15px] text-lagoon">auto_stories</span>
                <span id="reading-pct-label">${progressPercent}% read</span>
                <input
                  type="range"
                  id="reading-slider"
                  min="0"
                  max="100"
                  value="${progressPercent}"
                  class="w-16 h-1 accent-[#FF4757] cursor-pointer"
                />
              </div>

              <!-- Read Aloud TTS Tool -->
              <button
                id="read-aloud-btn"
                class="flex items-center gap-1.5 px-3 py-1 bg-panel hover:bg-paper text-ink rounded-lg border border-line transition-colors cursor-pointer text-xs font-semibold"
                type="button"
                title="Read aloud chapter content"
              >
                <span class="material-symbols-outlined text-[15px] text-[#0284C7]">volume_up</span>
                <span class="hidden lg:inline">Read Aloud</span>
              </button>

              <!-- Dyslexia / High Contrast Accessibility Toggle -->
              <button
                id="toggle-accessibility-btn"
                class="flex items-center gap-1.5 px-3 py-1 bg-panel hover:bg-paper text-ink rounded-lg border border-line transition-colors cursor-pointer text-xs font-semibold"
                type="button"
                title="Toggle Dyslexia font and High Contrast"
              >
                <span class="material-symbols-outlined text-[15px] text-[#10B981]">visibility</span>
                <span class="hidden lg:inline">A11y Mode</span>
              </button>

              <!-- Notes Toggle Button -->
              <button
                class="flex items-center gap-1.5 px-3 py-1 ${isNotesOpen ? 'bg-harbor text-white font-bold' : 'bg-panel hover:bg-paper text-ink'} rounded-lg border border-line transition-colors cursor-pointer shadow-xs text-xs font-semibold"
                id="discuss-toggle-top"
                type="button"
              >
                <span class="material-symbols-outlined text-[15px] ${isNotesOpen ? 'text-white' : 'text-harbor'}">chat_bubble_outline</span>
                <span>Notes (${state.discussions.length})</span>
              </button>
            </div>
          </div>

          <!-- Vibrant Hero Banner -->
          <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071E2D] via-[#0C2A3F] to-[#122E42] text-white p-6 sm:p-7 shadow-lg border border-[#1E435E] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div class="space-y-2 max-w-2xl">
              <div class="flex items-center gap-2 text-xs font-mono">
                <span class="px-2.5 py-0.5 rounded-full bg-[#FF4757] text-white font-bold text-[10px] uppercase tracking-wider">Interactive eBook Edition</span>
                <span class="text-gray-300">·</span>
                <span class="text-[#38BDF8]">${currentChapter.readingTime} read</span>
                <span class="text-gray-300">·</span>
                <span>Chapter ${currentChapter.num}</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline leading-tight">
                ${currentChapter.title}
              </h1>
              <p class="text-xs sm:text-sm text-gray-300 leading-relaxed">
                ${currentChapter.subtitle}
              </p>
            </div>

            <!-- Quick Bookmark Action -->
            <div class="flex items-center gap-3 shrink-0">
              <button id="add-bookmark-quick-btn" class="btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm">
                <span class="material-symbols-outlined text-[16px]">bookmark_add</span>
                <span>Bookmark Page</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      <!-- Main Three-Column Reader Workspace -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div class="flex flex-col ${isFocus ? 'items-center' : 'lg:flex-row items-start gap-6 xl:gap-8'}">
          
          <!-- LEFT COLUMN: Table of Contents & Chapter Navigation -->
          ${!isFocus ? `
            <aside class="w-full lg:w-48 xl:w-60 shrink-0 sticky top-24 self-start bg-white border border-line rounded-2xl p-4 shadow-xs space-y-4">
              <div class="text-xs uppercase tracking-wider text-outline font-semibold font-mono pb-2 border-b border-line flex items-center justify-between">
                <span>Chapters</span>
                <span class="text-lagoon font-bold font-mono">${bookChaptersList.length}</span>
              </div>

              <nav class="space-y-1 text-xs">
                ${bookChaptersList.map(ch => {
                  const isActive = ch.id === currentChapter.id;
                  return `
                    <button
                      class="chapter-jump-btn w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-[#FFF0F3] text-[#FF4757] font-bold border border-[#FFCCD5] shadow-2xs'
                          : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                      }"
                      data-chapter-id="${ch.id}"
                    >
                      <span class="truncate">${ch.num}. ${ch.title}</span>
                      <span class="text-[10px] font-mono shrink-0">${ch.readingTime}</span>
                    </button>
                  `;
                }).join('')}
              </nav>

              <!-- Sections of Active Chapter -->
              <div class="pt-3 border-t border-line space-y-1.5">
                <span class="text-[11px] uppercase tracking-wider text-[#64748B] font-bold font-mono block">Subsections:</span>
                ${currentChapter.sections.map(sec => `
                  <a href="#${sec.id}" class="block text-xs text-[#0F172A] hover:text-[#FF4757] hover:underline py-1 truncate">
                    ${sec.title}
                  </a>
                `).join('')}
              </div>
            </aside>
          ` : ''}

          <!-- CENTER COLUMN: Reading Content (65ch measure) -->
          <article class="flex-1 max-w-[65ch] w-full mx-auto text-ink space-y-6 leading-relaxed ${bodyTextClass}" id="manual-text-container">
            ${live?.body_html ? `
            <div class="space-y-1 pb-3 border-b border-line">
              <span class="text-xs uppercase tracking-wider text-harbor font-semibold font-mono">Live class manual</span>
              <h2 class="text-xl sm:text-2xl font-bold text-ink tracking-tight">${escapeHtml(live.title)}</h2>
            </div>
            <div class="text-on-surface-variant space-y-3">${live.body_html}</div>
            ` : `
            <div class="space-y-1 pb-3 border-b border-line" id="s4-1">
              <span class="text-xs uppercase tracking-wider text-harbor font-semibold font-mono">Section 4.1 · Core Exposition</span>
              <h2 class="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                Slope-Intercept Form: Analytical Formulation
              </h2>
              <div class="text-xs text-outline font-mono">Author: Dr. Elena Martinez · Department of Mathematics</div>
            </div>

            <p class="text-on-surface-variant">
              The <strong class="text-[#0F172A]">slope-intercept equation</strong> represents the most universally utilized representation of non-vertical linear relations in Cartesian geometry. Given an inclination rate <span class="font-mono font-semibold text-harbor">m</span> and vertical coordinate intercept <span class="font-mono font-semibold text-harbor">(0, b)</span>, every point <span class="font-mono">(x, y)</span> on the path satisfies:
            </p>

            <!-- Formal Equation Box -->
            <div class="p-6 bg-panel/50 border border-line rounded-2xl text-center space-y-2 card-depth-1">
              <div class="font-mono font-bold text-2xl text-ink tracking-wider">
                y = mx + b
              </div>
              <p class="text-xs text-outline font-mono">
                Theorem 4.2.1 — Standard Slope-Intercept Canonical Formulation
              </p>
            </div>

            <h3 class="text-lg font-bold text-ink pt-2" id="s4-2">
              Section 4.2 · Standard Form &amp; Negative Sign Isolation
            </h3>

            <p class="text-on-surface-variant">
              A prevalent algebraic misconception in high school Algebra occurs when isolating <span class="font-mono font-bold">y</span> from standard form <span class="font-mono font-bold">Ax + By = C</span> when the coefficient <span class="font-mono">B</span> is negative:
            </p>

            <div class="p-4 rounded-2xl bg-[#FFF0F3] border border-[#FFCCD5] space-y-2 text-xs font-mono">
              <div class="font-bold text-[#FF4757]">Canonical Proof Steps for 2x - 5y = 20:</div>
              <div>Step 1: Subtract 2x from both sides  ⟹  -5y = -2x + 20</div>
              <div>Step 2: Divide all terms by -5  ⟹  y = (-2 / -5)x + (20 / -5)</div>
              <div>Step 3: Simplify negative signs  ⟹  <strong>y = (2/5)x - 4</strong> (Notice the slope is positive +2/5!)</div>
            </div>

            <h3 class="text-lg font-bold text-ink pt-2" id="s4-3">
              Section 4.3 · Perpendicular Reciprocal Vector Derivation
            </h3>

            <p class="text-on-surface-variant">
              Two non-vertical lines <span class="font-mono font-bold">L₁</span> and <span class="font-mono font-bold">L₂</span> are perpendicular (<span class="font-mono">L₁ ⊥ L₂</span>) if and only if their slopes satisfy <span class="font-mono font-bold">m₁ · m₂ = -1</span>. Consequently, each slope is the opposite reciprocal of the other.
            </p>
            `}

            <!-- Chapter Pagination Controls -->
            <div class="pt-8 border-t border-line flex items-center justify-between gap-4 font-mono text-xs">
              ${prevChapter ? `
                <button class="chapter-jump-btn btn-secondary-3d px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer" data-chapter-id="${prevChapter.id}">
                  <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Previous: Chapter ${prevChapter.num}</span>
                </button>
              ` : `<div></div>`}

              ${nextChapter ? `
                <button class="chapter-jump-btn btn-primary-3d px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-sm" data-chapter-id="${nextChapter.id}">
                  <span>Next: Chapter ${nextChapter.num}</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              ` : `<div></div>`}
            </div>

          </article>

          <!-- RIGHT COLUMN: Notes & Highlights Desk -->
          ${!isFocus && isNotesOpen ? `
            <aside class="w-full lg:w-72 xl:w-80 shrink-0 sticky top-24 self-start bg-white border border-line rounded-2xl p-4 shadow-xs space-y-4">
              <div class="flex items-center justify-between pb-2 border-b border-line text-xs">
                <span class="font-bold text-[#0F172A] font-mono uppercase">Margin Annotations</span>
                <span class="text-xs text-[#64748B] font-mono">${state.discussions.length} notes</span>
              </div>

              <!-- Notes Stream -->
              <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                ${state.discussions.map(d => `
                  <div class="p-3 rounded-xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-1 text-xs">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-[#0F172A]">${d.author}</span>
                      <span class="text-[10px] text-[#64748B] font-mono">${d.timeAgo}</span>
                    </div>
                    <p class="text-[#475569] leading-relaxed">${d.content}</p>
                  </div>
                `).join('')}
              </div>

              <!-- Add Note Form -->
              <div class="pt-2 border-t border-line space-y-2">
                <textarea
                  id="new-note-text"
                  placeholder="Annotate chapter theorem or write study question..."
                  class="w-full p-2.5 rounded-xl border border-[#CBD5E1] text-xs font-sans resize-none focus:outline-none focus:border-[#FF4757]"
                  rows="3"
                ></textarea>
                <button id="submit-note-btn" class="btn-primary-3d w-full py-2 rounded-xl text-xs font-bold cursor-pointer shadow-xs">
                  Post Study Note
                </button>
              </div>
            </aside>
          ` : ''}

        </div>
      </div>

      <!-- Bookmarks Manager Modal -->
      ${isBookmarkModalOpen ? renderBookmarksModal() : ''}

    </div>
  `;
}

function renderBookmarksModal(): string {
  return `
    <div class="fixed inset-0 z-50 bg-[#071E2D]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="relative w-full max-w-xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-6 space-y-4 animate-fade-rise">
        <div class="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#FF4757] text-[20px]">bookmark</span>
            <h3 class="text-base font-bold text-[#0F172A] font-headline">Interactive eBook Bookmarks (${state.bookmarks.length})</h3>
          </div>
          <button id="close-dialog-btn" class="w-8 h-8 rounded-lg hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="space-y-3">
          ${state.bookmarks.map(bm => `
            <div class="p-3.5 rounded-2xl bg-[#FAFBFC] border border-[#E2E8F0] space-y-1 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-[#0F172A]">${bm.title}</span>
                <span class="font-mono text-[10px] text-[#64748B]">Page ${bm.page} · ${bm.createdAt}</span>
              </div>
              <p class="text-[#64748B]">${bm.note}</p>
              <div class="flex items-center justify-between pt-1 text-[11px] font-mono">
                <span class="text-[#0284C7]">${bm.chapterTitle}</span>
                <button class="remove-bookmark-btn text-[#EF4444] hover:underline cursor-pointer" data-bmid="${bm.id}">
                  Remove
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="pt-3 border-t border-[#E2E8F0] flex justify-end">
          <button id="close-dialog-btn-2" class="btn-navy-3d px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindManualReaderEvents(container: HTMLElement): void {
  container.querySelector('#reader-back-btn')?.addEventListener('click', () => setScreen('manuals'));

  // Toggle notes
  container.querySelector('#discuss-toggle-top')?.addEventListener('click', () => {
    state.manualNotesOpen = !state.manualNotesOpen;
    notify();
  });

  // Toggle Focus Mode
  container.querySelector('#toggle-focus-mode-btn')?.addEventListener('click', () => {
    state.manualFocusMode = !state.manualFocusMode;
    showToast(state.manualFocusMode ? 'Focus Mode active: Full-width distraction-free view' : 'Standard 3-column desk restored', 'fullscreen');
    notify();
  });

  // Reading progress slider
  const slider = container.querySelector('#reading-slider') as HTMLInputElement;
  slider?.addEventListener('input', () => {
    const val = parseInt(slider.value, 10);
    state.manualReadingProgress = val;
    const fill = container.querySelector('#reading-progress-fill') as HTMLElement;
    const label = container.querySelector('#reading-pct-label');
    if (fill) fill.style.width = `${val}%`;
    if (label) label.textContent = `${val}% read`;
  });

  // Chapter Jump
  container.querySelectorAll('.chapter-jump-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const chId = (e.currentTarget as HTMLElement).getAttribute('data-chapter-id');
      if (chId) {
        void noteManualChapterTime(chId);
        state.manualActiveChapterId = chId;
        showToast(`Jumped to Chapter § ${chId.toUpperCase()}`, 'menu_book');
        notify();
      }
    });
  });

  // Bookmarks Dialog
  container.querySelector('#toggle-bookmarks-btn')?.addEventListener('click', () => {
    state.activeDialog = 'ebook-bookmarks';
    notify();
  });

  container.querySelector('#add-bookmark-quick-btn')?.addEventListener('click', () => {
    state.bookmarks.push({
      id: 'bm-' + Date.now(),
      chapterId: state.manualActiveChapterId || 'ch4',
      chapterTitle: 'Chapter 04: Slope Dynamics',
      page: 126,
      title: 'Perpendicular Reciprocal Proof Section',
      note: 'Bookmarked for checkpoint derivation review',
      createdAt: 'Just now'
    });
    showToast('Bookmarked current chapter section', 'bookmark_add');
    notify();
  });

  container.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-bmid');
      state.bookmarks = state.bookmarks.filter(b => b.id !== id);
      showToast('Removed bookmark', 'delete');
      notify();
    });
  });

  container.querySelectorAll('#close-dialog-btn, #close-dialog-btn-2').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeDialog = null;
      notify();
    });
  });

  // Highlight tool
  container.querySelector('#toggle-highlight-tool-btn')?.addEventListener('click', () => {
    state.highlights.push({
      id: 'hl-' + Date.now(),
      chapterId: state.manualActiveChapterId || 'ch4',
      text: 'Two non-vertical lines are perpendicular if and only if m1 * m2 = -1.',
      color: 'yellow',
      createdAt: 'Just now'
    });
    showToast('Applied yellow study highlight to key theorem', 'brush');
    notify();
  });

  // Typography zoom
  const btnDec = container.querySelector('#btn-font-decrease');
  const btnInc = container.querySelector('#btn-font-increase');
  const currentScaleEl = container.querySelector('#current-text-scale');
  const textContainer = container.querySelector('#manual-text-container');

  const updateFontScale = (idx: number) => {
    state.manualFontScaleIndex = Math.max(0, Math.min(fontScales.length - 1, idx));
    if (currentScaleEl) currentScaleEl.textContent = fontScales[state.manualFontScaleIndex];
    if (textContainer) {
      fontClasses.forEach(cls => textContainer.classList.remove(cls));
      textContainer.classList.add(fontClasses[state.manualFontScaleIndex]);
    }
    showToast(`Typography zoom: ${fontScales[state.manualFontScaleIndex]}`, 'format_size');
  };

  btnDec?.addEventListener('click', () => updateFontScale(state.manualFontScaleIndex - 1));
  btnInc?.addEventListener('click', () => updateFontScale(state.manualFontScaleIndex + 1));

  container.querySelector('#submit-note-btn')?.addEventListener('click', async () => {
    const noteText = container.querySelector('#new-note-text') as HTMLTextAreaElement;
    const val = noteText?.value.trim();
    if (!val) return;
    try {
      await postLiveDiscussion(val);
      showToast('Note posted to the class handbook thread', 'forum');
      notify();
    } catch (err) {
      state.discussions = [
        {
          id: 'd-' + Date.now(),
          author: displayName() || 'You',
          role: 'student',
          avatarInitials: (displayName() || 'Y').slice(0, 2).toUpperCase(),
          timeAgo: 'Just now',
          content: val,
        },
        ...state.discussions,
      ];
      showToast(err instanceof Error ? err.message : 'Saved locally until launch is live', 'forum');
      notify();
    }
  });

  // Read Aloud simulation
  container.querySelector('#read-aloud-btn')?.addEventListener('click', () => {
    showToast('Read-Aloud Active: Playing synthesized audio for Chapter 04 (Rate: 1.0x)', 'volume_up');
  });

  // Accessibility toggle
  let a11yActive = false;
  container.querySelector('#toggle-accessibility-btn')?.addEventListener('click', () => {
    a11yActive = !a11yActive;
    if (a11yActive) {
      showToast('Dyslexia-friendly high-contrast readability mode activated', 'visibility');
    } else {
      showToast('Standard editorial typography mode restored', 'visibility_off');
    }
  });
}
