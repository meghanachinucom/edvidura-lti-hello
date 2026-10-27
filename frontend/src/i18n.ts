import { INDIA_REWRITE } from './i18n-india';
import { phrasesFor } from './i18n-catalog';
import { notify, state } from './state';

const LOCALE_KEY = 'edvidura_locale';

export type AppLanguage = {
  code: string;
  name: string;
  native: string;
  state: string;
  langAttr: string;
};

export const APP_LANGUAGES: AppLanguage[] = [
  { code: 'en-IN', name: 'English', native: 'English', state: 'India (default)', langAttr: 'en-IN' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', state: 'Andhra Pradesh & Telangana', langAttr: 'te-IN' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', state: 'Hindi belt (UP, MP, RJ, BR, DL…)', langAttr: 'hi-IN' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்', state: 'Tamil Nadu & Puducherry', langAttr: 'ta-IN' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', state: 'Karnataka', langAttr: 'kn-IN' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം', state: 'Kerala', langAttr: 'ml-IN' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी', state: 'Maharashtra', langAttr: 'mr-IN' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી', state: 'Gujarat', langAttr: 'gu-IN' },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা', state: 'West Bengal & Tripura', langAttr: 'bn-IN' },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', state: 'Punjab', langAttr: 'pa-IN' },
  { code: 'or-IN', name: 'Odia', native: 'ଓଡ଼ିଆ', state: 'Odisha', langAttr: 'or-IN' },
  { code: 'as-IN', name: 'Assamese', native: 'অসমীয়া', state: 'Assam', langAttr: 'as-IN' },
  { code: 'ur-IN', name: 'Urdu', native: 'اردو', state: 'Jammu & Kashmir', langAttr: 'ur-IN' },
];

const VALID = new Set(APP_LANGUAGES.map(l => l.code));

function sortedPairs(map: Record<string, string> | Array<[string, string]>): Array<[string, string]> {
  const entries = Array.isArray(map) ? map : Object.entries(map);
  return entries.slice().sort((a, b) => b[0].length - a[0].length);
}

const INDIA_PAIRS = sortedPairs(INDIA_REWRITE);

function applyPairs(input: string, pairs: Array<[string, string]>): string {
  let out = input;
  for (const [from, to] of pairs) {
    if (!from || from === to) continue;
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

export function getLocale(): string {
  return VALID.has(state.locale) ? state.locale : 'en-IN';
}

export function languageMeta(code = getLocale()): AppLanguage {
  return APP_LANGUAGES.find(l => l.code === code) || APP_LANGUAGES[0];
}

export function initLocale(): void {
  let stored = '';
  try {
    stored = sessionStorage.getItem(LOCALE_KEY) || localStorage.getItem(LOCALE_KEY) || '';
  } catch {
    stored = '';
  }
  state.locale = VALID.has(stored) ? stored : 'en-IN';
  applyDocumentLang();
}

export function setLocale(code: string, opts: { userPicked?: boolean } = {}): void {
  const next = VALID.has(code) ? code : 'en-IN';
  state.locale = next;
  state.chatLanguage = next;
  try {
    localStorage.setItem(LOCALE_KEY, next);
    sessionStorage.setItem(LOCALE_KEY, next);
    if (opts.userPicked) sessionStorage.setItem('edvidura_locale_user', '1');
  } catch {
    /* ignore quota */
  }
  applyDocumentLang();
  notify();
}

export function applyDocumentLang(): void {
  const meta = languageMeta();
  document.documentElement.lang = meta.langAttr;
  document.documentElement.setAttribute('data-locale', meta.code);
  document.title =
    meta.code === 'en-IN'
      ? 'EdVidura — Class 8 Mathematics · Andhra Pradesh'
      : localizeText('EdVidura — Class 8 Mathematics · Andhra Pradesh');
}

export function localizeText(input: string): string {
  if (!input) return input;
  const india = applyPairs(input, INDIA_PAIRS);
  const locale = getLocale();
  if (locale === 'en-IN') return india;
  return applyPairs(india, sortedPairs(phrasesFor(locale)));
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'SVG', 'PATH']);

function skipNode(node: Node): boolean {
  let el = node instanceof Element ? node : node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute('data-no-i18n')) return true;
    el = el.parentElement;
  }
  return false;
}

function looksMath(text: string): boolean {
  return text.length < 48 && /[=√∑∫π]/.test(text) && /[xyzm]/.test(text.toLowerCase());
}

export function applyI18n(root: ParentNode = document.body): void {
  applyDocumentLang();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    texts.push(current as Text);
    current = walker.nextNode();
  }
  for (const node of texts) {
    if (skipNode(node)) continue;
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) continue;
    if (looksMath(raw)) continue;
    const next = localizeText(raw);
    if (next !== raw) node.nodeValue = next;
  }

  const attrs = ['placeholder', 'title', 'aria-label', 'alt'];
  const elements = root.querySelectorAll<HTMLElement>(
    '[placeholder],[title],[aria-label],[alt]'
  );
  elements.forEach(el => {
    if (skipNode(el)) return;
    attrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (!val) return;
      const next = localizeText(val);
      if (next !== val) el.setAttribute(attr, next);
    });
  });
}

export function renderLanguageSelect(id: string, extraClass = ''): string {
  const current = getLocale();
  const options = APP_LANGUAGES.map(
    l =>
      `<option value="${l.code}" ${l.code === current ? 'selected' : ''}>${l.native} · ${l.state}</option>`
  ).join('');
  return `
    <label class="flex items-center gap-1.5 min-w-0 ${extraClass}" data-no-i18n title="Language">
      <span class="material-symbols-outlined text-[16px] text-[#64748B] shrink-0">translate</span>
      <select
        id="${id}"
        data-no-i18n
        class="max-w-[11rem] sm:max-w-[14rem] truncate bg-transparent border border-[#E2E8F0] rounded-lg px-2 py-1 text-[11px] sm:text-xs text-[#0F172A] outline-none cursor-pointer focus:border-[#FF4757]"
        aria-label="Language"
      >
        ${options}
      </select>
    </label>
  `;
}

export function bindLanguageSelect(container: HTMLElement, id: string): void {
  const el = container.querySelector(`#${id}`) as HTMLSelectElement | null;
  el?.addEventListener('change', () => {
    if (el.value) setLocale(el.value, { userPicked: true });
  });
}
