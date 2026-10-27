import { state } from './state';
import { escapeHtml } from './boot';

export function emptyPanel(title: string, detail: string): string {
  return `
    <div class="flex-1 w-full bg-[#FAFBFC]">
      <div class="max-w-xl mx-auto px-4 py-20 text-center space-y-3">
        <h1 class="text-2xl font-bold text-[#0F172A] font-headline">${escapeHtml(title)}</h1>
        <p class="text-sm text-[#64748B]">${escapeHtml(detail)}</p>
      </div>
    </div>
  `;
}

export function launchRequired(): string {
  return emptyPanel(
    'Launch required',
    state.apiError ||
      'Open EdVidura from Moodle (LTI) or /dev/client-launch so this screen can load class data from the API.'
  );
}

export function needsApi(): boolean {
  return !state.connected;
}
