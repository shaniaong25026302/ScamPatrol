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
  if (!launcher || !panel || !box || !form || !input) return;

  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const history = [];
  let busy = false;
  let greeted = false;

  function addBubble(role, text) {
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
        body: JSON.stringify({ messages: history }),
      });
      const d = await r.json().catch(() => ({}));
      hideTyping();
      const reply = r.ok && d.reply ? d.reply : d.error || "Inspector Hoot is unavailable right now — try again shortly.";
      addBubble("assistant", reply);
      if (r.ok && d.reply) {
        history.push({ role: "assistant", text: d.reply });
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

  function open() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    if (!greeted) {
      greeted = true;
      addBubble("assistant", "Hoot hoot! 🦉 I'm Inspector Hoot. Ask me about scams, what to do if you've been scammed, or tap a question below.");
    }
    setTimeout(() => input.focus(), 50);
  }
  function close() {
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
})();
// <Shania End>
