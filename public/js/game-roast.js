// <Shania Start>
// public/js/game-roast.js — Roast-the-Scam mini-game.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const submit = $("roast-submit");
  if (!submit) return;

  submit.addEventListener("click", async () => {
    const text = $("roast-text").value;
    $("roast-error").textContent = "";
    if (!text || text.trim().length < 10) { $("roast-error").textContent = "Paste at least 10 characters to roast."; return; }
    submit.disabled = true; submit.textContent = "🔥 Roasting…";
    try {
      const r = await fetch("/api/game/roast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { $("roast-error").textContent = d.error || "The roaster is busy — try again."; return; }
      $("roast-result").style.display = "block";
      $("roast-score").textContent = d.score + "/10";
      $("roast-out").textContent = "“" + d.roast + "”";
      const flags = $("roast-flags"); flags.innerHTML = "";
      (d.redFlags || []).forEach((f) => { const li = document.createElement("li"); li.textContent = f; flags.appendChild(li); });
      if (window.HQ && d.reward) window.HQ.showReward(d.reward);
    } catch (_) {
      $("roast-error").textContent = "Network error. Try again.";
    } finally {
      submit.disabled = false; submit.textContent = "🔥 Roast it";
    }
  });
})();
// <Shania End>
