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

  function applyHud(p) {
    if (!p) return;
    setText("hud-level", p.level);
    setText("hud-coins", p.coins);
    setText("hud-streak", p.streak);
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

  HQ.showReward = function (reward) {
    if (!reward) return;
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
