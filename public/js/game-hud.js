// <Shania Start>
// public/js/game-hud.js — shared HUD: fetches the player's profile, shows XP/level/badge toasts.
// Exposes window.HQ for page scripts.
(function () {
  "use strict";
  const HQ = { profile: null };

  async function fetchProfile() {
    try {
      const r = await fetch("/api/game/profile");
      if (!r.ok) return null;
      return await r.json();
    } catch (_) {
      return null;
    }
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  let energyTimer = null;
  function fmtTime(s) {
    s = Math.max(0, s);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function startEnergyCountdown(p) {
    if (energyTimer) { clearInterval(energyTimer); energyTimer = null; }
    const el = document.getElementById("hud-energy-timer");
    if (!el) return;
    if (p.energy >= (p.energyMax || 5)) { el.textContent = ""; return; } // full → no timer
    let secs = p.energyNextSec || 0;
    el.textContent = "+1 " + fmtTime(secs);
    energyTimer = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(energyTimer);
        energyTimer = null;
        HQ.refresh(); // energy regenerated — refetch
        return;
      }
      el.textContent = "+1 " + fmtTime(secs);
    }, 1000);
  }

  function applyHud(p) {
    if (!p) return;
    setText("hud-level", p.level);
    setText("hud-coins", p.coins);
    setText("hud-streak", p.streak);
    if (p.energy != null) setText("hud-energy", p.energy + "/" + (p.energyMax || 5));
    startEnergyCountdown(p);
    const av = document.getElementById("hud-avatar");
    if (av && p.avatarImg) av.src = p.avatarImg;
  }

  function toast(text, cls) {
    const wrap = document.getElementById("xp-toast");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "xp-pop " + (cls || "");
    el.textContent = text;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  HQ.toast = toast;

  // Full-screen result popup (darkens the page). opts: { kind:'correct'|'wrong', title, text, reasons[], button, onClose }
  HQ.popup = function (opts) {
    const ov = document.getElementById("gw-overlay");
    const md = document.getElementById("gw-modal");
    if (!ov || !md) return;
    md.className = "gw-modal " + (opts.kind || "");
    let html = "<h2>" + (opts.title || "") + "</h2>";
    if (opts.text) html += "<p>" + opts.text + "</p>";
    if (opts.reasons && opts.reasons.length) {
      html += '<ul class="reasons">' + opts.reasons.map((r) => "<li>" + r + "</li>").join("") + "</ul>";
    }
    html += '<button class="gw-btn" id="gw-modal-close">' + (opts.button || "Continue ▸") + "</button>";
    md.innerHTML = html;
    ov.classList.add("show");
    const close = () => {
      ov.classList.remove("show");
      if (typeof opts.onClose === "function") opts.onClose();
    };
    const btn = document.getElementById("gw-modal-close");
    if (btn) btn.addEventListener("click", close);
    ov.onclick = (e) => { if (e.target === ov) close(); };
  };

  HQ.showReward = function (reward) {
    if (!reward) return;
    if (window.SOUND) window.SOUND.reward(reward);
    if (reward.gainedXp) {
      const coins = reward.gainedCoins ? "  +" + reward.gainedCoins + "🪙" : "";
      toast("+" + reward.gainedXp + " XP" + coins, "");
    }
    if (reward.leveledUp) toast("⭐ Level " + reward.level + " — " + reward.rank + "!", "level");
    (reward.newBadges || []).forEach((b) => toast(b.icon + " Badge: " + b.name, "badge"));
    HQ.refresh();
  };

  HQ.refresh = async function () {
    HQ.profile = await fetchProfile();
    applyHud(HQ.profile);
    document.dispatchEvent(new CustomEvent("hq:profile", { detail: HQ.profile }));
  };

  window.HQ = HQ;
  document.addEventListener("DOMContentLoaded", () => HQ.refresh());
})();
// <Shania End>
