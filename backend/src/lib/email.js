/**
 * email.js — SendGrid transactional email helper
 * Uses @sendgrid/mail under the hood.
 * All functions are fail-safe: they log errors but never throw,
 * so a broken SendGrid config can't crash the API.
 */
const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@eduverse.app';
const APP_NAME   = 'EduVerse';

/**
 * Send a 6-digit OTP to the given email address.
 * @param {string} toEmail
 * @param {string} name     — recipient's name for personalisation
 * @param {string} otp      — the 6-digit code
 */
async function sendOTPEmail(toEmail, name, otp) {
    if (!process.env.SENDGRID_API_KEY) {
        // Dev fallback — log to console so you can still test without SendGrid
        console.log(`[EMAIL DEV] OTP for ${toEmail}: ${otp}`);
        return { success: true, dev: true };
    }

    try {
        await sgMail.send({
            to: toEmail,
            from: { email: FROM_EMAIL, name: APP_NAME },
            subject: `Your ${APP_NAME} verification code: ${otp}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#12122a;border-radius:16px;
              border:1px solid #3b0764;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:32px 24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🎓</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${APP_NAME}</h1>
      <p style="color:#f3e8ff;margin:6px 0 0;font-size:14px;">Email Verification</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;text-align:center;">
      <p style="color:#d1d5db;font-size:16px;margin:0 0 24px;">
        Hi <strong style="color:#fff;">${name}</strong>, here is your one-time verification code:
      </p>

      <!-- OTP Box -->
      <div style="background:#1a1a35;border:2px solid #7c3aed;border-radius:12px;
                  padding:20px 32px;display:inline-block;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#a78bfa;">
          ${otp}
        </span>
      </div>

      <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">
        This code expires in <strong style="color:#f59e0b;">10 minutes</strong>.
      </p>
      <p style="color:#6b7280;font-size:12px;margin:0;">
        If you didn't create an ${APP_NAME} account, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #1e1b4b;padding:16px 24px;text-align:center;">
      <p style="color:#4b5563;font-size:11px;margin:0;">
        © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`,
            text: `Hi ${name},\n\nYour ${APP_NAME} verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, ignore this email.`,
        });
        return { success: true };
    } catch (err) {
        console.error('[EMAIL] SendGrid error:', err.response?.body || err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendOTPEmail };
