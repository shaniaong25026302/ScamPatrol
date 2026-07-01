// <Shania Start>
// public/js/game-shop.js — buy + equip characters with gold.
(function () {
  "use strict";
  const grid = document.getElementById("shop-grid");
  if (!grid) return;
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  async function load() {
    try {
      const r = await fetch("/api/game/shop");
      if (!r.ok) { grid.innerHTML = '<p class="muted">Log in to visit the shop.</p>'; return; }
      const d = await r.json();
      const cc = document.getElementById("shop-coins");
      if (cc) cc.textContent = d.coins;
      grid.innerHTML = d.items.map((it) => {
        const equipped = it.key === d.equipped;
        let btn;
        if (equipped) btn = '<button class="gw-btn" disabled>Equipped ✓</button>';
        else if (it.owned) btn = '<button class="gw-btn ghost" data-equip="' + it.key + '">Equip</button>';
        else btn = '<button class="gw-btn gold" data-buy="' + it.key + '">Buy 🪙' + it.price + "</button>";
        return '<div class="shop-card' + (equipped ? " equipped" : "") + '">' +
          '<img src="' + it.img + '" class="shop-img" alt="' + esc(it.name) + '"/>' +
          '<div class="shop-name">' + esc(it.name) + "</div>" +
          '<div class="muted" style="font-size:.9rem;min-height:2.6em">' + esc(it.desc) + "</div>" +
          btn + "</div>";
      }).join("");
    } catch (_) {
      grid.innerHTML = '<p class="muted">Shop unavailable — try again.</p>';
    }
  }

  grid.addEventListener("click", async (e) => {
    const buy = e.target.closest("[data-buy]");
    const equip = e.target.closest("[data-equip]");
    if (buy) {
      const r = await fetch("/api/game/shop/buy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: buy.getAttribute("data-buy") }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (window.SOUND) window.SOUND.sfx.error();
        if (window.HQ) window.HQ.toast(d.error || "Can't buy that", "badge");
        return;
      }
      if (window.SOUND) window.SOUND.sfx.badge();
      if (window.HQ) { window.HQ.toast("Purchased! 🪙", "badge"); window.HQ.refresh(); }
      load();
    } else if (equip) {
      const r = await fetch("/api/game/shop/equip", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: equip.getAttribute("data-equip") }),
      });
      if (!r.ok) return;
      if (window.SOUND) window.SOUND.sfx.xp();
      if (window.HQ) window.HQ.refresh(); // updates the HUD avatar
      load();
    }
  });

  load();
})();
// <Shania End>
