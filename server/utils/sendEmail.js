// /server/utils/sendEmail.js
/**
 * LERNITT ACADEMY - EMAIL DELIVERY UTILITY
 * ----------------------------------------------------------------------------
 * Powered by SendGrid. This utility handles:
 * - Onboarding/Welcome emails
 * - Secure Password Reset tokens
 * - Lesson Reminders and Notifications
 * ----------------------------------------------------------------------------
 */

const sgMail = require("@sendgrid/mail");

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "no-reply@lernitt.com";

// Initialize the SendGrid instance
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("[SENDGRID] API Key is missing. Check Render environment variables.");
}

/**
 * sendEmail
 * Primary transport function for platform communications.
 */
async function sendEmail({ to, subject, text, html }) {
  if (!SENDGRID_API_KEY) {
    console.warn("[SENDGRID] Call aborted: API Key missing.");
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
    const response = await sgMail.send(msg);
    return response;
  } catch (err) {
    // Extract the specific error reason from SendGrid response
    const errorMessage = err.response?.body?.errors?.[0]?.message || err.message;
    console.error("[SENDGRID_FAILURE]:", errorMessage);
    
    // ✅ CRITICAL CHANGE: Throw the error so the backend routes (like /forgot-password) 
    // know the email failed and can notify the user.
    throw new Error(`Email delivery failed: ${errorMessage}`);
  }
}

module.exports = { sendEmail };
