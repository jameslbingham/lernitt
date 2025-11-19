// /server/utils/sendEmail.js
const sgMail = require("@sendgrid/mail");

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "no-reply@lernitt.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY not set – emails will not be sent.");
}

async function sendEmail({ to, subject, text, html }) {
  if (!SENDGRID_API_KEY) {
    console.warn("sendEmail called but SENDGRID_API_KEY is missing.");
    return;
  }

  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    text: text || undefined,
    html: html || undefined,
  };

  try {
    await sgMail.send(msg);
  } catch (err) {
    console.error("SendGrid sendEmail error:", err.response?.body || err);
  }
}

module.exports = { sendEmail };
