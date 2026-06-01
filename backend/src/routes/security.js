const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ============= ADMIN SECURITY MANAGEMENT =============

// GET /api/security/admin/sessions - Get active sessions
router.get('/admin/sessions', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 20, user_id, role } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let where = [];
        let paramIndex = 1;

        if (user_id) {
            where.push(`s.user_id = $${paramIndex++}`);
            params.push(user_id);
        }
        
        if (role) {
            where.push(`u.role = $${paramIndex++}`);
            params.push(role);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        
        const result = await query(
            `SELECT s.*, u.name, u.email, u.role, u.avatar_url
             FROM user_sessions s
             JOIN users u ON s.user_id = u.id
             ${whereClause}
             ORDER BY s.last_activity DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, parseInt(limit), offset]
        );

        const countResult = await query(
            `SELECT COUNT(*) as total FROM user_sessions s JOIN users u ON s.user_id = u.id ${whereClause}`,
            params
        );

        res.json({
            sessions: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) { next(err); }
});

// DELETE /api/security/admin/sessions/:id - Terminate a session
router.delete('/admin/sessions/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `DELETE FROM user_sessions WHERE id = $1 RETURNING user_id, ip_address`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ message: 'Session terminated successfully' });
    } catch (err) { next(err); }
});

// POST /api/security/admin/sessions/terminate-user/:userId - Terminate all sessions for a user
router.post('/admin/sessions/terminate-user/:userId', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        const result = await query(
            `DELETE FROM user_sessions WHERE user_id = $1`,
            [userId]
        );
        
        res.json({ 
            message: `${result.rowCount} sessions terminated successfully`,
            terminated_count: result.rowCount
        });
    } catch (err) { next(err); }
});

// GET /api/security/admin/activity-logs - Get system activity logs
router.get('/admin/activity-logs', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 50, user_id, action, level, start_date, end_date } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let where = [];
        let paramIndex = 1;

        if (user_id) {
            where.push(`al.user_id = $${paramIndex++}`);
            params.push(user_id);
        }
        
        if (action) {
            where.push(`al.action = $${paramIndex++}`);
            params.push(action);
        }
        
        if (level) {
            where.push(`al.level = $${paramIndex++}`);
            params.push(level);
        }
        
        if (start_date) {
            where.push(`al.created_at >= $${paramIndex++}`);
            params.push(start_date);
        }
        
        if (end_date) {
            where.push(`al.created_at <= $${paramIndex++}`);
            params.push(end_date);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        
        const result = await query(
            `SELECT al.*, u.name, u.email, u.role
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ${whereClause}
             ORDER BY al.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, parseInt(limit), offset]
        );

        const countResult = await query(
            `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`,
            params
        );

        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) { next(err); }
});

// GET /api/security/admin/permissions - Get role-based permissions
router.get('/admin/permissions', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT rp.*, r.name as role_name
             FROM role_permissions rp
             JOIN roles r ON rp.role_id = r.id
             ORDER BY r.name, rp.resource`
        );

        // Group by role
        const permissions = {};
        result.rows.forEach(row => {
            if (!permissions[row.role_name]) {
                permissions[row.role_name] = [];
            }
            permissions[row.role_name].push({
                resource: row.resource,
                action: row.action,
                granted: row.granted
            });
        });

        res.json({ permissions });
    } catch (err) { next(err); }
});

// PUT /api/security/admin/permissions - Update role permissions
router.put('/admin/permissions', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { role_name, resource, action, granted } = req.body;
        
        if (!role_name || !resource || !action) {
            return res.status(400).json({ error: 'Role name, resource, and action are required' });
        }

        // Get role ID
        const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role_name]);
        if (roleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        const roleId = roleResult.rows[0].id;

        // Update or insert permission
        const result = await query(
            `INSERT INTO role_permissions (role_id, resource, action, granted)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (role_id, resource, action) 
             DO UPDATE SET granted = $4, updated_at = NOW()
             RETURNING *`,
            [roleId, resource, action, granted]
        );

        res.json({ 
            message: 'Permission updated successfully',
            permission: result.rows[0]
        });
    } catch (err) { next(err); }
});

// GET /api/security/admin/security-events - Get security events and alerts
router.get('/admin/security-events', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 20, severity, start_date, end_date } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let where = [];
        let paramIndex = 1;

        if (severity) {
            where.push(`se.severity = $${paramIndex++}`);
            params.push(severity);
        }
        
        if (start_date) {
            where.push(`se.created_at >= $${paramIndex++}`);
            params.push(start_date);
        }
        
        if (end_date) {
            where.push(`se.created_at <= $${paramIndex++}`);
            params.push(end_date);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        
        const result = await query(
            `SELECT se.*, u.name, u.email, u.role
             FROM security_events se
             LEFT JOIN users u ON se.user_id = u.id
             ${whereClause}
             ORDER BY se.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, parseInt(limit), offset]
        );

        const countResult = await query(
            `SELECT COUNT(*) as total FROM security_events se ${whereClause}`,
            params
        );

        res.json({
            events: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) { next(err); }
});

// GET /api/security/admin/stats - Get security statistics
router.get('/admin/stats', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const [
            activeSessions,
            totalSessions,
            recentLogins,
            failedLogins,
            securityEvents,
            roleDistribution,
            suspiciousActivity
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM user_sessions WHERE last_activity >= NOW() - INTERVAL \'1 hour\''),
            query('SELECT COUNT(*) as count FROM user_sessions'),
            query('SELECT COUNT(*) as count FROM activity_logs WHERE action = $1 AND created_at >= NOW() - INTERVAL \'24 hours\'', ['login']),
            query('SELECT COUNT(*) as count FROM activity_logs WHERE action = $1 AND created_at >= NOW() - INTERVAL \'24 hours\'', ['login_failed']),
            query('SELECT COUNT(*) as count FROM security_events WHERE created_at >= NOW() - INTERVAL \'24 hours\''),
            query('SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role'),
            query(
                `SELECT COUNT(*) as count
                 FROM user_sessions 
                 WHERE last_activity >= NOW() - INTERVAL '1 hour'
                 GROUP BY user_id
                 HAVING COUNT(*) > 3`
            )
        ]);

        res.json({
            active_sessions: parseInt(activeSessions.rows[0].count),
            total_sessions: parseInt(totalSessions.rows[0].count),
            recent_logins: parseInt(recentLogins.rows[0].count),
            failed_logins: parseInt(failedLogins.rows[0].count),
            security_events: parseInt(securityEvents.rows[0].count),
            role_distribution: roleDistribution.rows,
            suspicious_activity: parseInt(suspiciousActivity.rows[0]?.count || 0)
        });
    } catch (err) { next(err); }
});

// POST /api/security/admin/lock-user/:userId - Lock/unlock user account
router.post('/admin/lock-user/:userId', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { locked, reason } = req.body;
        
        const result = await query(
            `UPDATE users 
             SET is_locked = $1, lock_reason = $2, locked_at = CASE WHEN $1 THEN NOW() ELSE NULL END
             WHERE id = $3 
             RETURNING name, email`,
            [locked, reason, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log the security action
        await query(
            `INSERT INTO activity_logs (user_id, action, details, level, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [req.user.id, locked ? 'user_locked' : 'user_unlocked', 
             `${locked ? 'Locked' : 'Unlocked'} user ${result.rows[0].name} (${result.rows[0].email}). Reason: ${reason || 'No reason provided'}`,
             'security']
        );

        res.json({ 
            message: `User ${locked ? 'locked' : 'unlocked'} successfully`,
            user: result.rows[0]
        });
    } catch (err) { next(err); }
});

// POST /api/security/admin/force-logout/:userId - Force logout user from all sessions
router.post('/admin/force-logout/:userId', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        const result = await query(
            `DELETE FROM user_sessions WHERE user_id = $1`,
            [userId]
        );

        // Log the security action
        await query(
            `INSERT INTO activity_logs (user_id, action, details, level, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [req.user.id, 'force_logout', 
             `Force logout user ID: ${userId}. Terminated ${result.rowCount} sessions.`,
             'security']
        );

        res.json({ 
            message: `Force logout completed successfully`,
            terminated_sessions: result.rowCount
        });
    } catch (err) { next(err); }
});

module.exports = router;
