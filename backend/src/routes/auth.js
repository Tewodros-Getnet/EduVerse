const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendOTPEmail } = require('../lib/email');
const {
    storeRefreshToken,
    validateRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokens,
} = require('../lib/cache');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
    return { accessToken, refreshToken };
};

/** Generate a cryptographically random 6-digit OTP. */
const generateOTP = () => {
    // Use crypto to avoid Math.random() bias
    const bytes = crypto.randomBytes(3);
    const num = bytes.readUIntBE(0, 3) % 1000000;
    return String(num).padStart(6, '0');
};

// ── Register ──────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role = 'student' } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'All fields required' });
        if (!['student', 'instructor'].includes(role))
            return res.status(400).json({ error: 'Invalid role' });

        // Check for existing verified account
        const existing = await query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
        if (existing.rows.length) {
            if (existing.rows[0].email_verified) {
                return res.status(409).json({ error: 'Email already registered' });
            }
            // Unverified account exists — delete it and let them re-register cleanly
            await query('DELETE FROM users WHERE email = $1', [email]);
        }

        const password_hash = await bcrypt.hash(password, 12);
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const result = await query(
            `INSERT INTO users (name, email, password_hash, role, email_verified, is_active, otp_code, otp_expires)
             VALUES ($1,$2,$3,$4,false,false,$5,$6) RETURNING id, name, email, role`,
            [name, email, password_hash, role, otp, otpExpires]
        );

        const user = result.rows[0];

        // Send OTP email (non-blocking — don't fail registration if email bounces)
        const emailResult = await sendOTPEmail(email, name, otp);
        if (!emailResult.success && !emailResult.dev) {
            console.error('[REGISTER] Failed to send OTP email to', email);
        }

        res.status(201).json({
            message: 'OTP sent to your email. Please verify to complete registration.',
            userId: user.id,
            // In dev mode with no SendGrid key, expose OTP so you can test
            ...(emailResult.dev && { dev_otp: otp }),
        });
    } catch (err) { next(err); }
});

// ── OTP Verification ──────────────────────────────────────────────────────────

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res, next) => {
    try {
        const { userId, otp } = req.body;
        if (!userId || !otp)
            return res.status(400).json({ error: 'userId and otp are required' });

        const result = await query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );
        if (!result.rows.length)
            return res.status(404).json({ error: 'User not found' });

        const user = result.rows[0];

        if (user.email_verified)
            return res.status(400).json({ error: 'Email already verified' });

        if (!user.otp_code || user.otp_code !== otp.trim())
            return res.status(400).json({ error: 'Invalid OTP code' });

        if (new Date() > new Date(user.otp_expires))
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });

        // Mark verified, activate account, clear OTP fields
        await query(
            `UPDATE users SET email_verified=true, is_active=true,
             otp_code=NULL, otp_expires=NULL, updated_at=NOW()
             WHERE id=$1`,
            [userId]
        );

        // Issue tokens — user is now fully logged in
        const { accessToken, refreshToken } = generateTokens(userId);
        await storeRefreshToken(refreshToken, userId);

        const { password_hash, otp_code, otp_expires, ...safeUser } = user;
        safeUser.email_verified = true;
        safeUser.is_active = true;

        res.json({
            message: 'Email verified successfully!',
            user: safeUser,
            accessToken,
            refreshToken,
        });
    } catch (err) { next(err); }
});

// ── Resend OTP ────────────────────────────────────────────────────────────────

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res, next) => {
    try {
        const { userId } = req.body;
        if (!userId)
            return res.status(400).json({ error: 'userId is required' });

        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        if (!result.rows.length)
            return res.status(404).json({ error: 'User not found' });

        const user = result.rows[0];
        if (user.email_verified)
            return res.status(400).json({ error: 'Email already verified' });

        // Rate-limit: don't resend if previous OTP is still fresh (< 1 min old)
        if (user.otp_expires) {
            const timeLeft = new Date(user.otp_expires) - Date.now();
            const nineMinutes = 9 * 60 * 1000;
            if (timeLeft > nineMinutes) {
                return res.status(429).json({
                    error: 'Please wait before requesting another OTP',
                    retryAfterSeconds: Math.ceil((timeLeft - nineMinutes) / 1000),
                });
            }
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await query(
            'UPDATE users SET otp_code=$1, otp_expires=$2 WHERE id=$3',
            [otp, otpExpires, userId]
        );

        const emailResult = await sendOTPEmail(user.email, user.name, otp);

        res.json({
            message: 'New OTP sent to your email',
            ...(emailResult.dev && { dev_otp: otp }),
        });
    } catch (err) { next(err); }
});

// ── Login ─────────────────────────────────────────────────────────────────────

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password required' });

        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (!result.rows.length)
            return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        if (role && user.role !== role)
            return res.status(403).json({ error: `Not a ${role} account` });

        // Check email verification before anything else
        if (!user.email_verified) {
            return res.status(403).json({
                error: 'Please verify your email before signing in.',
                needsVerification: true,
                userId: user.id,
            });
        }

        if (!user.is_active)
            return res.status(403).json({ error: 'Account deactivated' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials' });

        const { accessToken, refreshToken } = generateTokens(user.id);
        await storeRefreshToken(refreshToken, user.id);
        query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {});

        const { password_hash, otp_code, otp_expires, ...safeUser } = user;
        res.json({ user: safeUser, accessToken, refreshToken });
    } catch (err) { next(err); }
});

// ── Token refresh ─────────────────────────────────────────────────────────────

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(400).json({ error: 'Refresh token required' });

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const redisAvailable = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
        if (redisAvailable) {
            const record = await validateRefreshToken(refreshToken);
            if (record === 'revoked') {
                return res.status(401).json({ error: 'Refresh token has been revoked' });
            }
        }

        const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);
        await Promise.allSettled([
            revokeRefreshToken(refreshToken, decoded.userId),
            storeRefreshToken(newRefresh, decoded.userId),
        ]);

        res.json({ accessToken, refreshToken: newRefresh });
    } catch (err) { next(err); }
});

// ── Logout ────────────────────────────────────────────────────────────────────

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken, req.user.id);
    res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/logout-all
router.post('/logout-all', authenticate, async (req, res) => {
    await revokeAllRefreshTokens(req.user.id);
    res.json({ message: 'Logged out from all devices' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
