/**
 * email.js — Resend transactional email helper
 * Uses the Resend SDK (https://resend.com)
 *
 * Required env var:
 *   RESEND_API_KEY   — from Resend dashboard → API Keys
 *
 * FROM address:
 *   Free tier uses 'onboarding@resend.dev' (works without a custom domain).
 *   Set FROM_EMAIL in env to override once you add a custom domain.
 */
const { Resend } = require('resend');

const APP_NAME = 'EduVerse';

function getClient() {
    if (!process.env.RESEND_API_KEY) return null;
    return new Resend(process.env.RESEND_API_KEY);
}

// Free-tier safe: use Resend's default onboarding address
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const FROM = `${APP_NAME} <${FROM_EMAIL}>`;

/**
 * Send a 6-digit OTP to the given email address.
 */
async function sendOTPEmail(toEmail, name, otp) {
    const client = getClient();

    if (!client) {
        // Dev fallback — log OTP to console when no API key is configured
        console.log(`[EMAIL DEV] OTP for ${toEmail}: ${otp}`);
        return { success: true, dev: true };
    }

    try {
        const { data, error } = await client.emails.send({
            from: FROM,
            to: toEmail,
            subject: `Your ${APP_NAME} verification code: ${otp}`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#12122a;border-radius:16px;border:1px solid #3b0764;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:32px 24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🎓</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${APP_NAME}</h1>
      <p style="color:#f3e8ff;margin:6px 0 0;font-size:14px;">Email Verification</p>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <p style="color:#d1d5db;font-size:16px;margin:0 0 24px;">
        Hi <strong style="color:#fff;">${name}</strong>, here is your one-time verification code:
      </p>
      <div style="background:#1a1a35;border:2px solid #7c3aed;border-radius:12px;padding:20px 32px;display:inline-block;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#a78bfa;">${otp}</span>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">
        This code expires in <strong style="color:#f59e0b;">10 minutes</strong>.
      </p>
      <p style="color:#6b7280;font-size:12px;margin:0;">
        If you didn't create an ${APP_NAME} account, you can safely ignore this email.
      </p>
    </div>
    <div style="border-top:1px solid #1e1b4b;padding:16px 24px;text-align:center;">
      <p style="color:#4b5563;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
            text: `Hi ${name},\n\nYour ${APP_NAME} verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, ignore this email.`,
        });

        if (error) {
            console.error('[EMAIL] Resend error:', error);
            return { success: false, error: error.message };
        }

        console.log(`[EMAIL] OTP sent to ${toEmail} — id: ${data?.id}`);
        return { success: true, id: data?.id };
    } catch (err) {
        console.error('[EMAIL] Resend exception:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendOTPEmail };
