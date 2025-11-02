const nodemailer = require("nodemailer");

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true });

async function sendEmail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || "Lernitt <no-reply@lernitt.local>";
  const info = await transporter.sendMail({ from, to, subject, text, html });
  console.log("[email] sent:", info.messageId || info);
}

module.exports = { sendEmail };
