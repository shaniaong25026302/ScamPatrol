// <Liam Member 5 Daily Quiz Start>
// public/js/daily-quiz-nav.js
// -----------------------------------------------------------------------------
// Navbar state helper for Daily Quiz.
// The server cannot know quiz status inside the shared EJS navbar without making
// every page render async, so this tiny script asks /api/daily-quiz/status after
// each page load and decorates the Daily Quiz link.
// -----------------------------------------------------------------------------
(function () {
  "use strict";

  function applyStatus(status) {
    const link = document.getElementById("daily-quiz-nav-link");
    if (!link || !status) return;

    link.classList.remove("dq-nav-ready", "dq-nav-progress", "dq-nav-completed", "dq-nav-blink");
    link.textContent = status.navLabel || "Daily Quiz";
    link.title = status.navTitle || "Daily Quiz";
    link.dataset.quizState = status.state || "ready";

    if (status.state === "completed") {
      link.classList.add("dq-nav-completed");
    } else if (status.state === "in-progress") {
      link.classList.add("dq-nav-progress");
    } else {
      link.classList.add("dq-nav-ready", "dq-nav-blink");
      // Blink briefly on page load only, then remain bright green.
      window.setTimeout(() => link.classList.remove("dq-nav-blink"), 2200);
    }
  }

  async function refreshNav() {
    const link = document.getElementById("daily-quiz-nav-link");
    if (!link) return;
    try {
      const response = await fetch("/api/daily-quiz/status");
      if (!response.ok) return;
      const data = await response.json();
      applyStatus(data.status);
    } catch (_) {
      // Guest pages or network hiccups should not break the navbar.
    }
  }

  document.addEventListener("dailyquiz:status", (event) => applyStatus(event.detail));
  document.addEventListener("DOMContentLoaded", () => {
    refreshNav();

    document.addEventListener("click", (event) => {
      const link = event.target.closest("#daily-quiz-nav-link");
      if (!link || link.dataset.quizState !== "completed") return;
      event.preventDefault();
      const msg = "Today's Daily Quiz is already completed. Come back tomorrow for a new 10-question quiz.";
      if (window.HQ && typeof window.HQ.toast === "function") window.HQ.toast(msg);
      else alert(msg);
    });
  });
})();
// <Liam Member 5 Daily Quiz End>
