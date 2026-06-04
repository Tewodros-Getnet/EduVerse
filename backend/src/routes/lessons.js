const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { createUploader } = require('../lib/cloudinary');

const router = express.Router();

// Cloudinary-backed multer upload (videos, PDFs, docs — up to 200 MB)
const upload = createUploader({
    folder: 'eduverse/lessons',
    allowedFormats: ['mp4', 'mov', 'avi', 'mpeg', 'pdf', 'doc', 'docx'],
    resourceType: 'auto',
    fileSizeMb: 200,
});

// POST /api/lessons/upload
router.post('/upload', authenticate, authorize('instructor', 'admin'), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Cloudinary populates req.file.path with the secure URL
        const fileUrl = req.file.path;

        res.json({ url: fileUrl, message: 'File uploaded successfully' });
    } catch (error) {
        next(error);
    }
});

// GET /api/lessons/course/:courseId
router.get('/course/:courseId', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index',
            [req.params.courseId]
        );
        res.json({ lessons: result.rows });
    } catch (err) { next(err); }
});

// GET /api/lessons/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM lessons WHERE id = $1', [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Lesson not found' });
        res.json({ lesson: result.rows[0] });
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

        const result = await query(
            `INSERT INTO lessons (course_id, title, text_content, content_type, video_url, pdf_url, duration_minutes, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [course_id, title, text_content, content_type || 'text', video_url, pdf_url, duration_minutes, order_index]
        );
        res.status(201).json({ lesson: result.rows[0] });
    } catch (err) { next(err); }
});

// PUT /api/lessons/:id
router.put('/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { title, text_content, content_type, video_url, pdf_url, duration_minutes, order_index } = req.body;

        const result = await query(
            `UPDATE lessons SET title=$1, text_content=$2, content_type=$3, video_url=$4, pdf_url=$5,
             duration_minutes=$6, order_index=$7, updated_at=NOW()
             WHERE id=$8 RETURNING *`,
            [title, text_content, content_type, video_url, pdf_url, duration_minutes, order_index, req.params.id]
        );

        if (!result.rows.length) return res.status(404).json({ error: 'Lesson not found' });
        res.json({ lesson: result.rows[0] });
    } catch (err) { next(err); }
});

// DELETE /api/lessons/:id
router.delete('/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        await query('DELETE FROM lessons WHERE id = $1', [req.params.id]);
        res.json({ message: 'Lesson deleted' });
    } catch (err) { next(err); }
});

// POST /api/lessons/:id/complete
router.post('/:id/complete', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { course_id } = req.body;

        await query(
            `INSERT INTO lesson_progress (student_id, lesson_id, completed)
             VALUES ($1, $2, true)
             ON CONFLICT (student_id, lesson_id) 
             DO UPDATE SET completed = true, completed_at = NOW()`,
            [req.user.id, req.params.id]
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
