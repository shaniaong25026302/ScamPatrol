// <Shania Start>
// public/js/game-missions.js — Spot-the-Scam field missions loop.
(function () {
  "use strict";
  let current = null;
  let score = 0;
  const $ = (id) => document.getElementById(id);

  async function load() {
    $("m-feedback").style.display = "none";
    $("m-next").style.display = "none";
    $("m-actions").style.display = "block";
    document.querySelectorAll("#m-actions .gw-btn").forEach((b) => (b.disabled = false));
    $("m-content").textContent = "Loading mission…";
    try {
      const r = await fetch("/api/game/mission");
      const d = await r.json();
      current = d.mission;
      $("m-kind").textContent = current.kind + " · " + current.difficulty;
      $("m-content").textContent = current.content;
    } catch (_) {
      $("m-content").textContent = "Could not load a mission. Refresh to retry.";
    }
  }

  async function answer(ans) {
    if (!current) return;
    document.querySelectorAll("#m-actions .gw-btn").forEach((b) => (b.disabled = true));
    try {
      const r = await fetch("/api/game/mission/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: current.id, answer: ans }),
      });
      const d = await r.json();
      const fb = $("m-feedback");
      fb.style.display = "block";
      fb.innerHTML =
        (d.correct ? '<span class="gw-risk low">✅ Correct!</span>' : '<span class="gw-risk high">❌ Not quite</span>') +
        '<p style="margin:.6rem 0 0">It was <b>' + String(d.answer).toUpperCase() + "</b>. " + d.why + "</p>";
      if (d.correct) { score += 1; $("m-score").textContent = score; }
      if (window.HQ && d.reward) window.HQ.showReward(d.reward);
      $("m-next").style.display = "inline-flex";
    } catch (_) {
      document.querySelectorAll("#m-actions .gw-btn").forEach((b) => (b.disabled = false));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#m-actions .gw-btn").forEach((b) =>
      b.addEventListener("click", () => answer(b.getAttribute("data-ans"))),
    );
    $("m-next").addEventListener("click", load);
    load();
  });
})();
// <Shania End>
