const { query } = require('./src/db');

async function testAssignmentAnalytics() {
    try {
        console.log('Testing assignment analytics...');
        
        // First, get all assignments
        const assignments = await query('SELECT * FROM assignments LIMIT 1');
        if (assignments.rows.length === 0) {
            console.log('No assignments found in database');
            process.exit(0);
        }
        
        const assignmentId = assignments.rows[0].id;
        console.log('Testing with assignment ID:', assignmentId);
        
        // Test the analytics queries
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
                    MIN(score) as min_score,
                    COUNT(CASE WHEN submitted_at <= due_date THEN 1 END) as on_time_submissions
                 FROM assignment_submissions
                 WHERE assignment_id = $1`,
                [assignmentId]
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
                [assignmentId]
            ),
            query(
                `SELECT 
                    AVG(EXTRACT(EPOCH FROM (submitted_at - due_date))/3600) as avg_hours_late,
                    COUNT(CASE WHEN submitted_at > due_date THEN 1 END) as late_submissions
                 FROM assignment_submissions
                 WHERE assignment_id = $1 AND submitted_at IS NOT NULL`,
                [assignmentId]
            ),
            query(
                `SELECT a.*, c.title as course_title
                 FROM assignments a
                 JOIN courses c ON a.course_id = c.id
                 WHERE a.id = $1`,
                [assignmentId]
            )
        ]);

        console.log('Submission Stats:', submissionStats.rows[0]);
        console.log('Score Distribution:', scoreDistribution.rows);
        console.log('Time Analysis:', timeAnalysis.rows[0]);
        console.log('Assignment Details:', assignmentDetails.rows[0]);
        
        // Test submissions endpoint
        const submissions = await query(
            `SELECT sub.*, u.name as student_name, u.email as student_email, a.title as assignment_title
             FROM assignment_submissions sub
             JOIN users u ON sub.student_id = u.id
             JOIN assignments a ON sub.assignment_id = a.id
             WHERE sub.assignment_id = $1
             ORDER BY sub.submitted_at DESC`,
            [assignmentId]
        );
        
        console.log('Submissions:', submissions.rows);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testAssignmentAnalytics();
