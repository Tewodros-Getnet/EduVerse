const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res, next) => {
    try {
        const [users, courses, aiRequests, recentUsers] = await Promise.all([
            query('SELECT COUNT(*) as total FROM users'),
            query("SELECT COUNT(*) FILTER (WHERE status='published') as active FROM courses"),
            query('SELECT COUNT(*) as total FROM chat_history'),
            query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 5'),
        ]);
        res.json({
            stats: {
                total_users: parseInt(users.rows[0].total),
                active_courses: parseInt(courses.rows[0].active),
                ai_requests: parseInt(aiRequests.rows[0].total),
                system_health: 99.9,
            },
            recent_users: recentUsers.rows,
        });
    } catch (err) { next(err); }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let sql = 'SELECT id, name, email, role, is_active, created_at FROM users WHERE 1=1';
        const params = [];
        let idx = 1;
        if (role) { sql += ` AND role = $${idx++}`; params.push(role); }
        if (search) { sql += ` AND (name ILIKE $${idx} OR email ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(limit, offset);
        const result = await query(sql, params);
        const count = await query('SELECT COUNT(*) FROM users');
        res.json({ users: result.rows, total: parseInt(count.rows[0].count), page: Number(page) });
    } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res, next) => {
    try {
        const { is_active } = req.body;
        await query('UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2', [is_active, req.params.id]);
        await query(
            'INSERT INTO audit_logs (user_id, action, resource, ip_address, details) VALUES ($1,$2,$3,$4,$5)',
            [req.user.id, is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'users', req.ip, JSON.stringify({ target_id: req.params.id })]
        );
        res.json({ message: 'User status updated' });
    } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res, next) => {
    try {
        await query('DELETE FROM users WHERE id=$1', [req.params.id]);
        await query(
            'INSERT INTO audit_logs (user_id, action, resource, ip_address, details) VALUES ($1,$2,$3,$4,$5)',
            [req.user.id, 'USER_DELETED', 'users', req.ip, JSON.stringify({ target_id: req.params.id })]
        );
        res.json({ message: 'User deleted' });
    } catch (err) { next(err); }
});

// GET /api/admin/courses
router.get('/courses', async (req, res, next) => {
    try {
        const result = await query(
            `SELECT c.*, u.name as instructor_name, COUNT(e.id) as enrollment_count
       FROM courses c LEFT JOIN users u ON c.instructor_id = u.id
       LEFT JOIN enrollments e ON c.id = e.course_id
       GROUP BY c.id, u.name ORDER BY c.created_at DESC`
        );
        res.json({ courses: result.rows });
    } catch (err) { next(err); }
});

// PATCH /api/admin/courses/:id/status
router.patch('/courses/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        await query('UPDATE courses SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id]);
        res.json({ message: 'Course status updated' });
    } catch (err) { next(err); }
});

// GET /api/admin/metrics/ai-cost
router.get('/metrics/ai-cost', async (req, res, next) => {
    try {
        const result = await query(
            `SELECT ai_source, COUNT(*) as requests, AVG(response_time_ms) as avg_response_ms
       FROM chat_history GROUP BY ai_source`
        );
        res.json({ metrics: result.rows });
    } catch (err) { next(err); }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res, next) => {
    try {
        const { page = 1, limit = 50, action, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let where = [];
        let idx = 1;

        if (action) { where.push(`al.action = $${idx++}`); params.push(action); }
        if (search) {
            where.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR al.action ILIKE $${idx})`);
            params.push(`%${search}%`); idx++;
        }

        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        params.push(parseInt(limit), offset);

        const result = await query(
            `SELECT al.*, u.name as user_name, u.email as user_email
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ${whereClause}
             ORDER BY al.created_at DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            params
        );
        const countResult = await query(
            `SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause}`,
            params.slice(0, -2)
        );
        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) { next(err); }
});

// GET /api/admin/analytics
router.get('/analytics', async (req, res, next) => {
    try {
        const [userGrowth, courseStats, aiUsage, quizStats] = await Promise.all([
            query(`SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as new_users
                   FROM users GROUP BY week ORDER BY week DESC LIMIT 8`),
            query(`SELECT category, COUNT(*) as count, difficulty_level
                   FROM courses WHERE category IS NOT NULL
                   GROUP BY category, difficulty_level ORDER BY count DESC LIMIT 10`),
            query(`SELECT DATE_TRUNC('day', created_at) as day, COUNT(*) as queries
                   FROM chat_history GROUP BY day ORDER BY day DESC LIMIT 7`),
            query(`SELECT COALESCE(AVG(score), 0) as avg_score, COUNT(*) as total FROM quiz_attempts`),
        ]);
        res.json({
            user_growth: userGrowth.rows,
            course_stats: courseStats.rows,
            ai_usage: aiUsage.rows,
            quiz_stats: quizStats.rows[0],
        });
    } catch (err) { next(err); }
});

module.exports = router;
