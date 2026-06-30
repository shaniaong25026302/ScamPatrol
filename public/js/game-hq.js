// <Shania Start>
// public/js/game-hq.js — Scam Patrol HQ dashboard: analyzer + live rank/streak/badges/leaderboard.
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function setOwl(state) {
    const owl = document.querySelector("#owl-react .owl");
    if (owl) owl.className = "owl " + (state || "");
  }
  const RISK_LABEL = { high: "High Risk", medium: "Medium Risk", low: "Low Risk" };

  // ---- Analyzer ----
  const submit = $("ev-submit");
  if (submit) {
    submit.addEventListener("click", async () => {
      const text = $("ev-text").value;
      $("ev-error").textContent = "";
      if (!text || text.trim().length < 10) { $("ev-error").textContent = "Paste at least 10 characters."; return; }
      submit.disabled = true; submit.textContent = "🔍 Investigating…";
      try {
        const r = await fetch("/api/ai/analyze", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { $("ev-error").textContent = d.error || "Something went wrong."; return; }

        $("ev-result").style.display = "block";
        const badge = $("ev-badge");
        badge.className = "gw-risk " + d.risk_level;
        badge.textContent = RISK_LABEL[d.risk_level] || d.risk_level;
        $("ev-explanation").textContent = d.explanation || "";
        const sig = $("ev-signals"); sig.innerHTML = "";
        (d.signals || []).forEach((s) => { const li = document.createElement("li"); li.textContent = s; sig.appendChild(li); });

        setOwl(d.risk_level === "high" ? "owl-state-alarm" : d.risk_level === "low" ? "owl-state-happy" : "");
        const panel = $("analyzer-panel");
        panel.classList.toggle("siren", d.risk_level === "high");
        panel.classList.toggle("flash", d.risk_level === "high");

        if (window.HQ && d.reward) window.HQ.showReward(d.reward);
      } catch (_) {
        $("ev-error").textContent = "Network error. Try again.";
      } finally {
        submit.disabled = false; submit.textContent = "🔍 Submit Evidence";
      }
    });
  }

  // ---- Populate from profile ----
  const RANK_AT = { Recruit: 1, Detective: 5, Chief: 10 };
  function renderProfile(p) {
    if (!p) return;
    if ($("xp-into")) $("xp-into").textContent = p.intoLevel;
    if ($("xp-span")) $("xp-span").textContent = p.span;
    if ($("xp-fill")) $("xp-fill").style.width = Math.min(100, (p.intoLevel / p.span) * 100) + "%";
    if ($("rank-label")) $("rank-label").innerHTML = "Level <b>" + p.level + "</b> · <b>" + p.rank + "</b>";
    if ($("streak-num")) $("streak-num").textContent = p.streak;

    document.querySelectorAll(".rank-step").forEach((step) => {
      const need = RANK_AT[step.getAttribute("data-rank")] || 99;
      step.classList.toggle("on", p.level >= need);
    });

    const grid = $("badge-grid");
    if (grid && p.badges) {
      grid.innerHTML = "";
      p.badges.forEach((b) => {
        const d = document.createElement("div");
        d.className = "badge-card" + (b.earned ? " earned" : "");
        d.title = b.desc;
        d.innerHTML = '<div class="ico">' + b.icon + '</div><div class="nm">' + esc(b.name) + "</div>";
        grid.appendChild(d);
      });
    }
  }
  document.addEventListener("hq:profile", (e) => renderProfile(e.detail));

  // ---- Mini leaderboard ----
  async function loadLeaderboard() {
    const body = $("lb-mini");
    if (!body) return;
    try {
      const r = await fetch("/api/game/leaderboard?type=score");
      const d = await r.json();
      const rows = (d.leaders || []).slice(0, 6);
      if (!rows.length) { body.innerHTML = '<tr><td class="muted">Be the first on the board!</td></tr>'; return; }
      body.innerHTML = rows.map((l) =>
        '<tr class="' + (l.isMe ? "me" : "") + '"><td class="pos">' + l.position + '</td>' +
        '<td class="who">' + esc(l.username) + (l.isMe ? " (you)" : "") + "</td>" +
        '<td class="val">' + l.xp.toLocaleString() + "</td></tr>").join("");
    } catch (_) {
      body.innerHTML = '<tr><td class="muted">Leaderboard unavailable.</td></tr>';
    }
  }
  document.addEventListener("DOMContentLoaded", loadLeaderboard);
})();
// <Shania End>
