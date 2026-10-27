import { state, notify, setScreen, showToast } from '../state';
import {
  addPravachanaNote,
  escapeHtml,
  openPravachana,
  savePravachanaProgress,
} from '../boot';
import { episodeTitle, packLabel } from '../pravachana-ui';
import { getLocale } from '../i18n';
import { speak, stopSpeak } from '../voice';

export function renderPravachanaPlayer(): string {
  const ep = state.livePravachanaDetail;
  if (!ep) {
    return `<div class="p-12 text-center text-[#64748B]">Select a pravachanam from the library.</div>`;
  }
  const start = ep.progress?.position_sec || 0;
  const theatre = state.pravachanaTheatre;
  const notes = state.livePravachanaNotes;
  const meaning = getLocale().startsWith('en') ? ep.meaning_en : ep.transcript_te;

  return `
    <div class="flex flex-col w-full bg-[#FAFBFC] ${theatre ? 'min-h-screen' : ''}">
      <section class="w-full bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-3 print:hidden">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <button id="prav-back" type="button" class="font-bold text-[#64748B] hover:text-[#0F172A] cursor-pointer flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            Library
          </button>
          <div class="flex items-center gap-2 font-mono text-[#64748B]">
            <span class="text-[#FF4757] font-bold">${packLabel(ep.pack)}</span>
            <span>·</span>
            <span>${escapeHtml(ep.series_title_te || ep.series_title_en || '')}</span>
            ${ep.demo ? '<span class="px-2 py-0.5 rounded bg-[#FF4757] text-white font-bold">DEMO CLIP</span>' : ''}
          </div>
        </div>
      </section>

      <section class="w-full ${theatre ? 'px-0' : 'px-4 sm:px-6 lg:px-8 pt-6'}">
        <div class="${theatre ? 'w-full' : 'max-w-7xl mx-auto'}">
          <div class="relative bg-black ${theatre ? 'min-h-[80vh]' : 'rounded-3xl overflow-hidden shadow-xl aspect-video'}">
            <video id="prav-video" class="w-full h-full ${theatre ? 'min-h-[80vh] object-contain' : 'object-cover'}"
              controls playsinline
              poster="${escapeHtml(ep.cover_url)}"
              src="${escapeHtml(ep.stream_url)}"
              data-start="${start}"></video>
          </div>
          ${
            theatre
              ? ''
              : `
          <div class="flex flex-wrap items-center gap-2 mt-4 print:hidden">
            <button id="prav-theatre" type="button" class="btn-navy-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Theatre</button>
            <button id="prav-speak" type="button" class="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-[#E2E8F0] cursor-pointer">Speak meaning</button>
            <button id="prav-print" type="button" class="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-[#E2E8F0] cursor-pointer">Print meaning</button>
            <button id="prav-share" type="button" class="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-[#E2E8F0] cursor-pointer">Copy link</button>
            <a id="prav-download" class="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-[#E2E8F0] cursor-pointer" href="${escapeHtml(ep.stream_url)}" target="_blank" rel="noreferrer">Open file</a>
            <button id="prav-ask" type="button" class="btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Ask Vidura</button>
            ${
              ep.prev
                ? `<button id="prav-prev" type="button" class="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] cursor-pointer">Previous</button>`
                : ''
            }
            ${
              ep.next
                ? `<button id="prav-next" type="button" class="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] cursor-pointer">Next</button>`
                : ''
            }
          </div>`
          }
          ${
            theatre
              ? `<div class="p-4 print:hidden"><button id="prav-theatre" type="button" class="btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Exit theatre</button></div>`
              : ''
          }
        </div>
      </section>

      <section class="w-full px-4 sm:px-6 lg:px-8 py-8 ${theatre ? 'hidden' : ''}" id="prav-meaning">
        <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          <article class="lg:col-span-7 bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs">
            <h1 class="text-2xl sm:text-3xl font-bold font-headline text-[#0F172A]">${escapeHtml(episodeTitle(ep))}</h1>
            <p class="mt-4 text-xl text-[#071E2D] font-headline leading-relaxed">${escapeHtml(ep.transcript_sa || '')}</p>
            <p class="mt-4 text-base text-[#334155] leading-relaxed">${escapeHtml(meaning || '')}</p>
            ${
              getLocale().startsWith('en')
                ? ''
                : `<p class="mt-4 text-sm text-[#64748B] leading-relaxed">${escapeHtml(ep.meaning_en || '')}</p>`
            }
            <p class="mt-6 text-xs text-[#94A3B8] font-mono">Placeholder clip — licensed Chaganti Gari media replaces this URL when the department provides it.</p>
          </article>
          <aside class="lg:col-span-5 flex flex-col gap-4">
            <div class="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-xs print:hidden">
              <h2 class="text-sm font-bold text-[#0F172A] mb-3">చర్చ · Notes</h2>
              <textarea id="prav-note" rows="3" class="w-full rounded-xl border border-[#E2E8F0] p-3 text-sm outline-none focus:border-[#FF4757]" placeholder="Share a reflection with the public audience"></textarea>
              <button id="prav-note-send" type="button" class="mt-2 btn-primary-3d px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Post note</button>
              <div class="mt-4 space-y-3 max-h-72 overflow-y-auto">
                ${
                  notes.length
                    ? notes
                        .map(
                          n => `
                  <div class="rounded-xl bg-[#F8FAFC] p-3">
                    <div class="text-[11px] font-bold text-[#071E2D]">${escapeHtml(n.author_name || 'Citizen')}</div>
                    <div class="text-sm text-[#334155] mt-1">${escapeHtml(n.body)}</div>
                  </div>`
                        )
                        .join('')
                    : `<p class="text-xs text-[#94A3B8]">No notes yet.</p>`
                }
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  `;
}

export function bindPravachanaPlayerEvents(container: HTMLElement): void {
  const ep = state.livePravachanaDetail;
  const video = container.querySelector('#prav-video') as HTMLVideoElement | null;
  let lastSent = 0;

  const flush = (forceComplete = false) => {
    if (!video) return;
    const dur = video.duration || ep?.duration_sec || 0;
    const pos = video.currentTime || 0;
    const done = forceComplete || (dur > 0 && pos / dur >= 0.9);
    void savePravachanaProgress(pos, dur, done);
  };

  if (video) {
    const start = Number(video.getAttribute('data-start') || 0);
    video.addEventListener('loadedmetadata', () => {
      if (start > 2 && start < (video.duration || 0) - 2) {
        video.currentTime = start;
      }
    });
    video.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - lastSent < 5000) return;
      lastSent = now;
      flush();
    });
    video.addEventListener('pause', () => flush());
    video.addEventListener('ended', () => flush(true));
  }

  container.querySelector('#prav-back')?.addEventListener('click', () => {
    stopSpeak();
    setScreen('pravachana-home');
  });
  container.querySelector('#prav-theatre')?.addEventListener('click', () => {
    state.pravachanaTheatre = !state.pravachanaTheatre;
    notify();
  });
  container.querySelector('#prav-speak')?.addEventListener('click', () => {
    const text = ep?.transcript_te || ep?.meaning_en || '';
    speak(text, getLocale());
  });
  container.querySelector('#prav-print')?.addEventListener('click', () => window.print());
  container.querySelector('#prav-share')?.addEventListener('click', async () => {
    const url = `${window.location.origin}${window.location.pathname}#player`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied — open after launch', 'link');
    } catch {
      showToast(url, 'link');
    }
  });
  container.querySelector('#prav-ask')?.addEventListener('click', () => setScreen('ask-vidura'));
  container.querySelector('#prav-prev')?.addEventListener('click', () => {
    if (ep?.prev?.id) void openPravachana(ep.prev.id);
  });
  container.querySelector('#prav-next')?.addEventListener('click', () => {
    if (ep?.next?.id) void openPravachana(ep.next.id);
  });
  container.querySelector('#prav-note-send')?.addEventListener('click', () => {
    const box = container.querySelector('#prav-note') as HTMLTextAreaElement | null;
    const text = (box?.value || '').trim();
    if (!text) return;
    void addPravachanaNote(text)
      .then(() => {
        if (box) box.value = '';
        showToast('Note posted', 'chat');
      })
      .catch(err => showToast(err instanceof Error ? err.message : 'Could not post', 'error'));
  });
}
