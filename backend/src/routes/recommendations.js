const express = require('express');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/recommendations/next
router.get('/next', authenticate, authorize('student', 'instructor'), async (req, res, next) => {
    try {
        const { course_id } = req.query;

        // Get student's quiz performance
        const perf = await query(
            'SELECT AVG(score) as avg_score FROM quiz_attempts WHERE student_id=$1',
            [req.user.id]
        );
        const avgScore = parseFloat(perf.rows[0].avg_score) || 0;

        // Get knowledge trace
        let mastery = 0;
        if (course_id) {
            const kt = await query(
                'SELECT AVG(mastery_score) as avg FROM knowledge_trace WHERE student_id=$1 AND course_id=$2',
                [req.user.id, course_id]
            );
            mastery = parseFloat(kt.rows[0].avg) || 0;
        }

        // Recommendation logic based on SRS
        let recommendation;
        if (avgScore < 50 || mastery < 0.4) {
            recommendation = { type: 'recap', message: 'Review previous lessons with video recap and simpler analogies', difficulty: 'easier' };
        } else if (avgScore >= 50 && avgScore < 80) {
            recommendation = { type: 'practice', message: 'Try a practice quiz and peek at the next concept', difficulty: 'same' };
        } else {
            recommendation = { type: 'challenge', message: 'You are ready for a challenge problem!', difficulty: 'harder' };
        }

        // Get next unenrolled courses
        const suggested = await query(
            `SELECT c.id, c.title, c.difficulty_level, c.thumbnail_url, u.name as instructor_name
       FROM courses c LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.status='published' AND c.id NOT IN (
         SELECT course_id FROM enrollments WHERE student_id=$1
       ) ORDER BY RANDOM() LIMIT 3`,
            [req.user.id]
        );

        res.json({ recommendation, suggested_courses: suggested.rows, avg_score: avgScore, mastery });
    } catch (err) { next(err); }
});

module.exports = router;
