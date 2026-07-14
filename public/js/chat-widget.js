// <Shania Start>
// public/js/chat-widget.js — floating "Ask Inspector Hoot" chatbot (fetch → /api/ai/chat).
(function () {
  "use strict";
  const launcher = document.getElementById("hoot-launcher");
  const panel = document.getElementById("hoot-panel");
  const closeBtn = document.getElementById("hoot-close");
  // <Rebecca Member 2 Start>
  const maximizeBtn = document.getElementById("hoot-maximize");
  const resizeHandle = document.getElementById("hoot-resize-handle");
  // <Rebecca Member 2 End>
  const box = document.getElementById("chatbot");
  const form = document.getElementById("chatbot-form");
  const input = document.getElementById("chatbot-text");
  const micBtn = document.getElementById("chatbot-mic");
  const voiceStatus = document.getElementById("chatbot-voice-status");
  //Shawn Start
  const toggleHistoryBtn = document.getElementById("toggle-history");
  const historyList = document.getElementById("chat-history-list");
  const newChatBtn = document.getElementById("new-chat-btn");
  //Shawn End


  if (!launcher || !panel || !box || !form || !input) return;

  // <Rebecca Member 2 Start>
  // Chat widget window controls: maximize/restore and drag-resize like a small app window.
  const CHAT_SIZE_KEY = "scampatrolHootPanelSize";
  const CHAT_MAXIMIZED_KEY = "scampatrolHootPanelMaximized";
  let normalPanelSize = null;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getPanelLimits() {
    const widthLimit = Math.max(320, window.innerWidth - 32);
    const heightLimit = Math.max(420, window.innerHeight - 96);

    return {
      minWidth: Math.min(320, widthLimit),
      minHeight: Math.min(420, heightLimit),
      maxWidth: widthLimit,
      maxHeight: heightLimit,
    };
  }

  function setPanelSize(width, height, shouldSave = true) {
    const limits = getPanelLimits();
    const safeWidth = Math.round(clamp(width, limits.minWidth, limits.maxWidth));
    const safeHeight = Math.round(clamp(height, limits.minHeight, limits.maxHeight));

    panel.style.setProperty("--hoot-panel-width", `${safeWidth}px`);
    panel.style.setProperty("--hoot-panel-height", `${safeHeight}px`);

    if (shouldSave) {
      localStorage.setItem(CHAT_SIZE_KEY, JSON.stringify({ width: safeWidth, height: safeHeight }));
    }
  }

  function getCurrentPanelSize() {
    const rect = panel.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  function loadSavedPanelSize() {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_SIZE_KEY) || "null");
      if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)) {
        setPanelSize(saved.width, saved.height, false);
      }
    } catch (_) {
      localStorage.removeItem(CHAT_SIZE_KEY);
    }

    if (localStorage.getItem(CHAT_MAXIMIZED_KEY) === "true") {
      panel.classList.add("is-maximized");
      updateMaximizeButton(true);
    }
  }

  function updateMaximizeButton(isMaximized) {
    if (!maximizeBtn) return;

    maximizeBtn.textContent = isMaximized ? "❐" : "□";
    maximizeBtn.setAttribute("aria-label", isMaximized ? "Restore chat size" : "Maximize chat");
    maximizeBtn.setAttribute("title", isMaximized ? "Restore chat size" : "Maximize chat");
  }

  function maximizePanel(shouldSave = true) {
    if (!panel.classList.contains("is-maximized")) {
      normalPanelSize = getCurrentPanelSize();
    }

    panel.classList.add("is-maximized");
    updateMaximizeButton(true);

    if (shouldSave) {
      localStorage.setItem(CHAT_MAXIMIZED_KEY, "true");
    }
  }

  function restorePanel(shouldSave = true) {
    panel.classList.remove("is-maximized");
    updateMaximizeButton(false);

    if (normalPanelSize) {
      setPanelSize(normalPanelSize.width, normalPanelSize.height, shouldSave);
    }

    if (shouldSave) {
      localStorage.setItem(CHAT_MAXIMIZED_KEY, "false");
    }
  }

  function toggleMaximize() {
    if (panel.classList.contains("is-maximized")) {
      restorePanel();
    } else {
      maximizePanel();
    }
  }

  function startResize(e) {
    if (!resizeHandle || panel.classList.contains("is-maximized")) return;

    e.preventDefault();
    resizeHandle.setPointerCapture?.(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const start = getCurrentPanelSize();
    panel.classList.add("is-resizing");

    function onMove(moveEvent) {
      const newWidth = start.width + (startX - moveEvent.clientX);
      const newHeight = start.height + (moveEvent.clientY - startY);
      setPanelSize(newWidth, newHeight, false);
    }

    function onStop() {
      panel.classList.remove("is-resizing");
      const current = getCurrentPanelSize();
      setPanelSize(current.width, current.height, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onStop);
      window.removeEventListener("pointercancel", onStop);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onStop);
    window.addEventListener("pointercancel", onStop);
  }

  function keepPanelInsideViewport() {
    if (panel.classList.contains("is-maximized")) return;

    const current = getCurrentPanelSize();
    setPanelSize(current.width, current.height, false);
  }

  loadSavedPanelSize();

  if (maximizeBtn) maximizeBtn.addEventListener("click", toggleMaximize);
  if (resizeHandle) resizeHandle.addEventListener("pointerdown", startResize);
  window.addEventListener("resize", keepPanelInsideViewport);
  // <Rebecca Member 2 End>

  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const history = [];
  // <Shawn Feature Start>
  let sessionId = null;
  let sessions = [];
  // <Shawn Feature End>
  let busy = false;
  let greeted = false;

  // <Rebecca Feature 3 Start>
  // Voice Input / Output: hold mic to transcribe speech into the textbox, and read Hoot's replies aloud.
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canUseSpeechRecognition = Boolean(SpeechRecognitionCtor);
  const canUseSpeechSynthesis = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const speechSafeHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  const speechAllowedContext = window.isSecureContext || speechSafeHost;

  let recognition = null;
  let isListening = false;
  let baseVoiceText = "";
  let finalTranscript = "";
  let lastInterimTranscript = "";

  function voiceLang() {
    const rawLang = (document.documentElement.lang || navigator.language || "en-US").toLowerCase();

    // Chrome/Edge speech recognition is picky with some locale codes. These defaults are safer for demo.
    if (rawLang.startsWith("ms") || rawLang.startsWith("ms-my")) return "ms-MY";
    if (rawLang.startsWith("zh")) return "zh-CN";
    if (rawLang.startsWith("ta")) return "ta-IN";
    if (rawLang.startsWith("ja")) return "ja-JP";
    if (rawLang.startsWith("ko")) return "ko-KR";
    if (rawLang.startsWith("es")) return "es-ES";
    return "en-US";
  }

  function setVoiceStatus(message) {
    if (voiceStatus) voiceStatus.textContent = message || "";
  }

  function placeCursorAtEnd() {
    const end = input.value.length;
    input.focus();
    input.setSelectionRange?.(end, end);
  }

  function updateVoiceInput(interimTranscript = "") {
    const parts = [];
    if (baseVoiceText) parts.push(baseVoiceText);
    if (finalTranscript.trim()) parts.push(finalTranscript.trim());
    if (interimTranscript.trim()) parts.push(interimTranscript.trim());

    input.value = parts.join(" ").replace(/\s+/g, " ").trimStart();
    placeCursorAtEnd();
  }

  function resetMicButton() {
    if (!micBtn) return;
    micBtn.classList.remove("listening");
    micBtn.textContent = "🎙️";
    micBtn.setAttribute("aria-label", "Hold to speak");
    micBtn.setAttribute("title", "Hold to speak");
  }

  function markMicListening() {
    if (!micBtn) return;
    micBtn.classList.add("listening");
    micBtn.textContent = "🛑";
    micBtn.setAttribute("aria-label", "Release to stop speaking");
    micBtn.setAttribute("title", "Release to stop speaking");
  }

  function buildRecognition() {
    if (!canUseSpeechRecognition) return null;

    const r = new SpeechRecognitionCtor();
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.lang = voiceLang();

    r.onstart = () => {
      isListening = true;
      finalTranscript = "";
      lastInterimTranscript = "";
      baseVoiceText = input.value.trim();
      markMicListening();
      setVoiceStatus("Listening… release to stop");
    };

    r.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";

        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      lastInterimTranscript = interimTranscript;
      updateVoiceInput(interimTranscript);
    };

    r.onerror = (event) => {
      const error = event.error || "unknown";
      const messages = {
        "not-allowed": "Mic permission blocked. Allow microphone access.",
        "service-not-allowed": "Voice input needs Chrome/Edge on localhost or HTTPS.",
        "audio-capture": "No microphone found or mic is disabled.",
        network: "Voice input needs internet/browser speech service.",
        "no-speech": "No speech detected. Hold mic and speak clearly.",
        aborted: "Voice input stopped.",
        "language-not-supported": "Voice language not supported. Using English may help.",
      };

      setVoiceStatus(messages[error] || `Voice input unavailable: ${error}`);
    };

    r.onend = () => {
      isListening = false;

      // Some browsers only return interim text before the user releases the mic.
      if (!finalTranscript.trim() && lastInterimTranscript.trim()) {
        finalTranscript = `${lastInterimTranscript.trim()} `;
        updateVoiceInput("");
      }

      resetMicButton();

      if (input.value.trim()) {
        setVoiceStatus("Speech added to text box. Edit before sending.");
      }

      setTimeout(() => setVoiceStatus(""), 3500);
      placeCursorAtEnd();
    };

    return r;
  }

  function startVoiceInput() {
    if (!micBtn || busy || isListening) return;

    if (!speechAllowedContext) {
      setVoiceStatus("Use localhost or HTTPS for voice input.");
      return;
    }

    if (!canUseSpeechRecognition) {
      setVoiceStatus("Voice input works on Chrome/Edge only.");
      return;
    }

    try {
      if (recognition) {
        recognition.onend = null;
        try { recognition.abort(); } catch (_) {}
      }

      recognition = buildRecognition();
      recognition.start();
    } catch (error) {
      resetMicButton();
      isListening = false;
      setVoiceStatus(`Voice input could not start: ${error.name || "browser error"}`);
    }
  }

  function stopVoiceInput() {
    if (!recognition || !isListening) return;

    try {
      recognition.stop();
    } catch (_) {
      resetMicButton();
      isListening = false;
      setVoiceStatus("Voice input stopped");
    }
  }

  function speakReply(text, button) {
    if (!canUseSpeechSynthesis) {
      setVoiceStatus("Read aloud is not supported here");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (button && button.dataset.speaking === "true") {
        button.dataset.speaking = "false";
        button.textContent = "🔊";
        setVoiceStatus("Read aloud stopped");
        return;
      }
    }

    const utterance = new SpeechSynthesisUtterance(String(text || ""));
    utterance.lang = voiceLang();
    utterance.rate = 0.95;
    utterance.pitch = 1;

    if (button) {
      button.dataset.speaking = "true";
      button.textContent = "⏹";
    }
    setVoiceStatus("Reading aloud…");

    utterance.onend = () => {
      if (button) {
        button.dataset.speaking = "false";
        button.textContent = "🔊";
      }
      setVoiceStatus("");
    };
    utterance.onerror = () => {
      if (button) {
        button.dataset.speaking = "false";
        button.textContent = "🔊";
      }
      setVoiceStatus("Could not read aloud");
    };

    window.speechSynthesis.speak(utterance);
  }

  if (micBtn) {
    if (!speechAllowedContext) {
      micBtn.title = "Voice input needs localhost or HTTPS";
      micBtn.setAttribute("aria-label", "Voice input needs localhost or HTTPS");
    } else if (!canUseSpeechRecognition) {
      micBtn.title = "Voice input works on Chrome or Edge";
      micBtn.setAttribute("aria-label", "Voice input works on Chrome or Edge");
    }

    const holdStart = (e) => {
      e.preventDefault();
      startVoiceInput();
    };
    const holdStop = (e) => {
      e?.preventDefault?.();
      stopVoiceInput();
    };

    // Support mouse, touch, stylus, and keyboard so the demo works across more devices.
    micBtn.addEventListener("pointerdown", holdStart);
    window.addEventListener("pointerup", holdStop);
    window.addEventListener("pointercancel", holdStop);
    micBtn.addEventListener("touchstart", holdStart, { passive: false });
    window.addEventListener("touchend", holdStop, { passive: false });
    micBtn.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "Enter") holdStart(e);
    });
    micBtn.addEventListener("keyup", (e) => {
      if (e.code === "Space" || e.code === "Enter") holdStop(e);
    });
  }
  // <Rebecca Feature 3 End>

  function addBubble(role, text) {
    // <Rebecca Feature 3 Start>
    if (role === "assistant") {
      const row = document.createElement("div");
      row.className = "chatbot-reply-row";

      const div = document.createElement("div");
      div.className = "bubble them";
      div.innerHTML = esc(text).replace(/\n/g, "<br>");
      row.appendChild(div);

      if (canUseSpeechSynthesis) {
        const readBtn = document.createElement("button");
        readBtn.type = "button";
        readBtn.className = "read-aloud-btn";
        readBtn.textContent = "🔊";
        readBtn.setAttribute("aria-label", "Read chatbot reply aloud");
        readBtn.setAttribute("title", "Read aloud");
        readBtn.addEventListener("click", () => speakReply(text, readBtn));
        row.appendChild(readBtn);
      }

      box.appendChild(row);
      box.scrollTop = box.scrollHeight;
      return;
    }
    // <Rebecca Feature 3 End>

    const div = document.createElement("div");
    div.className = "bubble " + (role === "user" ? "me" : "them");
    div.innerHTML = esc(text).replace(/\n/g, "<br>");
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }
  function showTyping() {
    const t = document.createElement("div");
    t.className = "bubble them chatbot-typing";
    t.id = "chatbot-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
  }
  function hideTyping() {
    const t = document.getElementById("chatbot-typing");
    if (t) t.remove();
  }

  async function send(text) {
    const msg = String(text || "").trim();
    if (!msg || busy) return;
    stopVoiceInput();
    busy = true;
    input.value = "";
    addBubble("user", msg);
    history.push({ role: "user", text: msg });
    showTyping();
    if (window.SOUND) window.SOUND.sfx.click();
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, sessionId }), // Shawn added sessionId to the request
      });
      const d = await r.json().catch(() => ({}));
      hideTyping();
      const reply = r.ok && d.reply ? d.reply : d.error || "Inspector Hoot is unavailable right now — try again shortly.";
      addBubble("assistant", reply);
      if (r.ok && d.reply) {
        history.push({ role: "assistant", text: d.reply });
        // Shawn Start
        if (d.sessionId) {
            sessionId = d.sessionId;
        }
        // Shawn End
        if (window.SOUND) window.SOUND.sfx.hoot();
      }
    } catch (_) {
      hideTyping();
      addBubble("assistant", "Something went wrong — please try again.");
    } finally {
      busy = false;
      input.focus();
    }
  }

  // Shawn Start
  async function loadSessions() {

      const r = await fetch("/api/chat/sessions");

      if (!r.ok) return;

      sessions = await r.json();

      const list = document.getElementById("chat-history-list");

      list.innerHTML = "";

      sessions.forEach(session => {

      const div = document.createElement("div");

      div.className = "chat-history-item";

      const title =
          session.title.length > 30
              ? session.title.substring(0, 30) + "..."
              : session.title;

      const date = new Date(session.updated_at).toLocaleDateString();

      div.innerHTML = `
          <div class="chat-history-title">
              🦉 ${title}
          </div>

          <div class="chat-history-date">
              ${date}
          </div>
      `;

          div.onclick = () => {
              loadConversation(session.id);
          };

          // loadConversation
          async function loadConversation(id) {

              const r = await fetch("/api/chat/" + id);

              if (!r.ok) return;

              const messages = await r.json();

              sessionId = id;

              history.length = 0;

              box.innerHTML = "";

              messages.forEach(msg => {

                  history.push({
                      role: msg.role,
                      text: msg.message
                  });

                  addBubble(
                      msg.role,
                      msg.message
                  );

              });

          }
          // Shawn End

          list.appendChild(div);

      });

  }
  // Shawn End

  function open() {
    panel.hidden = false;
    loadSessions();// Shawn Start
    launcher.setAttribute("aria-expanded", "true");
    if (!greeted) {
      greeted = true;
      addBubble("assistant", "Hoot hoot! 🦉 I'm Inspector Hoot. Ask me about scams, what to do if you've been scammed, or tap a question below.");
    }
    setTimeout(() => input.focus(), 50);
  }
  function close() {
    stopVoiceInput();
    if (canUseSpeechSynthesis) window.speechSynthesis.cancel();
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
  }
  function toggle() {
    if (panel.hidden) open();
    else close();
  }

  launcher.addEventListener("click", toggle);
  if (closeBtn) closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send(input.value);
  });
  const quick = document.getElementById("chatbot-quick");
  if (quick) {
    quick.addEventListener("click", (e) => {
      const b = e.target.closest("[data-q]");
      if (b) send(b.getAttribute("data-q"));
    });
  }

  // Shawn Start
  if (newChatBtn) {

      newChatBtn.addEventListener("click", () => {

          sessionId = null;
          history.length = 0;
          box.innerHTML = "";

          loadSessions();

          historyList.style.display = "none";
          toggleHistoryBtn.textContent = "📜 Previous Chats ▼";

      });

  }

  if (toggleHistoryBtn) {

      toggleHistoryBtn.addEventListener("click", () => {

          const isHidden =
              historyList.style.display === "none";

          historyList.style.display =
              isHidden ? "block" : "none";

          toggleHistoryBtn.textContent =
              isHidden
                  ? "📜 Previous Chats ▲"
                  : "📜 Previous Chats ▼";

      });

  }
  // Shawn End
})();
// <Shania End>
