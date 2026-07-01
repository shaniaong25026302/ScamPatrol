// <Shania Start>
// public/js/sound.js — synthesized retro SFX (Web Audio) + MP3 theme song (HTML5 audio).
// SFX are robust against rapid retriggers; the theme resumes from its last position across
// page navigations (sessionStorage) and restarts the instant the user interacts on a new page.
(function () {
  "use strict";
  const LS_SFX = "sp_sfx";
  const LS_MUSIC = "sp_music";
  const LS_POS = "sp_pos";
  const THEME_SRC = "/audio/theme.mp3";

  let sfxOn = localStorage.getItem(LS_SFX) !== "0"; // default ON
  let musicOn = localStorage.getItem(LS_MUSIC) !== "0"; // default ON (starts on first interaction)

  // ---------- Web Audio SFX ----------
  let ctx = null;
  let master = null;
  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6; // louder
    const comp = ctx.createDynamicsCompressor(); // keeps it loud without harsh clipping
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }
  function resumeCtx() {
    if (ctx && ctx.state !== "running" && ctx.resume) ctx.resume();
  }
  function tone(freq, dur, type, peak, delay) {
    if (!ensureCtx()) return;
    resumeCtx();
    try {
      const t0 = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak || 0.3, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (_) { /* noop */ } };
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    } catch (_) {
      /* never let one bad schedule mute everything */
    }
  }

  let lastBlip = 0;
  const SFX = {
    click() {
      if (!sfxOn) return;
      const now = Date.now();
      if (now - lastBlip < 35) return;
      lastBlip = now;
      tone(400 + Math.random() * 60, 0.07, "square", 0.5);
    },
    xp() { if (!sfxOn) return; tone(660, 0.08, "square", 0.6, 0); tone(880, 0.11, "square", 0.6, 0.07); },
    badge() { if (!sfxOn) return; [523, 784, 1046].forEach((f, i) => tone(f, 0.14, "triangle", 0.65, i * 0.09)); },
    level() { if (!sfxOn) return; [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, "square", 0.6, i * 0.09)); },
    win() { if (!sfxOn) return; [523, 659, 784, 1046, 880, 1318].forEach((f, i) => tone(f, 0.16, "square", 0.6, i * 0.11)); },
    error() { if (!sfxOn) return; tone(200, 0.2, "sawtooth", 0.6, 0); tone(150, 0.24, "sawtooth", 0.6, 0.12); },
    // Owl "hoo-hoot" — two soft descending sine notes
    hoot() { if (!sfxOn) return; tone(420, 0.16, "sine", 0.7, 0); tone(340, 0.22, "sine", 0.7, 0.2); },
    // Cartoon "ow!" — a quick high-to-low yelp when the owl is poked
    ow() { if (!sfxOn) return; tone(640, 0.06, "square", 0.6, 0); tone(300, 0.16, "sine", 0.6, 0.05); },
  };

  // ---------- MP3 theme song ----------
  let music = null;
  function ensureMusic() {
    if (music) return music;
    music = new window.Audio(THEME_SRC);
    music.loop = true;
    music.volume = 0.6;
    music.preload = "auto";
    // resume from where the previous page left off
    const saved = parseFloat(sessionStorage.getItem(LS_POS) || "0");
    if (saved > 0) {
      music.addEventListener("loadedmetadata", () => {
        try { music.currentTime = music.duration ? saved % music.duration : saved; } catch (_) { /* noop */ }
      }, { once: true });
    }
    music.addEventListener("timeupdate", () => {
      sessionStorage.setItem(LS_POS, String(music.currentTime));
    });
    return music;
  }
  function startMusic() {
    ensureMusic();
    const p = music.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked until a gesture; armResume retries */ });
  }
  function stopMusic() {
    if (music) music.pause();
  }

  // ---------- toggles ----------
  function updateButtons() {
    const s = document.getElementById("snd-sfx");
    const m = document.getElementById("snd-music");
    if (s) { s.textContent = sfxOn ? "🔊" : "🔇"; s.style.opacity = sfxOn ? "1" : ".5"; }
    if (m) { m.textContent = "🎵"; m.style.opacity = musicOn ? "1" : ".4"; }
  }
  function setSfx(on) {
    sfxOn = on; localStorage.setItem(LS_SFX, on ? "1" : "0"); updateButtons();
    if (on) SFX.click();
  }
  function setMusic(on) {
    musicOn = on; localStorage.setItem(LS_MUSIC, on ? "1" : "0"); updateButtons();
    if (on) startMusic(); else stopMusic();
  }

  // ---------- gesture unlock ----------
  function onFirstGesture() {
    ensureCtx();
    resumeCtx();
    if (musicOn) startMusic();
  }
  function armResume() {
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll", "click", "wheel"];
    const fire = () => {
      onFirstGesture();
      if (music && !music.paused) events.forEach((e) => window.removeEventListener(e, fire, true));
    };
    events.forEach((e) => window.addEventListener(e, fire, true));
  }
  armResume();
  window.addEventListener("pageshow", onFirstGesture);

  document.addEventListener("click", (e) => {
    resumeCtx();
    // The owl mentors play their own hoot/ow — never the generic button click.
    if (e.target.closest("#mentor, #owl-react")) return;
    if (e.target.closest("button, .gw-btn, .btn, a, .lb-tab, .badge-card, .villain")) SFX.click();
  });

  document.addEventListener("DOMContentLoaded", () => {
    updateButtons();
    const s = document.getElementById("snd-sfx");
    const m = document.getElementById("snd-music");
    if (s) s.addEventListener("click", (e) => { e.preventDefault(); setSfx(!sfxOn); });
    if (m) m.addEventListener("click", (e) => { e.preventDefault(); setMusic(!musicOn); });
  });

  window.SOUND = {
    sfx: SFX,
    reward(r) {
      if (!r) return;
      if (r.leveledUp) SFX.level();
      else SFX.xp();
      if (r.newBadges && r.newBadges.length) setTimeout(() => SFX.badge(), 260);
    },
  };
})();
// <Shania End>
