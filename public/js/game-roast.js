// <Shania Start>
// public/js/game-roast.js — Roast-the-Scam mini-game.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const submit = $("roast-submit");
  if (!submit) return;

  submit.addEventListener("click", async () => {
  const text = $("roast-text").value;

  const patterns = [
    /\b[SFTG]\d{7}[A-Z]\b/i, // NRIC
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, // Email
    /\b\d{6}\b/, // OTP
    /(?:\d[ -]?){13,16}/, // Card Number
    /password/i // Password
  ];

  const found = patterns.some((pattern) => pattern.test(text));

  if (found) {
    const proceed = confirm(
      "🛡 Scam Patrol Alert!\n\n" +
      "We detected potentially sensitive information in your submission.\n\n" +
      "Detected information may include:\n" +
      "• NRIC\n" +
      "• Email Address\n" +
      "• OTP\n" +
      "• Card Details\n" +
      "• Password Information\n\n" +
      "Sharing personal information may expose you to scams.\n\n" +
      "Do you want to continue anyway?"
    );

    if (!proceed) return;
  }
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
