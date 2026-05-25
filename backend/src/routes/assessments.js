const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ============= ASSIGNMENTS =============

// GET /api/assignments/course/:courseId
router.get('/course/:courseId', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT a.*, c.title as course_title, u.name as instructor_name 
             FROM assignments a 
             JOIN courses c ON a.course_id = c.id 
             JOIN users u ON c.instructor_id = u.id 
             WHERE a.course_id = $1 
             ORDER BY a.due_date ASC`,
            [req.params.courseId]
        );
        res.json({ assignments: result.rows });
    } catch (err) { next(err); }
});

// GET /api/assessments/student
router.get('/student', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT a.*, c.title as course_name, ar.score, ar.remarks, ar.feedback, ar.created_at as submitted_at
             FROM assessments a
             JOIN courses c ON a.course_id = c.id
             LEFT JOIN assessment_results ar ON a.id = ar.assessment_id AND ar.student_id = $1
             WHERE c.id IN (
                 SELECT course_id FROM enrollments WHERE student_id = $1
             )
             ORDER BY a.scheduled_date ASC`,
            [req.user.id]
        );

        const assessments = result.rows.map(assessment => ({
            ...assessment,
            submitted: assessment.score !== null,
            startDate: assessment.scheduled_date,
            endDate: new Date(new Date(assessment.scheduled_date).getTime() + assessment.duration_minutes * 60000),
            duration: assessment.duration_minutes,
            courseName: assessment.course_name,
            questions: assessment.questions || []
        }));

        res.json({ assessments });
    } catch (err) { next(err); }
});

// DELETE /api/assessments/:id
router.delete('/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const assessment = await query(
            `SELECT c.instructor_id 
             FROM assessments a
             JOIN courses c ON a.course_id = c.id
             WHERE a.id = $1`,
            [req.params.id]
        );

        if (!assessment.rows.length) {
            return res.status(404).json({ error: 'Assessment not found' });
        }
        if (assessment.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await query('DELETE FROM assessments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Assessment deleted successfully' });
    } catch (err) { next(err); }
});

// POST /api/assessments/:id/submit
router.post('/:id/submit', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { answers } = req.body;
        const assessment = await query('SELECT id FROM assessments WHERE id = $1', [req.params.id]);
        if (!assessment.rows.length) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        await query(
            `INSERT INTO assessment_results (assessment_id, student_id, score, remarks, feedback)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (assessment_id, student_id)
             DO UPDATE SET score = EXCLUDED.score, remarks = EXCLUDED.remarks, feedback = EXCLUDED.feedback`,
            [req.params.id, req.user.id, null, answers ? 'Submitted for review' : 'Submitted', null]
        );

        res.status(201).json({ message: 'Assessment submitted successfully' });
    } catch (err) { next(err); }
});

// GET /api/assessments/instructor
router.get('/instructor', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT a.*, c.title as course_title, c.category
             FROM assessments a
             JOIN courses c ON a.course_id = c.id
             WHERE c.instructor_id = $1
             ORDER BY a.scheduled_date DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) { next(err); }
});

// GET /api/assignments/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const assignment = await query('SELECT * FROM assignments WHERE id = $1', [req.params.id]);
        if (!assignment.rows.length) return res.status(404).json({ error: 'Assignment not found' });

        const submissions = await query(
            `SELECT s.*, u.name as student_name 
             FROM assignment_submissions s 
             JOIN users u ON s.student_id = u.id 
             WHERE s.assignment_id = $1`,
            [req.params.id]
        );

        res.json({ assignment: assignment.rows[0], submissions: submissions.rows });
    } catch (err) { next(err); }
});

// POST /api/assessments (create)
router.post('/', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { courseId, title, description, startDate, endDate, duration, questions } = req.body;

        // Validate courseId
        if (!courseId) {
            return res.status(400).json({ error: 'Course ID is required' });
        }

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
        if (!course.rows.length) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: You do not own this course' });
        }

        const result = await query(
            `INSERT INTO assessments (course_id, title, scheduled_date, duration_minutes, description, type) 
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [courseId, title, new Date(startDate).toISOString(), duration || 120, description, 'project']
        );
        res.status(201).json({ assessment: result.rows[0] });
    } catch (err) { next(err); }
});

// DELETE /api/assignments/:id
router.delete('/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        // Check if instructor owns this assignment
        const assign = await query(`
            SELECT c.instructor_id 
            FROM assignments a 
            JOIN courses c ON a.course_id = c.id 
            WHERE a.id = $1`, [req.params.id]);
        if (assign.rows.length && assign.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Assignment deleted' });
    } catch (err) { next(err); }
});

// POST /api/assignments/:id/submit
router.post('/:id/submit', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { submission_text, file_url } = req.body;
        const assignment = await query('SELECT id FROM assignments WHERE id = $1', [req.params.id]);
        if (!assignment.rows.length) return res.status(404).json({ error: 'Assignment not found' });

        // Check if already submitted
        const existing = await query(
            'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
            [req.params.id, req.user.id]
        );

        if (existing.rows.length) {
            // Update existing submission
            const result = await query(
                `UPDATE assignment_submissions 
                 SET content = $1, file_url = $2 
                 WHERE assignment_id = $3 AND student_id = $4 RETURNING *`,
                [submission_text, file_url, req.params.id, req.user.id]
            );
            return res.json({ submission: result.rows[0] });
        }

        const result = await query(
            `INSERT INTO assignment_submissions (assignment_id, student_id, content, file_url) 
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [req.params.id, req.user.id, submission_text, file_url]
        );
        res.status(201).json({ submission: result.rows[0] });
    } catch (err) { next(err); }
});

// GET /api/assignments/student/submissions
router.get('/student/submissions', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT s.*, a.title, a.due_date, a.total_points, c.title as course_title 
             FROM assignment_submissions s 
             JOIN assignments a ON s.assignment_id = a.id 
             JOIN courses c ON a.course_id = c.id 
             WHERE s.student_id = $1 
             ORDER BY s.submitted_at DESC`,
            [req.user.id]
        );
        res.json({ submissions: result.rows });
    } catch (err) { next(err); }
});

// PATCH /api/assignments/:id/submissions/:submissionId/grade
router.patch('/:id/submissions/:submissionId/grade', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { score, feedback } = req.body;
        const result = await query(
            `UPDATE assignment_submissions 
             SET score = $1, feedback = $2 
             WHERE id = $3 AND assignment_id = $4 RETURNING *`,
            [score, feedback, req.params.submissionId, req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json({ submission: result.rows[0] });
    } catch (err) { next(err); }
});

// ============= COURSE NOTES =============

// GET /api/notes/course/:courseId
router.get('/course/:courseId/notes', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT n.*, u.name as instructor_name 
             FROM course_notes n 
             JOIN users u ON n.instructor_id = u.id 
             WHERE n.course_id = $1 
             ORDER BY n.created_at DESC`,
            [req.params.courseId]
        );
        res.json({ notes: result.rows });
    } catch (err) { next(err); }
});

// POST /api/notes (create course note)
router.post('/notes', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { course_id, title, content, is_public } = req.body;
        const result = await query(
            `INSERT INTO course_notes (course_id, instructor_id, title, content, is_public) 
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [course_id, req.user.id, title, content, is_public !== false]
        );
        res.status(201).json({ note: result.rows[0] });
    } catch (err) { next(err); }
});

// DELETE /api/notes/:id
router.delete('/notes/:id', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        await query('DELETE FROM course_notes WHERE id = $1 AND instructor_id = $2', [req.params.id, req.user.id]);
        res.json({ message: 'Note deleted' });
    } catch (err) { next(err); }
});

// ============= ASSESSMENTS (MID-TERM, FINAL) =============

// GET /api/assessments/course/:courseId
router.get('/course/:courseId', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT * FROM assessments 
             WHERE course_id = $1 
             ORDER BY scheduled_date ASC`,
            [req.params.courseId]
        );
        res.json(result.rows);
    } catch (err) { next(err); }
});

// POST /api/assessments/:id/results
router.post('/:id/results', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { student_id, score, remarks } = req.body;
        const result = await query(
            `INSERT INTO assessment_results (assessment_id, student_id, score, remarks) 
             VALUES ($1,$2,$3,$4) 
             ON CONFLICT (assessment_id, student_id) DO UPDATE SET score = $3, remarks = $4
             RETURNING *`,
            [req.params.id, student_id, score, remarks]
        );
        res.json({ result: result.rows[0] });
    } catch (err) { next(err); }
});

// GET /api/assessments/my/results
router.get('/my/results', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT ar.*, a.title as assessment_title, a.type as assessment_type, c.title as course_title
             FROM assessment_results ar 
             JOIN assessments a ON ar.assessment_id = a.id
             JOIN courses c ON a.course_id = c.id
             WHERE ar.student_id = $1
             ORDER BY ar.created_at DESC`,
            [req.user.id]
        );
        res.json({ results: result.rows });
    } catch (err) { next(err); }
});

// GET /api/assessments/:id/results
router.get('/:id/results', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT ar.*, u.name as student_name 
             FROM assessment_results ar 
             JOIN users u ON ar.student_id = u.id 
             WHERE ar.assessment_id = $1
             ORDER BY u.name ASC`,
            [req.params.id]
        );
        res.json({ results: result.rows });
    } catch (err) { next(err); }
});

// GET /api/assessments/course/:courseId
router.get('/course/:courseId', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { courseId } = req.params;

        // Verify instructor owns this course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `SELECT a.*, COUNT(ar.id) as submission_count
             FROM assessments a
             LEFT JOIN assessment_results ar ON a.id = ar.assessment_id
             WHERE a.course_id = $1
             GROUP BY a.id
             ORDER BY a.scheduled_date DESC`,
            [courseId]
        );

        res.json(result.rows);
    } catch (err) { next(err); }
});

module.exports = router;
