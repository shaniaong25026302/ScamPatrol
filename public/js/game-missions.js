// <Shania Start>
// public/js/game-missions.js — operations map: click a location → energy-costed run → Correct popup.
(function () {
  "use strict";
  const map = document.getElementById("mission-map");
  if (!map) return;
  const $ = (id) => document.getElementById(id);
  const ICONS = { Email: "📧", SMS: "💬", Website: "🌐", Call: "📞", Boss: "💀" };
  const NAMES = { Email: "Email Check", SMS: "SMS Scanner", Website: "Website Watch", Call: "Call Center", Boss: "Boss Battle: The Scammer" };
  const DIFF = { Email: "Easy", SMS: "Easy", Website: "Medium", Call: "Hard", Boss: "Expert" };
  const DCLASS = { Email: "easy", SMS: "easy", Website: "medium", Call: "hard", Boss: "expert" };
  const POS = { Email: { x: 12, y: 28 }, SMS: { x: 30, y: 66 }, Website: { x: 50, y: 20 }, Call: { x: 70, y: 66 }, Boss: { x: 87, y: 30 } };
  let current = null;

  const stars = (n) => "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n);

  async function loadMap() {
    $("run-panel").style.display = "none";
    $("map-panel").style.display = "";
    try {
      const r = await fetch("/api/game/profile");
      if (!r.ok) { map.innerHTML = '<p class="muted" style="padding:1rem">Log in to play missions.</p>'; return; }
      const p = await r.json();
      $("map-energy").textContent = p.energy + "/" + p.energyMax;

      map.querySelectorAll(".map-node").forEach((n) => n.remove()); // keep the svg path
      const nodes = p.missions || [];
      let distinctCleared = 0;
      let needed = 0;
      nodes.forEach((n) => {
        if (n.kind !== "Boss") { needed += 1; if ((n.cleared || 0) >= 1) distinctCleared += 1; }
        const pos = POS[n.kind] || { x: 50, y: 50 };
        const btn = document.createElement("button");
        btn.className = "map-node " + (DCLASS[n.kind] || "easy") + (n.locked ? " locked" : "");
        btn.style.left = pos.x + "%";
        btn.style.top = pos.y + "%";
        if (n.locked) btn.disabled = true;
        else btn.setAttribute("data-kind", n.kind);
        btn.innerHTML =
          '<span class="st">' + stars(n.stars) + "</span>" +
          '<span class="orb"><span class="ic">' + (ICONS[n.kind] || "❓") + "</span>" +
          (n.locked ? '<span class="lock">🔒</span>' : "") + "</span>" +
          '<span class="lbl"><b>' + (NAMES[n.kind] || n.kind) + "</b>" +
          '<small>(' + (DIFF[n.kind] || "") + ")</small></span>";
        map.appendChild(btn);
      });

      const boss = nodes.find((n) => n.kind === "Boss");
      const note = $("boss-note");
      if (boss && boss.locked) {
        note.innerHTML = "💀 <b>Boss: The Scammer</b> is locked — clear <b>every</b> case type once to " +
          "challenge it (" + distinctCleared + "/" + needed + ").";
      } else {
        note.innerHTML = "💀 <b>Boss: The Scammer</b> is <b style='color:var(--gw-red)'>UNLOCKED</b> — click it to challenge!";
      }
    } catch (_) {
      map.innerHTML = '<p class="muted" style="padding:1rem">Map unavailable — try again.</p>';
    }
  }

  async function startRun(kind) {
    const r = await fetch("/api/game/mission/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403 && d.noEnergy) {
      if (window.SOUND) window.SOUND.sfx.error();
      if (window.HQ && window.HQ.popup) {
        window.HQ.popup({ kind: "wrong", title: "⚡ Out of energy", text: "Energy refills 1 every hour — check the timer in the HUD!", button: "OK" });
      }
      return;
    }
    if (!r.ok) return;
    current = d.mission;
    $("map-energy").textContent = d.energy + "/" + d.energyMax;
    if (window.HQ) window.HQ.refresh();
    $("map-panel").style.display = "none";
    $("run-panel").style.display = "block";
    $("run-title").textContent = current.kind + " · " + current.difficulty;
    $("run-content").textContent = current.content;
    document.querySelectorAll("#run-actions .gw-btn").forEach((b) => (b.disabled = false));
  }

  async function answer(ans) {
    if (!current) return;
    document.querySelectorAll("#run-actions .gw-btn").forEach((b) => (b.disabled = true));
    const r = await fetch("/api/game/mission/check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId: current.id, answer: ans }),
    });
    const d = await r.json();
    if (window.HQ && d.reward) window.HQ.showReward(d.reward);
    if (!d.correct && window.SOUND) window.SOUND.sfx.error();
    if (window.HQ && window.HQ.popup) {
      window.HQ.popup({
        kind: d.correct ? "correct" : "wrong",
        title: d.correct ? "✅ Correct!" : "❌ Not quite",
        text: "It was <b>" + String(d.answer).toUpperCase() + "</b>.",
        reasons: d.why ? [d.why] : [],
        button: "Back to map ▸",
        onClose: loadMap,
      });
    } else {
      loadMap();
    }
  }

  map.addEventListener("click", (e) => {
    const n = e.target.closest(".map-node");
    if (!n || n.disabled) return;
    startRun(n.getAttribute("data-kind"));
  });
  document.querySelectorAll("#run-actions .gw-btn").forEach((b) =>
    b.addEventListener("click", () => answer(b.getAttribute("data-ans"))),
  );
  $("run-back").addEventListener("click", loadMap);
  loadMap();
})();
// <Shania End>
