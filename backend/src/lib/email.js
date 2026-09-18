/**
 * email.js — Brevo transactional email helper
 * Uses the Brevo SDK (https://www.brevo.com)
 *
 * Required env vars:
 *   BREVO_API_KEY        — from Brevo dashboard → SMTP & API → API Keys
 *   BREVO_SENDER_EMAIL   — verified sender email address
 *   BREVO_SENDER_NAME    — (optional) sender name, defaults to 'EduVerse'
 *
 * Brevo allows sending to ANY email address (300 emails/day free tier).
 * Only the sender email needs to be verified in your Brevo account.
 */

const APP_NAME = process.env.BREVO_SENDER_NAME || 'EduVerse';

// Lazy-load Brevo SDK only when needed (allows server to start without it)
let brevo = null;
function loadBrevo() {
    if (!brevo) {
        try {
            brevo = require('@getbrevo/brevo');
        } catch (err) {
            console.warn('[EMAIL] @getbrevo/brevo not installed. Run: npm install @getbrevo/brevo');
            return null;
        }
    }
    return brevo;
}

function getClient() {
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
        return null;
    }

    const brevoSDK = loadBrevo();
    if (!brevoSDK) return null;

    const apiInstance = new brevoSDK.TransactionalEmailsApi();
    const apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    return apiInstance;
}

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
const SENDER_NAME = APP_NAME;

/**
 * Send a 6-digit OTP to the given email address.
 */
async function sendOTPEmail(toEmail, name, otp) {
    const client = getClient();

    if (!client) {
        // Dev fallback — log OTP to console when no API key is configured
        console.log(`[EMAIL DEV] OTP for ${toEmail}: ${otp}`);
        console.warn('[EMAIL] Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in .env');
        return { success: true, dev: true };
    }

    try {
        const brevoSDK = loadBrevo();
        if (!brevoSDK) {
            // Package not available, fall back to dev mode
            console.log(`[EMAIL DEV] OTP for ${toEmail}: ${otp}`);
            console.warn('[EMAIL] Brevo SDK not available, using dev mode');
            return { success: true, dev: true };
        }

        const sendSmtpEmail = new brevoSDK.SendSmtpEmail();

        sendSmtpEmail.sender = {
            name: SENDER_NAME,
            email: SENDER_EMAIL
        };

        sendSmtpEmail.to = [{
            email: toEmail,
            name: name
        }];

        sendSmtpEmail.subject = `Your ${APP_NAME} verification code: ${otp}`;

        sendSmtpEmail.htmlContent = `
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
</html>`;

        sendSmtpEmail.textContent = `Hi ${name},\n\nYour ${APP_NAME} verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, ignore this email.`;

        const data = await client.sendTransacEmail(sendSmtpEmail);

        console.log(`[EMAIL] OTP sent to ${toEmail} — messageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId };

    } catch (err) {
        console.error('[EMAIL] Brevo error:', err.response?.text || err.message);
        return { 
            success: false, 
            error: err.response?.body?.message || err.message 
        };
    }
}

module.exports = { sendOTPEmail };
