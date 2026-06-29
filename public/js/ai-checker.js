// <Shania Start>
// public/js/ai-checker.js — AI Scam Checker page: validate, analyze, render result + history.
(function () {
  "use strict";

  const root = document.getElementById("ai-checker");
  if (!root) return;
  const authed = root.getAttribute("data-authed") === "1";

  const form = document.getElementById("ai-form");
  const textEl = document.getElementById("text");
  const charNow = document.getElementById("char-now");
  const submitBtn = document.getElementById("ai-submit");
  const errSlot = form.querySelector('.field-error[data-for="text"]');
  const errorBanner = document.getElementById("ai-error");

  const MIN = 10;
  const MAX = 10000;

  function setBanner(msg) {
    errorBanner.textContent = msg || "";
    errorBanner.style.display = msg ? "flex" : "none";
  }
  function setFieldError(msg) {
    if (errSlot) errSlot.textContent = msg || "";
    textEl.classList.toggle("invalid", !!msg);
  }
  function inputError(v) {
    const t = (v || "").trim();
    if (!t) return "Enter a message to check.";
    if (t.length < MIN) return `Message must be at least ${MIN} characters.`;
    if (v.length > MAX) return `Message must be ${MAX} characters or fewer.`;
    return "";
  }

  // live character count
  function updateCount() {
    charNow.textContent = String(textEl.value.length);
  }
  textEl.addEventListener("input", () => {
    updateCount();
    if (textEl.classList.contains("invalid")) setFieldError(inputError(textEl.value));
  });
  updateCount();

  function riskLabel(level) {
    return { high: "High risk", medium: "Medium risk", low: "Low risk" }[level] || level;
  }

  function renderResult(data) {
    const panel = document.getElementById("ai-result");
    const badge = document.getElementById("risk-badge");
    const saved = document.getElementById("result-saved");
    const explanation = document.getElementById("result-explanation");
    const signals = document.getElementById("result-signals");

    badge.className = "risk-badge risk-" + data.risk_level;
    badge.textContent = riskLabel(data.risk_level);
    explanation.textContent = data.explanation || "";

    signals.innerHTML = "";
    (data.signals || []).forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      signals.appendChild(li);
    });

    if (data.saved) {
      saved.textContent = "Saved to your history";
    } else if (data.guest) {
      saved.textContent =
        typeof data.remaining === "number" ? `${data.remaining} free guest checks left` : "";
    } else {
      saved.textContent = "";
    }

    panel.style.display = "block";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  }

  async function loadHistory() {
    const list = document.getElementById("history-list");
    const empty = document.getElementById("history-empty");
    if (!list) return;
    try {
      const res = await fetch("/api/ai/history");
      if (!res.ok) return;
      const { history } = await res.json();
      list.innerHTML = "";
      if (!history || !history.length) {
        if (empty) empty.style.display = "block";
        return;
      }
      if (empty) empty.style.display = "none";
      history.forEach((row) => {
        const li = document.createElement("li");
        const when = new Date(row.created_at).toLocaleString();
        const snippet = row.input_text.length > 120 ? row.input_text.slice(0, 120) + "…" : row.input_text;
        li.innerHTML =
          '<span class="risk-badge risk-' + row.risk_level + '">' + riskLabel(row.risk_level) + "</span>" +
          '<span class="history-text">' + escapeHtml(snippet) + "</span>" +
          '<span class="history-when">' + escapeHtml(when) + "</span>";
        list.appendChild(li);
      });
    } catch (_) {
      /* ignore history load errors */
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setBanner("");
    const text = textEl.value;
    const verr = inputError(text);
    setFieldError(verr);
    if (verr) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Checking…";
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        renderResult(data);
        if (authed) loadHistory();
      } else if (res.status === 403 && data.limited) {
        setBanner(data.error || "Guest limit reached. Please sign up.");
      } else {
        setBanner(data.error || "Something went wrong. Please try again.");
      }
    } catch (_) {
      setBanner("Network error. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Check message";
    }
  });

  if (authed) loadHistory();
})();
// <Shania End>
