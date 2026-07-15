// <CG Member 4 Start>
(function () {
  "use strict";

  function updateProfile(p) {
    if (!p) return;

    const avatar = document.getElementById("profile-avatar");
    if (avatar) avatar.src = p.avatarImg;

    const name = document.getElementById("profile-name");
    if (name) name.textContent = p.username;

    const level = document.getElementById("profile-level");
    if (level) level.textContent = p.level;

    const rank = document.getElementById("profile-rank");
    if (rank) rank.textContent = p.rank;

    const coins = document.getElementById("profile-coins");
    if (coins) coins.textContent = p.coins;

    const streak = document.getElementById("profile-streak");
    if (streak) streak.textContent = p.streak;
  }

  document.addEventListener("hq:profile", (e) => {
    updateProfile(e.detail);
  });

  if (window.HQ && window.HQ.profile) {
    updateProfile(window.HQ.profile);
  }
})();
// <CG Member 4 End>
