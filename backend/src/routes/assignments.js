const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/assignments/course/:courseId
router.get('/course/:courseId', authenticate, async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const result = await query(
            `SELECT a.*, c.title as course_name, u.name as instructor_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.id
             LEFT JOIN users u ON c.instructor_id = u.id
             WHERE a.course_id = $1
             ORDER BY a.created_at DESC`,
            [courseId]
        );

        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/assignments/student
router.get('/student', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT a.*, c.title as course_name, u.name as instructor_name,
                    CASE 
                        WHEN sub.id IS NOT NULL THEN 'submitted'
                        WHEN a.due_date < NOW() THEN 'overdue'
                        ELSE 'pending'
                    END as status
             FROM assignments a
             JOIN courses c ON a.course_id = c.id
             LEFT JOIN users u ON c.instructor_id = u.id
             LEFT JOIN enrollments e ON c.id = e.course_id AND e.student_id = $1
             LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_id = $1
             WHERE e.student_id = $1
             ORDER BY a.due_date ASC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/assignments/instructor
router.get('/instructor', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT a.*, c.title as course_name
             FROM assignments a
             JOIN courses c ON a.course_id = c.id
             WHERE c.instructor_id = $1
             ORDER BY a.created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/assignments/student/submissions
router.get('/student/submissions', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT s.*, a.title, a.due_date, a.max_points as total_points, c.title as course_title
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

// POST /api/assignments
router.post('/', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { title, description, courseId, dueDate, maxPoints } = req.body;

        console.log('Received courseId:', courseId);
        console.log('Request body:', req.body);

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
            `INSERT INTO assignments (title, description, course_id, due_date, max_points)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [title, description, courseId, dueDate, maxPoints]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// PUT /api/assignments/:id
router.put('/:id', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { title, description, due_date, max_points } = req.body;
        const { id } = req.params;

        const result = await query(
            `UPDATE assignments 
             SET title = $1, description = $2, due_date = $3, max_points = $4
             WHERE id = $5
             RETURNING *`,
            [title, description, due_date, max_points, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/assignments/:id
router.delete('/:id', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            `DELETE FROM assignments WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        res.json({ message: 'Assignment deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// GET /api/assignments/:id/submissions
router.get('/:id/submissions', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT sub.*, u.name as student_name, u.email as student_email, a.title as assignment_title
             FROM assignment_submissions sub
             JOIN users u ON sub.student_id = u.id
             JOIN assignments a ON sub.assignment_id = a.id
             WHERE sub.assignment_id = $1
             ORDER BY sub.submitted_at DESC`,
            [id]
        );

        res.json({ submissions: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/assignments/:id/grade - Grade a submission
router.post('/:id/grade', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { submission_id, score, feedback } = req.body;

        // Verify instructor owns the assignment through course
        const assignment = await query(`
            SELECT c.instructor_id 
            FROM assignments a 
            JOIN courses c ON a.course_id = c.id 
            WHERE a.id = $1`, [id]);
        if (!assignment.rows.length || assignment.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const graded = await query(
            `UPDATE assignment_submissions 
             SET score = $1, feedback = $2
             WHERE id = $3 AND assignment_id = $4
             RETURNING *`,
            [score, feedback, submission_id, id]
        );

        if (graded.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json({ submission: graded.rows[0] });
    } catch (err) { next(err); }
});

// GET /api/assignments/:id/analytics - Get assignment analytics for instructor
router.get('/:id/analytics', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the assignment through course
        const assignment = await query(`
            SELECT c.instructor_id 
            FROM assignments a 
            JOIN courses c ON a.course_id = c.id 
            WHERE a.id = $1`, [id]);
        if (!assignment.rows.length || assignment.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const [
            submissionStats,
            scoreDistribution,
            timeAnalysis,
            assignmentDetails
        ] = await Promise.all([
            query(
                `SELECT 
                    COUNT(*) as total_submissions,
                    COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as graded_submissions,
                    AVG(score) as avg_score,
                    MAX(score) as max_score,
                    MIN(score) as min_score
                 FROM assignment_submissions
                 WHERE assignment_id = $1`,
                [id]
            ),
            query(
                `SELECT 
                    CASE 
                        WHEN score >= 90 THEN 'A (90-100)'
                        WHEN score >= 80 THEN 'B (80-89)'
                        WHEN score >= 70 THEN 'C (70-79)'
                        WHEN score >= 60 THEN 'D (60-69)'
                        ELSE 'F (0-59)'
                    END as grade_range,
                    COUNT(*) as count
                 FROM assignment_submissions
                 WHERE assignment_id = $1 AND score IS NOT NULL
                 GROUP BY 
                    CASE 
                        WHEN score >= 90 THEN 'A (90-100)'
                        WHEN score >= 80 THEN 'B (80-89)'
                        WHEN score >= 70 THEN 'C (70-79)'
                        WHEN score >= 60 THEN 'D (60-69)'
                        ELSE 'F (0-59)'
                    END
                 ORDER BY grade_range`,
                [id]
            ),
            query(
                `SELECT 
                    AVG(EXTRACT(EPOCH FROM submitted_at)/3600) as avg_hours_since_submission,
                    COUNT(*) as total_submissions
                 FROM assignment_submissions
                 WHERE assignment_id = $1 AND submitted_at IS NOT NULL`,
                [id]
            ),
            query(
                `SELECT a.*, c.title as course_title
                 FROM assignments a
                 JOIN courses c ON a.course_id = c.id
                 WHERE a.id = $1`,
                [id]
            )
        ]);

        res.json({
            submission_stats: submissionStats.rows[0],
            score_distribution: scoreDistribution.rows,
            time_analysis: timeAnalysis.rows[0],
            assignment_details: assignmentDetails.rows[0]
        });
    } catch (err) { next(err); }
});

// POST /api/assignments/:id/bulk-grade - Bulk grade multiple submissions
router.post('/:id/bulk-grade', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { grades } = req.body; // Array of {submission_id, score, feedback}

        if (!Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({ error: 'Grades array is required' });
        }

        // Verify instructor owns the assignment through course
        const assignment = await query(`
            SELECT c.instructor_id 
            FROM assignments a 
            JOIN courses c ON a.course_id = c.id 
            WHERE a.id = $1`, [id]);
        if (!assignment.rows.length || assignment.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const gradedSubmissions = [];

        for (const grade of grades) {
            const graded = await query(
                `UPDATE assignment_submissions 
                 SET score = $1, feedback = $2
                 WHERE id = $3 AND assignment_id = $4
                 RETURNING *`,
                [grade.score, grade.feedback, grade.submission_id, id]
            );

            if (graded.rows.length > 0) {
                gradedSubmissions.push(graded.rows[0]);
            }
        }

        res.json({
            message: `Graded ${gradedSubmissions.length} submissions successfully`,
            graded_submissions: gradedSubmissions
        });
    } catch (err) { next(err); }
});

// GET /api/assignments/:id/export - Export assignment data for instructor
router.get('/:id/export', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { format = 'json' } = req.query;

        // Verify instructor owns the assignment through course
        const assignment = await query(`
            SELECT c.instructor_id 
            FROM assignments a 
            JOIN courses c ON a.course_id = c.id 
            WHERE a.id = $1`, [id]);
        if (!assignment.rows.length || assignment.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const submissions = await query(
            `SELECT sub.*, u.name, u.email,
                    e.enrolled_at, e.progress_percent
             FROM assignment_submissions sub
             JOIN users u ON sub.student_id = u.id
             JOIN enrollments e ON sub.student_id = e.student_id AND e.course_id = (SELECT course_id FROM assignments WHERE id = $1)
             WHERE sub.assignment_id = $1
             ORDER BY sub.submitted_at DESC`,
            [id]
        );

        if (format === 'csv') {
            // Convert to CSV format
            const csv = [
                'Student Name,Email,Submitted At,Score,Feedback,Status',
                ...submissions.rows.map(sub =>
                    `"${sub.name}","${sub.email}","${sub.submitted_at}","${sub.score || 'Not graded'}","${sub.feedback || ''}","${sub.score ? 'Graded' : 'Pending'}"`
                )
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="assignment_${id}_submissions.csv"`);
            res.send(csv);
        } else {
            res.json({ submissions: submissions.rows });
        }
    } catch (err) { next(err); }
});

module.exports = router;
