// <Shania Start>
// public/js/game-story.js — origin story: cutscenes + branching scam scenario engine.
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const LOGO = '<img src="/img/logo-cropped.png?v=3" class="logo-big pixel" alt="Scam Patrol HQ"/>';

  // ---------- CUTSCENES ----------
  const scenes = [
    { char: "🧓", speaker: "STORY", text: "This is your Uncle Tan. Retired bus captain. Loves his grandkids and his kopi-o.", btn: "Next ▸" },
    { char: "📱", speaker: "STORY", text: "One quiet afternoon, a text message buzzed on his phone…", btn: "Read it ▸" },
    { char: "💬", speaker: "THE SMS", text: "\"POSB: Your account is LOCKED. Verify now or it will be suspended: http://posb-secure-verify.xyz\"", btn: "And then? ▸" },
    { char: "😰", speaker: "STORY", text: "He clicked the link. He typed his bank login. By dinner, his life savings — $8,000 — were gone.", btn: "…", shake: true },
    { html: LOGO, speaker: "INSPECTOR HOOT", text: "Hoot hoot! I am INSPECTOR HOOT of Scam Patrol HQ. Don't lose hope, recruit.", btn: "Who are you? ▸" },
    { portal: true, speaker: "INSPECTOR HOOT", text: "I can turn back time — to the very moment that SMS arrived. This time, YOU guide Uncle Tan's hands.", btn: "🌀 ENTER THE PORTAL" },
  ];

  let si = 0;
  function renderScene() {
    const s = scenes[si];
    const vis = $("cut-visual");
    if (s.portal) vis.innerHTML = '<div class="portal"></div>';
    else if (s.html) vis.innerHTML = s.html;
    else vis.innerHTML = '<div class="char' + (s.shake ? " shake" : "") + '">' + s.char + "</div>";
    $("cut-speaker").textContent = s.speaker || "";
    $("cut-text").textContent = s.text;
    const acts = $("cut-actions");
    acts.innerHTML = "";
    const b = document.createElement("button");
    b.className = "gw-btn" + (s.portal ? " gold" : "");
    b.textContent = s.btn;
    b.addEventListener("click", () => {
      si += 1;
      if (si >= scenes.length) startInteractive();
      else renderScene();
    });
    acts.appendChild(b);
  }

  // ---------- BRANCHING SCENARIO ----------
  const NODES = {
    start: {
      who: "them", whoLabel: "POSB Bank (?)",
      text: "We detected suspicious activity. Your account is LOCKED 🔒. Verify now to avoid suspension: http://posb-secure-verify.xyz",
      choices: [
        { label: "🔗 Click the link and log in", say: "Okay… let me log in.", goto: "stop_click" },
        { label: "💬 Reply 'STOP' to unsubscribe", say: "STOP", goto: "reply_stop" },
        { label: "📞 Call POSB using the number on the bank card", say: "I'll call the official number on my card.", goto: "good_call" },
        { label: "📱 Ignore it, open the REAL bank app", say: "Let me check the real app instead.", goto: "good_app" },
      ],
    },
    stop_click: {
      who: "owl",
      text: "STOP! 🦉 A real bank NEVER sends a login link by SMS. That fake site just steals your password. Good thing I can rewind — try again, recruit!",
      choices: [{ label: "⏪ Rewind and try again", goto: "start" }],
    },
    reply_stop: {
      who: "them", whoLabel: "POSB Bank (?)",
      text: "This IS POSB. To confirm your identity, reply with your NRIC and card PIN now.",
      choices: [
        { label: "📨 Send NRIC and PIN", say: "S1234567A, PIN 1234", goto: "stop_pin" },
        { label: "🚫 Don't reply — call the bank", say: "No. I'll call the bank myself.", goto: "good_call" },
      ],
    },
    stop_pin: {
      who: "owl",
      text: "NO! 🦉 Your NRIC and PIN are the keys to everything. Banks NEVER ask for them. Replying = handing over your money. Rewind!",
      choices: [{ label: "⏪ Rewind and try again", goto: "start" }],
    },
    good_call: {
      who: "owl",
      text: "Smart move! 🦉 You called the OFFICIAL number. POSB confirms there was no problem — that SMS was a SCAM. Uncle Tan's money is safe! 💰",
      choices: [{ label: "Continue ▸", goto: "report_prompt" }],
    },
    good_app: {
      who: "owl",
      text: "Excellent! 🦉 The REAL app shows nothing wrong. The SMS was fake all along. Uncle Tan is safe! 💰",
      choices: [{ label: "Continue ▸", goto: "report_prompt" }],
    },
    report_prompt: {
      who: "owl",
      text: "One last thing, recruit — shall we report this scam so your neighbours don't fall for it?",
      choices: [
        { label: "🛡️ Report the scam SMS", goto: "win_report" },
        { label: "Just stay safe for now", goto: "win_safe" },
      ],
    },
    win_report: { outcome: "win", xp: true, title: "🎉 UNCLE TAN IS SAVED!",
      text: "And you reported the scam — the whole neighbourhood is safer. You're a natural, recruit." },
    win_safe: { outcome: "win", xp: true, title: "✅ Uncle Tan is safe!",
      text: "His savings are protected. Welcome to Scam Patrol HQ." },
  };

  function startInteractive() {
    $("cutscene").style.display = "none";
    $("phone-view").style.display = "block";
    goto("start");
  }

  function addBubble(who, whoLabel, text) {
    const div = document.createElement("div");
    div.className = "bubble " + who;
    div.innerHTML = (whoLabel ? '<span class="who">' + whoLabel + "</span>" : "") + text;
    $("chat").appendChild(div);
    div.scrollIntoView({ behavior: "smooth", block: "end" });
    if (who === "owl" && window.SOUND) window.SOUND.sfx.hoot();
  }

  function goto(id) {
    const node = NODES[id];
    $("choices").innerHTML = "";
    if (node.outcome) return showOutcome(node);
    addBubble(node.who, node.whoLabel || (node.who === "owl" ? "Inspector Hoot" : ""), node.text);
    const box = $("choices");
    (node.choices || []).forEach((c) => {
      const b = document.createElement("button");
      b.className = "gw-btn ghost";
      b.textContent = c.label;
      b.addEventListener("click", () => {
        if (c.say) addBubble("me", "Uncle Tan", c.say);
        goto(c.goto);
      });
      box.appendChild(b);
    });
  }

  async function showOutcome(node) {
    if (window.SOUND) window.SOUND.sfx.win();
    const out = $("story-outcome");
    out.innerHTML =
      '<div class="outcome win"><div class="story-speaker" style="color:var(--gw-green)">' + node.title + "</div>" +
      "<p>" + node.text + '</p><div id="out-reward" class="muted"></div>' +
      '<div id="out-cta" style="margin-top:.6rem"></div></div>';
    out.scrollIntoView({ behavior: "smooth" });
    const cta = $("out-cta");
    // Default CTA (guests can't enter HQ — they must sign up).
    cta.innerHTML = '<a href="/auth/register" class="gw-btn gold">CREATE ACCOUNT TO PLAY ▸</a>';
    if (!node.xp) return;
    try {
      const r = await fetch("/api/game/story/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (d.reward) {
        $("out-reward").textContent = "+" + d.reward.gainedXp + " XP earned!";
        cta.innerHTML = '<a href="/hq" class="gw-btn gold">ENTER SCAM PATROL HQ ▸</a>';
        if (window.HQ) window.HQ.showReward(d.reward);
      } else if (d.already) {
        $("out-reward").textContent = "You've already earned the origin-story reward — replay anytime!";
        cta.innerHTML = '<a href="/hq" class="gw-btn gold">ENTER SCAM PATROL HQ ▸</a>';
      } else if (d.guest) {
        $("out-reward").innerHTML = "Create an account to earn XP and climb the leaderboard.";
      }
    } catch (_) {
      /* ignore */
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("cutscene")) renderScene();
  });
})();
// <Shania End>
