// <Shania Start>
// public/js/chat-widget.js — floating "Ask Inspector Hoot" chatbot (fetch → /api/ai/chat).
(function () {
  "use strict";
  const launcher = document.getElementById("hoot-launcher");
  const panel = document.getElementById("hoot-panel");
  const closeBtn = document.getElementById("hoot-close");
  const box = document.getElementById("chatbot");
  const form = document.getElementById("chatbot-form");
  const input = document.getElementById("chatbot-text");
  const micBtn = document.getElementById("chatbot-mic");
  const voiceStatus = document.getElementById("chatbot-voice-status");
  //Shawn Start
  const toggleHistoryBtn = document.getElementById("toggle-history");
  const historyList = document.getElementById("chat-history-list");
  //Shawn End

  if (!launcher || !panel || !box || !form || !input) return;

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
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canUseSpeechRecognition = Boolean(SpeechRecognition);
  const canUseSpeechSynthesis = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let recognition = null;
  let isListening = false;
  let baseVoiceText = "";
  let finalTranscript = "";

  function voiceLang() {
    return document.documentElement.lang || "en-SG";
  }

  function setVoiceStatus(message) {
    if (voiceStatus) voiceStatus.textContent = message || "";
  }

  function updateVoiceInput(interimTranscript) {
    const pieces = [];
    if (baseVoiceText) pieces.push(baseVoiceText);
    if (finalTranscript.trim()) pieces.push(finalTranscript.trim());
    if (interimTranscript && interimTranscript.trim()) pieces.push(interimTranscript.trim());
    input.value = pieces.join(" ").replace(/\s+/g, " ").trimStart();
  }

  function buildRecognition() {
    if (!canUseSpeechRecognition) return null;
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = voiceLang();

    r.onstart = () => {
      isListening = true;
      finalTranscript = "";
      baseVoiceText = input.value.trim();
      if (micBtn) {
        micBtn.classList.add("listening");
        micBtn.textContent = "🛑";
        micBtn.setAttribute("aria-label", "Release to stop speaking");
        micBtn.setAttribute("title", "Release to stop speaking");
      }
      setVoiceStatus("Listening… release to stop");
    };

    r.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + " ";
        else interimTranscript += transcript;
      }
      updateVoiceInput(interimTranscript);
    };

    r.onerror = (event) => {
      const reason = event.error === "not-allowed"
        ? "Mic permission blocked"
        : event.error === "no-speech"
          ? "No speech detected"
          : "Voice input unavailable";
      setVoiceStatus(reason);
    };

    r.onend = () => {
      isListening = false;
      if (micBtn) {
        micBtn.classList.remove("listening");
        micBtn.textContent = "🎙️";
        micBtn.setAttribute("aria-label", "Hold to speak");
        micBtn.setAttribute("title", "Hold to speak");
      }
      if (input.value.trim()) setVoiceStatus("Speech added to text box");
      setTimeout(() => setVoiceStatus(""), 2500);
      input.focus();
    };

    return r;
  }

  function startVoiceInput() {
    if (!micBtn || !canUseSpeechRecognition || busy || isListening) return;
    try {
      recognition = buildRecognition();
      recognition.start();
    } catch (_) {
      setVoiceStatus("Voice input could not start");
    }
  }

  function stopVoiceInput() {
    if (!recognition || !isListening) return;
    try {
      recognition.stop();
    } catch (_) {
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
    if (!canUseSpeechRecognition) {
      micBtn.disabled = true;
      micBtn.title = "Voice input is not supported in this browser";
      micBtn.setAttribute("aria-label", "Voice input not supported");
      setVoiceStatus("Voice input not supported in this browser");
      setTimeout(() => setVoiceStatus(""), 3000);
    } else {
      micBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        micBtn.setPointerCapture?.(e.pointerId);
        startVoiceInput();
      });
      micBtn.addEventListener("pointerup", (e) => {
        e.preventDefault();
        stopVoiceInput();
      });
      micBtn.addEventListener("pointercancel", stopVoiceInput);
      micBtn.addEventListener("pointerleave", stopVoiceInput);
    }
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
          div.textContent = session.title;
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
          list.appendChild(div);
      });
  }
  // Shawn End

  // CG Start
  const langSelect = document.getElementById("chatbot-language");
  let chatLang = "en"; // default language

    if (langSelect) {
    langSelect.addEventListener("change", () => {
      chatLang = langSelect.value;
    });
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
        body: JSON.stringify({
          messages: history,
          sessionId, // Shawn’s feature
          language: chatLang // Erlisya’s feature
        }),
      });
      const d = await r.json().catch(() => ({}));
      hideTyping();
      const reply = r.ok && d.reply ? d.reply : d.error || "Inspector Hoot is unavailable right now — try again shortly.";
      addBubble("assistant", reply);
      if (r.ok && d.reply) {
        history.push({ role: "assistant", text: d.reply });
        if (d.sessionId) {
          sessionId = d.sessionId;
        }
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
  // CG End

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
