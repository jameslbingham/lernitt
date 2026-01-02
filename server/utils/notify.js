const Notification = require('../models/Notification');
const User = require('../models/User'); // ✅ ADDED: To find the user's email
const { sendEmail } = require('./sendEmail'); // ✅ ADDED: Using the SendGrid version

async function notify(user, type, title, message = '', data = {}) {
  // 1. Create the in-app notification in MongoDB
  const notification = await Notification.create({ user, type, title, message, data });

  // 2. ✅ NEW: Trigger a real email alert
  try {
    const recipient = await User.findById(user).select('email name');
    
    if (recipient && recipient.email) {
      await sendEmail({
        to: recipient.email,
        subject: `Lernitt: ${title}`,
        text: message,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Lernitt Notification</h2>
            <p>Hello ${recipient.name},</p>
            <p><strong>${title}</strong></p>
            <p>${message}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">
              Log in to your dashboard to view more details.
            </p>
          </div>
        `
      });
    }
  } catch (err) {
    console.error('[notify] Failed to send email alert:', err);
  }

  return notification;
}

module.exports = { notify };
