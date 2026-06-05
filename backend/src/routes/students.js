const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/students/instructor/all - Get all students for instructor
router.get('/instructor/all', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT DISTINCT u.id, u.name, u.email, u.created_at,
                    COUNT(e.id) as course_count,
                    AVG(e.progress_percent) as avg_progress,
                    COUNT(lp.id) as lesson_count,
                    COUNT(qa.id) as quiz_attempts,
                    COUNT(sub.id) as assignment_submissions
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             JOIN courses c ON e.course_id = c.id
             LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
             LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
             LEFT JOIN assignment_submissions sub ON u.id = sub.user_id
             WHERE c.instructor_id = $1 AND u.role = 'student'
             GROUP BY u.id, u.name, u.email, u.created_at
             ORDER BY u.name`,
            [req.user.id]
        );
        res.json({ students: result.rows });
    } catch (err) { next(err); }
});

// GET /api/students/instructor/course/:courseId - Get students for specific course
router.get('/instructor/course/:courseId', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { courseId } = req.params;
        
        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `SELECT u.id, u.name, u.email, u.created_at,
                    e.enrolled_at, e.progress_percent,
                    COUNT(lp.id) as lesson_count,
                    COUNT(qa.id) as quiz_attempts,
                    COUNT(sub.id) as assignment_submissions
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
             LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
             LEFT JOIN assignment_submissions sub ON u.id = sub.user_id
             WHERE e.course_id = $1 AND u.role = 'student'
             GROUP BY u.id, u.name, u.email, u.created_at, e.enrolled_at, e.progress_percent
             ORDER BY u.name`,
            [courseId]
        );
        res.json({ students: result.rows });
    } catch (err) { next(err); }
});

// GET /api/students/instructor/:studentId - Get detailed student information
router.get('/instructor/:studentId', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { studentId } = req.params;
        
        // Verify instructor has access to this student (through shared courses)
        const accessCheck = await query(
            `SELECT 1 FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.student_id = $1 AND c.instructor_id = $2
             LIMIT 1`,
            [studentId, req.user.id]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const [student, courses, activity, recentActivity] = await Promise.all([
            query(
                `SELECT id, name, email, created_at, last_login_at
                 FROM users 
                 WHERE id = $1 AND role = 'student'`,
                [studentId]
            ),
            query(
                `SELECT c.id, c.title, e.enrolled_at, e.progress_percent
                 FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE e.student_id = $1 AND c.instructor_id = $2
                 ORDER BY e.enrolled_at DESC`,
                [studentId, req.user.id]
            ),
            query(
                `SELECT 
                    COUNT(DISTINCT lp.id) as total_lessons,
                    COUNT(DISTINCT qa.id) as quiz_attempts,
                    AVG(qa.score) as avg_quiz_score,
                    COUNT(DISTINCT sub.id) as assignment_submissions
                 FROM users u
                 LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
                 LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
                 LEFT JOIN assignment_submissions sub ON u.id = sub.user_id
                 WHERE u.id = $1`,
                [studentId]
            ),
            query(
                `SELECT 
                    'lesson' as type, 
                    l.title,
                    lp.completed_at as timestamp
                 FROM lesson_progress lp
                 JOIN lessons l ON lp.lesson_id = l.id
                 JOIN courses c ON l.course_id = c.id
                 WHERE lp.student_id = $1 AND c.instructor_id = $2 AND lp.completed = true
                 UNION ALL
                 SELECT 
                    'quiz' as type,
                    q.title,
                    qa.completed_at as timestamp
                 FROM quiz_attempts qa
                 JOIN quizzes q ON qa.quiz_id = q.id
                 JOIN courses c ON q.course_id = c.id
                 WHERE qa.student_id = $1 AND c.instructor_id = $2
                 UNION ALL
                 SELECT 
                    'assignment' as type,
                    a.title,
                    sub.submitted_at as timestamp
                 FROM assignment_submissions sub
                 JOIN assignments a ON sub.assignment_id = a.id
                 JOIN courses c ON a.course_id = c.id
                 WHERE sub.user_id = $1 AND c.instructor_id = $2
                 ORDER BY timestamp DESC
                 LIMIT 10`,
                [studentId, req.user.id]
            )
        ]);

        if (student.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json({
            student: student.rows[0],
            courses: courses.rows,
            activity: activity.rows[0],
            recent_activity: recentActivity.rows
        });
    } catch (err) { next(err); }
});

// GET /api/students/instructor/export - Export all student data
router.get('/instructor/export', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT u.id, u.name, u.email, u.created_at, u.last_login_at,
                    COUNT(e.id) as course_count,
                    AVG(e.progress_percent) as avg_progress,
                    COUNT(lp.id) as lesson_count,
                    COUNT(qa.id) as quiz_attempts,
                    AVG(qa.score) as avg_quiz_score,
                    COUNT(sub.id) as assignment_submissions
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             JOIN courses c ON e.course_id = c.id
             LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
             LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
             LEFT JOIN assignment_submissions sub ON u.id = sub.user_id
             WHERE c.instructor_id = $1 AND u.role = 'student'
             GROUP BY u.id, u.name, u.email, u.created_at, u.last_login_at
             ORDER BY u.name`,
            [req.user.id]
        );
        res.json({ students: result.rows });
    } catch (err) { next(err); }
});

// GET /api/students/instructor/course/:courseId/export - Export course student data
router.get('/instructor/course/:courseId/export', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { courseId } = req.params;
        
        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `SELECT u.id, u.name, u.email, u.created_at, u.last_login_at,
                    e.enrolled_at, e.progress_percent,
                    COUNT(lp.id) as lesson_count,
                    COUNT(qa.id) as quiz_attempts,
                    AVG(qa.score) as avg_quiz_score,
                    COUNT(sub.id) as assignment_submissions
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
             LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
             LEFT JOIN assignment_submissions sub ON u.id = sub.user_id
             WHERE e.course_id = $1 AND u.role = 'student'
             GROUP BY u.id, u.name, u.email, u.created_at, u.last_login_at, e.enrolled_at, e.progress_percent
             ORDER BY u.name`,
            [courseId]
        );
        res.json({ students: result.rows });
    } catch (err) { next(err); }
});

// POST /api/students/instructor/:studentId/message - Send message to student (placeholder)
router.post('/instructor/:studentId/message', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const { subject, message } = req.body;
        
        // Verify instructor has access to this student
        const accessCheck = await query(
            `SELECT 1 FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.student_id = $1 AND c.instructor_id = $2
             LIMIT 1`,
            [studentId, req.user.id]
        );
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Store as a notification to the student
        await query(
            `INSERT INTO notifications (user_id, title, message, type, created_at, is_read) 
             VALUES ($1, $2, $3, 'message', NOW(), false)`,
            [studentId, subject, message]
        );

        res.json({ message: 'Message sent successfully' });
    } catch (err) { next(err); }
});

// GET /api/students/instructor/analytics - Get overall student analytics
router.get('/instructor/analytics', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const [
            totalStudents,
            activeStudents,
            progressStats,
            engagementStats,
            courseStats
        ] = await Promise.all([
            query(
                `SELECT COUNT(DISTINCT u.id) as total
                 FROM users u
                 JOIN enrollments e ON u.id = e.student_id
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1 AND u.role = 'student'`,
                [req.user.id]
            ),
            query(
                `SELECT COUNT(DISTINCT u.id) as active
                 FROM users u
                 JOIN enrollments e ON u.id = e.student_id
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1 AND u.role = 'student'
                 AND u.last_login_at >= NOW() - INTERVAL '7 days'`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    AVG(e.progress_percent) as avg_progress,
                    COUNT(CASE WHEN e.progress_percent >= 90 THEN 1 END) as completed,
                    COUNT(CASE WHEN e.progress_percent >= 50 THEN 1 END) as halfway,
                    COUNT(CASE WHEN e.progress_percent < 50 THEN 1 END) as started
                 FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    COUNT(DISTINCT lp.student_id) as lesson_participants,
                    COUNT(lp.id) as total_lesson_completions,
                    COUNT(DISTINCT qa.student_id) as quiz_participants,
                    COUNT(qa.id) as total_quiz_attempts,
                    AVG(qa.score) as avg_quiz_score
                 FROM courses c
                 LEFT JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 LEFT JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT c.title, COUNT(e.student_id) as enrolled_students, AVG(e.progress_percent) as avg_progress
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY enrolled_students DESC`,
                [req.user.id]
            )
        ]);

        res.json({
            total_students: totalStudents.rows[0].total,
            active_students: activeStudents.rows[0].active,
            progress_stats: progressStats.rows[0],
            engagement_stats: engagementStats.rows[0],
            course_stats: courseStats.rows
        });
    } catch (err) { next(err); }
});

module.exports = router;



