const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { createUploader } = require('../lib/cloudinary');
const https = require('https');

const router = express.Router();

// Separate uploaders — Cloudinary requires explicit resource_type for PDFs
// Using 'auto' sometimes misclassifies PDFs as 'image' which breaks serving.
const videoUpload = createUploader({
    folder: 'eduverse/lessons',
    allowedFormats: ['mp4', 'mov', 'avi', 'mpeg'],
    resourceType: 'video',
    fileSizeMb: 200,
});

const pdfUpload = createUploader({
    folder: 'eduverse/lessons',
    allowedFormats: ['pdf'],
    resourceType: 'raw',
    fileSizeMb: 20,
});

// POST /api/lessons/upload
// Routes to video or PDF uploader based on ?type= query param
router.post('/upload', authenticate, authorize('instructor', 'admin'), (req, res, next) => {
    const type = req.query.type || '';
    const uploader = type === 'pdf' ? pdfUpload : videoUpload;

    uploader.single('file')(req, res, (err) => {
        if (err) return next(err);
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        res.json({ url: req.file.path, message: 'File uploaded successfully' });
    });
});

// GET /api/lessons/pdf-proxy?url=<cloudinary_url>&download=1
// No auth required — the embed/iframe tags can't send Authorization headers.
// Security: only Cloudinary URLs are accepted (validated below).
router.get('/pdf-proxy', async (req, res, next) => {
    try {
        const { url, download } = req.query;
        if (!url) return res.status(400).json({ error: 'url query param required' });

        // Only allow Cloudinary URLs to prevent open-redirect abuse
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith('cloudinary.com') && !parsed.hostname.endsWith('res.cloudinary.com')) {
            return res.status(400).json({ error: 'Only Cloudinary URLs are supported' });
        }

        // Fix misclassified PDFs: Cloudinary sometimes stores PDFs under /image/upload/
        // but they must be fetched from /raw/upload/ to serve correctly
        const fixedUrl = url.replace(/\/image\/upload\//, '/raw/upload/');

        // Fetch the file from Cloudinary
        const fetchUrl = (urlStr) => new Promise((resolve, reject) => {
            https.get(urlStr, (upstream) => {
                // Follow one redirect (Cloudinary sometimes redirects)
                if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
                    return fetchUrl(upstream.headers.location).then(resolve).catch(reject);
                }
                resolve(upstream);
            }).on('error', reject);
        });

        const upstream = await fetchUrl(fixedUrl);

        if (upstream.statusCode !== 200) {
            return res.status(upstream.statusCode).json({ error: 'Failed to fetch file from Cloudinary' });
        }

        const contentType = upstream.headers['content-type'] || 'application/pdf';
        const filename = url.split('/').pop().split('?')[0] || 'document.pdf';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (download === '1') {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        }

        upstream.pipe(res);
    } catch (err) {
        next(err);
    }
});

// GET /api/lessons/course/:courseId
router.get('/course/:courseId', authenticate, async (req, res, next) => {
    try {
        const { courseId } = req.params;

        // Instructors and admins can always view their own course lessons
        if (req.user.role === 'instructor' || req.user.role === 'admin') {
            const result = await query(
                'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index',
                [courseId]
            );
            return res.json({ lessons: result.rows });
        }

        // Students must be enrolled to access lesson list
        const enrollment = await query(
            'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
            [req.user.id, courseId]
        );
        if (!enrollment.rows.length) {
            return res.status(403).json({ error: 'You must be enrolled in this course to access lessons' });
        }

        const result = await query(
            'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index',
            [courseId]
        );
        res.json({ lessons: result.rows });
    } catch (err) { next(err); }
});

// GET /api/lessons/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM lessons WHERE id = $1', [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Lesson not found' });

        const lesson = result.rows[0];

        // Instructors and admins bypass enrollment check
        if (req.user.role === 'instructor' || req.user.role === 'admin') {
            return res.json({ lesson });
        }

        // Students must be enrolled in the course this lesson belongs to
        const enrollment = await query(
            'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
            [req.user.id, lesson.course_id]
        );
        if (!enrollment.rows.length) {
            return res.status(403).json({ error: 'You must be enrolled in this course to access lessons' });
        }

        res.json({ lesson });
    } catch (err) { next(err); }
});

// POST /api/lessons
router.post('/', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { course_id, title, text_content, content_type, video_url, pdf_url, duration_minutes, order_index } = req.body;

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [course_id]);
        if (!course.rows.length) return res.status(404).json({ error: 'Course not found' });
        if (course.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const parsedDuration = duration_minutes !== '' && duration_minutes != null ? parseInt(duration_minutes) : null;
        const parsedOrder = order_index !== '' && order_index != null ? parseInt(order_index) : null;

        const result = await query(
            `INSERT INTO lessons (course_id, title, text_content, content_type, video_url, pdf_url, duration_minutes, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [course_id, title, text_content, content_type || 'text', video_url || null, pdf_url || null, parsedDuration, parsedOrder]
        );
        res.status(201).json({ lesson: result.rows[0] });
    } catch (err) { next(err); }
});

// PUT /api/lessons/:id
router.put('/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { title, text_content, content_type, video_url, pdf_url, duration_minutes, order_index } = req.body;

        // Verify instructor owns the course this lesson belongs to
        const lessonCheck = await query(
            `SELECT l.id, l.order_index as existing_order, c.instructor_id FROM lessons l
             JOIN courses c ON l.course_id = c.id
             WHERE l.id = $1`,
            [req.params.id]
        );
        if (!lessonCheck.rows.length) return res.status(404).json({ error: 'Lesson not found' });
        if (lessonCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const parsedDuration = duration_minutes !== '' && duration_minutes != null ? parseInt(duration_minutes) : null;
        // Fall back to the existing order_index if none provided — prevents NOT NULL violation
        const parsedOrder = (order_index !== '' && order_index != null)
            ? parseInt(order_index)
            : lessonCheck.rows[0].existing_order;

        const result = await query(
            `UPDATE lessons SET title=$1, text_content=$2, content_type=$3, video_url=$4, pdf_url=$5,
             duration_minutes=$6, order_index=$7, updated_at=NOW()
             WHERE id=$8 RETURNING *`,
            [title, text_content, content_type, video_url || null, pdf_url || null, parsedDuration, parsedOrder, req.params.id]
        );

        if (!result.rows.length) return res.status(404).json({ error: 'Lesson not found' });
        res.json({ lesson: result.rows[0] });
    } catch (err) { next(err); }
});

// DELETE /api/lessons/:id
router.delete('/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        // Verify instructor owns the course this lesson belongs to
        const lessonCheck = await query(
            `SELECT l.id, c.instructor_id FROM lessons l
             JOIN courses c ON l.course_id = c.id
             WHERE l.id = $1`,
            [req.params.id]
        );
        if (!lessonCheck.rows.length) return res.status(404).json({ error: 'Lesson not found' });
        if (lessonCheck.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await query('DELETE FROM lessons WHERE id = $1', [req.params.id]);
        res.json({ message: 'Lesson deleted' });
    } catch (err) { next(err); }
});

// POST /api/lessons/:id/complete
router.post('/:id/complete', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { course_id, watch_time } = req.body;

        await query(
            `INSERT INTO lesson_progress (student_id, lesson_id, completed, watch_time)
             VALUES ($1, $2, true, $3)
             ON CONFLICT (student_id, lesson_id) 
             DO UPDATE SET completed = true, completed_at = NOW(), watch_time = GREATEST(lesson_progress.watch_time, EXCLUDED.watch_time)`,
            [req.user.id, req.params.id, watch_time || 0]
        );

        // Update course progress
        const totalLessons = await query(
            'SELECT COUNT(*) FROM lessons WHERE course_id = $1',
            [course_id]
        );
        const completedLessons = await query(
            `SELECT COUNT(*) FROM lesson_progress lp
             JOIN lessons l ON lp.lesson_id = l.id
             WHERE lp.student_id = $1 AND l.course_id = $2 AND lp.completed = true`,
            [req.user.id, course_id]
        );

        const progress = Math.round((parseInt(completedLessons.rows[0].count) / parseInt(totalLessons.rows[0].count)) * 100);

        await query(
            'UPDATE enrollments SET progress_percent = $1 WHERE student_id = $2 AND course_id = $3',
            [progress, req.user.id, course_id]
        );

        res.json({ message: 'Lesson marked as complete', progress });
    } catch (err) { next(err); }
});

module.exports = router;
