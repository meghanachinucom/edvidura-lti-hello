/** Browser STT / TTS for Ask Vidura (Telugu-first on the government tenant). */

export function speak(text: string, lang = 'te-IN'): void {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voices = window.speechSynthesis.getVoices() || [];
  const hit = voices.find(v => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (hit) u.voice = hit;
  window.speechSynthesis.speak(u);
}

export function stopSpeak(): void {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

type Recog = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function listenOnce(
  lang: string,
  onText: (text: string) => void,
  onEnd: () => void
): (() => void) | null {
  const Ctor =
    (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition ||
    (window as unknown as { SpeechRecognition?: new () => Recog }).SpeechRecognition;
  if (!Ctor) {
    onEnd();
    return null;
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = false;
  rec.onresult = ev => {
    const text = ev.results?.[0]?.[0]?.transcript || '';
    if (text) onText(text);
  };
  rec.onerror = () => onEnd();
  rec.onend = () => onEnd();
  rec.start();
  return () => rec.stop();
}
