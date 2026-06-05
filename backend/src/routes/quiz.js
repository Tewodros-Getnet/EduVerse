const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/quiz/instructor (must come BEFORE /:id route)
router.get('/instructor', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT q.*, c.title as course_name, l.title as lesson_name
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             LEFT JOIN lessons l ON q.lesson_id = l.id
             WHERE c.instructor_id = $1
             ORDER BY q.created_at DESC`,
            [req.user.id]
        );
        res.json({ quizzes: result.rows });
    } catch (err) { next(err); }
});

// GET /api/quiz/course/:courseId (must come BEFORE /:id route)
router.get('/course/:courseId', authenticate, async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM quizzes WHERE course_id = $1', [req.params.courseId]);
        res.json({ quizzes: result.rows });
    } catch (err) { next(err); }
});

// GET /api/quiz/:id (generic route - must come LAST)
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const quiz = await query('SELECT * FROM quizzes WHERE id = $1', [req.params.id]);
        if (!quiz.rows.length) return res.status(404).json({ error: 'Quiz not found' });
        const questions = await query('SELECT id, question, question_type, options, points FROM quiz_questions WHERE quiz_id = $1', [req.params.id]);
        res.json({ quiz: quiz.rows[0], questions: questions.rows });
    } catch (err) { next(err); }
});

// POST /api/quiz (create)
router.post('/', authenticate, authorize('instructor', 'admin'), async (req, res, next) => {
    try {
        const { course_id, lesson_id, title, time_limit_minutes, max_attempts, passing_score, questions } = req.body;
        
        // Verify instructor owns the course
        const course = await query('SELECT instructor_id FROM courses WHERE id = $1', [course_id]);
        if (!course.rows.length) return res.status(404).json({ error: 'Course not found' });
        if (course.rows[0].instructor_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized - you do not own this course' });
        }

        const lessonId = lesson_id && lesson_id.trim() !== '' ? lesson_id : null;
        const quiz = await query(
            'INSERT INTO quizzes (course_id, lesson_id, title, time_limit_minutes, max_attempts, passing_score) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [course_id, lessonId, title, time_limit_minutes, max_attempts || 3, passing_score || 70]
        );
        const quizId = quiz.rows[0].id;
        if (questions && questions.length) {
            for (const q of questions) {
                const questionType = q.question_type === 'multiple_choice' ? 'mcq' : q.question_type;
                await query(
                    'INSERT INTO quiz_questions (quiz_id, question, question_type, options, correct_answer, points) VALUES ($1,$2,$3,$4,$5,$6)',
                    [quizId, q.question, questionType, JSON.stringify(q.options || []), q.correct_answer || '', q.points || 1]
                );
            }
        }
        res.status(201).json({ quiz: quiz.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/quiz/submit
router.post('/submit', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { quiz_id, answers } = req.body;

        // Check attempt count
        const attempts = await query('SELECT COUNT(*) FROM quiz_attempts WHERE student_id=$1 AND quiz_id=$2', [req.user.id, quiz_id]);
        const quiz = await query('SELECT * FROM quizzes WHERE id = $1', [quiz_id]);
        if (!quiz.rows.length) return res.status(404).json({ error: 'Quiz not found' });

        if (parseInt(attempts.rows[0].count) >= quiz.rows[0].max_attempts) {
            return res.status(400).json({ error: 'Max attempts reached' });
        }

        // Grade answers
        const questions = await query('SELECT * FROM quiz_questions WHERE quiz_id = $1', [quiz_id]);
        let score = 0, totalPoints = 0;
        const gradedAnswers = questions.rows.map(q => {
            totalPoints += q.points;
            const userAnswer = answers[q.id];
            const correct = userAnswer?.toString().toLowerCase() === q.correct_answer.toLowerCase();
            if (correct) score += q.points;
            return { question_id: q.id, user_answer: userAnswer, correct, correct_answer: q.correct_answer };
        });

        const percentScore = Math.round((score / totalPoints) * 100);
        const passed = percentScore >= quiz.rows[0].passing_score;
        const correctCount = gradedAnswers.filter(a => a.correct).length;
        const incorrectCount = gradedAnswers.length - correctCount;

        await query(
            'INSERT INTO quiz_attempts (student_id, quiz_id, score, answers) VALUES ($1,$2,$3,$4)',
            [req.user.id, quiz_id, percentScore, JSON.stringify(gradedAnswers)]
        );

        res.json({
            score: percentScore,
            passed,
            graded_answers: gradedAnswers,
            passing_score: quiz.rows[0].passing_score,
            correct_answers: correctCount,
            incorrect_answers: incorrectCount,
        });
    } catch (err) { next(err); }
});

// GET /api/quiz/student/results
router.get('/student/results', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const result = await query(
            `SELECT qa.*, q.title as quiz_title, c.title as course_title
             FROM quiz_attempts qa
             JOIN quizzes q ON qa.quiz_id = q.id
             JOIN courses c ON q.course_id = c.id
             WHERE qa.student_id = $1
             ORDER BY qa.completed_at DESC`,
            [req.user.id]
        );
        res.json({ attempts: result.rows });
    } catch (err) { next(err); }
});

// GET /api/quiz/:id/results
router.get('/:id/results', authenticate, async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM quiz_attempts WHERE quiz_id=$1 AND student_id=$2 ORDER BY completed_at DESC',
            [req.params.id, req.user.id]
        );
        res.json({ attempts: result.rows });
    } catch (err) { next(err); }
});

// GET /api/quiz/:id/attempts - Get all attempts for a quiz (instructor)
router.get('/:id/attempts', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the course this quiz belongs to
        const quiz = await query(
            `SELECT q.*, c.instructor_id 
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        if (!quiz.rows.length || quiz.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const attempts = await query(
            `SELECT qa.*, u.name, u.email,
                    e.enrolled_at, e.progress_percent
             FROM quiz_attempts qa
             JOIN users u ON qa.student_id = u.id
             JOIN enrollments e ON qa.student_id = e.student_id AND e.course_id = $2
             WHERE qa.quiz_id = $1
             ORDER BY qa.completed_at DESC`,
            [id, quiz.rows[0].course_id]
        );

        res.json({ attempts: attempts.rows, quiz: quiz.rows[0] });
    } catch (err) { next(err); }
});

// GET /api/quiz/:id/analytics - Get quiz analytics for instructor
router.get('/:id/analytics', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the course this quiz belongs to
        const quiz = await query(
            `SELECT q.*, c.instructor_id 
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        if (!quiz.rows.length || quiz.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const [
            attemptStats,
            scoreDistribution,
            questionAnalysis,
            timeAnalysis,
            quizDetails
        ] = await Promise.all([
            query(
                `SELECT 
                    COUNT(*) as total_attempts,
                    COUNT(DISTINCT student_id) as unique_students,
                    AVG(score) as avg_score,
                    MAX(score) as max_score,
                    MIN(score) as min_score,
                    COUNT(CASE WHEN score >= $2 THEN 1 END) as passed_count
                 FROM quiz_attempts
                 WHERE quiz_id = $1`,
                [id, quiz.rows[0].passing_score || 70]
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
                 FROM quiz_attempts
                 WHERE quiz_id = $1
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
                `SELECT qq.id as question_id, qq.question, qq.points,
                    CASE WHEN COUNT(ja.elem) = 0 THEN 0
                         ELSE ROUND(SUM(CASE WHEN (ja.elem->>'correct') = 'true' THEN 1 ELSE 0 END)::numeric * 100.0 / COUNT(ja.elem), 2)
                    END as correct_rate
                 FROM quiz_questions qq
                 LEFT JOIN quiz_attempts qa ON qa.quiz_id = qq.quiz_id
                 LEFT JOIN LATERAL jsonb_array_elements(coalesce(qa.answers::jsonb, '[]'::jsonb)) AS ja(elem) ON (ja.elem->>'question_id') = qq.id::text
                 WHERE qq.quiz_id = $1
                 GROUP BY qq.id, qq.question, qq.points
                 ORDER BY correct_rate ASC`,
                [id]
            ),
            query(
                `SELECT 
                    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_duration_minutes,
                    COUNT(CASE WHEN started_at IS NOT NULL THEN 1 END) as timed_attempts
                 FROM quiz_attempts
                 WHERE quiz_id = $1 AND started_at IS NOT NULL`,
                [id]
            ),
            query(
                `SELECT q.*, c.title as course_title
                 FROM quizzes q
                 JOIN courses c ON q.course_id = c.id
                 WHERE q.id = $1`,
                [id]
            )
        ]);

        res.json({
            attempt_stats: attemptStats.rows[0],
            score_distribution: scoreDistribution.rows,
            question_analysis: questionAnalysis.rows,
            time_analysis: timeAnalysis.rows[0],
            quiz_details: quizDetails.rows[0]
        });
    } catch (err) { next(err); }
});

// PUT /api/quiz/:id - Update quiz
router.put('/:id', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, time_limit_minutes, max_attempts, passing_score } = req.body;

        // Verify instructor owns the course this quiz belongs to
        const quiz = await query(
            `SELECT q.*, c.instructor_id 
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        if (!quiz.rows.length || quiz.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await query(
            `UPDATE quizzes 
             SET title = $1, time_limit_minutes = $2, max_attempts = $3, passing_score = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [title, time_limit_minutes, max_attempts, passing_score, id]
        );

        res.json({ quiz: result.rows[0] });
    } catch (err) { next(err); }
});

// DELETE /api/quiz/:id - Delete quiz
router.delete('/:id', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the course this quiz belongs to
        const quiz = await query(
            `SELECT q.*, c.instructor_id 
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        if (!quiz.rows.length || quiz.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete quiz (cascade should handle questions and attempts)
        await query('DELETE FROM quizzes WHERE id = $1', [id]);

        res.json({ message: 'Quiz deleted successfully' });
    } catch (err) { next(err); }
});

// POST /api/quiz/:id/publish - Publish quiz for students
router.post('/:id/publish', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify instructor owns the course this quiz belongs to
        const quiz = await query(
            `SELECT q.*, c.instructor_id 
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        if (!quiz.rows.length || quiz.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if quiz has questions
        const questions = await query('SELECT COUNT(*) as count FROM quiz_questions WHERE quiz_id = $1', [id]);
        if (parseInt(questions.rows[0].count) === 0) {
            return res.status(400).json({ error: 'Quiz must have at least one question before publishing' });
        }

        const result = await query(
            'UPDATE quizzes SET is_published = true, published_at = NOW() WHERE id = $1 RETURNING *',
            [id]
        );

        res.json({ quiz: result.rows[0] });
    } catch (err) { next(err); }
});

// POST /api/quiz/:id/duplicate - Duplicate quiz
router.post('/:id/duplicate', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { new_title } = req.body;

        // Verify instructor owns the course this quiz belongs to
        const quiz = await query(
            `SELECT q.*, c.instructor_id 
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        if (!quiz.rows.length || quiz.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const original = quiz.rows[0];

        // Create duplicate quiz
        const newQuiz = await query(
            `INSERT INTO quizzes (course_id, lesson_id, title, time_limit_minutes, max_attempts, passing_score, is_published)
             VALUES ($1,$2,$3,$4,$5,$6,false)
             RETURNING *`,
            [original.course_id, original.lesson_id, new_title || `${original.title} (Copy)`, original.time_limit_minutes, original.max_attempts, original.passing_score]
        );

        // Copy questions
        const questions = await query('SELECT * FROM quiz_questions WHERE quiz_id = $1', [id]);
        for (const question of questions.rows) {
            await query(
                `INSERT INTO quiz_questions (quiz_id, question, question_type, options, correct_answer, points)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [newQuiz.rows[0].id, question.question, question.question_type, question.options, question.correct_answer, question.points]
            );
        }

        res.json({ quiz: newQuiz.rows[0] });
    } catch (err) { next(err); }
});

// GET /api/quiz/:id/export - Export quiz data for instructor
router.get('/:id/export', authenticate, authorize('instructor'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { format = 'json' } = req.query;

        // Verify instructor owns the course this quiz belongs to
        const quiz = await query(
            `SELECT q.*, c.instructor_id 
             FROM quizzes q
             JOIN courses c ON q.course_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        if (!quiz.rows.length || quiz.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const attempts = await query(
            `SELECT qa.*, u.name, u.email,
                    e.enrolled_at, e.progress_percent
             FROM quiz_attempts qa
             JOIN users u ON qa.student_id = u.id
             JOIN enrollments e ON qa.student_id = e.student_id AND e.course_id = $2
             WHERE qa.quiz_id = $1
             ORDER BY qa.completed_at DESC`,
            [id, quiz.rows[0].course_id]
        );

        if (format === 'csv') {
            // Convert to CSV format
            const csv = [
                'Student Name,Email,Completed At,Score,Passed,Answers',
                ...attempts.rows.map(attempt =>
                    `"${attempt.name}","${attempt.email}","${attempt.completed_at}","${attempt.score}","${attempt.passed ? 'Yes' : 'No'}","${attempt.answers}"`
                )
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="quiz_${id}_results.csv"`);
            res.send(csv);
        } else {
            res.json({ attempts: attempts.rows, quiz: quiz.rows[0] });
        }
    } catch (err) { next(err); }
});

module.exports = router;
