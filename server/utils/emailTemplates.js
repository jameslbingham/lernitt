// server/utils/emailTemplates.js

/**
 * Generates the HTML for the 5-Lesson Package Receipt Email
 * Used when a student successfully purchases a bundle.
 */
const generatePackageReceiptEmail = (lesson, studentName) => {
  // Calculate total by multiplying the locked price per lesson by the package size
  const totalAmount = (lesson.price * (lesson.packageSize || 5)).toFixed(2);
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px;">
      <h2 style="color: #4f46e5; margin-bottom: 5px;">LERNITT</h2>
      <h1 style="font-size: 20px; color: #1e293b;">Your 5-Lesson Package Receipt</h1>
      
      <p>Hi ${studentName},</p>
      <p>Success! Your payment for the <strong>${lesson.lessonTypeTitle || 'General Lesson'}</strong> package with ${lesson.tutorName || 'your tutor'} has been processed.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 14px; color: #64748b; text-transform: uppercase;">Package Breakdown</h3>
        <table width="100%">
          <tr>
            <td style="padding: 5px 0; color: #475569;">1x Scheduled Lesson</td>
            <td align="right" style="color: #1e293b;">${new Date(lesson.startTime).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #475569;">4x Pre-paid Credits</td>
            <td align="right" style="color: #1e293b;">Added to Dashboard</td>
          </tr>
          <tr style="font-weight: bold; border-top: 1px solid #e2e8f0;">
            <td style="padding-top: 10px; color: #1e293b;">Total Paid</td>
            <td style="padding-top: 10px; color: #4f46e5;" align="right">€${totalAmount}</td>
          </tr>
        </table>
      </div>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-lessons" 
         style="display: block; background: #4f46e5; color: white; text-align: center; padding: 15px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px;">
         Schedule your next session
      </a>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; text-align: center;">
        Your price is locked for all lessons in this bundle.
      </p>
    </div>
  `;
};

module.exports = { generatePackageReceiptEmail };
