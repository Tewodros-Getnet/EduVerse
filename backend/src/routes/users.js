const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { createUploader, uploadSingle } = require('../lib/cloudinary');
const { revokeAllRefreshTokens } = require('../lib/cache');

const router = express.Router();

// Cloudinary uploader for avatars (images only, 5 MB max)
const avatarUpload = createUploader({
    folder: 'eduverse/avatars',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    resourceType: 'image',
    fileSizeMb: 5,
});

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            'SELECT id, name, email, role, avatar_url, bio, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json({ user: result.rows[0] });
    } catch (err) { next(err); }
});

// PUT /api/users/profile  — update name and/or bio
router.put('/profile', authenticate, async (req, res, next) => {
    try {
        const { name, bio } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

        const result = await query(
            `UPDATE users SET name=$1, bio=$2, updated_at=NOW()
             WHERE id=$3 RETURNING id, name, email, role, avatar_url, bio, created_at`,
            [name.trim(), bio || null, req.user.id]
        );
        res.json({ user: result.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/users/avatar  — upload profile picture to Cloudinary
router.post('/avatar', authenticate, uploadSingle(avatarUpload, 'avatar'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file provided' });

        const avatar_url = req.file.path; // Cloudinary CDN URL
        const result = await query(
            `UPDATE users SET avatar_url=$1, updated_at=NOW()
             WHERE id=$2 RETURNING id, name, email, role, avatar_url, bio, created_at`,
            [avatar_url, req.user.id]
        );
        res.json({ user: result.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/users/change-password
router.post('/change-password', authenticate, async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password)
            return res.status(400).json({ error: 'Both current and new password are required' });
        if (new_password.length < 8)
            return res.status(400).json({ error: 'New password must be at least 8 characters' });

        const result = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        const new_hash = await bcrypt.hash(new_password, 12);
        await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [new_hash, req.user.id]);

        // Revoke all existing refresh tokens — forces re-login on all devices
        await revokeAllRefreshTokens(req.user.id);

        res.json({ message: 'Password changed successfully' });
    } catch (err) { next(err); }
});

// GET /api/users/progress
router.get('/progress', authenticate, async (req, res, next) => {
    try {
        const enrollments = await query(
            `SELECT e.*, c.title, c.thumbnail_url FROM enrollments e
       JOIN courses c ON e.course_id = c.id WHERE e.student_id = $1`,
            [req.user.id]
        );
        const badges = await query('SELECT * FROM badges WHERE student_id = $1', [req.user.id]);
        const quizStats = await query(
            'SELECT AVG(score) as avg_score, COUNT(*) as total_attempts FROM quiz_attempts WHERE student_id = $1',
            [req.user.id]
        );
        res.json({
            enrollments: enrollments.rows,
            badges: badges.rows,
            quiz_stats: quizStats.rows[0],
        });
    } catch (err) { next(err); }
});

// GET /api/users/notifications
router.get('/notifications', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
            [req.user.id]
        );
        res.json({ notifications: result.rows });
    } catch (err) { next(err); }
});

// PATCH /api/users/notifications/:id/read
router.patch('/notifications/:id/read', authenticate, async (req, res, next) => {
    try {
        await query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        res.json({ message: 'Marked as read' });
    } catch (err) { next(err); }
});

// ============= ADMIN USER MANAGEMENT =============

// GET /api/users/admin/all - Get all users for admin
router.get('/admin/all', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 20, role, search, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let where = [];
        let paramIndex = 1;

        if (role) {
            where.push(`role = $${paramIndex++}`);
            params.push(role);
        }

        if (search) {
            where.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex + 1})`);
            params.push(`%${search}%`, `%${search}%`);
            paramIndex += 2;
        }

        if (status === 'active') {
            where.push(`is_active = true`);
        } else if (status === 'inactive') {
            where.push(`is_active = false`);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        const limitParam = paramIndex++;
        const offsetParam = paramIndex++;

        const result = await query(
            `SELECT id, name, email, role, is_active, created_at, last_login_at,
                    (SELECT COUNT(*) FROM enrollments WHERE student_id = users.id) as course_count
             FROM users 
             ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${limitParam} OFFSET $${offsetParam}`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        const countResult = await query(
            `SELECT COUNT(*) as total FROM users ${whereClause}`,
            params
        );

        res.json({
            users: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) { next(err); }
});

// POST /api/users/admin/create - Create new user
router.post('/admin/create', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { name, email, password, role = 'student' } = req.body;

        // Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO users (name, email, password_hash, role, is_active, created_at) 
             VALUES ($1, $2, $3, $4, true, NOW()) 
             RETURNING id, name, email, role, is_active, created_at`,
            [name, email, passwordHash, role]
        );

        res.status(201).json({ user: result.rows[0] });
    } catch (err) { next(err); }
});

// PUT /api/users/admin/:id - Update user
router.put('/admin/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, role, is_active } = req.body;

        // Check if user exists
        const existingUser = await query('SELECT id FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if email is being changed and if it conflicts
        if (email) {
            const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        const result = await query(
            `UPDATE users 
             SET name = COALESCE($1, name), 
                 email = COALESCE($2, email), 
                 role = COALESCE($3, role), 
                 is_active = COALESCE($4, is_active),
                 updated_at = NOW()
             WHERE id = $5 
             RETURNING id, name, email, role, is_active, created_at, updated_at`,
            [name, email, role, is_active, id]
        );

        res.json({ user: result.rows[0] });
    } catch (err) { next(err); }
});

// DELETE /api/users/admin/:id - Delete user
router.delete('/admin/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Don't allow admin to delete themselves
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = await query('DELETE FROM users WHERE id = $1 RETURNING name, email', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: `User ${result.rows[0].name} (${result.rows[0].email}) deleted successfully` });
    } catch (err) { next(err); }
});

// POST /api/users/admin/:id/reset-password - Reset user password
router.post('/admin/:id/reset-password', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        const result = await query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING name, email',
            [passwordHash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: `Password reset successfully for ${result.rows[0].name}` });
    } catch (err) { next(err); }
});

// POST /api/users/admin/:id/toggle-status - Activate/Deactivate user
router.post('/admin/:id/toggle-status', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Don't allow admin to deactivate themselves
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }

        const result = await query(
            'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING name, email, is_active',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const status = result.rows[0].is_active ? 'activated' : 'deactivated';
        res.json({ message: `User ${result.rows[0].name} ${status} successfully` });
    } catch (err) { next(err); }
});

// GET /api/users/admin/stats - Get user statistics
router.get('/admin/stats', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const [
            totalUsers,
            activeUsers,
            students,
            instructors,
            admins,
            recentUsers
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users'),
            query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
            query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['student']),
            query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['instructor']),
            query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']),
            query('SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL \'30 days\'')
        ]);

        res.json({
            total_users: parseInt(totalUsers.rows[0].count),
            active_users: parseInt(activeUsers.rows[0].count),
            students: parseInt(students.rows[0].count),
            instructors: parseInt(instructors.rows[0].count),
            admins: parseInt(admins.rows[0].count),
            recent_users: parseInt(recentUsers.rows[0].count)
        });
    } catch (err) { next(err); }
});

module.exports = router;
