// <Liam Member 5 Start>
// public/js/scam-weather.js
// -----------------------------------------------------------------------------
// Scam Weather browser helper.
// This file deliberately keeps the page interactive while the backend performs
// the slower "daily report" automation.
// -----------------------------------------------------------------------------

(function () {
  const loadingBox = document.getElementById("sw-daily-loading");
  const contentBox = document.getElementById("sw-daily-content");
  const refreshBtn = document.getElementById("sw-refresh-btn");
  const monthlyLoadingBox = document.getElementById("sw-monthly-loading");
  const monthlyContentBox = document.getElementById("sw-monthly-content");
  const monthlyRefreshBtn = document.getElementById("sw-monthly-refresh-btn");
  const loadMoreBtn = document.getElementById("sw-load-more");
  const newsList = document.getElementById("sw-news-list");

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Unknown time" : d.toLocaleString();
  }

  function setReportLoading(isLoading) {
    if (!loadingBox || !contentBox) return;
    loadingBox.classList.toggle("sw-hidden", !isLoading);
    contentBox.classList.toggle("sw-hidden", isLoading);
    if (refreshBtn) refreshBtn.disabled = isLoading;
  }

  function barRow(label, value, max) {
    const pct = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
    return `
      <div class="sw-bar-row">
        <div class="sw-bar-label">
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </div>
        <div class="sw-bar-track"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }

  function renderReport(report, ids) {
    const totalEl = document.getElementById(ids.totalArticles);
    const leadingEl = document.getElementById(ids.leadingType);
    const windowEl = document.getElementById(ids.reportWindow);
    const fallbackEl = ids.fallbackReason ? document.getElementById(ids.fallbackReason) : null;
    const typeBars = document.getElementById(ids.typeBars);
    const sourceBars = document.getElementById(ids.sourceBars);
    const usedArticles = document.getElementById(ids.usedArticles);

    if (totalEl) totalEl.textContent = report.totalArticles || 0;
    if (leadingEl) {
      leadingEl.textContent =
        report.leadingType && report.leadingType.type
          ? `${report.leadingType.type} is the leading signal`
          : "No strong signal yet";
    }
    if (windowEl) {
      windowEl.textContent = `${report.windowLabel} · generated ${fmtDate(report.generatedAt)}`;
    }
    if (fallbackEl) {
      fallbackEl.textContent = report.fallbackReason || "";
    }

    const maxType = Math.max(1, ...(report.typeCounts || []).map((item) => item.count));
    const maxSource = Math.max(1, ...(report.sourceCounts || []).map((item) => item.count));

    if (typeBars) {
      typeBars.innerHTML = (report.typeCounts || []).length
        ? report.typeCounts.map((item) => barRow(item.type, item.count, maxType)).join("")
        : "<p class='muted'>No scam-type signal yet.</p>";
    }

    if (sourceBars) {
      sourceBars.innerHTML = (report.sourceCounts || []).length
        ? report.sourceCounts.map((item) => barRow(item.sourceName, item.count, maxSource)).join("")
        : "<p class='muted'>No source signal yet.</p>";
    }

    if (usedArticles) {
      usedArticles.innerHTML = (report.articlesUsed || []).length
        ? report.articlesUsed.map((article) => `
            <article class="sw-used-article">
              <strong><a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></strong>
              <p class="muted">${escapeHtml(article.sourceName)} · ${fmtDate(article.publishedAt)} · ${escapeHtml(article.freshnessLabel || "Trusted source")}</p>
              <div class="sw-type-chip-row">
                ${(article.scamTypes || []).map((type) => `<span class="sw-type-chip">${escapeHtml(type)}</span>`).join("")}
              </div>
            </article>
          `).join("")
        : "<p class='muted'>No articles were used.</p>";
    }
  }

  function renderDailyReport(report) {
    renderReport(report, {
      totalArticles: "sw-total-articles",
      leadingType: "sw-leading-type",
      reportWindow: "sw-report-window",
      typeBars: "sw-type-bars",
      sourceBars: "sw-source-bars",
      usedArticles: "sw-used-articles"
    });

    setReportLoading(false);
  }

  function setMonthlyReportLoading(isLoading) {
    if (!monthlyLoadingBox || !monthlyContentBox) return;
    monthlyLoadingBox.classList.toggle("sw-hidden", !isLoading);
    monthlyContentBox.classList.toggle("sw-hidden", isLoading);
    if (monthlyRefreshBtn) monthlyRefreshBtn.disabled = isLoading;
  }

  function renderMonthlyReport(report) {
    renderReport(report, {
      totalArticles: "sw-month-total-articles",
      leadingType: "sw-month-leading-type",
      reportWindow: "sw-month-report-window",
      fallbackReason: "sw-month-fallback-reason",
      typeBars: "sw-month-type-bars",
      sourceBars: "sw-month-source-bars",
      usedArticles: "sw-month-used-articles"
    });

    setMonthlyReportLoading(false);
  }

  async function loadDailyReport(force = false) {
    setReportLoading(true);

    try {
      const res = await fetch(`/api/scam-weather/daily-report${force ? "?force=1" : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderDailyReport(data.report);
    } catch (err) {
      if (loadingBox) {
        loadingBox.innerHTML = `
          <span>⚠️</span>
          <div>
            <strong>Daily report could not refresh.</strong>
            <p class="muted">The cached Scam News below is still available. Error: ${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    }
  }



  async function loadMonthlyReport(force = false) {
    setMonthlyReportLoading(true);

    try {
      const res = await fetch(`/api/scam-weather/monthly-report${force ? "?force=1" : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderMonthlyReport(data.report);
    } catch (err) {
      if (monthlyLoadingBox) {
        monthlyLoadingBox.innerHTML = `
          <span>⚠️</span>
          <div>
            <strong>Monthly report could not refresh.</strong>
            <p class="muted">Seasonal advice and Scam News are still available. Error: ${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    }
  }

  function renderArticleCard(article) {
    return `
      <article class="panel sw-article-card">
        <div class="sw-article-meta">
          <span class="gw-chip">${escapeHtml(article.sourceName)}</span>
          <span class="gw-risk ${escapeHtml(article.riskLevel)}">${escapeHtml(article.riskLevel)}</span>
          <span class="muted">${fmtDate(article.publishedAt)}</span>
          <span class="gw-chip">${escapeHtml(article.freshnessLabel || "Trusted source")}</span>
        </div>

        <h2><a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h2>
        <p>${escapeHtml(article.summary)}</p>

        <div class="sw-type-chip-row">
          ${(article.scamTypes || []).map((type) => `<span class="sw-type-chip">${escapeHtml(type)}</span>`).join("")}
        </div>
      </article>
    `;
  }

  async function loadMoreNews() {
    if (!loadMoreBtn || !newsList) return;

    const page = Number(loadMoreBtn.dataset.nextPage || 2);
    const type = loadMoreBtn.dataset.type || "all";
    const source = loadMoreBtn.dataset.source || "all";
    const params = new URLSearchParams({ page: String(page), limit: "6", type, source });

    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading another 6…";

    try {
      const res = await fetch(`/api/scam-weather/news?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.articles && data.articles.length) {
        newsList.insertAdjacentHTML("beforeend", data.articles.map(renderArticleCard).join(""));
      }

      loadMoreBtn.dataset.nextPage = String(page + 1);
      loadMoreBtn.dataset.hasMore = data.hasMore ? "true" : "false";
      loadMoreBtn.style.display = data.hasMore ? "inline-flex" : "none";
    } catch (err) {
      loadMoreBtn.textContent = `Could not load news (${err.message})`;
      setTimeout(() => {
        loadMoreBtn.textContent = "View another 6 articles";
        loadMoreBtn.disabled = false;
      }, 1800);
      return;
    }

    loadMoreBtn.textContent = "View another 6 articles";
    loadMoreBtn.disabled = false;
  }

  if (refreshBtn) refreshBtn.addEventListener("click", () => loadDailyReport(true));
  if (monthlyRefreshBtn) monthlyRefreshBtn.addEventListener("click", () => loadMonthlyReport(true));
  if (loadMoreBtn) {
    loadMoreBtn.style.display = loadMoreBtn.dataset.hasMore === "true" ? "inline-flex" : "none";
    loadMoreBtn.addEventListener("click", loadMoreNews);
  }

  if (loadingBox && contentBox) loadDailyReport(false);
  if (monthlyLoadingBox && monthlyContentBox) loadMonthlyReport(false);
})();
// <Liam Member 5 End>
