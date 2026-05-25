const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/messages/instructor/send - Send direct message from instructor to student
router.post('/instructor/send', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { recipient_id, subject, message } = req.body;
        const sender_id = req.user.id;

        if (!recipient_id || !subject || !message) {
            return res.status(400).json({ error: 'Recipient ID, subject, and message are required' });
        }

        // Verify recipient is a student
        const recipient = await query('SELECT id, role FROM users WHERE id = $1', [recipient_id]);
        if (!recipient.rows.length) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        if (recipient.rows[0].role !== 'student') {
            return res.status(400).json({ error: 'Messages can only be sent to students' });
        }

        // Verify instructor and student share at least one course
        const sharedCourse = await query(
            `SELECT c.id FROM courses c
             WHERE c.instructor_id = $1 
             AND c.id IN (
                 SELECT course_id FROM enrollments WHERE student_id = $2
             )
             LIMIT 1`,
            [sender_id, recipient_id]
        );

        if (!sharedCourse.rows.length) {
            return res.status(403).json({ error: 'You do not share a course with this student' });
        }

        // Create message notification
        await query(
            `INSERT INTO notifications (user_id, title, message, type, created_at, is_read) 
             VALUES ($1, $2, $3, 'message', NOW(), false)`,
            [recipient_id, subject, message]
        );

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (err) { next(err); }
});

// GET /api/messages/instructor/sent - Get messages sent by instructor
router.get('/instructor/sent', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        // This would require a separate messages table to track sent messages
        // For now, return empty array
        res.json({ messages: [] });
    } catch (err) { next(err); }
});

// POST /api/messages/student/send - Send message from student (optional)
router.post('/student/send', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { recipient_id, subject, message } = req.body;
        const sender_id = req.user.id;

        if (!recipient_id || !subject || !message) {
            return res.status(400).json({ error: 'Recipient ID, subject, and message are required' });
        }

        // Verify recipient is an instructor
        const recipient = await query('SELECT id, role FROM users WHERE id = $1', [recipient_id]);
        if (!recipient.rows.length) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        if (recipient.rows[0].role !== 'instructor') {
            return res.status(400).json({ error: 'Messages to non-instructors are not supported' });
        }

        // Create message notification
        await query(
            `INSERT INTO notifications (user_id, title, message, type, created_at, is_read) 
             VALUES ($1, $2, $3, 'message', NOW(), false)`,
            [recipient_id, subject, message]
        );

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (err) { next(err); }
});

module.exports = router;
