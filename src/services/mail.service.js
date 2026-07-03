// <Shania Start>
// src/services/mail.service.js — outgoing email via SMTP (Nodemailer).
// Used for password-reset links. If SMTP isn't configured, isConfigured() is false
// and callers fall back to the on-screen dev link instead of throwing.
const nodemailer = require("nodemailer");
const dns = require("dns").promises;

let transporter;

function hasMailjet() {
  return Boolean(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);
}
function hasHttpApi() {
  return Boolean(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY) || hasMailjet();
}
function hasSmtp() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}
function isConfigured() {
  return hasHttpApi() || hasSmtp();
}

// Parse MAIL_FROM ("Name <email>") into { name, email } for the HTTP API sender.
function senderIdentity() {
  const raw = process.env.MAIL_FROM || "";
  const m = raw.match(/^(.*?)<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || "Scam Patrol", email: m[2].trim() };
  if (raw.includes("@")) return { name: "Scam Patrol", email: raw.trim() };
  return { name: "Scam Patrol", email: process.env.SMTP_USER || "no-reply@scampatrol.app" };
}

// Send via Brevo's HTTPS API (port 443) — works on hosts that block SMTP (e.g. Render).
async function sendViaBrevo({ to, subject, text, html }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: senderIdentity(),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => ({}));
  return { messageId: data.messageId || "(brevo)" };
}

// Send via Resend's HTTPS API (port 443). No phone needed to sign up. On the free tier
// WITHOUT a verified domain you must send FROM onboarding@resend.dev and can only send
// TO your own Resend account email — fine for a demo/reset of your own account.
async function sendViaResend({ to, subject, text, html }) {
  const from = process.env.RESEND_FROM || "Scam Patrol <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => ({}));
  return { messageId: data.id || "(resend)" };
}

// Send via Mailjet's HTTPS Send API v3.1 (port 443). Auth = Basic base64(apiKey:secretKey).
// The From email must be a verified sender in Mailjet.
async function sendViaMailjet({ to, subject, text, html }) {
  const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString("base64");
  const sender = senderIdentity();
  const res = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: sender.email, Name: sender.name },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
          HTMLPart: html,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mailjet API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => ({}));
  const msg = data && data.Messages && data.Messages[0];
  const id = msg && msg.To && msg.To[0] && (msg.To[0].MessageID || msg.To[0].MessageUUID);
  return { messageId: id || "(mailjet)" };
}

async function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const hostname = process.env.SMTP_HOST || "smtp.gmail.com";
    // Render has NO outbound IPv6 route, so letting Node resolve smtp.gmail.com
    // (which prefers an AAAA/IPv6 record) caused ENETUNREACH / timeouts. Resolve a
    // literal IPv4 ourselves and pin TLS to the real hostname so the cert still validates.
    let host = hostname;
    try {
      host = (await dns.lookup(hostname, { family: 4 })).address;
    } catch (_) {
      /* fall back to the hostname if the lookup fails */
    }
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
      tls: { servername: hostname }, // SNI + cert validation against smtp.gmail.com
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      // Longer timeouts: cloud hosts (Render) reach smtp.gmail.com slower than localhost.
      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: 25000,
    });
  }
  return transporter;
}

// Open + authenticate the connection ahead of time (called at startup).
// Non-throwing, but LOGS the outcome so the real SMTP problem is visible in Render logs.
async function warmUp() {
  if (hasHttpApi()) {
    const provider = process.env.RESEND_API_KEY ? "Resend" : process.env.BREVO_API_KEY ? "Brevo" : "Mailjet";
    console.log(`Email: ${provider} HTTP API configured (sender ${senderIdentity().email}).`);
    return true;
  }
  if (!hasSmtp()) {
    console.error("Email not configured (no BREVO_API_KEY and no SMTP_USER/PASS) — reset emails will fail.");
    return false;
  }
  try {
    const t = await getTransporter();
    await t.verify();
    console.log(`SMTP ready: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} as ${process.env.SMTP_USER}`);
    return true;
  } catch (e) {
    console.error(`SMTP verify FAILED (${e.code || ""}): ${e.message}`);
    return false;
  }
}

function resetEmailContent(resetUrl) {
  return {
    subject: "Reset your Scam Patrol password",
    text:
      `We received a request to reset your Scam Patrol password.\n\n` +
      `Reset it here (link expires in 1 hour):\n${resetUrl}\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:480px;margin:auto">` +
      `<h2 style="color:#1E3A5F">Reset your Scam Patrol password</h2>` +
      `<p>We received a request to reset your password. This link expires in 1 hour.</p>` +
      `<p><a href="${resetUrl}" style="display:inline-block;background:#1E3A5F;color:#fff;` +
      `padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>` +
      `<p style="color:#5b6776;font-size:13px">If you didn't request this, you can ignore this email.</p>` +
      `</div>`,
  };
}

async function sendPasswordReset(toEmail, resetUrl) {
  const { subject, text, html } = resetEmailContent(resetUrl);

  // [DevOps: Reliability / provider failover] email is sent over an HTTP API (Mailjet/Resend/Brevo)
  // which works where the host blocks SMTP, and falls back to SMTP — so a single provider or
  // protocol being down doesn't take password reset down with it.
  if (process.env.RESEND_API_KEY) {
    const info = await sendViaResend({ to: toEmail, subject, text, html });
    console.log(`Password reset email sent via Resend (id ${info.messageId}) -> ${toEmail}`);
    return info;
  }
  if (process.env.BREVO_API_KEY) {
    const info = await sendViaBrevo({ to: toEmail, subject, text, html });
    console.log(`Password reset email sent via Brevo (id ${info.messageId}) -> ${toEmail}`);
    return info;
  }
  if (hasMailjet()) {
    const info = await sendViaMailjet({ to: toEmail, subject, text, html });
    console.log(`Password reset email sent via Mailjet (id ${info.messageId}) -> ${toEmail}`);
    return info;
  }

  const t = await getTransporter();
  if (!t) throw new Error("Email is not configured");
  const from = process.env.MAIL_FROM || `Scam Patrol <${process.env.SMTP_USER}>`;
  const info = await t.sendMail({ from, to: toEmail, subject, text, html });
  console.log(`Password reset email sent via SMTP (id ${info.messageId}) -> ${toEmail}`);
  return info;
}

// Optional: verify SMTP credentials/connection (used by tooling/tests).
async function verifyConnection() {
  const t = await getTransporter();
  if (!t) throw new Error("SMTP is not configured");
  return t.verify();
}

module.exports = { isConfigured, sendPasswordReset, verifyConnection, warmUp };
// <Shania End>
