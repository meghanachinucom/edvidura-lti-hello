/**
 * PeBL in-book chapter discussion — multi-user micro-forum + offline buffer.
 */
(function () {
  var root = document.getElementById("pebl-discuss");
  if (!root) return;

  var manualId = root.getAttribute("data-manual-id") || "";
  var token = root.getAttribute("data-token") || "";
  var me = root.getAttribute("data-subject") || "";
  var listEl = document.getElementById("pebl-msg-list");
  var statusEl = document.getElementById("pebl-status");
  var form = document.getElementById("pebl-form");
  var bodyEl = document.getElementById("pebl-body");
  var chapterLabel = document.getElementById("pebl-chapter-label");
  var offlineEl = document.getElementById("pebl-offline");
  var chapterSelect = document.getElementById("pebl-chapter");
  var STORAGE_KEY = "edvidura_pebl_outbox_v1";

  var state = {
    chapterSlug: root.getAttribute("data-chapter") || "",
    chapterTitle: root.getAttribute("data-chapter-title") || "",
  };

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function outbox() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") || [];
    } catch (e) {
      return [];
    }
  }

  function saveOutbox(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []));
    } catch (e) { /* ignore quota */ }
  }

  function clientId() {
    return (
      "c-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function updateOfflineBadge() {
    var n = outbox().filter(function (x) {
      return String(x.manual_id) === String(manualId);
    }).length;
    if (!offlineEl) return;
    if (n > 0) {
      offlineEl.hidden = false;
      offlineEl.textContent =
        n + " offline post" + (n === 1 ? "" : "s") + " waiting to sync";
    } else if (!navigator.onLine) {
      offlineEl.hidden = false;
      offlineEl.textContent = "Offline — posts will sync when you reconnect";
    } else {
      offlineEl.hidden = true;
      offlineEl.textContent = "";
    }
  }

  function renderMessages(messages) {
    if (!listEl) return;
    if (!messages || !messages.length) {
      listEl.innerHTML =
        '<p class="pebl-empty body-sm text-muted">Be the first — ask a class question or share a tip for this chapter.</p>';
      return;
    }
    var byParent = {};
    messages.forEach(function (m) {
      var key = m.parent_id || "_root";
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(m);
    });
    function renderNode(m, depth) {
      var mine = me && m.author_subject === me;
      var name = m.author_name || m.author_subject || "Learner";
      var when = (m.created_at || "").replace("T", " ").slice(0, 16);
      var html =
        '<article class="pebl-msg' +
        (mine ? " pebl-msg--mine" : "") +
        '" data-id="' +
        esc(m.id) +
        '" style="margin-left:' +
        depth * 12 +
        'px">' +
        '<header class="pebl-msg__meta"><strong>' +
        esc(name) +
        "</strong><span>" +
        esc(when) +
        "</span></header>" +
        '<div class="pebl-msg__body">' +
        esc(m.body) +
        "</div>" +
        '<button type="button" class="pebl-reply link" data-parent="' +
        esc(m.id) +
        '">Reply</button>' +
        "</article>";
      var kids = byParent[m.id] || [];
      kids.forEach(function (k) {
        html += renderNode(k, depth + 1);
      });
      return html;
    }
    var roots = byParent._root || messages.filter(function (m) {
      return !m.parent_id;
    });
    listEl.innerHTML = roots.map(function (m) {
      return renderNode(m, 0);
    }).join("");
    listEl.querySelectorAll(".pebl-reply").forEach(function (btn) {
      btn.addEventListener("click", function () {
        form.setAttribute("data-parent-id", btn.getAttribute("data-parent") || "");
        setStatus("Replying…");
        if (bodyEl) bodyEl.focus();
      });
    });
  }

  function loadThread() {
    if (!state.chapterSlug) {
      renderMessages([]);
      if (chapterLabel) chapterLabel.textContent = "Select a chapter";
      return;
    }
    if (chapterLabel) {
      chapterLabel.textContent = state.chapterTitle || state.chapterSlug;
    }
    setStatus("Loading…");
    var url =
      "/manuals/" +
      encodeURIComponent(manualId) +
      "/discussions?chapter=" +
      encodeURIComponent(state.chapterSlug) +
      "&token=" +
      encodeURIComponent(token);
    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.ok) {
          setStatus((data && data.error) || "Could not load discussion");
          return;
        }
        renderMessages(data.messages || []);
        setStatus("");
      })
      .catch(function () {
        setStatus("Could not load discussion");
      });
  }

  function postPayload(payload) {
    return fetch("/manuals/" + encodeURIComponent(manualId) + "/discussions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }).then(function (r) {
      return r.json().then(function (data) {
        return { okHttp: r.ok, data: data };
      });
    });
  }

  function flushOutbox() {
    if (!navigator.onLine) {
      updateOfflineBadge();
      return Promise.resolve();
    }
    var items = outbox();
    if (!items.length) {
      updateOfflineBadge();
      return Promise.resolve();
    }
    var remain = [];
    var chain = Promise.resolve();
    items.forEach(function (item) {
      chain = chain.then(function () {
        return postPayload(item)
          .then(function (res) {
            if (!(res.data && res.data.ok)) remain.push(item);
          })
          .catch(function () {
            remain.push(item);
          });
      });
    });
    return chain.then(function () {
      saveOutbox(remain);
      updateOfflineBadge();
      if (remain.length < items.length) loadThread();
    });
  }

  function setChapter(slug, title) {
    state.chapterSlug = (slug || "").replace(/^#/, "");
    state.chapterTitle = title || state.chapterSlug.replace(/-/g, " ");
    root.setAttribute("data-chapter", state.chapterSlug);
    if (chapterSelect && chapterSelect.value !== state.chapterSlug) {
      chapterSelect.value = state.chapterSlug;
    }
    document.querySelectorAll(".ebook-toc a").forEach(function (a) {
      a.classList.toggle(
        "on",
        (a.getAttribute("href") || "").replace(/^#/, "") === state.chapterSlug
      );
    });
    loadThread();
  }

  if (chapterSelect) {
    chapterSelect.addEventListener("change", function () {
      var opt = chapterSelect.options[chapterSelect.selectedIndex];
      setChapter(chapterSelect.value, opt ? opt.textContent : "");
    });
  }

  document.querySelectorAll(".ebook-toc a").forEach(function (a) {
    a.addEventListener("click", function () {
      var slug = (a.getAttribute("href") || "").replace(/^#/, "");
      setChapter(slug, a.textContent || slug);
    });
  });

  window.addEventListener("hashchange", function () {
    var slug = (location.hash || "").replace(/^#/, "");
    if (!slug) return;
    var link = document.querySelector(
      '.ebook-toc a[href="#' + slug.replace(/"/g, "") + '"]'
    );
    setChapter(slug, link ? link.textContent : slug);
  });

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = (bodyEl && bodyEl.value || "").trim();
      if (!text) {
        setStatus("Type a message first.");
        return;
      }
      if (!state.chapterSlug) {
        setStatus("Pick a chapter first.");
        return;
      }
      var payload = {
        token: token,
        chapter_slug: state.chapterSlug,
        chapter_title: state.chapterTitle,
        body: text,
        parent_id: form.getAttribute("data-parent-id") || null,
        client_id: clientId(),
        manual_id: manualId,
      };
      form.removeAttribute("data-parent-id");
      if (bodyEl) bodyEl.value = "";

      if (!navigator.onLine) {
        var box = outbox();
        box.push(payload);
        saveOutbox(box);
        updateOfflineBadge();
        setStatus("Saved offline — will sync when you reconnect.");
        return;
      }

      setStatus("Posting…");
      postPayload(payload)
        .then(function (res) {
          if (!(res.data && res.data.ok)) {
            setStatus((res.data && res.data.error) || "Post failed");
            return;
          }
          setStatus("");
          loadThread();
        })
        .catch(function () {
          var box = outbox();
          box.push(payload);
          saveOutbox(box);
          updateOfflineBadge();
          setStatus("Network error — queued offline.");
        });
    });
  }

  window.addEventListener("online", function () {
    flushOutbox();
  });
  window.addEventListener("offline", updateOfflineBadge);

  if (!state.chapterSlug && chapterSelect && chapterSelect.options.length) {
    var first = chapterSelect.options[0];
    if (first && first.value) {
      state.chapterSlug = first.value;
      state.chapterTitle = first.textContent || first.value;
    }
  }

  updateOfflineBadge();
  flushOutbox().then(loadThread);
})();
