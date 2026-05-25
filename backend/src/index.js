const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const aiRoutes = require('./routes/ai');
const quizRoutes = require('./routes/quiz');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const recommendationRoutes = require('./routes/recommendations');
const liveRoutes = require('./routes/live');
const analyticsRoutes = require('./routes/analytics');
const lessonRoutes = require('./routes/lessons');
const assessmentRoutes = require('./routes/assessments');
const assignmentRoutes = require('./routes/assignments');
const notificationRoutes = require('./routes/notifications');
const messagesRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const securityRoutes = require('./routes/security');
const studentRoutes = require('./routes/students');
const { setupSocketHandlers } = require('./socket/handlers');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { migrate } = require('./db/migrate');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: [
            process.env.STUDENT_FRONTEND_URL || 'http://localhost:3000',
            process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001',
            process.env.INSTRUCTOR_FRONTEND_URL || 'http://localhost:3002',
            'http://localhost:3003',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
    origin: [
        process.env.STUDENT_FRONTEND_URL || 'http://localhost:3000',
        process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001',
        process.env.INSTRUCTOR_FRONTEND_URL || 'http://localhost:3002',
        'http://localhost:3003',
    ],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/students', studentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// One-time seed endpoint
app.post('/setup/seed', async (req, res) => {
    try {
        const { pool } = require('./db');
        const bcrypt = require('bcryptjs');
        const log = [];

        const users = await pool.query('SELECT id, email, role FROM users');
        const instructor = users.rows.find(u => u.email === 'instructor@eduverse.com');
        const student = users.rows.find(u => u.email === 'student@eduverse.com');
        if (!instructor || !student) return res.status(400).json({ error: 'Run migration first' });

        // Extra students
        const extraStudents = [
            { name: 'Maria Garcia', email: 'maria@example.com' },
            { name: 'James Liu', email: 'james@example.com' },
            { name: 'Priya Patel', email: 'priya@example.com' },
            { name: 'Tom Wilson', email: 'tom@example.com' },
        ];
        const studentIds = [student.id];
        for (const s of extraStudents) {
            const ex = await pool.query('SELECT id FROM users WHERE email=$1', [s.email]);
            if (!ex.rows.length) {
                const hash = await bcrypt.hash('Student@123', 10);
                const r = await pool.query(`INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'student') RETURNING id`, [s.name, s.email, hash]);
                studentIds.push(r.rows[0].id);
            } else { studentIds.push(ex.rows[0].id); }
        }
        log.push(`${studentIds.length} students ready`);

        // Courses
        const courseData = [
            { title: 'Advanced Machine Learning', description: 'Deep dive into ML algorithms, neural networks, and practical applications.', difficulty_level: 'advanced', category: 'Machine Learning', status: 'published', price: 99.99 },
            { title: 'Deep Learning Fundamentals', description: 'CNN, RNN, transformers and modern deep learning architectures.', difficulty_level: 'intermediate', category: 'Deep Learning', status: 'published', price: 79.99 },
            { title: 'NLP Basics', description: 'Natural Language Processing from tokenization to transformers.', difficulty_level: 'beginner', category: 'NLP', status: 'published', price: 49.99 },
            { title: 'Python for Data Science', description: 'Pandas, NumPy, Matplotlib and data analysis workflows.', difficulty_level: 'beginner', category: 'Data Science', status: 'draft', price: 39.99 },
        ];
        const courseIds = [];
        for (const c of courseData) {
            const ex = await pool.query('SELECT id FROM courses WHERE title=$1 AND instructor_id=$2', [c.title, instructor.id]);
            if (!ex.rows.length) {
                const r = await pool.query(`INSERT INTO courses (instructor_id,title,description,difficulty_level,category,status,price) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [instructor.id, c.title, c.description, c.difficulty_level, c.category, c.status, c.price]);
                courseIds.push(r.rows[0].id);
            } else { courseIds.push(ex.rows[0].id); }
        }
        log.push(`${courseIds.length} courses ready`);

        // Lessons
        const lessonSets = [
            [{ title: 'Introduction to ML', text_content: 'Machine learning is a subset of AI that enables systems to learn from data.', duration_minutes: 15 }, { title: 'Supervised Learning', text_content: 'Supervised learning uses labeled training data to learn a mapping function.', duration_minutes: 20 }, { title: 'Neural Networks Basics', text_content: 'Neural networks are computing systems inspired by biological neural networks.', duration_minutes: 25 }, { title: 'Backpropagation', text_content: 'Backpropagation is the algorithm used to train neural networks.', duration_minutes: 30 }],
            [{ title: 'What is Deep Learning?', text_content: 'Deep learning uses multiple layers to progressively extract higher-level features.', duration_minutes: 15 }, { title: 'Convolutional Neural Networks', text_content: 'CNNs are specialized for processing grid-like data such as images.', duration_minutes: 25 }, { title: 'Recurrent Neural Networks', text_content: 'RNNs are designed to work with sequential data.', duration_minutes: 20 }],
            [{ title: 'Text Preprocessing', text_content: 'Tokenization, stemming, lemmatization and stop word removal.', duration_minutes: 15 }, { title: 'Word Embeddings', text_content: 'Word2Vec, GloVe and contextual embeddings.', duration_minutes: 20 }, { title: 'Sentiment Analysis', text_content: 'Classifying text as positive, negative or neutral.', duration_minutes: 20 }],
        ];
        const lessonIdsByCourse = {};
        for (let i = 0; i < 3; i++) {
            lessonIdsByCourse[courseIds[i]] = [];
            for (let j = 0; j < lessonSets[i].length; j++) {
                const l = lessonSets[i][j];
                const ex = await pool.query('SELECT id FROM lessons WHERE course_id=$1 AND title=$2', [courseIds[i], l.title]);
                if (!ex.rows.length) {
                    const r = await pool.query(`INSERT INTO lessons (course_id,title,text_content,content_type,order_index,duration_minutes) VALUES ($1,$2,$3,'text',$4,$5) RETURNING id`, [courseIds[i], l.title, l.text_content, j + 1, l.duration_minutes]);
                    lessonIdsByCourse[courseIds[i]].push(r.rows[0].id);
                } else { lessonIdsByCourse[courseIds[i]].push(ex.rows[0].id); }
            }
        }
        log.push('lessons ready');

        // Enrollments
        const enrollments = [
            [0, 0, 65], [0, 1, 30], [1, 0, 100], [1, 2, 80],
            [2, 0, 45], [2, 1, 90], [3, 2, 20], [4, 0, 55], [4, 1, 70],
        ];
        for (const [si, ci, prog] of enrollments) {
            await pool.query(`INSERT INTO enrollments (student_id,course_id,progress_percent) VALUES ($1,$2,$3) ON CONFLICT (student_id,course_id) DO UPDATE SET progress_percent=$3`, [studentIds[si], courseIds[ci], prog]);
        }
        log.push(`${enrollments.length} enrollments`);

        // Lesson progress
        const s0lessons = lessonIdsByCourse[courseIds[0]] || [];
        for (let i = 0; i < Math.ceil(s0lessons.length * 0.65); i++) {
            await pool.query(`INSERT INTO lesson_progress (student_id,lesson_id,completed,completed_at) VALUES ($1,$2,true,NOW()-INTERVAL '${i} days') ON CONFLICT DO NOTHING`, [studentIds[0], s0lessons[i]]);
        }
        log.push('lesson progress');

        // Quizzes
        const quizDefs = [
            { ci: 0, title: 'ML Fundamentals Quiz' }, { ci: 1, title: 'Deep Learning Quiz' }, { ci: 2, title: 'NLP Basics Quiz' },
        ];
        const quizIds = [];
        for (const q of quizDefs) {
            const ex = await pool.query('SELECT id FROM quizzes WHERE course_id=$1 AND title=$2', [courseIds[q.ci], q.title]);
            if (!ex.rows.length) {
                const r = await pool.query(`INSERT INTO quizzes (course_id,title,time_limit_minutes,max_attempts,passing_score) VALUES ($1,$2,30,3,70) RETURNING id`, [courseIds[q.ci], q.title]);
                quizIds.push(r.rows[0].id);
                const qs = [
                    { q: 'What is supervised learning?', t: 'mcq', o: JSON.stringify(['Learning with labels', 'Learning without labels', 'Reinforcement learning', 'Transfer learning']), a: 'Learning with labels', p: 2 },
                    { q: 'Neural networks are inspired by the human brain.', t: 'true_false', o: JSON.stringify(['True', 'False']), a: 'True', p: 1 },
                    { q: 'What does CNN stand for?', t: 'mcq', o: JSON.stringify(['Convolutional Neural Network', 'Connected Neural Node', 'Computed Neuron Network', 'Cascaded Neural Net']), a: 'Convolutional Neural Network', p: 2 },
                ];
                for (const qq of qs) await pool.query(`INSERT INTO quiz_questions (quiz_id,question,question_type,options,correct_answer,points) VALUES ($1,$2,$3,$4,$5,$6)`, [r.rows[0].id, qq.q, qq.t, qq.o, qq.a, qq.p]);
            } else { quizIds.push(ex.rows[0].id); }
        }
        log.push(`${quizIds.length} quizzes`);

        // Quiz attempts
        const attempts = [[0, 0, 85], [0, 1, 72], [1, 0, 95], [2, 0, 60], [2, 2, 88], [3, 1, 78]];
        for (const [si, qi, score] of attempts) {
            await pool.query(`INSERT INTO quiz_attempts (student_id,quiz_id,score,answers) VALUES ($1,$2,$3,'{}')`, [studentIds[si], quizIds[qi], score]);
        }
        log.push(`${attempts.length} quiz attempts`);

        // Live session
        const lsEx = await pool.query(`SELECT id FROM live_sessions WHERE title='Neural Networks Deep Dive'`);
        if (!lsEx.rows.length) {
            await pool.query(`INSERT INTO live_sessions (course_id,title,description,scheduled_at,duration_minutes,status) VALUES ($1,'Neural Networks Deep Dive','Live walkthrough of backpropagation',NOW()+INTERVAL '2 days',60,'scheduled')`, [courseIds[0]]);
        }
        log.push('live session');

        // Badges
        await pool.query(`INSERT INTO badges (student_id,badge_type) VALUES ($1,'fast_learner') ON CONFLICT DO NOTHING`, [studentIds[0]]);
        await pool.query(`INSERT INTO badges (student_id,badge_type) VALUES ($1,'quiz_master') ON CONFLICT DO NOTHING`, [studentIds[1]]);
        log.push('badges');

        // Knowledge trace
        for (const concept of ['supervised_learning', 'neural_networks', 'backpropagation']) {
            await pool.query(`INSERT INTO knowledge_trace (student_id,course_id,concept,mastery_score) VALUES ($1,$2,$3,$4) ON CONFLICT (student_id,course_id,concept) DO UPDATE SET mastery_score=$4`, [studentIds[0], courseIds[0], concept, (Math.random() * 0.5 + 0.4).toFixed(2)]);
        }
        log.push('knowledge trace');

        res.json({ success: true, log });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Socket.io
setupSocketHandlers(io);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

(async () => {
    try {
        await migrate();
        console.log('Database migrations complete');
    } catch (err) {
        console.error('Failed to run database migrations', err);
        process.exit(1);
    }

    httpServer.listen(PORT, () => {
        console.log(`EduVerse backend running on port ${PORT}`);
    });
})();

module.exports = { app, io };
