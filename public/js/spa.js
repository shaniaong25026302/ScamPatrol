// <Shania Start>
// public/js/spa.js — soft navigation (pjax) so the audio + persistent shell survive page changes.
// Intercepts internal link clicks, swaps <main> via fetch, re-executes the new page's scripts,
// updates the URL + nav highlight, and FALLS BACK to a normal full navigation on any problem.
(function () {
  "use strict";
  if (!window.history || !window.fetch || !window.DOMParser) return; // unsupported → normal nav

  const MAIN = "main.game-main";

  function updateNavActive() {
    const path = location.pathname;
    document.querySelectorAll(".gw-nav a").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === path);
    });
  }

  function injectScript(old) {
    return new Promise((resolve) => {
      const s = document.createElement("script");
      Array.from(old.attributes).forEach((att) => s.setAttribute(att.name, att.value));
      if (old.src) {
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      } else {
        s.textContent = old.textContent;
        document.body.appendChild(s);
        resolve();
      }
    });
  }

  // Re-run the swapped-in scripts. We temporarily capture their DOMContentLoaded/load/ready
  // registrations and fire them immediately (the DOM is already ready) — this initialises page
  // scripts WITHOUT re-firing the persistent shell scripts' listeners.
  async function runScripts(scripts) {
    const dAdd = document.addEventListener;
    const wAdd = window.addEventListener;
    const pending = [];
    const cap = (orig, target) =>
      function (type, listener, opts) {
        if (type === "DOMContentLoaded" || type === "load" || type === "readystatechange") {
          if (typeof listener === "function") pending.push(listener);
          return undefined;
        }
        return orig.call(target, type, listener, opts);
      };
    document.addEventListener = cap(dAdd, document);
    window.addEventListener = cap(wAdd, window);
    try {
      for (const sc of scripts) await injectScript(sc);
    } finally {
      document.addEventListener = dAdd;
      window.addEventListener = wAdd;
    }
    pending.forEach((fn) => {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

  let navToken = 0;
  async function navigate(url, push) {
    const token = ++navToken;
    const res = await fetch(url, { headers: { "X-Requested-With": "spa" }, credentials: "same-origin" });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("text/html")) throw new Error("not an HTML page");
    const html = await res.text();
    if (token !== navToken) return; // superseded by a newer navigation

    const doc = new DOMParser().parseFromString(html, "text/html");
    const newMain = doc.querySelector(MAIN);
    const curMain = document.querySelector(MAIN);
    if (!newMain || !curMain) throw new Error("no main element");

    const finalUrl = new URL(res.url || url, location.href);
    document.title = doc.title || document.title;

    const scripts = Array.from(newMain.querySelectorAll("script"));
    scripts.forEach((s) => s.remove());
    curMain.innerHTML = newMain.innerHTML;

    if (push) history.pushState({ spa: true }, "", finalUrl.pathname + finalUrl.search);
    window.scrollTo(0, 0);
    updateNavActive();
    await runScripts(scripts);
    if (window.HQ && window.HQ.refresh) window.HQ.refresh();
  }

  function resolveLink(a, e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return null;
    if (a.dataset && a.dataset.action === "logout") return null;
    const href = a.getAttribute("href");
    if (!href || href[0] === "#" || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return null;
    return url;
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    const url = a ? resolveLink(a, e) : null;
    if (!url) return;
    e.preventDefault();
    navigate(url.pathname + url.search, true).catch(() => {
      window.location.href = url.href; // graceful fallback to a normal full navigation
    });
  });

  window.addEventListener("popstate", () => {
    navigate(location.pathname + location.search, false).catch(() => window.location.reload());
  });

  history.replaceState({ spa: true }, "", location.href);
})();
// <Shania End>
