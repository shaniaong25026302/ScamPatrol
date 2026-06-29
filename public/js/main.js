// <Shania Start>
// public/js/main.js — tiny shared client script loaded on every page.
// Handles the navbar logout link; feature pages add their own scripts.
document.addEventListener("click", async (e) => {
  const logout = e.target.closest('[data-action="logout"]');
  if (!logout) return;
  e.preventDefault();
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (_) {
    /* ignore — redirect anyway */
  }
  window.location.href = "/";
});
// <Shania End>
