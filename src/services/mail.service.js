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
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendPasswordReset(toEmail, resetUrl) {
  const t = getTransporter();
  if (!t) throw new Error("SMTP is not configured");
  const from = process.env.MAIL_FROM || `scamlah <${process.env.SMTP_USER}>`;

  await t.sendMail({
    from,
    to: toEmail,
    subject: "Reset your scamlah password",
    text:
      `We received a request to reset your scamlah password.\n\n` +
      `Reset it here (link expires in 1 hour):\n${resetUrl}\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:480px;margin:auto">` +
      `<h2 style="color:#1E3A5F">Reset your scamlah password</h2>` +
      `<p>We received a request to reset your password. This link expires in 1 hour.</p>` +
      `<p><a href="${resetUrl}" style="display:inline-block;background:#1E3A5F;color:#fff;` +
      `padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>` +
      `<p style="color:#5b6776;font-size:13px">If you didn't request this, you can ignore this email.</p>` +
      `</div>`,
  });
}

// Optional: verify SMTP credentials/connection (used by tooling/tests).
async function verifyConnection() {
  const t = getTransporter();
  if (!t) throw new Error("SMTP is not configured");
  return t.verify();
}

module.exports = { isConfigured, sendPasswordReset, verifyConnection };
// <Shania End>
