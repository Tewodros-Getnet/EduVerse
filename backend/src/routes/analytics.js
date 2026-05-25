const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/public/stats (public endpoint - no auth required)
router.get('/public/stats', async (req, res, next) => {
    try {
        const [activeStudents, instructors, coursesData, successRate] = await Promise.all([
            query('SELECT COUNT(DISTINCT id) as count FROM users WHERE role = $1', ['student']),
            query('SELECT COUNT(DISTINCT id) as count FROM users WHERE role = $1', ['instructor']),
            query('SELECT COUNT(id) as count FROM courses WHERE status = $1', ['published']),
            query(`SELECT COALESCE(ROUND(AVG(CASE WHEN e.progress_percent >= 80 THEN 1 ELSE 0 END) * 100, 2), 0) as rate 
                   FROM enrollments e`),
        ]);

        res.json({
            active_students: parseInt(activeStudents.rows[0].count || 0),
            instructors: parseInt(instructors.rows[0].count || 0),
            courses: parseInt(coursesData.rows[0].count || 0),
            success_rate: parseFloat(successRate.rows[0].rate || 0),
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/dashboard
router.get('/instructor/dashboard', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const [courses, students, revenue, engagement] = await Promise.all([
            query('SELECT COUNT(*) FROM courses WHERE instructor_id = $1', [req.user.id]),
            query(
                `SELECT COUNT(DISTINCT e.student_id) FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT COALESCE(SUM(c.price), 0) as total FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT AVG(e.progress_percent) as avg_progress FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
        ]);

        res.json({
            total_courses: parseInt(courses.rows[0].count),
            total_students: parseInt(students.rows[0].count),
            total_revenue: parseFloat(revenue.rows[0].total || 0),
            avg_engagement: parseFloat(engagement.rows[0].avg_progress || 0),
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/performance
router.get('/instructor/performance', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const [engagementResult, revenueResult, totalLessonsResult, totalAssignmentsResult, avgQuizResult, coursePerformance] = await Promise.all([
            query(
                `SELECT COUNT(DISTINCT u.id) as total_students,
                        AVG(e.progress_percent) as avg_student_progress,
                        COUNT(CASE WHEN e.progress_percent >= 80 THEN 1 END) as highly_engaged,
                        COUNT(CASE WHEN e.progress_percent >= 50 AND e.progress_percent < 80 THEN 1 END) as moderately_engaged,
                        COUNT(CASE WHEN e.progress_percent < 50 THEN 1 END) as lowly_engaged
                 FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 JOIN users u ON e.student_id = u.id
                 WHERE c.instructor_id = $1 AND u.role = 'student'`,
                [req.user.id]
            ),
            query(
                `SELECT COUNT(*) as total_enrollments,
                        COALESCE(SUM(c.price), 0) as total_revenue
                 FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT COUNT(l.id) as total_lessons,
                        COUNT(lp.id) as completed_lessons
                 FROM courses c
                 JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.completed = true
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT COUNT(a.id) as total_assignments
                 FROM courses c
                 JOIN assignments a ON c.id = a.course_id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT AVG(qa.score) as avg_quiz_performance
                 FROM courses c
                 JOIN quizzes q ON c.id = q.course_id
                 JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT c.id, c.title,
                        COUNT(DISTINCT e.student_id) as enrollment_count,
                        COALESCE(AVG(e.progress_percent), 0) as avg_progress
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY c.created_at DESC`,
                [req.user.id]
            ),
        ]);

        const totalEnrollments = parseInt(revenueResult.rows[0].total_enrollments || 0);
        const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue || 0);

        res.json({
            student_engagement: {
                total_students: parseInt(engagementResult.rows[0].total_students || 0),
                avg_student_progress: parseFloat(engagementResult.rows[0].avg_student_progress || 0),
                highly_engaged: parseInt(engagementResult.rows[0].highly_engaged || 0),
                moderately_engaged: parseInt(engagementResult.rows[0].moderately_engaged || 0),
                lowly_engaged: parseInt(engagementResult.rows[0].lowly_engaged || 0),
            },
            revenue_analytics: {
                total_revenue: totalRevenue,
                revenue_per_enrollment: totalEnrollments ? totalRevenue / totalEnrollments : 0,
                total_enrollments: totalEnrollments,
            },
            content_effectiveness: {
                total_lessons: parseInt(totalLessonsResult.rows[0].total_lessons || 0),
                completed_lessons: parseInt(totalLessonsResult.rows[0].completed_lessons || 0),
                avg_quiz_performance: parseFloat(avgQuizResult.rows[0].avg_quiz_performance || 0),
                total_assignments: parseInt(totalAssignmentsResult.rows[0].total_assignments || 0),
            },
            course_performance: coursePerformance.rows.map(row => ({
                id: row.id,
                title: row.title,
                enrollment_count: parseInt(row.enrollment_count || 0),
                avg_progress: parseFloat(row.avg_progress || 0),
            })),
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/completion-rates
router.get('/instructor/completion-rates', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const [completionSummary, courseCompletion, lessonRates, quizRates, assignmentRates] = await Promise.all([
            query(
                `SELECT COUNT(*) as total_enrollments,
                        COUNT(CASE WHEN e.progress_percent >= 100 THEN 1 END) as total_completed,
                        AVG(e.progress_percent) as avg_progress
                 FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT c.id, c.title,
                        COUNT(e.student_id) as enrollments,
                        COUNT(CASE WHEN e.progress_percent >= 100 THEN 1 END) as completions,
                        COALESCE(100.0 * COUNT(CASE WHEN e.progress_percent >= 100 THEN 1 END) / NULLIF(COUNT(e.student_id), 0), 0) as completion_rate
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY c.created_at DESC`,
                [req.user.id]
            ),
            query(
                `SELECT c.id, c.title,
                        COALESCE(100.0 * SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END) / NULLIF(COUNT(l.id), 0), 0) as lesson_completion_rate
                 FROM courses c
                 JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY c.created_at DESC`,
                [req.user.id]
            ),
            query(
                `SELECT c.id, c.title,
                        COALESCE(100.0 * SUM(CASE WHEN qa.score >= 60 THEN 1 ELSE 0 END) / NULLIF(COUNT(qa.id), 0), 0) as quiz_pass_rate
                 FROM courses c
                 LEFT JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY c.created_at DESC`,
                [req.user.id]
            ),
            query(
                `SELECT c.id, c.title,
                        COALESCE(100.0 * COUNT(DISTINCT sub.student_id) / NULLIF(COUNT(DISTINCT e.student_id), 0), 0) as submission_rate
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 LEFT JOIN assignments a ON c.id = a.course_id
                 LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY c.created_at DESC`,
                [req.user.id]
            ),
        ]);

        res.json({
            overall_completion: {
                total_enrollments: parseInt(completionSummary.rows[0].total_enrollments || 0),
                total_completions: parseInt(completionSummary.rows[0].total_completed || 0),
                overall_completion_rate: completionSummary.rows[0].total_enrollments ? parseFloat((completionSummary.rows[0].total_completed || 0) * 100.0 / completionSummary.rows[0].total_enrollments) : 0,
                avg_progress_percent: parseFloat(completionSummary.rows[0].avg_progress || 0),
            },
            course_completion_breakdown: courseCompletion.rows.map(row => ({
                id: row.id,
                title: row.title,
                enrollments: parseInt(row.enrollments || 0),
                completions: parseInt(row.completions || 0),
                completion_rate: parseFloat(row.completion_rate || 0),
            })),
            lesson_completion_rates: lessonRates.rows.map(row => ({
                id: row.id,
                course_title: row.title,
                lesson_completion_rate: parseFloat(row.lesson_completion_rate || 0),
            })),
            quiz_completion_rates: quizRates.rows.map(row => ({
                id: row.id,
                course_title: row.title,
                quiz_pass_rate: parseFloat(row.quiz_pass_rate || 0),
            })),
            assignment_completion_rates: assignmentRates.rows.map(row => ({
                id: row.id,
                course_title: row.title,
                submission_rate: parseFloat(row.submission_rate || 0),
            })),
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/student-performance
router.get('/instructor/student-performance', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const courseId = req.query.courseId;
        const courseFilter = courseId ? 'AND c.id = $2' : '';
        const courseParams = courseId ? [req.user.id, courseId] : [req.user.id];

        const topPerformers = await query(
            `SELECT u.id, u.name, u.email, AVG(e.progress_percent) as avg_progress
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             JOIN courses c ON e.course_id = c.id
             WHERE c.instructor_id = $1 ${courseFilter}
             GROUP BY u.id, u.name, u.email
             ORDER BY avg_progress DESC
             LIMIT 5`,
            courseParams
        );

        const strugglingStudents = await query(
            `SELECT u.id, u.name, u.email, AVG(e.progress_percent) as avg_progress
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             JOIN courses c ON e.course_id = c.id
             WHERE c.instructor_id = $1 ${courseFilter}
             GROUP BY u.id, u.name, u.email
             ORDER BY avg_progress ASC
             LIMIT 5`,
            courseParams
        );

        const distribution = await query(
            `WITH student_progress AS (
                SELECT u.id, AVG(e.progress_percent) as avg_progress
                FROM users u
                JOIN enrollments e ON u.id = e.student_id
                JOIN courses c ON e.course_id = c.id
                WHERE c.instructor_id = $1 ${courseFilter}
                GROUP BY u.id
            )
            SELECT '0-49%' as progress_range, COUNT(*) as student_count,
                   COALESCE(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM student_progress), 0), 0) as percentage
            FROM student_progress WHERE avg_progress < 50
            UNION ALL
            SELECT '50-79%' as progress_range, COUNT(*) as student_count,
                   COALESCE(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM student_progress), 0), 0) as percentage
            FROM student_progress WHERE avg_progress >= 50 AND avg_progress < 80
            UNION ALL
            SELECT '80-100%' as progress_range, COUNT(*) as student_count,
                   COALESCE(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM student_progress), 0), 0) as percentage
            FROM student_progress WHERE avg_progress >= 80`,
            courseParams
        );

        res.json({
            top_performers: topPerformers.rows.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                avg_progress: parseFloat(row.avg_progress || 0),
            })),
            struggling_students: strugglingStudents.rows.map(row => ({
                id: row.id,
                name: row.name,
                email: row.email,
                avg_progress: parseFloat(row.avg_progress || 0),
            })),
            progress_distribution: distribution.rows.map(row => ({
                progress_range: row.progress_range,
                student_count: parseInt(row.student_count || 0),
                percentage: parseFloat(row.percentage || 0),
            })),
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/content-analytics
router.get('/instructor/content-analytics', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const [lessonEngagement, quizEngagement, assignmentEngagement, lessonAnalytics, quizAnalytics] = await Promise.all([
            query(
                `SELECT 'lessons' as content_type,
                        COUNT(l.id) as total_items,
                        COALESCE(100.0 * SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END) / NULLIF(COUNT(l.id), 0), 0) as engagement_rate
                 FROM courses c
                 JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT 'quizzes' as content_type,
                        COUNT(q.id) as total_items,
                        COALESCE(100.0 * SUM(CASE WHEN qa.score >= 60 THEN 1 ELSE 0 END) / NULLIF(COUNT(qa.id), 0), 0) as engagement_rate
                 FROM courses c
                 JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT 'assignments' as content_type,
                        COUNT(a.id) as total_items,
                        COALESCE(100.0 * COUNT(DISTINCT sub.student_id) / NULLIF(COUNT(DISTINCT a.id), 0), 0) as engagement_rate
                 FROM courses c
                 JOIN assignments a ON c.id = a.course_id
                 LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT l.id, l.title,
                        COUNT(lp.id) as attempts,
                        SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END) as completions,
                        COALESCE(100.0 * SUM(CASE WHEN lp.completed = true THEN 1 ELSE 0 END) / NULLIF(COUNT(lp.id), 0), 0) as completion_rate
                 FROM lessons l
                 JOIN courses c ON l.course_id = c.id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 WHERE c.instructor_id = $1
                 GROUP BY l.id, l.title
                 ORDER BY completion_rate DESC
                 LIMIT 5`,
                [req.user.id]
            ),
            query(
                `SELECT q.id, q.title,
                        COUNT(qa.id) as attempts,
                        SUM(CASE WHEN qa.score >= 60 THEN 1 ELSE 0 END) as passes,
                        COALESCE(100.0 * SUM(CASE WHEN qa.score >= 60 THEN 1 ELSE 0 END) / NULLIF(COUNT(qa.id), 0), 0) as pass_rate
                 FROM quizzes q
                 JOIN courses c ON q.course_id = c.id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $1
                 GROUP BY q.id, q.title
                 ORDER BY pass_rate DESC
                 LIMIT 5`,
                [req.user.id]
            ),
        ]);

        res.json({
            content_engagement_by_type: [
                {
                    content_type: 'lessons',
                    total_items: parseInt(lessonEngagement.rows[0]?.total_items || 0),
                    engagement_rate: parseFloat(lessonEngagement.rows[0]?.engagement_rate || 0),
                },
                {
                    content_type: 'quizzes',
                    total_items: parseInt(quizEngagement.rows[0]?.total_items || 0),
                    engagement_rate: parseFloat(quizEngagement.rows[0]?.engagement_rate || 0),
                },
                {
                    content_type: 'assignments',
                    total_items: parseInt(assignmentEngagement.rows[0]?.total_items || 0),
                    engagement_rate: parseFloat(assignmentEngagement.rows[0]?.engagement_rate || 0),
                },
            ],
            lesson_analytics: lessonAnalytics.rows.map(row => ({
                id: row.id,
                title: row.title,
                attempts: parseInt(row.attempts || 0),
                completions: parseInt(row.completions || 0),
                completion_rate: parseFloat(row.completion_rate || 0),
            })),
            quiz_analytics: quizAnalytics.rows.map(row => ({
                id: row.id,
                title: row.title,
                attempts: parseInt(row.attempts || 0),
                passes: parseInt(row.passes || 0),
                pass_rate: parseFloat(row.pass_rate || 0),
            })),
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/courses
router.get('/instructor/courses', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT 
                c.id, c.title, c.status,
                COUNT(DISTINCT e.student_id) as enrollment_count,
                AVG(e.progress_percent) as avg_progress,
                COUNT(DISTINCT qa.id) as quiz_attempts,
                AVG(qa.score) as avg_quiz_score
             FROM courses c
             LEFT JOIN enrollments e ON c.id = e.course_id
             LEFT JOIN quizzes q ON c.id = q.course_id
             LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
             WHERE c.instructor_id = $1
             GROUP BY c.id, c.title, c.status
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        res.json({ courses: result.rows });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/students/:courseId
router.get('/instructor/students/:courseId', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT 
                u.id, u.name, u.email, u.avatar_url,
                e.progress_percent, e.enrolled_at,
                COUNT(DISTINCT lp.lesson_id) as completed_lessons,
                AVG(qa.score) as avg_quiz_score
             FROM enrollments e
             JOIN users u ON e.student_id = u.id
             LEFT JOIN lesson_progress lp ON e.student_id = lp.student_id
             LEFT JOIN quizzes q ON e.course_id = q.course_id
             LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = e.student_id
             WHERE e.course_id = $1
             GROUP BY u.id, u.name, u.email, u.avatar_url, e.progress_percent, e.enrolled_at
             ORDER BY e.enrolled_at DESC`,
            [req.params.courseId]
        );
        res.json({ students: result.rows });
    } catch (err) { next(err); }
});

// GET /api/analytics/student/dashboard
router.get('/student/dashboard', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const [enrollments, completedCourses, quizStats, badges, streak] = await Promise.all([
            query('SELECT COUNT(*) FROM enrollments WHERE student_id = $1', [req.user.id]),
            query('SELECT COUNT(*) FROM enrollments WHERE student_id = $1 AND progress_percent = 100', [req.user.id]),
            query(
                `SELECT AVG(score) as avg_score, COUNT(*) as total_attempts
                 FROM quiz_attempts WHERE student_id = $1`,
                [req.user.id]
            ),
            query('SELECT COUNT(*) FROM badges WHERE student_id = $1', [req.user.id]),
            query(
                `SELECT COUNT(DISTINCT DATE(completed_at)) as days
                 FROM lesson_progress
                 WHERE student_id = $1 AND completed_at >= NOW() - INTERVAL '7 days'`,
                [req.user.id]
            ),
        ]);

        res.json({
            enrolled_courses: parseInt(enrollments.rows[0].count),
            completed_courses: parseInt(completedCourses.rows[0].count),
            avg_quiz_score: parseFloat(quizStats.rows[0].avg_score || 0),
            total_quiz_attempts: parseInt(quizStats.rows[0].total_attempts || 0),
            badges_earned: parseInt(badges.rows[0].count),
            learning_streak: parseInt(streak.rows[0].days || 0),
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/student/progress?time_range=week|month|year
router.get('/student/progress', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { time_range = 'week' } = req.query;
        const userId = req.user.id;

        let timeFilter;
        switch (time_range) {
            case 'week':
                timeFilter = "AND e.enrolled_at >= NOW() - INTERVAL '7 days'";
                break;
            case 'month':
                timeFilter = "AND e.enrolled_at >= NOW() - INTERVAL '30 days'";
                break;
            case 'year':
                timeFilter = "AND e.enrolled_at >= NOW() - INTERVAL '365 days'";
                break;
            default:
                timeFilter = "AND e.enrolled_at >= NOW() - INTERVAL '7 days'";
        }

        const progressQuery = `
            SELECT 
                c.id as course_id,
                c.title as course_title,
                e.progress_percent,
                e.enrolled_at
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = $1 ${timeFilter}
            ORDER BY c.title
        `;

        const result = await query(progressQuery, [userId]);

        res.json({
            time_range,
            progress_data: result.rows,
            summary: {
                total_courses: result.rows.length,
                avg_progress: Math.round(result.rows.reduce((acc, row) => acc + (row.progress_percent || 0), 0) / result.rows.length) || 0,
                completed_courses: result.rows.filter(row => row.progress_percent >= 100).length
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/analytics/student/recent-activity
router.get('/student/recent-activity', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        const activityQuery = `
            SELECT 
                'enrollment' as activity_type,
                c.title as title,
                e.enrolled_at as timestamp,
                CASE WHEN e.progress_percent = 100 THEN 'completed' ELSE 'in_progress' END as status
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = $1 AND e.enrolled_at >= NOW() - INTERVAL '7 days'
            
            ORDER BY timestamp DESC
            LIMIT 20
        `;

        const result = await query(activityQuery, [userId]);

        res.json({
            activities: result.rows,
            summary: {
                total_activities: result.rows.length,
                recent_enrollments: result.rows.filter(row => row.activity_type === 'enrollment').length,
                recent_quizzes: 0,
                recent_assignments: 0
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/analytics/student/progress/:courseId
router.get('/student/progress/:courseId', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const [enrollment, lessons, quizzes] = await Promise.all([
            query(
                'SELECT progress_percent, enrolled_at FROM enrollments WHERE student_id = $1 AND course_id = $2',
                [req.user.id, req.params.courseId]
            ),
            query(
                `SELECT l.id, l.title, l.duration_minutes, lp.completed, lp.completed_at
                 FROM lessons l
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.student_id = $1
                 WHERE l.course_id = $2
                 ORDER BY l.order_index`,
                [req.user.id, req.params.courseId]
            ),
            query(
                `SELECT q.id, q.title, qa.score, qa.completed_at
                 FROM quizzes q
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1
                 WHERE q.course_id = $2
                 ORDER BY q.created_at`,
                [req.user.id, req.params.courseId]
            ),
        ]);

        res.json({
            enrollment: enrollment.rows[0],
            lessons: lessons.rows,
            quizzes: quizzes.rows,
        });
    } catch (err) { next(err); }
});

// ============= ADMIN ANALYTICS =============

// GET /api/analytics/admin/dashboard - Comprehensive admin dashboard stats
router.get('/admin/dashboard', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const [
            totalUsers,
            activeUsers,
            totalCourses,
            publishedCourses,
            totalEnrollments,
            totalRevenue,
            avgProgress,
            recentActivity,
            topCourses,
            userGrowth,
            courseGrowth
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users'),
            query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
            query('SELECT COUNT(*) as count FROM courses'),
            query('SELECT COUNT(*) as count FROM courses WHERE status = $1', ['published']),
            query('SELECT COUNT(*) as count FROM enrollments'),
            query('SELECT COALESCE(SUM(c.price), 0) as total FROM enrollments e JOIN courses c ON e.course_id = c.id'),
            query('SELECT AVG(progress_percent) as avg FROM enrollments'),
            query(
                `SELECT COUNT(*) as count FROM (
                    SELECT 1 FROM enrollments WHERE enrolled_at >= NOW() - INTERVAL '7 days'
                    UNION ALL
                    SELECT 1 FROM quiz_attempts WHERE completed_at >= NOW() - INTERVAL '7 days'
                    UNION ALL
                    SELECT 1 FROM assignment_submissions WHERE submitted_at >= NOW() - INTERVAL '7 days'
                ) as recent_activity`
            ),
            query(
                `SELECT c.title, COUNT(e.id) as enrollment_count, AVG(e.progress_percent) as avg_progress
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 WHERE c.status = 'published'
                 GROUP BY c.id, c.title
                 ORDER BY enrollment_count DESC
                 LIMIT 5`
            ),
            query(
                `SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    COUNT(*) as new_users
                 FROM users
                 WHERE created_at >= NOW() - INTERVAL '6 months'
                 GROUP BY DATE_TRUNC('month', created_at)
                 ORDER BY month`
            ),
            query(
                `SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    COUNT(*) as new_courses
                 FROM courses
                 WHERE created_at >= NOW() - INTERVAL '6 months'
                 GROUP BY DATE_TRUNC('month', created_at)
                 ORDER BY month`
            )
        ]);

        res.json({
            overview: {
                total_users: parseInt(totalUsers.rows[0].count),
                active_users: parseInt(activeUsers.rows[0].count),
                total_courses: parseInt(totalCourses.rows[0].count),
                published_courses: parseInt(publishedCourses.rows[0].count),
                total_enrollments: parseInt(totalEnrollments.rows[0].count),
                total_revenue: parseFloat(totalRevenue.rows[0].total || 0),
                avg_progress: parseFloat(avgProgress.rows[0].avg || 0),
                recent_activity: parseInt(recentActivity.rows[0].count)
            },
            top_courses: topCourses.rows,
            user_growth: userGrowth.rows,
            course_growth: courseGrowth.rows
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/admin/users - User analytics for admin
router.get('/admin/users', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const [
            usersByRole,
            usersByStatus,
            userActivity,
            inactiveUsers,
            newUsers
        ] = await Promise.all([
            query(
                `SELECT role, COUNT(*) as count
                 FROM users
                 GROUP BY role
                 ORDER BY count DESC`
            ),
            query(
                `SELECT 
                    CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END as status,
                    COUNT(*) as count
                 FROM users
                 GROUP BY is_active
                 ORDER BY count DESC`
            ),
            query(
                `SELECT 
                    DATE_TRUNC('day', last_login_at) as day,
                    COUNT(*) as logins
                 FROM users
                 WHERE last_login_at >= NOW() - INTERVAL '30 days'
                 GROUP BY DATE_TRUNC('day', last_login_at)
                 ORDER BY day`
            ),
            query(
                `SELECT COUNT(*) as count
                 FROM users
                 WHERE last_login_at < NOW() - INTERVAL '30 days' OR last_login_at IS NULL`
            ),
            query(
                `SELECT COUNT(*) as count
                 FROM users
                 WHERE created_at >= NOW() - INTERVAL '30 days'`
            )
        ]);

        res.json({
            users_by_role: usersByRole.rows,
            users_by_status: usersByStatus.rows,
            user_activity: userActivity.rows,
            inactive_users: parseInt(inactiveUsers.rows[0].count),
            new_users: parseInt(newUsers.rows[0].count)
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/admin/courses - Course analytics for admin
router.get('/admin/courses', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const [
            coursesByStatus,
            coursesByCategory,
            coursePerformance,
            lowPerformanceCourses,
            recentCourses
        ] = await Promise.all([
            query(
                `SELECT status, COUNT(*) as count
                 FROM courses
                 GROUP BY status
                 ORDER BY count DESC`
            ),
            query(
                `SELECT category, COUNT(*) as count
                 FROM courses
                 WHERE category IS NOT NULL
                 GROUP BY category
                 ORDER BY count DESC
                 LIMIT 10`
            ),
            query(
                `SELECT 
                    c.title,
                    c.category,
                    COUNT(e.id) as enrollment_count,
                    AVG(e.progress_percent) as avg_progress,
                    COUNT(DISTINCT qa.student_id) as quiz_takers
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 LEFT JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.status = 'published'
                 GROUP BY c.id, c.title, c.category
                 ORDER BY enrollment_count DESC
                 LIMIT 10`
            ),
            query(
                `SELECT 
                    c.title,
                    c.category,
                    COUNT(e.id) as enrollment_count,
                    AVG(e.progress_percent) as avg_progress
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 WHERE c.status = 'published'
                 GROUP BY c.id, c.title, c.category
                 HAVING AVG(e.progress_percent) < 30
                 ORDER BY avg_progress ASC
                 LIMIT 5`
            ),
            query(
                `SELECT COUNT(*) as count
                 FROM courses
                 WHERE created_at >= NOW() - INTERVAL '30 days'`
            )
        ]);

        res.json({
            courses_by_status: coursesByStatus.rows,
            courses_by_category: coursesByCategory.rows,
            course_performance: coursePerformance.rows,
            low_performance_courses: lowPerformanceCourses.rows,
            recent_courses: parseInt(recentCourses.rows[0].count)
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/admin/engagement - Engagement analytics for admin
router.get('/admin/engagement', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const [
            enrollmentTrends,
            completionRates,
            quizPerformance,
            assignmentSubmissions,
            learningActivity
        ] = await Promise.all([
            query(
                `SELECT 
                    DATE_TRUNC('week', enrolled_at) as week,
                    COUNT(*) as enrollments
                 FROM enrollments
                 WHERE enrolled_at >= NOW() - INTERVAL '12 weeks'
                 GROUP BY DATE_TRUNC('week', enrolled_at)
                 ORDER BY week`
            ),
            query(
                `SELECT 
                    CASE 
                        WHEN progress_percent >= 90 THEN 'Completed (90%+)'
                        WHEN progress_percent >= 70 THEN 'Good Progress (70-89%)'
                        WHEN progress_percent >= 50 THEN 'Moderate Progress (50-69%)'
                        WHEN progress_percent >= 30 THEN 'Low Progress (30-49%)'
                        ELSE 'Very Low Progress (<30%)'
                    END as progress_range,
                    COUNT(*) as count
                 FROM enrollments
                 GROUP BY 
                    CASE 
                        WHEN progress_percent >= 90 THEN 'Completed (90%+)'
                        WHEN progress_percent >= 70 THEN 'Good Progress (70-89%)'
                        WHEN progress_percent >= 50 THEN 'Moderate Progress (50-69%)'
                        WHEN progress_percent >= 30 THEN 'Low Progress (30-49%)'
                        ELSE 'Very Low Progress (<30%)'
                    END
                 ORDER BY 
                    CASE 
                        WHEN progress_percent >= 90 THEN 1
                        WHEN progress_percent >= 70 THEN 2
                        WHEN progress_percent >= 50 THEN 3
                        WHEN progress_percent >= 30 THEN 4
                        ELSE 5
                    END`
            ),
            query(
                `SELECT 
                    AVG(score) as avg_score,
                    COUNT(*) as total_attempts,
                    COUNT(DISTINCT student_id) as unique_students
                 FROM quiz_attempts
                 WHERE completed_at >= NOW() - INTERVAL '30 days'`
            ),
            query(
                `SELECT 
                    COUNT(*) as total_submissions,
                    COUNT(DISTINCT student_id) as unique_students,
                    AVG(score) as avg_score
                 FROM assignment_submissions
                 WHERE submitted_at >= NOW() - INTERVAL '30 days'`
            ),
            query(
                `SELECT 
                    DATE_TRUNC('day', created_at) as day,
                    COUNT(*) as activities
                 FROM (
                    SELECT created_at FROM lesson_progress WHERE created_at >= NOW() - INTERVAL '30 days'
                    UNION ALL
                    SELECT completed_at FROM lesson_progress WHERE completed_at >= NOW() - INTERVAL '30 days'
                    UNION ALL
                    SELECT created_at FROM quiz_attempts WHERE created_at >= NOW() - INTERVAL '30 days'
                    UNION ALL
                    SELECT submitted_at FROM assignment_submissions WHERE submitted_at >= NOW() - INTERVAL '30 days'
                 ) activities
                 GROUP BY DATE_TRUNC('day', created_at)
                 ORDER BY day`
            )
        ]);

        res.json({
            enrollment_trends: enrollmentTrends.rows,
            completion_rates: completionRates.rows,
            quiz_performance: quizPerformance.rows[0],
            assignment_submissions: assignmentSubmissions.rows[0],
            learning_activity: learningActivity.rows
        });
    } catch (err) { next(err); }
});

// ============= ENHANCED INSTRUCTOR ANALYTICS =============

// GET /api/analytics/instructor/performance - Comprehensive performance analytics
router.get('/instructor/performance', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const [
            coursePerformance,
            studentEngagement,
            contentEffectiveness,
            timeAnalytics,
            revenueAnalytics
        ] = await Promise.all([
            query(
                `SELECT 
                    c.id, c.title, c.price,
                    COUNT(e.student_id) as enrollment_count,
                    AVG(e.progress_percent) as avg_progress,
                    COUNT(CASE WHEN e.progress_percent = 100 THEN 1 END) as completed_count,
                    COUNT(DISTINCT qa.id) as total_quiz_attempts,
                    AVG(qa.score) as avg_quiz_score,
                    COUNT(DISTINCT sub.id) as total_assignments,
                    AVG(sub.score) as avg_assignment_score,
                    COUNT(DISTINCT ls.id) as total_live_sessions,
                    COUNT(DISTINCT sa.student_id) as total_live_attendees
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 LEFT JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 LEFT JOIN assignments a ON c.id = a.course_id
                 LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
                 LEFT JOIN live_sessions ls ON c.id = ls.course_id
                 LEFT JOIN session_attendance sa ON ls.id = sa.session_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title, c.price
                 ORDER BY c.created_at DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    COUNT(DISTINCT u.id) as total_students,
                    COUNT(DISTINCT CASE WHEN e.progress_percent >= 80 THEN u.id END) as highly_engaged,
                    COUNT(DISTINCT CASE WHEN e.progress_percent >= 50 THEN u.id END) as moderately_engaged,
                    COUNT(DISTINCT CASE WHEN e.progress_percent < 50 THEN u.id END) as lowly_engaged,
                    AVG(e.progress_percent) as avg_student_progress,
                    COUNT(DISTINCT CASE WHEN lp.completed = true THEN lp.student_id END) as active_learners,
                    COUNT(DISTINCT CASE WHEN u.last_login_at >= NOW() - INTERVAL '7 days' THEN u.id END) as recently_active
                 FROM users u
                 JOIN enrollments e ON u.id = e.student_id
                 JOIN courses c ON e.course_id = c.id
                 LEFT JOIN lesson_progress lp ON u.id = lp.student_id
                 WHERE c.instructor_id = $1 AND u.role = 'student'
                 GROUP BY c.instructor_id`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    COUNT(DISTINCT l.id) as total_lessons,
                    COUNT(DISTINCT CASE WHEN lp.completed = true THEN lp.id END) as completed_lessons,
                    COUNT(DISTINCT q.id) as total_quizzes,
                    COUNT(DISTINCT qa.id) as attempted_quizzes,
                    AVG(qa.score) as avg_quiz_performance,
                    COUNT(DISTINCT a.id) as total_assignments,
                    COUNT(DISTINCT sub.id) as submitted_assignments,
                    AVG(sub.score) as avg_assignment_performance
                 FROM courses c
                 LEFT JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 LEFT JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 LEFT JOIN assignments a ON c.id = a.course_id
                 LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.instructor_id`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    AVG(EXTRACT(EPOCH FROM (lp.completed_at - e.enrolled_at))/86400) as avg_days_to_complete_lesson,
                    AVG(EXTRACT(EPOCH FROM (qa.completed_at - e.enrolled_at))/86400) as avg_days_to_attempt_quiz,
                    COUNT(DISTINCT CASE WHEN u.last_login_at >= NOW() - INTERVAL '30 days' THEN u.id END) as monthly_active_users,
                    COUNT(DISTINCT CASE WHEN e.enrolled_at >= NOW() - INTERVAL '30 days' THEN u.id END) as new_enrollments_monthly
                 FROM users u
                 JOIN enrollments e ON u.id = e.student_id
                 JOIN courses c ON e.course_id = c.id
                 LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
                 LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
                 WHERE c.instructor_id = $1 AND u.role = 'student'
                 GROUP BY c.instructor_id`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    COALESCE(SUM(c.price), 0) as total_revenue,
                    COUNT(e.id) as total_enrollments,
                    AVG(c.price) as avg_course_price,
                    COALESCE(SUM(c.price) / NULLIF(COUNT(e.id), 0), 0) as revenue_per_enrollment,
                    COUNT(CASE WHEN c.price > 0 THEN 1 END) as paid_courses,
                    COUNT(CASE WHEN c.price = 0 THEN 1 END) as free_courses
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.instructor_id`,
                [req.user.id]
            )
        ]);

        res.json({
            course_performance: coursePerformance.rows,
            student_engagement: studentEngagement.rows[0],
            content_effectiveness: contentEffectiveness.rows[0],
            time_analytics: timeAnalytics.rows[0],
            revenue_analytics: revenueAnalytics.rows[0]
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/completion-rates - Detailed completion rate analytics
router.get('/instructor/completion-rates', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const [
            overallCompletion,
            courseCompletionBreakdown,
            lessonCompletionRates,
            quizCompletionRates,
            assignmentCompletionRates,
            timeToCompletion
        ] = await Promise.all([
            query(
                `SELECT 
                    COUNT(e.id) as total_enrollments,
                    COUNT(CASE WHEN e.progress_percent = 100 THEN 1 END) as completed_courses,
                    ROUND(COUNT(CASE WHEN e.progress_percent = 100 THEN 1 END) * 100.0 / NULLIF(COUNT(e.id), 0), 2) as overall_completion_rate,
                    AVG(e.progress_percent) as avg_progress_percent
                 FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    c.id, c.title,
                    COUNT(e.id) as enrollments,
                    COUNT(CASE WHEN e.progress_percent = 100 THEN 1 END) as completions,
                    ROUND(COUNT(CASE WHEN e.progress_percent = 100 THEN 1 END) * 100.0 / NULLIF(COUNT(e.id), 0), 2) as completion_rate,
                    AVG(e.progress_percent) as avg_progress
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY completion_rate DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    c.title as course_title,
                    COUNT(l.id) as total_lessons,
                    COUNT(lp.id) as attempted_lessons,
                    COUNT(CASE WHEN lp.completed = true THEN 1 END) as completed_lessons,
                    ROUND(COUNT(CASE WHEN lp.completed = true THEN 1 END) * 100.0 / NULLIF(COUNT(l.id), 0), 2) as lesson_completion_rate
                 FROM courses c
                 LEFT JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY lesson_completion_rate DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    c.title as course_title,
                    COUNT(q.id) as total_quizzes,
                    COUNT(qa.id) as attempted_quizzes,
                    COUNT(CASE WHEN qa.score >= q.passing_score THEN 1 END) as passed_quizzes,
                    ROUND(COUNT(CASE WHEN qa.score >= q.passing_score THEN 1 END) * 100.0 / NULLIF(COUNT(qa.id), 0), 2) as quiz_pass_rate,
                    AVG(qa.score) as avg_quiz_score
                 FROM courses c
                 LEFT JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY quiz_pass_rate DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    c.title as course_title,
                    COUNT(a.id) as total_assignments,
                    COUNT(sub.id) as submitted_assignments,
                    COUNT(CASE WHEN sub.score IS NOT NULL THEN 1 END) as graded_assignments,
                    ROUND(COUNT(sub.id) * 100.0 / NULLIF(COUNT(a.id), 0), 2) as submission_rate,
                    AVG(sub.score) as avg_assignment_score
                 FROM courses c
                 LEFT JOIN assignments a ON c.id = a.course_id
                 LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
                 WHERE c.instructor_id = $1
                 GROUP BY c.id, c.title
                 ORDER BY submission_rate DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    c.title,
                    COUNT(CASE WHEN e.progress_percent = 100 THEN 1 END) as completed_courses,
                    COUNT(e.id) as total_enrollments,
                    ROUND(COUNT(CASE WHEN e.progress_percent = 100 THEN 1 END) * 100.0 / NULLIF(COUNT(e.id), 0), 2) as completion_rate
                 FROM courses c
                 JOIN enrollments e ON c.id = e.course_id
                 WHERE c.instructor_id = $1 AND e.progress_percent = 100
                 GROUP BY c.id, c.title
                 HAVING COUNT(e.id) > 0
                 ORDER BY completion_rate DESC`,
                [req.user.id]
            )
        ]);

        res.json({
            overall_completion: overallCompletion.rows[0],
            course_completion_breakdown: courseCompletionBreakdown.rows,
            lesson_completion_rates: lessonCompletionRates.rows,
            quiz_completion_rates: quizCompletionRates.rows,
            assignment_completion_rates: assignmentCompletionRates.rows,
            time_to_completion: timeToCompletion.rows
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/student-performance - Individual student performance analytics
router.get('/instructor/student-performance', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { courseId } = req.query;

        let whereClause = 'WHERE c.instructor_id = $1';
        let params = [req.user.id];

        if (courseId) {
            whereClause += ' AND e.course_id = $2';
            params.push(courseId);
        }

        const [
            topPerformers,
            strugglingStudents,
            engagementTrends,
            progressDistribution
        ] = await Promise.all([
            query(
                `SELECT 
                    u.id, u.name, u.email, u.avatar_url,
                    AVG(e.progress_percent) as avg_progress,
                    AVG(qa.score) as avg_quiz_score,
                    COUNT(DISTINCT e.course_id) as courses_enrolled,
                    COUNT(CASE WHEN e.progress_percent = 100 THEN 1 END) as courses_completed,
                    COUNT(DISTINCT lp.lesson_id) as lessons_completed,
                    COUNT(DISTINCT qa.id) as quizzes_attempted
                 FROM users u
                 JOIN enrollments e ON u.id = e.student_id
                 JOIN courses c ON e.course_id = c.id
                 LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
                 LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
                 ${whereClause}
                 GROUP BY u.id, u.name, u.email, u.avatar_url
                 ORDER BY avg_progress DESC, avg_quiz_score DESC
                 LIMIT 10`,
                params
            ),
            query(
                `SELECT 
                    u.id, u.name, u.email, u.avatar_url,
                    AVG(e.progress_percent) as avg_progress,
                    AVG(qa.score) as avg_quiz_score,
                    COUNT(DISTINCT e.course_id) as courses_enrolled,
                    COUNT(DISTINCT lp.lesson_id) as lessons_completed,
                    COUNT(DISTINCT qa.id) as quizzes_attempted
                 FROM users u
                 JOIN enrollments e ON u.id = e.student_id
                 JOIN courses c ON e.course_id = c.id
                 LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
                 LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
                 ${whereClause}
                 GROUP BY u.id, u.name, u.email, u.avatar_url
                 HAVING AVG(e.progress_percent) < 50 OR (AVG(qa.score) < 60 AND COUNT(DISTINCT qa.id) > 0)
                 ORDER BY avg_progress ASC, avg_quiz_score ASC
                 LIMIT 10`,
                params
            ),
            query(
                `SELECT 
                    DATE_TRUNC('week', e.enrolled_at) as week,
                    COUNT(DISTINCT e.student_id) as active_students,
                    COUNT(e.id) as lesson_activities,
                    COUNT(DISTINCT qa.student_id) as quiz_takers,
                    COUNT(qa.id) as quiz_attempts
                 FROM courses c
                 LEFT JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 LEFT JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $1 AND e.enrolled_at >= NOW() - INTERVAL '12 weeks'
                 GROUP BY DATE_TRUNC('week', e.enrolled_at)
                 ORDER BY week`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    CASE 
                        WHEN e.progress_percent >= 90 THEN '90-100%'
                        WHEN e.progress_percent >= 80 THEN '80-89%'
                        WHEN e.progress_percent >= 70 THEN '70-79%'
                        WHEN e.progress_percent >= 60 THEN '60-69%'
                        WHEN e.progress_percent >= 50 THEN '50-59%'
                        WHEN e.progress_percent >= 40 THEN '40-49%'
                        WHEN e.progress_percent >= 30 THEN '30-39%'
                        WHEN e.progress_percent >= 20 THEN '20-29%'
                        WHEN e.progress_percent >= 10 THEN '10-19%'
                        ELSE '0-9%'
                    END as progress_range,
                    COUNT(*) as student_count,
                    ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE c.instructor_id = $1), 0), 2) as percentage
                 FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE c.instructor_id = $1
                 GROUP BY 
                    CASE 
                        WHEN e.progress_percent >= 90 THEN '90-100%'
                        WHEN e.progress_percent >= 80 THEN '80-89%'
                        WHEN e.progress_percent >= 70 THEN '70-79%'
                        WHEN e.progress_percent >= 60 THEN '60-69%'
                        WHEN e.progress_percent >= 50 THEN '50-59%'
                        WHEN e.progress_percent >= 40 THEN '40-49%'
                        WHEN e.progress_percent >= 30 THEN '30-39%'
                        WHEN e.progress_percent >= 20 THEN '20-29%'
                        WHEN e.progress_percent >= 10 THEN '10-19%'
                        ELSE '0-9%'
                    END
                 ORDER BY progress_range`,
                [req.user.id]
            )
        ]);

        res.json({
            top_performers: topPerformers.rows,
            struggling_students: strugglingStudents.rows,
            engagement_trends: engagementTrends.rows,
            progress_distribution: progressDistribution.rows
        });
    } catch (err) { next(err); }
});

// GET /api/analytics/instructor/content-analytics - Content performance analytics
router.get('/instructor/content-analytics', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const [
            lessonAnalytics,
            quizAnalytics,
            assignmentAnalytics,
            liveSessionAnalytics,
            contentEngagementByType
        ] = await Promise.all([
            query(
                `SELECT 
                    l.id, l.title, l.duration_minutes,
                    COUNT(lp.id) as attempts,
                    COUNT(CASE WHEN lp.completed = true THEN 1 END) as completions,
                    ROUND(COUNT(CASE WHEN lp.completed = true THEN 1 END) * 100.0 / NULLIF(COUNT(lp.id), 0), 2) as completion_rate
                 FROM courses c
                 JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 WHERE c.instructor_id = $1
                 GROUP BY l.id, l.title, l.duration_minutes
                 ORDER BY completion_rate DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    q.id, q.title, q.passing_score, q.max_attempts,
                    COUNT(qa.id) as attempts,
                    COUNT(CASE WHEN qa.score >= q.passing_score THEN 1 END) as passes,
                    ROUND(COUNT(CASE WHEN qa.score >= q.passing_score THEN 1 END) * 100.0 / NULLIF(COUNT(qa.id), 0), 2) as pass_rate,
                    AVG(qa.score) as avg_score
                 FROM courses c
                 JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $1
                 GROUP BY q.id, q.title, q.passing_score, q.max_attempts
                 ORDER BY pass_rate DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    a.id, a.title, a.max_points, a.due_date,
                    COUNT(sub.id) as submissions,
                    COUNT(CASE WHEN sub.score IS NOT NULL THEN 1 END) as graded,
                    ROUND(COUNT(sub.id) * 100.0 / NULLIF((SELECT COUNT(e.student_id) FROM enrollments e WHERE e.course_id = a.course_id), 0), 2) as submission_rate,
                    AVG(sub.score) as avg_score,
                    AVG(EXTRACT(EPOCH FROM (sub.submitted_at - a.due_date))/3600) as avg_hours_late
                 FROM courses c
                 JOIN assignments a ON c.id = a.course_id
                 LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
                 WHERE c.instructor_id = $1
                 GROUP BY a.id, a.title, a.max_points, a.due_date
                 ORDER BY submission_rate DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    ls.id, ls.title, ls.duration_minutes, ls.scheduled_at,
                    COUNT(sa.student_id) as attendees,
                    ROUND(COUNT(sa.student_id) * 100.0 / NULLIF((SELECT COUNT(e.student_id) FROM enrollments e WHERE e.course_id = ls.course_id), 0), 2) as attendance_rate,
                    AVG(EXTRACT(EPOCH FROM (sa.left_at - sa.joined_at))/60) as avg_attendance_duration_minutes
                 FROM courses c
                 JOIN live_sessions ls ON c.id = ls.course_id
                 LEFT JOIN session_attendance sa ON ls.id = sa.session_id
                 WHERE c.instructor_id = $1
                 GROUP BY ls.id, ls.title, ls.duration_minutes, ls.scheduled_at
                 ORDER BY attendance_rate DESC`,
                [req.user.id]
            ),
            query(
                `SELECT 
                    'lessons' as content_type,
                    COUNT(l.id) as total_items,
                    COUNT(lp.id) as total_interactions,
                    ROUND(COUNT(lp.id) * 100.0 / NULLIF(COUNT(l.id), 0), 2) as engagement_rate
                 FROM courses c
                 LEFT JOIN lessons l ON c.id = l.course_id
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 WHERE c.instructor_id = $1
                 GROUP BY 'lessons'
                 
                 UNION ALL
                 
                 SELECT 
                    'quizzes' as content_type,
                    COUNT(q.id) as total_items,
                    COUNT(qa.id) as total_interactions,
                    ROUND(COUNT(qa.id) * 100.0 / NULLIF(COUNT(q.id), 0), 2) as engagement_rate
                 FROM courses c
                 LEFT JOIN quizzes q ON c.id = q.course_id
                 LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE c.instructor_id = $2
                 GROUP BY 'quizzes'
                 
                 UNION ALL
                 
                 SELECT 
                    'assignments' as content_type,
                    COUNT(a.id) as total_items,
                    COUNT(sub.id) as total_interactions,
                    ROUND(COUNT(sub.id) * 100.0 / NULLIF(COUNT(a.id), 0), 2) as engagement_rate
                 FROM courses c
                 LEFT JOIN assignments a ON c.id = a.course_id
                 LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
                 WHERE c.instructor_id = $3
                 GROUP BY 'assignments'
                 
                 UNION ALL
                 
                 SELECT 
                    'live_sessions' as content_type,
                    COUNT(ls.id) as total_items,
                    COUNT(sa.student_id) as total_interactions,
                    ROUND(COUNT(sa.student_id) * 100.0 / NULLIF(COUNT(ls.id), 0), 2) as engagement_rate
                 FROM courses c
                 LEFT JOIN live_sessions ls ON c.id = ls.course_id
                 LEFT JOIN session_attendance sa ON ls.id = sa.session_id
                 WHERE c.instructor_id = $4
                 GROUP BY 'live_sessions'`,
                [req.user.id, req.user.id, req.user.id, req.user.id]
            )
        ]);

        res.json({
            lesson_analytics: lessonAnalytics.rows,
            quiz_analytics: quizAnalytics.rows,
            assignment_analytics: assignmentAnalytics.rows,
            live_session_analytics: liveSessionAnalytics.rows,
            content_engagement_by_type: contentEngagementByType.rows
        });
    } catch (err) { next(err); }
});

module.exports = router;
