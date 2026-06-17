const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { createUploader } = require('../lib/cloudinary');
const { invalidateCache } = require('../lib/cache');

// Cloudinary-backed upload for course thumbnails (images only, 5 MB max)
const thumbnailUpload = createUploader({
    folder: 'eduverse/thumbnails',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    resourceType: 'image',
    fileSizeMb: 5,
});

const router = express.Router();

// GET /api/courses  — no Redis cache (causes stale results after publish/unpublish)
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { category, difficulty, search, page = 1, limit = 12 } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let idx = 1;
        let where = `c.status = 'published'`;

        if (category) { where += ` AND c.category = $${idx++}`; params.push(category); }
        if (difficulty) { where += ` AND c.difficulty_level = $${idx++}`; params.push(difficulty); }
        if (search) {
            where += ` AND (c.title ILIKE $${idx} OR c.description ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        params.push(parseInt(limit), offset);
        const sql = `SELECT c.*, u.name as instructor_name,
            COUNT(DISTINCT e.id) as enrollment_count
            FROM courses c
            LEFT JOIN users u ON c.instructor_id = u.id
            LEFT JOIN enrollments e ON c.id = e.course_id
            WHERE ${where}
            GROUP BY c.id, u.name
            ORDER BY c.created_at DESC
            LIMIT $${idx++} OFFSET $${idx++}`;

        const result = await query(sql, params);
        res.json({ courses: result.rows, page: Number(page), limit: Number(limit) });
    } catch (err) { next(err); }
});

// GET /api/courses/my/enrolled  — must be before /:id
router.get('/my/enrolled', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT c.*, e.progress_percent, e.enrolled_at, u.name as instructor_name
             FROM courses c
             JOIN enrollments e ON c.id = e.course_id
             LEFT JOIN users u ON c.instructor_id = u.id
             WHERE e.student_id = $1
             ORDER BY e.enrolled_at DESC`,
            [req.user.id]
        );
        res.json({ courses: result.rows });
    } catch (err) { next(err); }
});

// GET /api/courses/instructor
router.get('/instructor', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT * FROM courses WHERE instructor_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ courses: result.rows });
    } catch (err) { next(err); }
});

// GET /api/courses/my/teaching  — must be before /:id
router.get('/my/teaching', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT c.*, COUNT(DISTINCT e.id) as enrollment_count,
             AVG(e.progress_percent) as avg_progress
             FROM courses c
             LEFT JOIN enrollments e ON c.id = e.course_id
             WHERE c.instructor_id = $1
             GROUP BY c.id
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        res.json({ courses: result.rows });
    } catch (err) { next(err); }
});

// GET /api/courses/enrolled - Get student's enrolled courses
router.get('/enrolled', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT c.*, e.progress_percent, e.enrolled_at, u.name as instructor_name
             FROM courses c
             JOIN enrollments e ON c.id = e.course_id
             LEFT JOIN users u ON c.instructor_id = u.id
             WHERE e.student_id = $1
             ORDER BY e.enrolled_at DESC`,
            [req.user.id]
        );
        res.json({ courses: result.rows });
    } catch (err) { next(err); }
});

// POST /api/courses
router.post('/', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { title, description, difficulty_level, category, tags, thumbnail_url, price = 0 } = req.body;
        const result = await query(
            `INSERT INTO courses (instructor_id, title, description, difficulty_level, category, tags, thumbnail_url, price, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft') RETURNING *`,
            [req.user.id, title, description, difficulty_level, category, tags, thumbnail_url, price]
        );
        await invalidateCache('courses:list:*', 'admin:dashboard');
        res.status(201).json({ course: result.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/courses/:id/upload-thumbnail - Upload course thumbnail
router.post('/:id/upload-thumbnail', authenticate, authorize('instructor', 'admin'), thumbnailUpload.single('thumbnail'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
        if (!course.rows.length || (course.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Use Cloudinary URL if a file was uploaded, otherwise fall back to body URL
        const thumbnail_url = req.file ? req.file.path : req.body.thumbnail_url;
        if (!thumbnail_url) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const result = await query(
            'UPDATE courses SET thumbnail_url = $1, updated_at = NOW() WHERE id = $2 RETURNING thumbnail_url',
            [thumbnail_url, id]
        );

        res.json({ thumbnail_url: result.rows[0].thumbnail_url });
    } catch (err) { next(err); }
});

// POST /api/courses/:id/publish - Publish course for instructor
router.post('/:id/publish', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
        if (!course.rows.length || (course.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if course has lessons
        const lessons = await query('SELECT COUNT(*) as count FROM lessons WHERE course_id = $1', [id]);
        if (parseInt(lessons.rows[0].count) === 0) {
            return res.status(400).json({ error: 'Course must have at least one lesson before publishing' });
        }

        const result = await query(
            'UPDATE courses SET status = $1, published_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
            ['published', id]
        );

        await invalidateCache('courses:list:*', 'admin:dashboard');
        res.json({ course: result.rows[0] });
    } catch (err) { next(err); }
});

// GET /api/courses/:id/analytics - Get course analytics for instructor
router.get('/:id/analytics', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
        if (!course.rows.length || (course.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const [
            enrollmentStats,
            progressStats,
            completionStats,
            engagementStats,
            revenueStats
        ] = await Promise.all([
            query(
                `SELECT 
                    COUNT(*) as total_enrollments,
                    COUNT(CASE WHEN e.enrolled_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_enrollments,
                    AVG(e.progress_percent) as avg_progress
                 FROM enrollments e
                 WHERE e.course_id = $1`,
                [id]
            ),
            query(
                `SELECT 
                    COUNT(CASE WHEN e.progress_percent >= 90 THEN 1 END) as completed,
                    COUNT(CASE WHEN e.progress_percent >= 50 THEN 1 END) as halfway,
                    COUNT(CASE WHEN e.progress_percent < 50 THEN 1 END) as started
                 FROM enrollments e
                 WHERE e.course_id = $1`,
                [id]
            ),
            query(
                `SELECT 
                    AVG(qa.score) as avg_quiz_score,
                    COUNT(DISTINCT qa.student_id) as quiz_participants,
                    COUNT(qa.id) as total_quiz_attempts
                 FROM quizzes q
                 JOIN quiz_attempts qa ON q.id = qa.quiz_id
                 WHERE q.course_id = $1`,
                [id]
            ),
            query(
                `SELECT 
                    COUNT(DISTINCT lp.student_id) as lesson_participants,
                    COUNT(lp.id) as total_lesson_completions,
                    AVG(CASE WHEN lp.completed = true THEN 1 ELSE 0 END) * 100 as completion_rate
                 FROM lessons l
                 LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
                 WHERE l.course_id = $1`,
                [id]
            ),
            query(
                `SELECT 
                    COALESCE(SUM(c.price), 0) as total_revenue,
                    COUNT(e.id) as paying_students
                 FROM courses c
                 JOIN enrollments e ON c.id = e.course_id
                 WHERE c.id = $1 AND c.price > 0`,
                [id]
            )
        ]);

        res.json({
            enrollment_stats: enrollmentStats.rows[0],
            progress_stats: progressStats.rows[0],
            completion_stats: completionStats.rows[0],
            engagement_stats: engagementStats.rows[0],
            revenue_stats: revenueStats.rows[0]
        });
    } catch (err) { next(err); }
});

// POST /api/courses/:id/duplicate - Duplicate course for instructor
router.post('/:id/duplicate', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { new_title } = req.body;

        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
        if (!course.rows.length || (course.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get original course
        const originalCourse = await query('SELECT * FROM courses WHERE id = $1', [id]);
        if (originalCourse.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const orig = originalCourse.rows[0];

        // Create duplicate course
        const newCourse = await query(
            `INSERT INTO courses (instructor_id, title, description, difficulty_level, category, tags, thumbnail_url, price, duration_hours, prerequisites, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft')
             RETURNING *`,
            [req.user.id, new_title || `${orig.title} (Copy)`, orig.description, orig.difficulty_level, orig.category, orig.tags, orig.thumbnail_url, orig.price, orig.duration_hours, orig.prerequisites]
        );

        // Copy lessons
        const lessons = await query('SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index', [id]);
        for (const lesson of lessons.rows) {
            await query(
                `INSERT INTO lessons (course_id, title, description, content, video_url, duration_minutes, order_index, resources)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [newCourse.rows[0].id, lesson.title, lesson.description, lesson.content, lesson.video_url, lesson.duration_minutes, lesson.order_index, lesson.resources]
            );
        }

        res.json({ course: newCourse.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/courses/:id/enroll
router.post('/:id/enroll', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { id } = req.params;
        await query(
            'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.user.id, id]
        );
        res.json({ message: 'Enrolled successfully' });
    } catch (err) { next(err); }
});

// POST /api/courses/:id/unenroll
router.post('/:id/unenroll', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { id } = req.params;
        await query(
            'DELETE FROM enrollments WHERE student_id = $1 AND course_id = $2',
            [req.user.id, id]
        );
        res.json({ message: 'Unenrolled successfully' });
    } catch (err) { next(err); }
});

// GET /api/courses/:id/students
router.get('/:id/students', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `SELECT u.id, u.name, u.email, e.enrolled_at, e.progress_percent
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             WHERE e.course_id = $1
             ORDER BY e.enrolled_at DESC`,
            [id]
        );

        res.json({ students: result.rows });
    } catch (err) { next(err); }
});

// ============= ADMIN COURSE MONITORING =============

// GET /api/courses/admin/all - Get all courses for admin monitoring
router.get('/admin/all', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, search, instructor_id } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [];
        let where = [];
        let paramIndex = 1;

        if (status) {
            where.push(`c.status = $${paramIndex++}`);
            params.push(status);
        }

        if (search) {
            where.push(`(c.title ILIKE $${paramIndex++} OR c.description ILIKE $${paramIndex++})`);
            params.push(`%${search}%`, `%${search}%`);
            paramIndex++;
        }

        if (instructor_id) {
            where.push(`c.instructor_id = $${paramIndex++}`);
            params.push(instructor_id);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const result = await query(
            `SELECT c.*, u.name as instructor_name, u.email as instructor_email,
                    COUNT(e.id) as enrollment_count,
                    AVG(e.progress_percent) as avg_progress,
                    COUNT(l.id) as lesson_count
             FROM courses c
             LEFT JOIN users u ON c.instructor_id = u.id
             LEFT JOIN enrollments e ON c.id = e.course_id
             LEFT JOIN lessons l ON c.id = l.course_id
             ${whereClause}
             GROUP BY c.id, u.name, u.email
             ORDER BY c.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, parseInt(limit), offset]
        );

        const countResult = await query(
            `SELECT COUNT(*) as total FROM courses c ${whereClause}`,
            params
        );

        res.json({
            courses: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) { next(err); }
});

// POST /api/courses/admin/:id/approve - Approve instructor course
router.post('/admin/:id/approve', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            'UPDATE courses SET status = $1, approved_at = NOW(), approved_by = $2 WHERE id = $3 RETURNING title',
            ['published', req.user.id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ message: `Course "${result.rows[0].title}" approved successfully` });
    } catch (err) { next(err); }
});

// POST /api/courses/admin/:id/reject - Reject instructor course
router.post('/admin/:id/reject', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const result = await query(
            `UPDATE courses SET status = $1, rejected_at = NOW(), rejected_by = $2, rejection_reason = $3 
             WHERE id = $4 RETURNING title`,
            ['rejected', req.user.id, reason, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ message: `Course "${result.rows[0].title}" rejected successfully` });
    } catch (err) { next(err); }
});

// DELETE /api/courses/admin/:id - Admin can delete any course
router.delete('/admin/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM courses WHERE id = $1 RETURNING title', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ message: `Course "${result.rows[0].title}" deleted successfully` });
    } catch (err) { next(err); }
});

// GET /api/courses/admin/stats - Get course statistics for admin
router.get('/admin/stats', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const [
            totalCourses,
            publishedCourses,
            pendingCourses,
            rejectedCourses,
            totalEnrollments,
            avgProgress,
            recentCourses
        ] = await Promise.all([
            query('SELECT COUNT(*) as count FROM courses'),
            query('SELECT COUNT(*) as count FROM courses WHERE status = $1', ['published']),
            query('SELECT COUNT(*) as count FROM courses WHERE status = $1', ['pending']),
            query('SELECT COUNT(*) as count FROM courses WHERE status = $1', ['rejected']),
            query('SELECT COUNT(*) as count FROM enrollments'),
            query('SELECT AVG(progress_percent) as avg FROM enrollments'),
            query('SELECT COUNT(*) as count FROM courses WHERE created_at >= NOW() - INTERVAL \'30 days\'')
        ]);

        res.json({
            total_courses: parseInt(totalCourses.rows[0].count),
            published_courses: parseInt(publishedCourses.rows[0].count),
            pending_courses: parseInt(pendingCourses.rows[0].count),
            rejected_courses: parseInt(rejectedCourses.rows[0].count),
            total_enrollments: parseInt(totalEnrollments.rows[0].count),
            avg_progress: parseFloat(avgProgress.rows[0].avg) || 0,
            recent_courses: parseInt(recentCourses.rows[0].count)
        });
    } catch (err) { next(err); }
});

// GET /api/courses/admin/:id/details - Get detailed course information for admin
router.get('/admin/:id/details', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const [course, enrollments, lessons, assignments, assessments] = await Promise.all([
            query(
                `SELECT c.*, u.name as instructor_name, u.email as instructor_email
                 FROM courses c
                 LEFT JOIN users u ON c.instructor_id = u.id
                 WHERE c.id = $1`,
                [id]
            ),
            query(
                `SELECT e.*, u.name as student_name, u.email as student_email
                 FROM enrollments e
                 LEFT JOIN users u ON e.student_id = u.id
                 WHERE e.course_id = $1
                 ORDER BY e.enrolled_at DESC`,
                [id]
            ),
            query(
                `SELECT l.*, COUNT(q.id) as quiz_count
                 FROM lessons l
                 LEFT JOIN quizzes q ON l.id = q.lesson_id
                 WHERE l.course_id = $1
                 GROUP BY l.id
                 ORDER BY l.order_index`,
                [id]
            ),
            query(
                `SELECT a.*, COUNT(sub.id) as submission_count
                 FROM assignments a
                 LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
                 WHERE a.course_id = $1
                 GROUP BY a.id
                 ORDER BY a.due_date DESC`,
                [id]
            ),
            query(
                `SELECT a.*, COUNT(ar.id) as result_count
                 FROM assessments a
                 LEFT JOIN assessment_results ar ON a.id = ar.assessment_id
                 WHERE a.course_id = $1
                 GROUP BY a.id
                 ORDER BY a.scheduled_date DESC`,
                [id]
            )
        ]);

        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({
            course: course.rows[0],
            enrollments: enrollments.rows,
            lessons: lessons.rows,
            assignments: assignments.rows,
            assessments: assessments.rows
        });
    } catch (err) { next(err); }
});

// GET /api/courses/:id — MUST be after all /admin/* and other static routes
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const course = await query(
            `SELECT c.*, u.name as instructor_name, u.avatar_url as instructor_avatar
             FROM courses c
             LEFT JOIN users u ON c.instructor_id = u.id
             WHERE c.id = $1`,
            [id]
        );
        if (!course.rows.length) return res.status(404).json({ error: 'Course not found' });

        const lessons = await query(
            'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index',
            [id]
        );

        // Auto-calculate duration_hours from lesson durations (video/mixed only)
        const totalMinutes = lessons.rows.reduce((sum, l) => {
            if (l.content_type === 'video' || l.content_type === 'mixed') {
                return sum + (parseInt(l.duration_minutes) || 0);
            }
            return sum;
        }, 0);
        const courseData = {
            ...course.rows[0],
            duration_hours: totalMinutes > 0 ? Math.round((totalMinutes / 60) * 10) / 10 : (course.rows[0].duration_hours || 0)
        };

        res.json({ course: courseData, lessons: lessons.rows });
    } catch (err) { next(err); }
});

// PUT /api/courses/:id — MUST be after all /admin/* and other static routes
router.put('/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, difficulty_level, category, status, thumbnail_url } = req.body;
        const result = await query(
            `UPDATE courses SET title=$1, description=$2, difficulty_level=$3, category=$4, status=$5,
             thumbnail_url=$6, updated_at=NOW()
             WHERE id=$7 AND (instructor_id=$8 OR $9='admin') RETURNING *`,
            [title, description, difficulty_level, category, status, thumbnail_url, id, req.user.id, req.user.role]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Course not found or unauthorized' });
        await invalidateCache('courses:list:*', 'admin:dashboard');
        res.json({ course: result.rows[0] });
    } catch (err) { next(err); }
});

// DELETE /api/courses/:id — MUST be after all /admin/* and other static routes
router.delete('/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
        if (!course.rows.length || (course.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await query('DELETE FROM courses WHERE id = $1', [id]);
        await invalidateCache('courses:list:*', 'admin:dashboard');
        res.json({ message: 'Course deleted successfully' });
    } catch (err) { next(err); }
});

module.exports = router;
