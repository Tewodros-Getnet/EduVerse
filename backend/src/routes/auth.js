const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
    return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role = 'student' } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
        if (!['student', 'instructor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

        const password_hash = await bcrypt.hash(password, 12);
        const result = await query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, password_hash, role]
        );

        const user = result.rows[0];
        const { accessToken, refreshToken } = generateTokens(user.id);
        res.status(201).json({ user, accessToken, refreshToken });
    } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        if (role && user.role !== role) return res.status(403).json({ error: `Not a ${role} account` });
        if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const { accessToken, refreshToken } = generateTokens(user.id);
        const { password_hash, ...safeUser } = user;
        res.json({ user: safeUser, accessToken, refreshToken });
    } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);
        res.json({ accessToken, refreshToken: newRefresh });
    } catch (err) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
