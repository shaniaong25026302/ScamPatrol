// <Shania Start>
// public/js/game-leaderboard.js — full leaderboard with score/streak tabs.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  async function load(type) {
    const body = $("lb-body");
    body.innerHTML = '<tr><td class="muted">Loading…</td></tr>';
    try {
      const r = await fetch("/api/game/leaderboard?type=" + type);
      const d = await r.json();
      const rows = d.leaders || [];
      if (!rows.length) { body.innerHTML = '<tr><td class="muted">No players yet — be the first!</td></tr>'; return; }
      body.innerHTML = rows.map((l) => {
        const val = type === "streak" ? l.streak + " 🔥" : l.xp.toLocaleString() + " XP";
        return '<tr class="' + (l.isMe ? "me" : "") + '"><td class="pos">' + l.position + "</td>" +
          '<td class="who">' + esc(l.username) + (l.isMe ? " (you)" : "") + ' <span class="muted">Lv ' + l.level + "</span></td>" +
          '<td class="val">' + val + "</td></tr>";
      }).join("");
    } catch (_) {
      body.innerHTML = '<tr><td class="muted">Leaderboard unavailable.</td></tr>';
    }
  }

  document.addEventListener("hq:profile", (e) => {
    const p = e.detail;
    if (p) { $("lb-rank").textContent = "#" + p.leaderboardRank; $("lb-mylevel").textContent = p.level; }
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lb-tab").forEach((t) =>
      t.addEventListener("click", () => {
        document.querySelectorAll(".lb-tab").forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        load(t.getAttribute("data-type"));
      }),
    );
    load("score");
  });
})();
// <Shania End>
