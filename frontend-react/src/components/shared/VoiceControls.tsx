import { useEffect, useRef, useState } from "react";
import { Globe, Mic, MicOff, Square, Volume2 } from "lucide-react";
import { getLocaleBcp47, SUPPORTED_LOCALES, useLocale, type Locale } from "@/i18n";
import { api } from "@/lib/api";

/** Language Selector Dropdown for TopNav and Reader/Coach */
export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <Globe aria-hidden size={16} className="text-ink-muted" />
      <label htmlFor="edvidura-lang-select" className="sr-only">
        Interface & Voice Language
      </label>
      <select
        id="edvidura-lang-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink shadow-sm hover:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        title="Select Interface and Voice Language"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native} ({l.name})
          </option>
        ))}
      </select>
    </div>
  );
}

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  lang?: string;
  className?: string;
  disabled?: boolean;
}

/** Microphone input button using Web Speech Recognition + FreeFlow AI cleanup */
export function VoiceInputButton({
  onTranscript,
  lang,
  className = "",
  disabled = false,
}: VoiceInputButtonProps) {
  const { locale } = useLocale();
  const bcp47 = lang || getLocaleBcp47(locale);
  const [listening, setListening] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleListen = () => {
    if (listening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.lang = bcp47;
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setListening(true);
    };

    rec.onresult = async (event: any) => {
      const raw = event.results?.[0]?.[0]?.transcript || "";
      if (!raw) return;

      setListening(false);
      setCleaning(true);

      try {
        // FreeFlow AI voice cleanup call
        const res = await api.post<{
          ok?: boolean;
          data?: { cleaned?: string };
          cleaned?: string;
        }>("/api/v1/app/voice/cleanup", {
          transcript: raw,
          language: bcp47,
        });
        const cleanedText = res.data?.cleaned || res.cleaned || raw;
        onTranscript(cleanedText);
      } catch {
        onTranscript(raw);
      } finally {
        setCleaning(false);
      }
    };

    rec.onerror = () => {
      setListening(false);
      setCleaning(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListen}
      disabled={disabled || cleaning}
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
        listening
          ? "bg-rose-600 text-white animate-pulse"
          : cleaning
            ? "bg-amber-100 text-amber-900 border border-amber-300"
            : "bg-surface border border-border text-ink hover:bg-highlight"
      } ${className}`}
      title={
        listening
          ? "Listening... Click to stop"
          : cleaning
            ? "Cleaning audio with smart voice filter..."
            : `Speak in ${bcp47}`
      }
      aria-label={listening ? "Stop microphone" : "Speak question"}
      aria-pressed={listening}
    >
      {listening ? (
        <>
          <MicOff aria-hidden size={14} />
          <span>Listening...</span>
        </>
      ) : cleaning ? (
        <>
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping mr-1" />
          <span>Polishing...</span>
        </>
      ) : (
        <>
          <Mic aria-hidden size={14} className="text-brand" />
          <span>Voice ({bcp47.split("-")[0].toUpperCase()})</span>
        </>
      )}
    </button>
  );
}

interface VoiceListenButtonProps {
  text: string;
  lang?: string;
  className?: string;
  rate?: number;
}

/** Text-to-speech playback button for read-aloud */
export function VoiceListenButton({
  text,
  lang,
  className = "",
  rate = 1.0,
}: VoiceListenButtonProps) {
  const { locale } = useLocale();
  const bcp47 = lang || getLocaleBcp47(locale);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, " ").trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = bcp47;
    utterance.rate = rate;

    // Pick best voice for the language if available
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(
      (v) => v.lang.startsWith(bcp47) || v.lang.startsWith(bcp47.split("-")[0]),
    );
    if (match) utterance.voice = match;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={toggleSpeak}
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium transition-colors ${
        speaking
          ? "bg-brand text-white"
          : "bg-surface border border-border text-ink hover:bg-highlight"
      } ${className}`}
      title={speaking ? "Stop read-aloud" : `Listen in ${bcp47}`}
      aria-label={speaking ? "Stop read-aloud" : "Listen aloud"}
      aria-pressed={speaking}
    >
      {speaking ? (
        <>
          <Square aria-hidden size={13} fill="currentColor" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 aria-hidden size={14} className="text-brand" />
          <span>Listen</span>
        </>
      )}
    </button>
  );
}
