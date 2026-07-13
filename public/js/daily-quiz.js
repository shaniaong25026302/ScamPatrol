// <Liam Member 5 Daily Quiz Start>
// public/js/daily-quiz.js
// -----------------------------------------------------------------------------
// Browser controller for Daily Quiz.
// It deliberately asks the server to grade each answer instead of exposing the
// correctIndex in HTML/JS. That keeps progress honest and makes refresh-safe
// saved progress easier to explain during presentation.
// -----------------------------------------------------------------------------
(function () {
  "use strict";

  const els = {};
  let quiz = null;
  let currentIndex = 0;
  let locked = false;

  function $(id) {
    return document.getElementById(id);
  }

  function initElements() {
    [
      "dq-loading", "dq-completed", "dq-question-wrap", "dq-status-title", "dq-status-desc",
      "dq-progress-chip", "dq-score-chip", "dq-final-score", "dq-final-reward", "dq-question-count",
      "dq-question-kind", "dq-prompt", "dq-article-title", "dq-article-snippet", "dq-source-name",
      "dq-article-link", "dq-answer-form", "dq-feedback", "dq-start-btn"
    ].forEach((id) => { els[id] = $(id); });
  }

  function show(id) {
    const el = els[id];
    if (el) el.classList.remove("dq-hidden");
  }

  function hide(id) {
    const el = els[id];
    if (el) el.classList.add("dq-hidden");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function kindLabel(kind) {
    return {
      "scam-type": "Scam type",
      precaution: "Precaution",
      source: "Source check",
      statistic: "Data signal"
    }[kind] || "Question";
  }

  function updateStatus(status) {
    if (!status) return;
    if (els["dq-status-title"]) els["dq-status-title"].textContent = status.navLabel || "Daily Quiz";
    if (els["dq-status-desc"]) els["dq-status-desc"].textContent = status.navTitle || "Answer today's quiz.";
    if (els["dq-progress-chip"]) els["dq-progress-chip"].textContent = `${status.answeredCount}/${status.totalQuestions}`;
    if (els["dq-score-chip"]) els["dq-score-chip"].textContent = status.score;

    // Let the shared navbar script update immediately after each answer.
    document.dispatchEvent(new CustomEvent("dailyquiz:status", { detail: status }));
  }

  async function fetchToday() {
    const response = await fetch("/api/daily-quiz/today");
    if (!response.ok) throw new Error("Unable to load Daily Quiz.");
    const data = await response.json();
    return data.quiz;
  }

  function renderCompleted() {
    hide("dq-loading");
    hide("dq-question-wrap");
    show("dq-completed");

    const status = quiz;
    if (els["dq-final-score"]) els["dq-final-score"].textContent = `${status.score}/${status.totalQuestions}`;
    if (els["dq-final-reward"]) {
      const reward = status.reward || {};
      els["dq-final-reward"].textContent = reward.gainedXp
        ? `Reward earned: +${reward.gainedXp} EXP and +${reward.gainedCoins} coins.`
        : "Reward was already claimed when you completed the quiz.";
    }
  }

  function renderQuestion() {
    if (!quiz) return;
    updateStatus(quiz);

    if (quiz.completed) {
      renderCompleted();
      return;
    }

    hide("dq-loading");
    hide("dq-completed");
    show("dq-question-wrap");

    currentIndex = quiz.answers.length;
    const q = quiz.questions[currentIndex];
    if (!q) return renderCompleted();

    if (els["dq-question-count"]) els["dq-question-count"].textContent = `Question ${currentIndex + 1}/${quiz.totalQuestions}`;
    if (els["dq-question-kind"]) els["dq-question-kind"].textContent = kindLabel(q.kind);
    if (els["dq-prompt"]) els["dq-prompt"].textContent = q.prompt;
    if (els["dq-article-title"]) els["dq-article-title"].textContent = q.articleTitle;
    if (els["dq-article-snippet"]) els["dq-article-snippet"].textContent = q.articleSnippet;
    if (els["dq-source-name"]) els["dq-source-name"].textContent = q.sourceName;
    if (els["dq-article-link"]) els["dq-article-link"].href = q.articleLink || "/scam-weather";

    hide("dq-feedback");
    if (els["dq-feedback"]) els["dq-feedback"].innerHTML = "";

    if (els["dq-answer-form"]) {
      els["dq-answer-form"].innerHTML = q.options.map((option, index) => `
        <button class="dq-option" type="button" data-index="${index}">
          <span class="dq-option-letter">${String.fromCharCode(65 + index)}</span>
          <span>${escapeHtml(option)}</span>
        </button>
      `).join("");
    }
  }

  function renderError(message) {
    hide("dq-loading");
    show("dq-question-wrap");
    if (els["dq-prompt"]) els["dq-prompt"].textContent = "Daily Quiz could not load";
    if (els["dq-answer-form"]) els["dq-answer-form"].innerHTML = "";
    if (els["dq-feedback"]) {
      els["dq-feedback"].className = "dq-feedback wrong";
      els["dq-feedback"].innerHTML = `<strong>⚠️ ${escapeHtml(message)}</strong>`;
      show("dq-feedback");
    }
  }

  async function submitAnswer(selectedIndex, button) {
    if (locked || !quiz || quiz.completed) return;
    const q = quiz.questions[quiz.answers.length];
    if (!q) return;
    locked = true;

    document.querySelectorAll(".dq-option").forEach((btn) => {
      btn.disabled = true;
      btn.classList.remove("selected");
    });
    if (button) button.classList.add("selected");

    try {
      const response = await fetch("/api/daily-quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, selectedIndex })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Answer was rejected.");

      const result = data.result;
      if (els["dq-feedback"]) {
        els["dq-feedback"].className = `dq-feedback ${result.correct ? "correct" : "wrong"}`;
        els["dq-feedback"].innerHTML = `
          <strong>${result.correct ? "✅ Correct" : "❌ Not quite"}</strong>
          <p>${escapeHtml(result.explanation)}</p>
          ${result.correct ? "" : `<p class="muted">Correct answer: ${escapeHtml(data.correctAnswer)}</p>`}
          <button class="gw-btn ${data.quizStatus.completed ? "gold" : "ghost"}" id="dq-next-btn" type="button">
            ${data.quizStatus.completed ? "View results" : "Next question"}
          </button>
        `;
        show("dq-feedback");
      }

      quiz.answers.push(result);
      quiz.score = data.quizStatus.score;
      quiz.completed = data.quizStatus.completed;
      quiz.answeredCount = data.quizStatus.answeredCount;
      quiz.remainingCount = data.quizStatus.remainingCount;
      quiz.state = data.quizStatus.state;
      quiz.reward = data.reward || data.quizStatus.reward;
      updateStatus(data.quizStatus);

      if (data.reward && window.HQ) window.HQ.showReward(data.reward);

      const next = $("dq-next-btn");
      if (next) next.addEventListener("click", () => {
        locked = false;
        renderQuestion();
      });
    } catch (err) {
      locked = false;
      renderError(err.message);
    }
  }

  async function loadQuiz() {
    show("dq-loading");
    hide("dq-completed");
    hide("dq-question-wrap");
    try {
      quiz = await fetchToday();
      renderQuestion();
    } catch (err) {
      renderError(err.message);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initElements();
    if (els["dq-start-btn"]) els["dq-start-btn"].addEventListener("click", loadQuiz);
    if (els["dq-answer-form"]) {
      els["dq-answer-form"].addEventListener("click", (event) => {
        const btn = event.target.closest(".dq-option");
        if (!btn) return;
        submitAnswer(Number(btn.dataset.index), btn);
      });
    }
    loadQuiz();
  });
})();
// <Liam Member 5 Daily Quiz End>
