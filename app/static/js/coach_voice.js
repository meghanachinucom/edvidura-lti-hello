/**
 * Study coach voice: mic (STT) + speak answer (TTS) via Web Speech API.
 * Language select drives BCP-47 tags for Indian locales (hi-IN, te-IN, ta-IN, …).
 */
(function () {
  var STORAGE_KEY = "edvidura.coach.voice_lang";

  function $(id) {
    return document.getElementById(id);
  }

  function selectedLang() {
    var sel = $("coach-voice-lang");
    return (sel && sel.value) || "en-IN";
  }

  function setStatus(msg, isErr) {
    var el = $("coach-voice-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isErr ? "var(--error)" : "var(--outline)";
  }

  function persistLang() {
    try {
      localStorage.setItem(STORAGE_KEY, selectedLang());
    } catch (e) {}
  }

  function restoreLang() {
    var sel = $("coach-voice-lang");
    if (!sel) return;
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === saved) {
            sel.value = saved;
            break;
          }
        }
      }
    } catch (e) {}
  }

  function SpeechRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  var recognition = null;
  var listening = false;

  function stopListening() {
    if (recognition && listening) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    listening = false;
    var btn = $("coach-mic-btn");
    if (btn) {
      btn.setAttribute("aria-pressed", "false");
      btn.classList.remove("coach-mic-on");
      var icon = btn.querySelector(".material-symbols-outlined");
      if (icon) icon.textContent = "mic";
    }
  }

  function startListening() {
    var Ctor = SpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("Voice input needs Chrome or Edge on this device.", true);
      return;
    }
    var ta = $("coach-question");
    if (!ta) return;

    stopListening();
    recognition = new Ctor();
    recognition.lang = selectedLang();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
      listening = true;
      var btn = $("coach-mic-btn");
      if (btn) {
        btn.setAttribute("aria-pressed", "true");
        btn.classList.add("coach-mic-on");
        var icon = btn.querySelector(".material-symbols-outlined");
        if (icon) icon.textContent = "mic_off";
      }
      setStatus("Listening… speak in " + selectedLang());
    };

    recognition.onerror = function (ev) {
      var err = (ev && ev.error) || "error";
      if (err === "not-allowed") {
        setStatus("Microphone permission blocked. Allow mic for this site.", true);
      } else if (err === "no-speech") {
        setStatus("No speech heard. Try again.", true);
      } else if (err !== "aborted") {
        setStatus("Voice input error: " + err, true);
      }
      stopListening();
    };

    recognition.onend = function () {
      listening = false;
      var btn = $("coach-mic-btn");
      if (btn) {
        btn.setAttribute("aria-pressed", "false");
        btn.classList.remove("coach-mic-on");
        var icon = btn.querySelector(".material-symbols-outlined");
        if (icon) icon.textContent = "mic";
      }
      if ($("coach-voice-status") && /Listening/.test($("coach-voice-status").textContent || "")) {
        setStatus("");
      }
    };

    recognition.onresult = function (ev) {
      var transcript = "";
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        transcript += ev.results[i][0].transcript;
      }
      transcript = (transcript || "").trim();
      if (!transcript) return;
      var final = ev.results[ev.results.length - 1].isFinal;
      if (final) {
        ta.value = (ta.value ? ta.value.replace(/\s+$/, "") + " " : "") + transcript;
        ta.focus();
        setStatus("Captured. Review and press Ask.");
      } else {
        setStatus(transcript);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      setStatus("Could not start microphone.", true);
      stopListening();
    }
  }

  function toggleMic() {
    if (listening) {
      stopListening();
      setStatus("");
      return;
    }
    startListening();
  }

  function speakAnswer() {
    if (!window.speechSynthesis) {
      setStatus("Speech playback not supported in this browser.", true);
      return;
    }
    var textEl = $("coach-answer-text");
    var text = textEl ? (textEl.textContent || "").trim() : "";
    if (!text) {
      setStatus("Ask a question first, then use Speak.", true);
      return;
    }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = selectedLang();
    // Prefer a matching voice when the OS/browser has one installed.
    try {
      var voices = window.speechSynthesis.getVoices() || [];
      var lang = selectedLang().toLowerCase();
      var langPrefix = lang.split("-")[0];
      var match =
        voices.find(function (v) {
          return (v.lang || "").toLowerCase() === lang;
        }) ||
        voices.find(function (v) {
          return (v.lang || "").toLowerCase().indexOf(langPrefix) === 0;
        });
      if (match) u.voice = match;
    } catch (e) {}
    u.onstart = function () {
      setStatus("Speaking…");
    };
    u.onend = function () {
      setStatus("");
    };
    u.onerror = function () {
      setStatus("Could not speak this answer.", true);
    };
    window.speechSynthesis.speak(u);
  }

  function stopSpeak() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setStatus("");
  }

  function init() {
    restoreLang();
    var sel = $("coach-voice-lang");
    if (sel) {
      sel.addEventListener("change", function () {
        persistLang();
        stopListening();
        stopSpeak();
        setStatus("Language: " + sel.value);
      });
    }
    var mic = $("coach-mic-btn");
    if (mic) mic.addEventListener("click", toggleMic);
    var speak = $("coach-speak-btn");
    if (speak) speak.addEventListener("click", speakAnswer);
    var stop = $("coach-speak-stop-btn");
    if (stop) stop.addEventListener("click", stopSpeak);

    // Chrome loads voices asynchronously.
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = function () {};
      try {
        window.speechSynthesis.getVoices();
      } catch (e) {}
    }

    if (!SpeechRecognitionCtor()) {
      setStatus("Mic needs Chrome/Edge. Speak still works where voices are installed.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
