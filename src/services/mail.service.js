// <Shania Start>
// src/services/mail.service.js — outgoing email via SMTP (Nodemailer).
// Used for password-reset links. If SMTP isn't configured, isConfigured() is false
// and callers fall back to the on-screen dev link instead of throwing.
const nodemailer = require("nodemailer");

let transporter;

function isConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
      // Force IPv4: Render can't route outbound IPv6, so resolving Gmail to an
      // IPv6 address caused ENETUNREACH / connection timeouts.
      family: 4,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Keep an authenticated connection warm so each reset email skips the
      // slow DNS + TLS + AUTH handshake (this is what made delivery feel laggy).
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
  if (!isConfigured()) {
    console.error("SMTP not configured (SMTP_USER/SMTP_PASS missing) — reset emails will fail.");
    return false;
  }
  try {
    await getTransporter().verify();
    console.log(`SMTP ready: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} as ${process.env.SMTP_USER}`);
    return true;
  } catch (e) {
    console.error(`SMTP verify FAILED (${e.code || ""}): ${e.message}`);
    return false;
  }
}

async function sendPasswordReset(toEmail, resetUrl) {
  const t = getTransporter();
  if (!t) throw new Error("SMTP is not configured");
  const from = process.env.MAIL_FROM || `Scam Patrol <${process.env.SMTP_USER}>`;

  const info = await t.sendMail({
    from,
    to: toEmail,
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
  });
  console.log(`Password reset email sent (id ${info.messageId}) -> ${toEmail}`);
  return info;
}

// Optional: verify SMTP credentials/connection (used by tooling/tests).
async function verifyConnection() {
  const t = getTransporter();
  if (!t) throw new Error("SMTP is not configured");
  return t.verify();
}

module.exports = { isConfigured, sendPasswordReset, verifyConnection, warmUp };
// <Shania End>
