// <Shania Start>
// public/js/game-relationship.js — long-con / romance scam timeline mapper.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const RISK_LABEL = { high: "High Risk", medium: "Medium Risk", low: "Low Risk" };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  const submit = $("rel-submit");
  if (!submit) return;
  submit.addEventListener("click", async () => {
    const text = $("rel-text").value;
    $("rel-error").textContent = "";
    if (!text || text.trim().length < 20) { $("rel-error").textContent = "Paste at least 20 characters of the conversation."; return; }
    submit.disabled = true; submit.textContent = "🔍 Mapping…";
    try {
      const r = await fetch("/api/ai/relationship", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { $("rel-error").textContent = d.error || "Something went wrong."; return; }

      $("rel-result").style.display = "block";
      const badge = $("rel-badge");
      badge.className = "gw-risk " + d.risk_level;
      badge.textContent = RISK_LABEL[d.risk_level] || d.risk_level;
      $("rel-summary").textContent = d.summary || "";
      const tl = $("rel-timeline"); tl.innerHTML = "";
      (d.timeline || []).forEach((t) => {
        const li = document.createElement("li");
        li.innerHTML =
          '<div class="stage">' + esc(t.stage) + "</div>" +
          (t.quote ? '<div class="quote">“' + esc(t.quote) + '”</div>' : "") +
          '<div class="tactic">' + esc(t.tactic) + "</div>";
        tl.appendChild(li);
      });
      $("rel-advice").innerHTML = "🦉 <b>Inspector Hoot:</b> " + esc(d.advice || "Stay safe out there.");
      if (window.HQ && d.reward) window.HQ.showReward(d.reward);
    } catch (_) {
      $("rel-error").textContent = "Network error. Try again.";
    } finally {
      submit.disabled = false; submit.textContent = "🔍 Map the Timeline";
    }
  });
})();
// <Shania End>
