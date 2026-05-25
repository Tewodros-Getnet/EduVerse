const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ============= ADMIN NOTIFICATIONS =============

// POST /api/notifications/admin/broadcast - Send broadcast message to all users
router.post('/admin/broadcast', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { title, message, type = 'announcement', target_roles = [] } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        // Get all users to notify
        let whereClause = 'WHERE is_active = true';
        const params = [];

        if (target_roles.length > 0) {
            whereClause += ` AND role = ANY($1)`;
            params.push(target_roles);
        }

        const users = await query(
            `SELECT id FROM users ${whereClause}`,
            params
        );

        if (users.rows.length === 0) {
            return res.status(404).json({ error: 'No users found to notify' });
        }

        // Insert notifications for all users
        const notificationPromises = users.rows.map(user =>
            query(
                `INSERT INTO notifications (user_id, title, message, type, created_at, is_read) 
                 VALUES ($1, $2, $3, $4, NOW(), false)`,
                [user.id, title, message, type]
            )
        );

        await Promise.all(notificationPromises);

        res.json({
            message: `Broadcast message sent to ${users.rows.length} users`,
            recipients_count: users.rows.length
        });
    } catch (err) { next(err); }
});

// POST /api/notifications/admin/announcement - Send platform announcement
router.post('/admin/announcement', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { title, message, priority = 'normal', expires_at } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        // Get all active users
        const users = await query('SELECT id FROM users WHERE is_active = true');

        // Insert announcement for all users
        const notificationPromises = users.rows.map(user =>
            query(
                `INSERT INTO notifications (user_id, title, message, type, priority, created_at, expires_at, is_read) 
                 VALUES ($1, $2, $3, 'announcement', $4, NOW(), $5, false)`,
                [user.id, title, message, priority, expires_at]
            )
        );

        await Promise.all(notificationPromises);

        res.json({
            message: `Announcement sent to ${users.rows.length} users`,
            recipients_count: users.rows.length
        });
    } catch (err) { next(err); }
});

// POST /api/notifications/admin/course/:courseId - Send notification to course students
router.post('/admin/course/:courseId', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { title, message, type = 'course_update' } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        // Get all enrolled students
        const students = await query(
            `SELECT u.id, u.name, u.email
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             WHERE e.course_id = $1 AND u.is_active = true`,
            [courseId]
        );

        if (students.rows.length === 0) {
            return res.status(404).json({ error: 'No active students found in this course' });
        }

        // Insert notifications for all course students
        const notificationPromises = students.rows.map(student =>
            query(
                `INSERT INTO notifications (user_id, title, message, type, course_id, created_at, is_read) 
                 VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
                [student.id, title, message, type, courseId]
            )
        );

        await Promise.all(notificationPromises);

        res.json({
            message: `Course notification sent to ${students.rows.length} students`,
            recipients_count: students.rows.length
        });
    } catch (err) { next(err); }
});

// GET /api/notifications/admin/sent - Get sent notifications by admin
router.get('/admin/sent', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = 'WHERE n.type IN (\'announcement\', \'broadcast\', \'system_alert\')';
        const params = [];
        let paramIndex = 1;

        if (type) {
            whereClause += ` AND n.type = $${paramIndex++}`;
            params.push(type);
        }

        const result = await query(
            `SELECT n.*, COUNT(u.id) as recipient_count
             FROM notifications n
             JOIN users u ON n.user_id = u.id
             ${whereClause}
             GROUP BY n.id
             ORDER BY n.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, parseInt(limit), offset]
        );

        const countResult = await query(
            `SELECT COUNT(DISTINCT n.id) as total
             FROM notifications n
             ${whereClause}`,
            params
        );

        res.json({
            notifications: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) { next(err); }
});

// GET /api/notifications/admin/stats - Get notification statistics
router.get('/admin/stats', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const [
            totalNotifications,
            unreadNotifications,
            recentNotifications,
            notificationsByType,
            readRate
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM notifications'),
            query('SELECT COUNT(*) as count FROM notifications WHERE is_read = false'),
            query('SELECT COUNT(*) as count FROM notifications WHERE created_at >= NOW() - INTERVAL \'7 days\''),
            query(
                `SELECT type, COUNT(*) as count
                 FROM notifications
                 GROUP BY type
                 ORDER BY count DESC`
            ),
            query(
                `SELECT 
                    COUNT(CASE WHEN is_read THEN 1 END) * 100.0 / COUNT(*) as read_rate
                 FROM notifications`
            )
        ]);

        res.json({
            total_notifications: parseInt(totalNotifications.rows[0].count),
            unread_notifications: parseInt(unreadNotifications.rows[0].count),
            recent_notifications: parseInt(recentNotifications.rows[0].count),
            notifications_by_type: notificationsByType.rows,
            read_rate: parseFloat(readRate.rows[0].read_rate || 0)
        });
    } catch (err) { next(err); }
});

// DELETE /api/notifications/admin/:id - Delete notification (admin only)
router.delete('/admin/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM notifications WHERE id = $1 RETURNING title', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: `Notification "${result.rows[0].title}" deleted successfully` });
    } catch (err) { next(err); }
});

// GET /api/notifications/admin - Get admin notifications
router.get('/admin', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        // Get notifications for the admin
        const notificationsQuery = `
            SELECT 
                id, title, message, type, created_at, is_read, read_at
            FROM notifications 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `;

        const notifications = await query(notificationsQuery, [userId, limit, offset]);

        res.json({ notifications: notifications.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/admin/generate-test - Generate test admin notifications
router.post('/admin/generate-test', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Generate some mock admin notifications for testing
        const mockNotifications = [
            {
                user_id: userId,
                title: 'System Alert',
                message: 'Database backup completed successfully',
                type: 'system_alert',
                is_read: false
            },
            {
                user_id: userId,
                title: 'New User Registration',
                message: '15 new users registered in the last 24 hours',
                type: 'announcement',
                is_read: false
            },
            {
                user_id: userId,
                title: 'Security Update',
                message: 'All systems are secure and up to date',
                type: 'security',
                is_read: true
            },
            {
                user_id: userId,
                title: 'Course Review Required',
                message: '3 courses pending admin review',
                type: 'course_review',
                is_read: false
            },
            {
                user_id: userId,
                title: 'User Report',
                message: '2 user reports require attention',
                type: 'user_report',
                is_read: true
            }
        ];

        // Insert mock notifications
        const insertPromises = mockNotifications.map(notification =>
            query(
                `INSERT INTO notifications (user_id, title, message, type, created_at, is_read) 
                 VALUES ($1, $2, $3, $4, NOW(), $5)`,
                [notification.user_id, notification.title, notification.message, notification.type, notification.is_read]
            )
        );

        await Promise.all(insertPromises);

        res.json({
            message: `${mockNotifications.length} test notifications generated`,
            count: mockNotifications.length
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/admin/mark-all-read - Mark all notifications as read for all users
router.post('/admin/mark-all-read', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { user_id, type } = req.body;

        let whereClause = '';
        const params = [];

        if (user_id) {
            whereClause = 'WHERE user_id = $1';
            params.push(user_id);
        } else if (type) {
            whereClause = 'WHERE type = $1';
            params.push(type);
        } else {
            // Mark all notifications as read
            whereClause = '';
        }

        const result = await query(
            `UPDATE notifications SET is_read = true, read_at = NOW() ${whereClause} RETURNING COUNT(*) as count`,
            params
        );

        res.json({
            message: `${result.rows[0].count} notifications marked as read`,
            count: parseInt(result.rows[0].count)
        });
    } catch (err) { next(err); }
});

// ============= INSTRUCTOR NOTIFICATIONS =============

// GET /api/notifications/instructor - Get instructor notifications
router.get('/instructor', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        // Get notifications for the instructor
        const notificationsQuery = `
            SELECT 
                id, title, message, type, created_at, is_read, read_at
            FROM notifications 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `;

        const notifications = await query(notificationsQuery, [userId, limit, offset]);

        // Transform the data to match frontend expectations
        const transformedNotifications = notifications.rows.map(notification => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            created_at: notification.created_at,
            read: notification.is_read,
            read_at: notification.read_at
        }));

        res.json({ notifications: transformedNotifications });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/instructor/read-all - Mark all instructor notifications as read
router.post('/instructor/read-all', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `UPDATE notifications 
             SET is_read = true, read_at = NOW() 
             WHERE user_id = $1 AND is_read = false 
             RETURNING COUNT(*) as count`,
            [userId]
        );

        res.json({
            message: `${result.rows[0].count} notifications marked as read`,
            count: parseInt(result.rows[0].count)
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/instructor/send - Send notification to course students
router.post('/instructor/send', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { courseId, title, message, type = 'announcement' } = req.body;
        const instructorId = req.user.id;

        if (!courseId || !title || !message) {
            return res.status(400).json({ error: 'Course ID, title, and message are required' });
        }

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
        if (!course.rows.length || course.rows[0].instructor_id !== instructorId) {
            return res.status(403).json({ error: 'Unauthorized: You do not own this course' });
        }

        // Get all enrolled students
        const students = await query(
            `SELECT u.id
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             WHERE e.course_id = $1 AND u.role = 'student'`,
            [courseId]
        );

        if (students.rows.length === 0) {
            return res.status(404).json({ error: 'No students found in this course' });
        }

        // Insert notifications for all course students
        const notificationPromises = students.rows.map(student =>
            query(
                `INSERT INTO notifications (user_id, title, message, type, course_id, created_at, is_read) 
                 VALUES ($1, $2, $3, $4, $5, NOW(), false)`,
                [student.id, title, message, type, courseId]
            )
        );

        await Promise.all(notificationPromises);

        res.json({
            message: `Notification sent to ${students.rows.length} students`,
            recipients_count: students.rows.length
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/instructor/generate - Generate mock notifications for testing
router.post('/instructor/generate', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Generate some mock notifications for testing
        const mockNotifications = [
            {
                user_id: userId,
                title: 'New Student Enrollment',
                message: 'John Doe has enrolled in your Web Development course',
                type: 'enrollment',
                is_read: false
            },
            {
                user_id: userId,
                title: 'Assignment Submitted',
                message: '5 students have submitted the JavaScript Fundamentals assignment',
                type: 'assignment',
                is_read: false
            },
            {
                user_id: userId,
                title: 'Course Review Posted',
                message: 'A student left a 5-star review for your React course',
                type: 'review',
                is_read: true
            },
            {
                user_id: userId,
                title: 'Live Session Reminder',
                message: 'Your live session starts in 1 hour',
                type: 'reminder',
                is_read: false
            },
            {
                user_id: userId,
                title: 'Revenue Update',
                message: 'You earned $250 from course enrollments this week',
                type: 'revenue',
                is_read: true
            }
        ];

        // Insert mock notifications
        const insertPromises = mockNotifications.map(notification =>
            query(
                `INSERT INTO notifications (user_id, title, message, type, created_at, is_read) 
                 VALUES ($1, $2, $3, $4, NOW(), $5)`,
                [notification.user_id, notification.title, notification.message, notification.type, notification.is_read]
            )
        );

        await Promise.all(insertPromises);

        res.json({
            message: `${mockNotifications.length} mock notifications generated`,
            count: mockNotifications.length
        });
    } catch (err) {
        next(err);
    }
});

// ============= STUDENT NOTIFICATIONS =============

// GET /api/notifications/student - Get student notifications
router.get('/student', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        // Get notifications for the student
        const notificationsQuery = `
            SELECT 
                id, title, message, type, created_at, is_read, read_at
            FROM notifications 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2 OFFSET $3
        `;

        const notifications = await query(notificationsQuery, [userId, limit, offset]);

        // Transform the data to match frontend expectations
        const transformedNotifications = notifications.rows.map(notification => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            created_at: notification.created_at,
            read: notification.is_read,
            read_at: notification.read_at
        }));

        res.json({ notifications: transformedNotifications });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/:id/read', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            `UPDATE notifications 
             SET is_read = true, read_at = NOW() 
             WHERE id = $1 AND user_id = $2 
             RETURNING id, title`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({
            message: 'Notification marked as read',
            notification: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/student/read-all - Mark all student notifications as read
router.post('/student/read-all', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `UPDATE notifications 
             SET is_read = true, read_at = NOW() 
             WHERE user_id = $1 AND is_read = false 
             RETURNING COUNT(*) as count`,
            [userId]
        );

        res.json({
            message: `${result.rows[0].count} notifications marked as read`,
            count: parseInt(result.rows[0].count)
        });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING title',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({
            message: 'Notification deleted successfully',
            title: result.rows[0].title
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/notifications/student/settings - Get notification settings
router.get('/student/settings', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Return default settings (in a real app, these would be stored in the database)
        const defaultSettings = {
            email_notifications: true,
            push_notifications: true,
            assignment_reminders: true,
            quiz_reminders: true,
            live_session_alerts: true,
            course_updates: true,
            grade_notifications: true
        };

        res.json({ settings: defaultSettings });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/student/settings - Update notification settings
router.post('/student/settings', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const settings = req.body;

        // In a real app, these would be stored in the database
        // For now, just return success
        res.json({
            message: 'Notification settings updated successfully',
            settings
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications/student/generate - Generate mock notifications for testing
router.post('/student/generate', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Generate some mock notifications for testing
        const mockNotifications = [
            {
                user_id: userId,
                title: 'New Assignment Available',
                message: 'Complete the JavaScript Fundamentals assignment by tomorrow',
                type: 'assignment',
                is_read: false
            },
            {
                user_id: userId,
                title: 'Quiz Reminder',
                message: 'Don\'t forget to take the React Hooks quiz today',
                type: 'quiz',
                is_read: false
            },
            {
                user_id: userId,
                title: 'Grade Posted',
                message: 'Your grade for the CSS Module assignment has been posted',
                type: 'grade',
                is_read: true
            },
            {
                user_id: userId,
                title: 'Live Session Starting Soon',
                message: 'Join the live session on Advanced React in 30 minutes',
                type: 'live_session',
                is_read: false
            },
            {
                user_id: userId,
                title: 'Course Update',
                message: 'New content added to the Web Development course',
                type: 'announcement',
                is_read: true
            }
        ];

        // Insert mock notifications
        const insertPromises = mockNotifications.map(notification =>
            query(
                `INSERT INTO notifications (user_id, title, message, type, created_at, is_read) 
                 VALUES ($1, $2, $3, $4, NOW(), $5)`,
                [notification.user_id, notification.title, notification.message, notification.type, notification.is_read]
            )
        );

        await Promise.all(insertPromises);

        res.json({
            message: `${mockNotifications.length} mock notifications generated`,
            count: mockNotifications.length
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
