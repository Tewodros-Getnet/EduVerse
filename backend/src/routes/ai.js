const express = require('express');
const axios = require('axios');
const { query } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Create axios instance with certificate verification disabled for development
const apiClient = axios.create({
    httpsAgent: require('https').Agent({
        rejectUnauthorized: false
    })
});

const router = express.Router();

async function askGroq(question, context) {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('your_') || process.env.GROQ_API_KEY === 'your_groq_api_key') {
        throw new Error('GROQ_API_KEY not configured');
    }
    const response = await apiClient.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: `You are an AI tutor for EduVerse. Context: ${context}` },
                { role: 'user', content: question },
            ],
            max_tokens: 1024,
        },
        {
            headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            timeout: 8000,
        }
    );
    return response.data.choices[0].message.content;
}

async function askGemini(question, context) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_') || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
        throw new Error('GEMINI_API_KEY not configured');
    }
    const response = await apiClient.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            contents: [{ parts: [{ text: `You are an AI tutor for EduVerse. Context: ${context}\n\nQuestion: ${question}` }] }]
        },
        { timeout: 15000 }
    );
    return response.data.candidates[0].content.parts[0].text;
}

// Strip markdown code fences and parse JSON safely
function parseAIJson(text) {
    // Remove ```json ... ``` or ``` ... ``` wrappers that LLMs often add
    const stripped = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();
    return JSON.parse(stripped);
}

// POST /api/ai/chat — open to all authenticated users
router.post('/chat', authenticate, async (req, res, next) => {
    try {
        const { question, course_id, use_deep = false, conversation_history = [] } = req.body;
        if (!question) return res.status(400).json({ error: 'Question required' });

        // Build course context
        let context = 'General learning platform';
        if (course_id) {
            const course = await query('SELECT title, description FROM courses WHERE id = $1', [course_id]);
            if (course.rows.length) context = `Course: ${course.rows[0].title}. ${course.rows[0].description}`;
        }

        // Build conversation context from history
        let conversationContext = '';
        if (conversation_history.length > 0) {
            const historyText = conversation_history
                .slice(-10) // max 10 turns
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');
            conversationContext = `\n\nConversation history:\n${historyText}`;
        }

        const start = Date.now();
        let answer, ai_source;

        // Check if API keys are configured
        const hasGroq = process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_');
        const hasGemini = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_');

        if (!hasGroq && !hasGemini) {
            // Fallback when no API keys configured
            answer = `Based on the ${context}, I would suggest exploring the course materials thoroughly. Please note: AI tutor is in demo mode. Configure GROQ_API_KEY and/or GEMINI_API_KEY in .env for full AI capabilities.`;
            ai_source = 'demo';
        } else if (use_deep) {
            try {
                answer = await askGemini(question, context + conversationContext);
                ai_source = 'gemini';
            } catch (err) {
                if (hasGroq) {
                    try {
                        answer = await askGroq(question, context + conversationContext);
                        ai_source = 'groq';
                    } catch {
                        answer = `I encountered an error processing your question: ${err.message}. API keys may not be valid.`;
                        ai_source = 'error';
                    }
                } else {
                    answer = `Gemini API failed and Groq is not configured. ${err.message}`;
                    ai_source = 'error';
                }
            }
        } else {
            try {
                answer = await askGroq(question, context + conversationContext);
                ai_source = 'groq';
            } catch (err) {
                if (hasGemini) {
                    try {
                        answer = await askGemini(question, context + conversationContext);
                        ai_source = 'gemini';
                    } catch {
                        answer = `I encountered an error processing your question: ${err.message}. API keys may not be valid.`;
                        ai_source = 'error';
                    }
                } else {
                    answer = `Groq API failed and Gemini is not configured. ${err.message}`;
                    ai_source = 'error';
                }
            }
        }

        const response_time_ms = Date.now() - start;

        // Store in chat_history (student_id column stores any user's id)
        await query(
            'INSERT INTO chat_history (student_id, course_id, question, answer, ai_source, response_time_ms) VALUES ($1,$2,$3,$4,$5,$6)',
            [req.user.id, course_id || null, question, answer, ai_source, response_time_ms]
        );

        res.json({ answer, ai_source, response_time_ms });
    } catch (err) { next(err); }
});

// GET /api/ai/history
router.get('/history', authenticate, async (req, res, next) => {
    try {
        const { course_id, limit = 20 } = req.query;
        const params = [req.user.id];
        let sql = 'SELECT * FROM chat_history WHERE student_id = $1';
        if (course_id) {
            sql += ' AND course_id = $2';
            params.push(course_id);
        }
        sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));
        const result = await query(sql, params);
        res.json({ history: result.rows });
    } catch (err) { next(err); }
});

// PATCH /api/ai/history/:id/helpful
router.patch('/history/:id/helpful', authenticate, async (req, res, next) => {
    try {
        const { helpful } = req.body;
        await query(
            'UPDATE chat_history SET helpful_flag=$1 WHERE id=$2 AND student_id=$3',
            [helpful, req.params.id, req.user.id]
        );
        res.json({ message: 'Updated' });
    } catch (err) { next(err); }
});

// GET /api/ai/history/:id/helpful - Mark chat entry as helpful
router.get('/history/:id/helpful', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        await query('UPDATE chat_history SET helpful_flag = true WHERE id = $1 AND student_id = $2', [id, req.user.id]);
        res.json({ message: 'Marked as helpful' });
    } catch (err) { next(err); }
});

// ============= ADMIN AI FEATURES =============

// POST /api/ai/admin/stats-summary - Generate AI-powered statistics summary
router.post('/admin/stats-summary', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { time_period = '30 days' } = req.body;

        // Get comprehensive stats data
        const [
            userStats,
            courseStats,
            enrollmentStats,
            activityStats,
            aiUsageStats
        ] = await Promise.all([
            query(
                `SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN is_active THEN 1 END) as active_users,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${time_period}' THEN 1 END) as new_users,
                    COUNT(CASE WHEN last_login_at < NOW() - INTERVAL '30 days' OR last_login_at IS NULL THEN 1 END) as inactive_users
                 FROM users`
            ),
            query(
                `SELECT 
                    COUNT(*) as total_courses,
                    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_courses,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${time_period}' THEN 1 END) as new_courses
                 FROM courses`
            ),
            query(
                `SELECT 
                    COUNT(*) as total_enrollments,
                    AVG(progress_percent) as avg_progress,
                    COUNT(CASE WHEN enrolled_at >= NOW() - INTERVAL '${time_period}' THEN 1 END) as new_enrollments
                 FROM enrollments`
            ),
            query(
                `SELECT 
                    COUNT(*) as total_activities,
                    COUNT(*) as recent_activities
                 FROM (
                    SELECT created_at as ts FROM lesson_progress WHERE created_at >= NOW() - INTERVAL '${time_period}'
                    UNION ALL
                    SELECT completed_at as ts FROM lesson_progress WHERE completed_at >= NOW() - INTERVAL '${time_period}'
                    UNION ALL
                    SELECT completed_at as ts FROM quiz_attempts WHERE completed_at >= NOW() - INTERVAL '${time_period}'
                    UNION ALL
                    SELECT submitted_at as ts FROM assignment_submissions WHERE submitted_at >= NOW() - INTERVAL '${time_period}'
                 ) activities`
            ),
            query(
                `SELECT 
                    COUNT(*) as total_ai_requests,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${time_period}' THEN 1 END) as recent_ai_requests,
                    AVG(response_time_ms) as avg_response_time
                 FROM chat_history`
            )
        ]);

        const statsData = {
            users: userStats.rows[0],
            courses: courseStats.rows[0],
            enrollments: enrollmentStats.rows[0],
            activity: activityStats.rows[0],
            ai_usage: aiUsageStats.rows[0],
            time_period
        };

        // Generate AI summary using Groq or fallback
        const prompt = `As an AI assistant, please provide a comprehensive summary and analysis of the following learning management system statistics for the ${time_period} period:

User Statistics:
- Total users: ${statsData.users.total_users}
- Active users: ${statsData.users.active_users}
- New users: ${statsData.users.new_users}
- Inactive users: ${statsData.users.inactive_users}

Course Statistics:
- Total courses: ${statsData.courses.total_courses}
- Published courses: ${statsData.courses.published_courses}
- New courses: ${statsData.courses.new_courses}

Enrollment Statistics:
- Total enrollments: ${statsData.enrollments.total_enrollments}
- Average progress: ${Math.round(statsData.enrollments.avg_progress || 0)}%
- New enrollments: ${statsData.enrollments.new_enrollments}

Activity Statistics:
- Total activities: ${statsData.activity.total_activities}
- Recent activities: ${statsData.activity.recent_activities}

AI Usage Statistics:
- Total AI requests: ${statsData.ai_usage.total_ai_requests}
- Recent AI requests: ${statsData.ai_usage.recent_ai_requests}
- Average response time: ${Math.round(statsData.ai_usage.avg_response_time || 0)}ms

Please provide:
1. Key insights and trends
2. Areas of concern or improvement
3. Recommendations for platform optimization
4. User engagement analysis
5. Growth patterns and predictions

Format your response in a clear, structured manner with bullet points and actionable recommendations.`;

        let summary;
        try {
            // Try Groq first
            const groqResponse = await askGroq(prompt);
            summary = groqResponse;
        } catch (error) {
            // Fallback to Gemini
            try {
                const geminiResponse = await askGemini(prompt);
                summary = geminiResponse;
            } catch (geminiError) {
                // Final fallback - basic analysis
                summary = generateBasicSummary(statsData);
            }
        }

        res.json({
            summary,
            stats_data: statsData,
            generated_at: new Date().toISOString()
        });
    } catch (err) { next(err); }
});

// GET /api/ai/admin/inactive-users - Detect inactive users with AI insights
router.get('/admin/inactive-users', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { days_threshold = 30 } = req.query;

        // Get inactive users with their activity patterns
        const inactiveUsers = await query(
            `SELECT 
                u.id, u.name, u.email, u.role, u.created_at, u.last_login_at,
                COUNT(e.id) as course_count,
                AVG(e.progress_percent) as avg_progress,
                COUNT(lp.id) as lesson_activities,
                COUNT(qa.id) as quiz_attempts,
                COUNT(sub.id) as assignment_submissions
             FROM users u
             LEFT JOIN enrollments e ON u.id = e.student_id
             LEFT JOIN lesson_progress lp ON u.id = lp.student_id
             LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
             LEFT JOIN assignment_submissions sub ON u.id = sub.student_id
             WHERE u.is_active = true 
             AND (u.last_login_at < NOW() - INTERVAL '${days_threshold} days' OR u.last_login_at IS NULL)
             AND u.role != 'admin'
             GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.last_login_at
             ORDER BY u.last_login_at DESC NULLS LAST`
        );

        // Generate AI insights for inactive users
        const insights = await generateUserInsights(inactiveUsers.rows, days_threshold);

        res.json({
            inactive_users: inactiveUsers.rows,
            insights,
            threshold_days: parseInt(days_threshold),
            total_inactive: inactiveUsers.rows.length
        });
    } catch (err) { next(err); }
});

// POST /api/ai/admin/engagement-prediction - Predict user engagement patterns
router.post('/admin/engagement-prediction', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { user_id, time_period = '30 days' } = req.body;

        // Get user's historical activity data
        const userActivity = await query(
            `SELECT 
                u.name, u.email, u.role,
                COUNT(e.id) as enrolled_courses,
                AVG(e.progress_percent) as avg_progress,
                COUNT(lp.id) as lessons_completed,
                COUNT(qa.id) as quiz_attempts,
                AVG(qa.score) as avg_quiz_score,
                COUNT(sub.id) as assignments_submitted,
                AVG(sub.score) as avg_assignment_score,
                COUNT(ach.id) as recent_activities
             FROM users u
             LEFT JOIN enrollments e ON u.id = e.student_id
             LEFT JOIN lesson_progress lp ON u.id = lp.student_id AND lp.completed = true
             LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
             LEFT JOIN assignment_submissions sub ON u.id = sub.student_id
             LEFT JOIN (
                SELECT student_id, 1 as id FROM lesson_progress 
                WHERE created_at >= NOW() - INTERVAL '${time_period}'
                UNION ALL
                SELECT student_id, 1 FROM quiz_attempts 
                WHERE created_at >= NOW() - INTERVAL '${time_period}'
                UNION ALL
                SELECT student_id, 1 FROM assignment_submissions 
                WHERE submitted_at >= NOW() - INTERVAL '${time_period}'
             ) ach ON u.id = ach.student_id
             WHERE u.id = $1
             GROUP BY u.id, u.name, u.email, u.role`,
            [user_id]
        );

        if (userActivity.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userActivity.rows[0];

        // Generate AI prediction
        const prompt = `As an AI learning analytics expert, analyze this user's engagement data and provide predictions and recommendations:

User Profile:
- Name: ${userData.name}
- Email: ${userData.email}
- Role: ${userData.role}

Activity Metrics:
- Enrolled courses: ${userData.enrolled_courses || 0}
- Average progress: ${Math.round(userData.avg_progress || 0)}%
- Lessons completed: ${userData.lessons_completed || 0}
- Quiz attempts: ${userData.quiz_attempts || 0}
- Average quiz score: ${Math.round(userData.avg_quiz_score || 0)}%
- Assignments submitted: ${userData.assignments_submitted || 0}
- Average assignment score: ${Math.round(userData.avg_assignment_score || 0)}%
- Recent activities (last ${time_period}): ${userData.recent_activities || 0}

Please provide:
1. Engagement level assessment (High, Medium, Low, At Risk)
2. Dropout risk prediction with confidence level
3. Personalized recommendations to improve engagement
4. Predicted learning outcomes
5. Suggested interventions

Format your response with clear sections and actionable recommendations.`;

        let prediction;
        try {
            const groqResponse = await askGroq(prompt);
            prediction = groqResponse;
        } catch (error) {
            try {
                const geminiResponse = await askGemini(prompt);
                prediction = geminiResponse;
            } catch (geminiError) {
                prediction = generateBasicPrediction(userData);
            }
        }

        res.json({
            user_data: userData,
            prediction,
            generated_at: new Date().toISOString()
        });
    } catch (err) { next(err); }
});

// Helper function to generate basic summary when AI is unavailable
function generateBasicSummary(stats) {
    return `
# Platform Statistics Summary

## Key Metrics
- **Total Users**: ${stats.users.total_users} (${stats.users.active_users} active, ${stats.users.inactive_users} inactive)
- **Courses**: ${stats.courses.total_courses} total (${stats.courses.published_courses} published)
- **Enrollments**: ${stats.enrollments.total_enrollments} with ${Math.round(stats.enrollments.avg_progress || 0)}% average progress
- **Activities**: ${stats.activity.total_activities} total (${stats.activity.recent_activities} recent)

## Insights
1. User engagement is ${stats.users.active_users > stats.users.total_users * 0.7 ? 'healthy' : 'needs attention'}
2. Course completion rate is ${Math.round(stats.enrollments.avg_progress || 0)}%
3. Platform activity shows ${stats.activity.recent_activities > 100 ? 'high' : 'moderate'} engagement

## Recommendations
- Focus on re-engaging ${stats.users.inactive_users} inactive users
- Improve course completion rates
- Monitor AI usage patterns for optimization
`;
}

// Helper function to generate user insights
async function generateUserInsights(users, threshold) {
    const totalInactive = users.length;
    const byRole = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
    }, {});

    const avgCoursesEnrolled = users.reduce((sum, user) => sum + (user.course_count || 0), 0) / totalInactive;
    const avgProgress = users.reduce((sum, user) => sum + (user.avg_progress || 0), 0) / totalInactive;

    return {
        summary: `Found ${totalInactive} inactive users for the last ${threshold} days`,
        role_distribution: byRole,
        average_metrics: {
            courses_enrolled: Math.round(avgCoursesEnrolled * 10) / 10,
            progress_percentage: Math.round(avgProgress),
        },
        recommendations: [
            'Send re-engagement emails to inactive users',
            'Offer personalized course recommendations',
            'Implement gamification features',
            'Create targeted notifications based on user interests'
        ]
    };
}

// Helper function to generate basic prediction
function generateBasicPrediction(userData) {
    const engagementScore = calculateEngagementScore(userData);
    const riskLevel = engagementScore > 70 ? 'Low' : engagementScore > 40 ? 'Medium' : 'High';

    return `
# User Engagement Analysis

## Current Status
- **Engagement Level**: ${engagementScore}/100
- **Risk Level**: ${riskLevel}
- **Activity Level**: ${userData.recent_activities > 10 ? 'High' : userData.recent_activities > 5 ? 'Medium' : 'Low'}

## Recommendations
1. ${riskLevel === 'High' ? 'Immediate intervention required' : 'Continue monitoring'}
2. ${userData.avg_progress < 50 ? 'Focus on course completion support' : 'Maintain current engagement'}
3. ${userData.recent_activities === 0 ? 'Send re-engagement campaign' : 'Encourage continued participation'}

## Predicted Outcome
${riskLevel === 'Low' ? 'Likely to complete courses successfully' :
            riskLevel === 'Medium' ? 'May need additional support to complete courses' :
                'High risk of course dropout'}
`;
}

// Helper function to calculate engagement score
function calculateEngagementScore(userData) {
    let score = 0;

    // Course enrollment (30%)
    score += Math.min((userData.enrolled_courses || 0) * 10, 30);

    // Progress (25%)
    score += (userData.avg_progress || 0) * 0.25;

    // Quiz activity (20%)
    score += Math.min((userData.quiz_attempts || 0) * 4, 20);

    // Assignment activity (15%)
    score += Math.min((userData.assignments_submitted || 0) * 3, 15);

    // Recent activity (10%)
    score += Math.min((userData.recent_activities || 0) * 2, 10);

    return Math.min(Math.round(score), 100);
}

// ============= INSTRUCTOR AI FEATURES =============

// POST /api/ai/instructor/quiz-generator - Generate quiz questions using AI
router.post('/instructor/quiz-generator', authenticate, async (req, res, next) => {
    try {
        const { course_id, lesson_id, topic, difficulty = 'medium', question_count = 5, question_types = ['multiple_choice'] } = req.body;

        if (!topic || !course_id) {
            return res.status(400).json({ error: 'Topic and course_id are required' });
        }

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id, title FROM courses WHERE id = $1', [course_id]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let context = `Course: ${course.rows[0].title}. Topic: ${topic}. Difficulty: ${difficulty}. Generate ${question_count} questions of types: ${question_types.join(', ')}.`;

        const prompt = `Generate ${question_count} quiz questions about "${topic}" for a course. 
        Requirements:
        - Difficulty level: ${difficulty}
        - Question types: ${question_types.join(', ')}
        - Include clear correct answers
        - For multiple choice, provide 4 options
        - Assign appropriate point values (1-5 points based on difficulty)
        
        Format as JSON array:
        [
          {
            "question": "question text",
            "question_type": "multiple_choice|true_false|short_answer",
            "options": ["option1", "option2", "option3", "option4"],
            "correct_answer": "correct option or answer",
            "points": 3
          }
        ]`;

        let questions;
        try {
            const response = await askGroq(prompt, context);
            // Parse JSON response
            questions = parseAIJson(response);
        } catch (err) {
            // Fallback to demo questions
            questions = [
                {
                    question: `What is the main concept of ${topic}?`,
                    question_type: 'multiple_choice',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correct_answer: 'Option A',
                    points: 3
                },
                {
                    question: `Explain the importance of ${topic} in this course.`,
                    question_type: 'short_answer',
                    options: [],
                    correct_answer: 'A comprehensive explanation would cover key aspects',
                    points: 5
                }
            ];
        }

        res.json({
            questions,
            topic,
            difficulty,
            course_title: course.rows[0].title,
            generated_at: new Date().toISOString()
        });
    } catch (err) { next(err); }
});

// POST /api/ai/instructor/content-suggestions - Get AI suggestions for course content
router.post('/instructor/content-suggestions', authenticate, async (req, res, next) => {
    try {
        const { course_id, content_type, current_content, target_audience, learning_objectives } = req.body;

        if (!course_id || !content_type) {
            return res.status(400).json({ error: 'Course ID and content type are required' });
        }

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id, title, description FROM courses WHERE id = $1', [course_id]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let context = `Course: ${course.rows[0].title}. Description: ${course.rows[0].description}. Content type: ${content_type}.`;
        if (target_audience) context += ` Target audience: ${target_audience}.`;
        if (learning_objectives) context += ` Learning objectives: ${learning_objectives}.`;

        const prompt = `Provide suggestions for improving ${content_type} content for this course.
        
        Current content: ${current_content || 'No content provided yet'}
        
        Provide suggestions in these categories:
        1. Content Structure
        2. Engagement Strategies
        3. Assessment Methods
        4. Accessibility Improvements
        5. Technology Integration
        
        Format as JSON:
        {
          "content_structure": ["suggestion1", "suggestion2"],
          "engagement_strategies": ["suggestion1", "suggestion2"],
          "assessment_methods": ["suggestion1", "suggestion2"],
          "accessibility_improvements": ["suggestion1", "suggestion2"],
          "technology_integration": ["suggestion1", "suggestion2"]
        }`;

        let suggestions;
        try {
            const response = await askGroq(prompt, context);
            suggestions = parseAIJson(response);
        } catch (err) {
            // Fallback suggestions
            suggestions = {
                content_structure: ['Start with clear learning objectives', 'Use logical progression of topics'],
                engagement_strategies: ['Include interactive elements', 'Use real-world examples'],
                assessment_methods: ['Mix formative and summative assessments', 'Provide immediate feedback'],
                accessibility_improvements: ['Add alt text to images', 'Ensure proper color contrast'],
                technology_integration: ['Use multimedia content', 'Include interactive simulations']
            };
        }

        res.json({
            suggestions,
            content_type,
            course_title: course.rows[0].title,
            generated_at: new Date().toISOString()
        });
    } catch (err) { next(err); }
});

// POST /api/ai/instructor/feedback-generator - Generate AI feedback for student work
router.post('/instructor/feedback-generator', authenticate, async (req, res, next) => {
    try {
        const { student_work, assignment_type, rubric_criteria, student_level = 'intermediate' } = req.body;

        if (!student_work || !assignment_type) {
            return res.status(400).json({ error: 'Student work and assignment type are required' });
        }

        let context = `Assignment type: ${assignment_type}. Student level: ${student_level}.`;
        if (rubric_criteria) context += ` Rubric criteria: ${rubric_criteria}.`;

        const prompt = `Generate constructive feedback for student work.
        
        Student work: ${student_work}
        Assignment type: ${assignment_type}
        Student level: ${student_level}
        
        Provide feedback in these sections:
        1. Strengths (what the student did well)
        2. Areas for Improvement (specific, actionable suggestions)
        3. Next Steps (how to build on this work)
        4. Encouragement (positive reinforcement)
        
        Format as JSON:
        {
          "strengths": ["point1", "point2"],
          "areas_for_improvement": ["point1", "point2"],
          "next_steps": ["step1", "step2"],
          "encouragement": "positive message",
          "estimated_grade_suggestion": "A/B/C/D/F based on current work"
        }`;

        let feedback;
        try {
            const response = await askGroq(prompt, context);
            feedback = parseAIJson(response);
        } catch (err) {
            // Fallback feedback
            feedback = {
                strengths: ['Good effort demonstrated', 'Clear attempt to address requirements'],
                areas_for_improvement: ['Add more detail to explanations', 'Check for accuracy'],
                next_steps: ['Review similar examples', 'Practice with additional exercises'],
                encouragement: 'You\'re making good progress. Keep working on these areas!',
                estimated_grade_suggestion: 'C'
            };
        }

        res.json({
            feedback,
            assignment_type,
            student_level,
            generated_at: new Date().toISOString()
        });
    } catch (err) { next(err); }
});

// POST /api/ai/instructor/course-optimizer - Get AI suggestions for course optimization
router.post('/instructor/course-optimizer', authenticate, async (req, res, next) => {
    try {
        const { course_id, current_performance_data, target_metrics } = req.body;

        if (!course_id) {
            return res.status(400).json({ error: 'Course ID is required' });
        }

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id, title, description FROM courses WHERE id = $1', [course_id]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let context = `Course: ${course.rows[0].title}. Description: ${course.rows[0].description}.`;
        if (current_performance_data) context += ` Current performance: ${JSON.stringify(current_performance_data)}.`;
        if (target_metrics) context += ` Target metrics: ${JSON.stringify(target_metrics)}.`;

        const prompt = `Analyze course performance and provide optimization suggestions.
        
        Current performance data: ${JSON.stringify(current_performance_data || {})}
        Target metrics: ${JSON.stringify(target_metrics || {})}
        
        Provide recommendations in these areas:
        1. Content Improvements
        2. Engagement Strategies
        3. Assessment Adjustments
        4. Student Support
        5. Technical Enhancements
        
        Format as JSON:
        {
          "content_improvements": ["suggestion1", "suggestion2"],
          "engagement_strategies": ["suggestion1", "suggestion2"],
          "assessment_adjustments": ["suggestion1", "suggestion2"],
          "student_support": ["suggestion1", "suggestion2"],
          "technical_enhancements": ["suggestion1", "suggestion2"],
          "priority_actions": ["high priority action1", "high priority action2"]
        }`;

        let optimization;
        try {
            const response = await askGroq(prompt, context);
            optimization = parseAIJson(response);
        } catch (err) {
            // Fallback optimization
            optimization = {
                content_improvements: ['Add more practical examples', 'Include supplementary materials'],
                engagement_strategies: ['Increase interactive elements', 'Add discussion forums'],
                assessment_adjustments: ['Provide more frequent feedback', 'Vary assessment types'],
                student_support: ['Offer office hours', 'Create study groups'],
                technical_enhancements: ['Improve video quality', 'Add mobile accessibility'],
                priority_actions: ['Update course content', 'Improve student communication']
            };
        }

        res.json({
            optimization,
            course_title: course.rows[0].title,
            generated_at: new Date().toISOString()
        });
    } catch (err) { next(err); }
});

// POST /api/ai/instructor/student-insights - Get AI-powered insights about student performance
router.post('/instructor/student-insights', authenticate, async (req, res, next) => {
    try {
        const { course_id, student_data, time_period = '30_days' } = req.body;

        if (!course_id || !student_data) {
            return res.status(400).json({ error: 'Course ID and student data are required' });
        }

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id, title FROM courses WHERE id = $1', [course_id]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let context = `Course: ${course.rows[0].title}. Time period: ${time_period}. Student data: ${JSON.stringify(student_data)}.`;

        const prompt = `Analyze student performance data and provide actionable insights.
        
        Student data: ${JSON.stringify(student_data)}
        Time period: ${time_period}
        
        Provide insights in these categories:
        1. Performance Trends
        2. At-Risk Students
        3. High Performers
        4. Common Challenges
        5. Recommended Actions
        
        Format as JSON:
        {
          "performance_trends": ["trend1", "trend2"],
          "at_risk_students": [
            {
              "student_id": "id",
              "name": "name",
              "risk_factors": ["factor1", "factor2"],
              "recommended_actions": ["action1", "action2"]
            }
          ],
          "high_performers": [
            {
              "student_id": "id",
              "name": "name",
              "strengths": ["strength1", "strength2"],
              "enrichment_suggestions": ["suggestion1", "suggestion2"]
            }
          ],
          "common_challenges": ["challenge1", "challenge2"],
          "recommended_actions": ["action1", "action2"]
        }`;

        let insights;
        try {
            const response = await askGroq(prompt, context);
            insights = parseAIJson(response);
        } catch (err) {
            // Fallback insights
            insights = {
                performance_trends: ['Overall progress steady', 'Quiz scores improving'],
                at_risk_students: [],
                high_performers: [],
                common_challenges: ['Time management', 'Concept understanding'],
                recommended_actions: ['Provide additional practice', 'Offer tutoring sessions']
            };
        }

        res.json({
            insights,
            course_title: course.rows[0].title,
            time_period,
            generated_at: new Date().toISOString()
        });
    } catch (err) { next(err); }
});

// POST /api/ai/instructor/learning-path-generator - Generate personalized learning paths
router.post('/instructor/learning-path-generator', authenticate, async (req, res, next) => {
    try {
        const { course_id, student_profile, learning_goals, time_constraint } = req.body;

        if (!course_id || !student_profile) {
            return res.status(400).json({ error: 'Course ID and student profile are required' });
        }

        // Verify instructor owns the course
        const course = await query('SELECT instructor_id, title FROM courses WHERE id = $1', [course_id]);
        if (!course.rows.length || course.rows[0].instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let context = `Course: ${course.rows[0].title}. Student profile: ${JSON.stringify(student_profile)}.`;
        if (learning_goals) context += ` Learning goals: ${learning_goals}.`;
        if (time_constraint) context += ` Time constraint: ${time_constraint}.`;

        const prompt = `Generate a personalized learning path for a student.
        
        Student profile: ${JSON.stringify(student_profile)}
        Learning goals: ${learning_goals || 'General course completion'}
        Time constraint: ${time_constraint || 'No specific constraint'}
        
        Provide a learning path with:
        1. Recommended sequence of lessons/activities
        2. Estimated time for each component
        3. Prerequisites for each step
        4. Assessment checkpoints
        5. Support resources
        
        Format as JSON:
        {
          "learning_path": [
            {
              "step": 1,
              "activity": "activity description",
              "estimated_time": "time estimate",
              "prerequisites": ["prereq1"],
              "assessment_type": "quiz|assignment|project",
              "support_resources": ["resource1", "resource2"]
            }
          ],
          "total_estimated_time": "total time",
          "key_milestones": ["milestone1", "milestone2"],
          "success_metrics": ["metric1", "metric2"]
        }`;

        let learningPath;
        try {
            const response = await askGroq(prompt, context);
            learningPath = parseAIJson(response);
        } catch (err) {
            // Fallback learning path
            learningPath = {
                learning_path: [
                    {
                        step: 1,
                        activity: "Review course fundamentals",
                        estimated_time: "2 hours",
                        prerequisites: [],
                        assessment_type: "quiz",
                        support_resources: ["Course materials", "Video tutorials"]
                    }
                ],
                total_estimated_time: "2 hours",
                key_milestones: ["Complete fundamentals review"],
                success_metrics: ["Quiz score > 80%"]
            };
        }

        res.json({
            learning_path: learningPath,
            course_title: course.rows[0].title,
            generated_at: new Date().toISOString()
        });
    } catch (err) { next(err); }
});

// GET /api/ai/student/recommendations
router.get('/student/recommendations', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get enrolled courses with progress and recent quiz scores
        const [coursesResult, quizResult] = await Promise.all([
            query(
                `SELECT c.id, c.title, c.category, c.difficulty_level, e.progress_percent
                 FROM enrollments e
                 JOIN courses c ON e.course_id = c.id
                 WHERE e.student_id = $1
                 ORDER BY e.progress_percent DESC
                 LIMIT 5`,
                [userId]
            ),
            query(
                `SELECT q.title as quiz_title, qa.score, c.title as course_title
                 FROM quiz_attempts qa
                 JOIN quizzes q ON qa.quiz_id = q.id
                 JOIN courses c ON q.course_id = c.id
                 WHERE qa.student_id = $1
                 ORDER BY qa.completed_at DESC
                 LIMIT 5`,
                [userId]
            ),
        ]);

        const courses = coursesResult.rows;
        const recentQuizzes = quizResult.rows;

        if (courses.length === 0) {
            return res.json({ recommendations: [] });
        }

        const prompt = `A student is enrolled in these courses with the following progress:
${courses.map(c => `- ${c.title} (${c.category}, ${c.difficulty_level}): ${Math.round(c.progress_percent)}% complete`).join('\n')}

Recent quiz scores:
${recentQuizzes.length > 0 ? recentQuizzes.map(q => `- ${q.quiz_title} in ${q.course_title}: ${q.score}%`).join('\n') : 'No quizzes taken yet'}

Generate 4 personalized learning recommendations. Return ONLY a JSON array:
[
  {
    "title": "short recommendation title",
    "description": "one sentence explaining why this is recommended for this student",
    "icon": "single emoji"
  }
]`;

        let recommendations;
        try {
            const response = await askGroq(prompt, '');
            recommendations = parseAIJson(response);
        } catch {
            // Fallback: build basic recommendations from course data
            recommendations = courses.slice(0, 3).map(course => ({
                title: `Continue ${course.title}`,
                description: `You're ${Math.round(course.progress_percent)}% through this course — keep the momentum going.`,
                icon: '📚',
            }));
            if (recommendations.length < 4) {
                recommendations.push({
                    title: 'Practice with quizzes',
                    description: 'Test your knowledge to reinforce what you have learned.',
                    icon: '📝',
                });
            }
        }

        res.json({ recommendations });
    } catch (err) {
        next(err);
    }
});

// GET /api/ai/student/learning-path
router.get('/student/learning-path', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get user's current progress and courses
        const progressQuery = `
            SELECT 
                c.id as course_id,
                c.title as course_title,
                c.category,
                e.progress_percent,
                e.enrolled_at,
                l.title as current_lesson,
                l.order_index as lesson_order
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN lessons l ON c.id = l.course_id AND l.order_index = FLOOR((SELECT COUNT(*) FROM lessons WHERE course_id = c.id) * e.progress_percent / 100)
            WHERE e.student_id = $1
            ORDER BY e.progress_percent DESC
            LIMIT 3
        `;

        const courses = await query(progressQuery, [userId]);

        // Generate learning path based on current progress
        const learning_path = courses.rows.map((course, index) => ({
            id: `path_${course.course_id}`,
            title: course.course_title,
            category: course.category,
            current_progress: Math.round(course.progress_percent),
            current_lesson: course.current_lesson || 'Introduction',
            next_steps: [
                `Complete ${course.current_lesson || 'current lesson'}`,
                `Practice with exercises`,
                `Take quiz when ready`
            ],
            estimated_completion: `${Math.ceil((100 - course.progress_percent) / 10)} weeks`,
            difficulty: course.progress_percent > 70 ? 'advanced' : course.progress_percent > 30 ? 'intermediate' : 'beginner'
        }));

        res.json({ learning_path });
    } catch (err) {
        next(err);
    }
});

// POST /api/ai/student/explain
router.post('/student/explain', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { topic, difficulty = 'intermediate', context } = req.body;
        const userId = req.user.id;

        const prompt = `Explain ${topic} at ${difficulty} level${context ? ` in the context of ${context}` : ''}. Provide a clear, structured explanation with examples.`;

        let explanation;
        try {
            explanation = await askGroq(prompt, context || '');
        } catch (groqError) {
            try {
                explanation = await askGemini(prompt, context || '');
            } catch (geminiError) {
                explanation = `I apologize, but I'm having trouble generating an explanation for "${topic}" right now. Please try again later.`;
            }
        }

        res.json({ explanation });
    } catch (err) {
        next(err);
    }
});

// POST /api/ai/student/generate-quiz
router.post('/student/generate-quiz', authenticate, authorize('student'), async (req, res, next) => {
    try {
        const { topic, question_count = 5, context } = req.body;
        const userId = req.user.id;

        const prompt = `Generate ${question_count} multiple choice questions about ${topic}${context ? ` in the context of ${context}` : ''}. For each question, provide:
1. The question
2. 4 options (A, B, C, D)
3. The correct answer
4. A brief explanation

Format as JSON array.`;

        let quiz_content;
        try {
            quiz_content = await askGroq(prompt, context || '');
        } catch (groqError) {
            try {
                quiz_content = await askGemini(prompt, context || '');
            } catch (geminiError) {
                quiz_content = `I apologize, but I'm having trouble generating a quiz for "${topic}" right now. Please try again later.`;
            }
        }

        res.json({ quiz_content });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

