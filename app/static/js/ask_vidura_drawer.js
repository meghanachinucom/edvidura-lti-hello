/**
 * Ask Vidura right-side drawer — AJAX chat against /learn/coach/ask
 */
(function () {
  var fab = document.getElementById("askv-fab");
  var drawer = document.getElementById("askv-drawer");
  var backdrop = document.getElementById("askv-backdrop");
  var closeBtn = document.getElementById("askv-close");
  var form = document.getElementById("askv-form");
  var thread = document.getElementById("askv-thread");
  var statusEl = document.getElementById("askv-status");
  var qEl = document.getElementById("askv-question");
  var sendBtn = document.getElementById("askv-send");
  var langEl = document.getElementById("askv-lang");
  var chipsEl = document.getElementById("askv-chips");
  if (!fab || !drawer || !form) return;

  var STORAGE_OPEN = "edvidura.askv.open";
  var STORAGE_LANG = "edvidura.coach.voice_lang";
  var lastQuestion = "";
  var lastAnswer = "";

  function setOpen(open) {
    drawer.classList.toggle("is-open", !!open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    fab.classList.toggle("is-hidden", !!open);
    document.body.classList.toggle("askv-open", !!open);
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.classList.toggle("is-on", !!open);
    }
    try {
      localStorage.setItem(STORAGE_OPEN, open ? "1" : "0");
    } catch (e) {}
    if (open && qEl) qEl.focus();
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function addMsg(kind, html) {
    if (!thread) return;
    var div = document.createElement("div");
    div.className = "askv-msg askv-msg--" + kind;
    div.innerHTML = html;
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || "";
  }

  function tokenValue() {
    return (form.querySelector('input[name="token"]') || {}).value || "";
  }

  function loadShortcuts() {
    if (!chipsEl) return;
    var token = tokenValue();
    fetch("/learn/coach/shortcuts?token=" + encodeURIComponent(token), {
      headers: { Accept: "application/json" },
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (!d || !d.ok || !d.shortcuts || !d.shortcuts.length) return;
        chipsEl.innerHTML = "";
        d.shortcuts.forEach(function (s) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "askv-chip-btn";
          b.textContent = s.label || "Ask";
          b.addEventListener("click", function () {
            if (qEl) {
              qEl.value = s.prompt || "";
              qEl.focus();
            }
          });
          chipsEl.appendChild(b);
        });
        chipsEl.hidden = false;
      })
      .catch(function () {});
  }

  function addFeedbackBar(question, answer) {
    var bar = document.createElement("div");
    bar.className = "askv-feedback";
    bar.innerHTML =
      '<button type="button" data-r="up" title="Helpful">👍</button>' +
      '<button type="button" data-r="down" title="Not helpful">👎</button>' +
      '<span class="askv-feedback__st"></span>';
    bar.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var rating = btn.getAttribute("data-r");
        fetch("/learn/coach/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            token: tokenValue(),
            rating: rating,
            question: question,
            answer: answer,
          }),
        })
          .then(function (r) {
            return r.json();
          })
          .then(function (d) {
            var st = bar.querySelector(".askv-feedback__st");
            if (st) st.textContent = d.ok ? "Thanks" : "";
            bar.querySelectorAll("button").forEach(function (b) {
              b.disabled = true;
            });
          })
          .catch(function () {});
      });
    });
    if (thread) {
      thread.appendChild(bar);
      thread.scrollTop = thread.scrollHeight;
    }
  }

  fab.addEventListener("click", function () {
    setOpen(true);
  });
  if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });
  if (backdrop) backdrop.addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) setOpen(false);
  });

  try {
    var savedLang = localStorage.getItem(STORAGE_LANG);
    if (savedLang && langEl) {
      for (var i = 0; i < langEl.options.length; i++) {
        if (langEl.options[i].value === savedLang) {
          langEl.value = savedLang;
          break;
        }
      }
    }
  } catch (e) {}

  if (langEl) {
    langEl.addEventListener("change", function () {
      try {
        localStorage.setItem(STORAGE_LANG, langEl.value);
      } catch (e) {}
    });
  }

  loadShortcuts();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var question = (qEl && qEl.value || "").trim();
    if (!question) {
      setStatus("Type a question first.");
      return;
    }
    var token = tokenValue();
    var reply_language = langEl ? langEl.value : "en-IN";
    lastQuestion = question;
    addMsg("user", "<p>" + esc(question) + "</p>");
    qEl.value = "";
    setStatus("Thinking…");
    if (sendBtn) sendBtn.disabled = true;

    fetch("/learn/coach/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: token,
        question: question,
        reply_language: reply_language,
      }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (sendBtn) sendBtn.disabled = false;
        if (!res.ok || !res.data || !res.data.ok) {
          var err =
            (res.data && res.data.error) || "Ask Vidura could not answer.";
          addMsg("bot", '<p class="askv-err">' + esc(err) + "</p>");
          setStatus("");
          return;
        }
        var d = res.data;
        lastAnswer = d.answer || "";
        var html = "<p>" + esc(d.answer) + "</p>";
        if (d.strategy_label) {
          html =
            '<span class="askv-chip">' +
            esc(d.strategy_label) +
            "</span>" +
            html;
        }
        if (d.integrity_blocked) {
          html +=
            '<p class="askv-err">Integrity: will not write exams or assignments.</p>';
        }
        if (d.clarify) {
          html +=
            '<p class="askv-check"><strong>Clarify:</strong> reply with a specific topic next.</p>';
        }
        if (d.check_question && !d.clarify) {
          html +=
            '<p class="askv-check"><strong>Check:</strong> ' +
            esc(d.check_question) +
            "</p>";
        }
        if (d.citations && d.citations.length) {
          html += '<ul class="askv-cites">';
          d.citations.forEach(function (c) {
            html +=
              "<li><strong>" +
              esc(c.title || "Source") +
              "</strong>" +
              (c.excerpt ? " — " + esc(c.excerpt) : "") +
              "</li>";
          });
          html += "</ul>";
        }
        addMsg("bot", html);
        if (d.answer && !d.clarify) {
          addFeedbackBar(lastQuestion, lastAnswer);
        }
        setStatus("");
      })
      .catch(function () {
        if (sendBtn) sendBtn.disabled = false;
        addMsg(
          "bot",
          '<p class="askv-err">Network error — try again in a moment.</p>'
        );
        setStatus("");
      });
  });

  // Restore open state only on larger screens
  try {
    if (
      localStorage.getItem(STORAGE_OPEN) === "1" &&
      window.innerWidth >= 900
    ) {
      setOpen(true);
    }
  } catch (e) {}
})();
