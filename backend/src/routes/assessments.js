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
             JOIN users u ON s.user_id = u.id 
             WHERE s.assignment_id = $1`,
            [req.params.id]
        );

        res.json({ assignment: assignment.rows[0], submissions: submissions.rows });
    } catch (err) { next(err); }
});

// POST /api/assessments (create)
router.post('/', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { courseId, title, description, startDate, endDate, duration, type } = req.body;

        // Validate courseId
        if (!courseId) {
            return res.status(400).json({ error: 'Course ID is required' });
        }

        const validTypes = ['exam', 'midterm', 'final', 'project'];
        const assessmentType = validTypes.includes(type) ? type : 'exam';

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
            [courseId, title, new Date(startDate).toISOString(), duration || 120, description, assessmentType]
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
            'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );

        if (existing.rows.length) {
            // Update existing submission
            const result = await query(
                `UPDATE assignment_submissions 
                 SET content = $1, file_url = $2 
                 WHERE assignment_id = $3 AND user_id = $4 RETURNING *`,
                [submission_text, file_url, req.params.id, req.user.id]
            );
            return res.json({ submission: result.rows[0] });
        }

        const result = await query(
            `INSERT INTO assignment_submissions (assignment_id, user_id, content, file_url) 
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
             WHERE s.user_id = $1 
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

// GET /api/assessments/course/:courseId — unified route for both students and instructors
router.get('/course/:courseId', authenticate, async (req, res, next) => {
    try {
        const { courseId } = req.params;

        // Instructors get submission counts; students get basic list
        if (req.user.role === 'instructor' || req.user.role === 'admin') {
            const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
            if (!course.rows.length || (course.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin')) {
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
            return res.json(result.rows);
        }

        // Student — plain list
        const result = await query(
            'SELECT * FROM assessments WHERE course_id = $1 ORDER BY scheduled_date ASC',
            [courseId]
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

// ============= ONLINE EXAM QUESTIONS =============

// POST /api/assessments/:id/questions — instructor adds questions to an exam
router.post('/:id/questions', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { questions } = req.body; // array of question objects

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'questions array is required' });
        }

        // Verify instructor owns the course this assessment belongs to
        const assessment = await query(
            `SELECT a.id, a.course_id, c.instructor_id
             FROM assessments a
             JOIN courses c ON a.course_id = c.id
             WHERE a.id = $1`,
            [id]
        );
        if (!assessment.rows.length) return res.status(404).json({ error: 'Assessment not found' });
        if (assessment.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete existing questions so instructor can replace them entirely
        await query('DELETE FROM exam_questions WHERE assessment_id = $1', [id]);

        // Insert all questions
        const inserted = [];
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const result = await query(
                `INSERT INTO exam_questions
                    (assessment_id, question, question_type, options, correct_answer, points, order_index)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    id,
                    q.question,
                    q.question_type || 'mcq',
                    q.options ? JSON.stringify(q.options) : null,
                    q.correct_answer || null,
                    q.points || 1,
                    i,
                ]
            );
            inserted.push(result.rows[0]);
        }

        // Mark assessment as having questions
        await query(
            'UPDATE assessments SET has_questions = true, updated_at = NOW() WHERE id = $1',
            [id]
        );

        res.status(201).json({ questions: inserted, count: inserted.length });
    } catch (err) { next(err); }
});

// GET /api/assessments/:id/questions — fetch questions
// Instructor gets correct_answer; students don't
router.get('/:id/questions', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify assessment exists and student is enrolled (or instructor owns it)
        const assessment = await query(
            `SELECT a.*, c.instructor_id FROM assessments a
             JOIN courses c ON a.course_id = c.id
             WHERE a.id = $1`,
            [id]
        );
        if (!assessment.rows.length) return res.status(404).json({ error: 'Assessment not found' });

        const isInstructor = req.user.role === 'instructor' || req.user.role === 'admin';

        if (!isInstructor) {
            // Students: must be enrolled
            const enrolled = await query(
                'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
                [req.user.id, assessment.rows[0].course_id]
            );
            if (!enrolled.rows.length) {
                return res.status(403).json({ error: 'You must be enrolled to access this exam' });
            }
        }

        // Instructors get correct_answer; students don't (prevents cheating)
        const cols = isInstructor
            ? 'id, question, question_type, options, correct_answer, points, order_index'
            : 'id, question, question_type, options, points, order_index';

        const result = await query(
            `SELECT ${cols} FROM exam_questions
             WHERE assessment_id = $1
             ORDER BY order_index ASC`,
            [id]
        );

        res.json({ questions: result.rows, assessment: assessment.rows[0] });
    } catch (err) { next(err); }
});

// ============= ONLINE EXAM ATTEMPTS =============

// POST /api/assessments/:id/start — student starts the exam, records start time
router.post('/:id/start', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { id } = req.params;

        const assessment = await query(
            `SELECT a.*, c.instructor_id FROM assessments a
             JOIN courses c ON a.course_id = c.id
             WHERE a.id = $1`,
            [id]
        );
        if (!assessment.rows.length) return res.status(404).json({ error: 'Assessment not found' });

        const a = assessment.rows[0];

        // Must be enrolled
        const enrolled = await query(
            'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
            [req.user.id, a.course_id]
        );
        if (!enrolled.rows.length) {
            return res.status(403).json({ error: 'You must be enrolled to take this exam' });
        }

        // Must have questions
        if (!a.has_questions) {
            return res.status(400).json({ error: 'This exam has no questions yet' });
        }

        // Check if already submitted
        const existing = await query(
            'SELECT * FROM exam_attempts WHERE assessment_id = $1 AND student_id = $2',
            [id, req.user.id]
        );
        if (existing.rows.length && existing.rows[0].submitted_at) {
            return res.status(400).json({ error: 'You have already submitted this exam' });
        }

        // Check exam window — must be within scheduled_date + duration
        const now = new Date();
        const start = new Date(a.scheduled_date);
        const end = new Date(start.getTime() + a.duration_minutes * 60000);

        if (now < start) {
            return res.status(400).json({ error: 'Exam has not started yet' });
        }
        if (now > end) {
            return res.status(400).json({ error: 'Exam window has closed' });
        }

        // Create or return existing in-progress attempt
        if (existing.rows.length) {
            return res.json({ attempt: existing.rows[0], already_started: true });
        }

        const attempt = await query(
            `INSERT INTO exam_attempts (assessment_id, student_id, started_at)
             VALUES ($1, $2, NOW()) RETURNING *`,
            [id, req.user.id]
        );

        res.status(201).json({ attempt: attempt.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/assessments/:id/attempt — student submits answers, auto-grades MCQ + T/F
router.post('/:id/attempt', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { answers } = req.body; // { [question_id]: answer_string }

        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ error: 'answers object is required' });
        }

        // Must have a started attempt
        const attemptRow = await query(
            'SELECT * FROM exam_attempts WHERE assessment_id = $1 AND student_id = $2',
            [id, req.user.id]
        );
        if (!attemptRow.rows.length) {
            return res.status(400).json({ error: 'You must start the exam before submitting' });
        }
        if (attemptRow.rows[0].submitted_at) {
            return res.status(400).json({ error: 'You have already submitted this exam' });
        }

        // Check time — auto-submit is fine even if window just closed
        const assessment = await query(
            'SELECT * FROM assessments WHERE id = $1',
            [id]
        );
        if (!assessment.rows.length) return res.status(404).json({ error: 'Assessment not found' });

        // Fetch all questions
        const questions = await query(
            'SELECT * FROM exam_questions WHERE assessment_id = $1 ORDER BY order_index',
            [id]
        );

        let totalPoints = 0;
        let earnedPoints = 0;
        let hasShortAnswer = false;

        const gradedAnswers = questions.rows.map(q => {
            totalPoints += q.points;
            const studentAnswer = (answers[q.id] || '').toString().trim();

            if (q.question_type === 'short_answer') {
                hasShortAnswer = true;
                return {
                    question_id: q.id,
                    answer: studentAnswer,
                    correct: null, // needs manual grading
                    points_earned: null,
                };
            }

            const correct = studentAnswer.toLowerCase() === (q.correct_answer || '').toLowerCase();
            const pointsEarned = correct ? q.points : 0;
            earnedPoints += pointsEarned;

            return {
                question_id: q.id,
                answer: studentAnswer,
                correct,
                points_earned: pointsEarned,
            };
        });

        // Score is null if there are short answers pending review; otherwise auto-calculate
        const autoGradedPoints = totalPoints - questions.rows
            .filter(q => q.question_type === 'short_answer')
            .reduce((s, q) => s + q.points, 0);

        const score = hasShortAnswer
            ? null  // instructor must review short answers
            : Math.round((earnedPoints / totalPoints) * 100);

        const passed = score !== null
            ? score >= (assessment.rows[0].passing_score || 60)
            : null;

        const updated = await query(
            `UPDATE exam_attempts
             SET answers = $1, score = $2, passed = $3,
                 auto_graded = $4, submitted_at = NOW()
             WHERE assessment_id = $5 AND student_id = $6
             RETURNING *`,
            [
                JSON.stringify(gradedAnswers),
                score,
                passed,
                !hasShortAnswer,
                id,
                req.user.id,
            ]
        );

        // Sync score to assessment_results so it shows in Grades page
        if (score !== null) {
            await query(
                `INSERT INTO assessment_results (assessment_id, student_id, score, remarks)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (assessment_id, student_id)
                 DO UPDATE SET score = $3, remarks = $4`,
                [id, req.user.id, score, passed ? 'Passed' : 'Failed']
            );
        }

        res.json({
            attempt: updated.rows[0],
            score,
            passed,
            auto_graded: !hasShortAnswer,
            graded_answers: gradedAnswers,
            total_points: totalPoints,
            earned_points: earnedPoints,
            message: hasShortAnswer
                ? 'Submitted. Short answer questions are pending instructor review.'
                : `Exam submitted. You scored ${score}%.`,
        });
    } catch (err) { next(err); }
});

// GET /api/assessments/:id/attempt — student fetches their own attempt result
router.get('/:id/attempt', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM exam_attempts WHERE assessment_id = $1 AND student_id = $2',
            [req.params.id, req.user.id]
        );
        if (!result.rows.length) return res.json({ attempt: null });
        res.json({ attempt: result.rows[0] });
    } catch (err) { next(err); }
});

// GET /api/assessments/:id/attempts — instructor views all student attempts
router.get('/:id/attempts', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const assessment = await query(
            `SELECT a.id, c.instructor_id FROM assessments a
             JOIN courses c ON a.course_id = c.id WHERE a.id = $1`,
            [id]
        );
        if (!assessment.rows.length) return res.status(404).json({ error: 'Assessment not found' });
        if (assessment.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `SELECT ea.*, u.name as student_name, u.email as student_email
             FROM exam_attempts ea
             JOIN users u ON ea.student_id = u.id
             WHERE ea.assessment_id = $1
             ORDER BY ea.submitted_at DESC NULLS LAST`,
            [id]
        );
        res.json({ attempts: result.rows });
    } catch (err) { next(err); }
});

// PATCH /api/assessments/:id/attempts/:attemptId/grade — instructor manually grades short answers
router.patch('/:id/attempts/:attemptId/grade', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { id, attemptId } = req.params;
        const { score, remarks } = req.body;

        if (score === undefined || score === null) {
            return res.status(400).json({ error: 'score is required' });
        }

        const finalScore = Math.min(100, Math.max(0, parseInt(score)));

        // Verify ownership
        const assessment = await query(
            `SELECT a.*, c.instructor_id FROM assessments a
             JOIN courses c ON a.course_id = c.id WHERE a.id = $1`,
            [id]
        );
        if (!assessment.rows.length) return res.status(404).json({ error: 'Assessment not found' });
        if (assessment.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const passed = finalScore >= (assessment.rows[0].passing_score || 60);

        const updated = await query(
            `UPDATE exam_attempts
             SET score = $1, passed = $2, auto_graded = false
             WHERE id = $3 AND assessment_id = $4
             RETURNING *`,
            [finalScore, passed, attemptId, id]
        );

        if (!updated.rows.length) return res.status(404).json({ error: 'Attempt not found' });

        // Sync to assessment_results
        await query(
            `INSERT INTO assessment_results (assessment_id, student_id, score, remarks)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (assessment_id, student_id)
             DO UPDATE SET score = $3, remarks = $4`,
            [id, updated.rows[0].student_id, finalScore, remarks || (passed ? 'Passed' : 'Failed')]
        );

        res.json({ attempt: updated.rows[0] });
    } catch (err) { next(err); }
});

module.exports = router;
