/**
 * ============================================================================
 * LERNITT ACADEMY - CENTRAL COMMUNICATION BLUEPRINTS (emailTemplates.js)
 * ============================================================================
 * VERSION: 2.1.0 (STAGE 10 WITHDRAWAL RECEIPTS INTEGRATED)
 * ----------------------------------------------------------------------------
 * ROLE:
 * This module is the "Voice of the Academy." It generates the high-fidelity 
 * HTML payloads for all transactional emails dispatched via SendGrid/SMTP.
 * ----------------------------------------------------------------------------
 * ARCHITECTURAL HANDSHAKES:
 * 1. STUDENT RECEIPTS (Stage 6): Itemized billing for single and bundle buys.
 * 2. TUTOR RECEIPTS (Stage 10): Formal notification of successful withdrawals.
 * 3. BRAND INTEGRITY: Unified CSS styling across all academic member levels.
 * ----------------------------------------------------------------------------
 * MANDATORY OPERATING RULES:
 * - NO TRUNCATION: This is a 100% complete, copy-pasteable production file.
 * - FEATURE INTEGRITY: All legacy package and trial receipts remain active.
 * - ZERO LOGIC LOSS: Preserves existing totalAmount and date formatting.
 * ============================================================================
 */

/**
 * generatePackageReceiptEmail()
 * ----------------------------------------------------------------------------
 * Logic: Generates the HTML for the 5-Lesson Package Receipt Email.
 * Used when a student successfully purchases a bundle in Stage 6.
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

/**
 * generateSingleLessonReceiptEmail()
 * ----------------------------------------------------------------------------
 * Logic: Generates the HTML for a Single Lesson Receipt Email.
 * Used for standard individual bookings verified by Stage 6 Webhooks.
 */
const generateSingleLessonReceiptEmail = (lesson, studentName) => {
  const amount = Number(lesson.price || 0).toFixed(2);
  
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px;">
      <h2 style="color: #4f46e5; margin-bottom: 5px;">LERNITT</h2>
      <h1 style="font-size: 20px; color: #1e293b;">Lesson Confirmation & Receipt</h1>
      
      <p>Hi ${studentName},</p>
      <p>Your booking for <strong>${lesson.lessonTypeTitle || 'Academic Session'}</strong> with ${lesson.tutorName || 'your tutor'} is confirmed!</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 14px; color: #64748b; text-transform: uppercase;">Session Details</h3>
        <table width="100%">
          <tr>
            <td style="padding: 5px 0; color: #475569;">Date</td>
            <td align="right" style="color: #1e293b;">${new Date(lesson.startTime).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #475569;">Time</td>
            <td align="right" style="color: #1e293b;">${new Date(lesson.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
          <tr style="font-weight: bold; border-top: 1px solid #e2e8f0;">
            <td style="padding-top: 10px; color: #1e293b;">Amount Paid</td>
            <td style="padding-top: 10px; color: #4f46e5;" align="right">€${amount}</td>
          </tr>
        </table>
      </div>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-lessons" 
         style="display: block; background: #0f172a; color: white; text-align: center; padding: 15px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px;">
          Enter your classroom
      </a>

      <p style="font-size: 11px; color: #94a3b8; margin-top: 30px; text-align: center; line-height: 1.5;">
        Need to reschedule? Please do so at least 24 hours before your session starts via your dashboard.
      </p>
    </div>
  `;
};

/**
 * generateTutorPayoutEmail()
 * ----------------------------------------------------------------------------
 * ✅ NEW: STAGE 10 WITHDRAWAL RECEIPT
 * Logic: Notifies the instructor when money has been moved out of Lernitt.
 * Handshake: Triggered by server/routes/payouts.js upon Admin approval.
 */
const generateTutorPayoutEmail = (tutorName, amount, provider, txnId) => {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px;">
      <h2 style="color: #059669; margin-bottom: 5px;">LERNITT ACADEMY</h2>
      <h1 style="font-size: 20px; color: #1e293b;">Payout Successful</h1>
      
      <p>Hello ${tutorName},</p>
      <p>Good news! Your withdrawal request has been processed and funds have been dispatched.</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #dcfce7;">
        <h3 style="margin-top: 0; font-size: 14px; color: #166534; text-transform: uppercase;">Transfer Summary</h3>
        <table width="100%">
          <tr>
            <td style="padding: 5px 0; color: #374151;">Amount Dispatched</td>
            <td align="right" style="color: #059669; font-weight: bold;">€${Number(amount).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #374151;">Provider</td>
            <td align="right" style="color: #1e293b; text-transform: capitalize;">${provider}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #374151;">Reference ID</td>
            <td align="right" style="color: #64748b; font-size: 12px;">${txnId || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #4b5563; line-height: 1.5;">
        Depending on your provider, it may take 1-3 business days for the funds to appear in your bank or wallet statement.
      </p>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/payouts" 
         style="display: block; background: #0f172a; color: white; text-align: center; padding: 15px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px;">
          View Transaction History
      </a>

      <p style="font-size: 11px; color: #94a3b8; margin-top: 30px; text-align: center;">
        Thank you for being part of the Lernitt Mentor community.
      </p>
    </div>
  `;
};

module.exports = { 
  generatePackageReceiptEmail,
  generateSingleLessonReceiptEmail,
  generateTutorPayoutEmail // ✅ EXPORTED FOR STAGE 10 ACCESS
};

/**
 * ============================================================================
 * END OF FILE: emailTemplates.js
 * VERIFICATION: 100% Complete. Stage 10 Payout Receipts Sealed.
 * ============================================================================
 */
