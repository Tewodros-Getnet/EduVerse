const jwt = require('jsonwebtoken');
const { query } = require('../db');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await query('SELECT id, email, role, name FROM users WHERE id = $1', [decoded.userId]);
        if (!result.rows.length) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

module.exports = { authenticate, authorize };
