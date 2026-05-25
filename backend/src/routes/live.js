const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/live/sessions
router.get('/sessions', authenticate, async (req, res, next) => {
    try {
        let sql = `SELECT ls.*, c.title as course_title, u.name as instructor_name
                   FROM live_sessions ls
                   JOIN courses c ON ls.course_id = c.id
                   JOIN users u ON c.instructor_id = u.id
                   WHERE 1=1`;
        const params = [];

        if (req.user.role === 'instructor') {
            sql += ' AND c.instructor_id = $1';
            params.push(req.user.id);
        } else if (req.user.role === 'student') {
            sql += ` AND ls.course_id IN (
                SELECT course_id FROM enrollments WHERE student_id = $1
            )`;
            params.push(req.user.id);
        }

        sql += ' ORDER BY ls.scheduled_at DESC';

        const result = await query(sql, params);
        res.json({ sessions: result.rows });
    } catch (err) { next(err); }
});

// GET /api/live/sessions/:id
router.get('/sessions/:id', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT ls.*, c.title as course_title, u.name as instructor_name, u.avatar_url as instructor_avatar
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             JOIN users u ON c.instructor_id = u.id
             WHERE ls.id = $1`,
            [req.params.id]
        );

        if (!result.rows.length) return res.status(404).json({ error: 'Session not found' });
        res.json({ session: result.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/live/sessions
router.post('/sessions', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { course_id, title, description, scheduled_at, duration_minutes, meeting_url } = req.body;

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [course_id]);
        if (!course.rows.length) return res.status(404).json({ error: 'Course not found' });
        if (course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `INSERT INTO live_sessions (course_id, title, description, scheduled_at, duration_minutes, meeting_url, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'scheduled') RETURNING *`,
            [course_id, title, description, scheduled_at, duration_minutes, meeting_url]
        );

        // Notify enrolled students
        const students = await query(
            'SELECT student_id FROM enrollments WHERE course_id = $1',
            [course_id]
        );

        for (const student of students.rows) {
            await query(
                `INSERT INTO notifications (user_id, type, title, message, link)
                 VALUES ($1, 'live_session', 'New Live Session', $2, $3)`,
                [
                    student.student_id,
                    `Live session "${title}" scheduled`,
                    `/student/live/${result.rows[0].id}`
                ]
            );
        }

        res.status(201).json({ session: result.rows[0] });
    } catch (err) { next(err); }
});

// PATCH /api/live/sessions/:id/status
router.patch('/sessions/:id/status', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { status } = req.body;

        const result = await query(
            'UPDATE live_sessions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );

        if (!result.rows.length) return res.status(404).json({ error: 'Session not found' });
        res.json({ session: result.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/join
router.post('/sessions/:id/join', authenticate, async (req, res, next) => {
    try {
        const session = await query('SELECT * FROM live_sessions WHERE id = $1', [req.params.id]);
        if (!session.rows.length) return res.status(404).json({ error: 'Session not found' });

        // Record attendance
        await query(
            `INSERT INTO session_attendance (session_id, student_id, joined_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (session_id, student_id) DO NOTHING`,
            [req.params.id, req.user.id]
        );

        res.json({ meeting_url: session.rows[0].meeting_url });
    } catch (err) { next(err); }
});

// GET /api/live/sessions/:id/attendance
router.get('/sessions/:id/attendance', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT u.id, u.name, u.email, u.avatar_url, sa.joined_at, sa.left_at
             FROM session_attendance sa
             JOIN users u ON sa.student_id = u.id
             WHERE sa.session_id = $1
             ORDER BY sa.joined_at DESC`,
            [req.params.id]
        );

        res.json({ attendance: result.rows });
    } catch (err) { next(err); }
});

// GET /api/live/instructor/sessions - Get all sessions for instructor with enhanced data
router.get('/instructor/sessions', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT ls.*, c.title as course_title,
                    COUNT(sa.student_id) as attendance_count,
                    COUNT(CASE WHEN ls.status = 'completed' THEN 1 END) as completed_sessions
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             LEFT JOIN session_attendance sa ON ls.id = sa.session_id
             WHERE c.instructor_id = $1
             GROUP BY ls.id, c.title
             ORDER BY ls.scheduled_at DESC`,
            [req.user.id]
        );
        res.json({ sessions: result.rows });
    } catch (err) { next(err); }
});

// PUT /api/live/sessions/:id - Update live session
router.put('/sessions/:id', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, scheduled_at, duration_minutes, meeting_url } = req.body;

        // Verify instructor owns the course this session belongs to
        const session = await query(
            `SELECT ls.*, c.instructor_id 
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             WHERE ls.id = $1`,
            [id]
        );

        if (!session.rows.length || session.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `UPDATE live_sessions 
             SET title = $1, description = $2, scheduled_at = $3, duration_minutes = $4, meeting_url = $5, updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [title, description, scheduled_at, duration_minutes, meeting_url, id]
        );

        res.json({ session: result.rows[0] });
    } catch (err) { next(err); }
});

// DELETE /api/live/sessions/:id - Delete live session
router.delete('/sessions/:id', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the course this session belongs to
        const session = await query(
            `SELECT ls.*, c.instructor_id 
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             WHERE ls.id = $1`,
            [id]
        );

        if (!session.rows.length || session.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete session (cascade should handle attendance)
        await query('DELETE FROM live_sessions WHERE id = $1', [id]);

        res.json({ message: 'Live session deleted successfully' });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/start - Start a live session
router.post('/sessions/:id/start', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the course this session belongs to
        const session = await query(
            `SELECT ls.*, c.instructor_id 
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             WHERE ls.id = $1`,
            [id]
        );

        if (!session.rows.length || session.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            'UPDATE live_sessions SET status = $1, started_at = NOW() WHERE id = $2 RETURNING *',
            ['live', id]
        );

        // Notify enrolled students that session is starting
        const students = await query(
            `SELECT e.student_id FROM enrollments e
             WHERE e.course_id = $1`,
            [session.rows[0].course_id]
        );

        for (const student of students.rows) {
            await query(
                `INSERT INTO notifications (user_id, type, title, message, link)
                 VALUES ($1, 'live_session_start', 'Live Session Starting', $2, $3)`,
                [
                    student.student_id,
                    `Live session "${session.rows[0].title}" is starting now!`,
                    `/student/live/${id}`
                ]
            );
        }

        res.json({ session: result.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/end - End a live session
router.post('/sessions/:id/end', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the course this session belongs to
        const session = await query(
            `SELECT ls.*, c.instructor_id 
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             WHERE ls.id = $1`,
            [id]
        );

        if (!session.rows.length || session.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            'UPDATE live_sessions SET status = $1, ended_at = NOW() WHERE id = $2 RETURNING *',
            ['completed', id]
        );

        res.json({ session: result.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/recordings - Add recording to session
router.post('/sessions/:id/recordings', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { recording_url, duration_minutes, title } = req.body;

        // Verify instructor owns the course this session belongs to
        const session = await query(
            `SELECT ls.*, c.instructor_id 
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             WHERE ls.id = $1`,
            [id]
        );

        if (!session.rows.length || session.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `INSERT INTO session_recordings (session_id, recording_url, duration_minutes, title, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [id, recording_url, duration_minutes, title || `Recording of ${session.rows[0].title}`]
        );

        // Notify enrolled students about recording availability
        const students = await query(
            `SELECT e.student_id FROM enrollments e
             WHERE e.course_id = $1`,
            [session.rows[0].course_id]
        );

        for (const student of students.rows) {
            await query(
                `INSERT INTO notifications (user_id, type, title, message, link)
                 VALUES ($1, 'recording_available', 'Recording Available', $2, $3)`,
                [
                    student.student_id,
                    `Recording for "${session.rows[0].title}" is now available`,
                    `/student/live/${id}`
                ]
            );
        }

        res.json({ recording: result.rows[0] });
    } catch (err) { next(err); }
});

// GET /api/live/sessions/:id/recordings - Get recordings for a session
router.get('/sessions/:id/recordings', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT sr.* FROM session_recordings sr
             WHERE sr.session_id = $1
             ORDER BY sr.created_at DESC`,
            [req.params.id]
        );

        res.json({ recordings: result.rows });
    } catch (err) { next(err); }
});

// GET /api/live/sessions/:id/analytics - Get session analytics for instructor
router.get('/sessions/:id/analytics', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the course this session belongs to
        const session = await query(
            `SELECT ls.*, c.instructor_id 
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             WHERE ls.id = $1`,
            [id]
        );

        if (!session.rows.length || session.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const [
            attendanceStats,
            attendanceDetails,
            recordingStats,
            sessionDetails
        ] = await Promise.all([
            query(
                `SELECT 
                    COUNT(*) as total_attendees,
                    COUNT(CASE WHEN sa.joined_at IS NOT NULL THEN 1 END) as joined_count,
                    COUNT(CASE WHEN sa.left_at IS NOT NULL THEN 1 END) as completed_count,
                    AVG(EXTRACT(EPOCH FROM (sa.left_at - sa.joined_at))/60) as avg_duration_minutes
                 FROM session_attendance sa
                 WHERE sa.session_id = $1`,
                [id]
            ),
            query(
                `SELECT u.id, u.name, u.email, u.avatar_url, 
                        sa.joined_at, sa.left_at,
                        EXTRACT(EPOCH FROM (sa.left_at - sa.joined_at))/60 as duration_minutes
                 FROM session_attendance sa
                 JOIN users u ON sa.student_id = u.id
                 WHERE sa.session_id = $1
                 ORDER BY sa.joined_at DESC`,
                [id]
            ),
            query(
                `SELECT 
                    COUNT(*) as total_recordings,
                    SUM(duration_minutes) as total_duration
                 FROM session_recordings
                 WHERE session_id = $1`,
                [id]
            ),
            query(
                `SELECT ls.*, c.title as course_title
                 FROM live_sessions ls
                 JOIN courses c ON ls.course_id = c.id
                 WHERE ls.id = $1`,
                [id]
            )
        ]);

        res.json({
            attendance_stats: attendanceStats.rows[0],
            attendance_details: attendanceDetails.rows,
            recording_stats: recordingStats.rows[0],
            session_details: sessionDetails.rows[0]
        });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/leave
router.post('/sessions/:id/leave', authenticate, async (req, res, next) => {
    try {
        // Update attendance record
        await query(
            `UPDATE session_attendance 
             SET left_at = NOW() 
             WHERE session_id = $1 AND student_id = $2 AND left_at IS NULL`,
            [req.params.id, req.user.id]
        );

        res.json({ message: 'Left session successfully' });
    } catch (err) { next(err); }
});

// GET /api/live/sessions/:id/updates
router.get('/sessions/:id/updates', authenticate, async (req, res, next) => {
    try {
        const [attendance, chat] = await Promise.all([
            query(
                `SELECT u.id, u.name, u.email, u.avatar_url
                 FROM session_attendance sa
                 JOIN users u ON sa.student_id = u.id
                 WHERE sa.session_id = $1 AND sa.left_at IS NULL`,
                [req.params.id]
            ),
            query(
                `SELECT user_name, message, created_at
                 FROM session_chat
                 WHERE session_id = $1
                 ORDER BY created_at ASC
                 LIMIT 50`,
                [req.params.id]
            )
        ]);

        res.json({
            participants: attendance.rows,
            chat: chat.rows
        });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/chat
router.post('/sessions/:id/chat', authenticate, async (req, res, next) => {
    try {
        const { message } = req.body;

        await query(
            `INSERT INTO session_chat (session_id, student_id, user_name, message)
             VALUES ($1, $2, $3, $4)`,
            [req.params.id, req.user.id, req.user.name, message]
        );

        res.json({ message: 'Chat message sent' });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/screen-share/start
router.post('/sessions/:id/screen-share/start', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        res.json({ message: 'Screen share started' });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/screen-share/stop
router.post('/sessions/:id/screen-share/stop', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        res.json({ message: 'Screen share stopped' });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/audio/mute
router.post('/sessions/:id/audio/mute', authenticate, async (req, res, next) => {
    try {
        res.json({ message: 'Audio muted' });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/audio/unmute
router.post('/sessions/:id/audio/unmute', authenticate, async (req, res, next) => {
    try {
        res.json({ message: 'Audio unmuted' });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/video/start
router.post('/sessions/:id/video/start', authenticate, async (req, res, next) => {
    try {
        res.json({ message: 'Video started' });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/video/stop
router.post('/sessions/:id/video/stop', authenticate, async (req, res, next) => {
    try {
        res.json({ message: 'Video stopped' });
    } catch (err) { next(err); }
});

// POST /api/live/sessions/:id/duplicate - Duplicate live session
router.post('/sessions/:id/duplicate', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { new_title, new_scheduled_at } = req.body;

        // Verify instructor owns the course this session belongs to
        const session = await query(
            `SELECT ls.*, c.instructor_id 
             FROM live_sessions ls
             JOIN courses c ON ls.course_id = c.id
             WHERE ls.id = $1`,
            [id]
        );

        if (!session.rows.length || session.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const original = session.rows[0];

        // Create duplicate session
        const newSession = await query(
            `INSERT INTO live_sessions (course_id, title, description, scheduled_at, duration_minutes, meeting_url, status)
             VALUES ($1,$2,$3,$4,$5,$6,'scheduled')
             RETURNING *`,
            [original.course_id, new_title || `${original.title} (Copy)`, original.description, new_scheduled_at, original.duration_minutes, original.meeting_url]
        );

        res.json({ session: newSession.rows[0] });
    } catch (err) { next(err); }
});

module.exports = router;
