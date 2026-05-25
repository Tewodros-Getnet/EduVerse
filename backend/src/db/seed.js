require('dotenv').config();
const { pool } = require('./index');

async function seed() {
    const client = await pool.connect();
    try {
        console.log('Seeding demo data...\n');

        // Get existing users
        const users = await client.query('SELECT id, email, role FROM users');
        const instructor = users.rows.find(u => u.email === 'instructor@eduverse.com');
        const student = users.rows.find(u => u.email === 'student@eduverse.com');

        if (!instructor || !student) {
            console.error('Run migrations first: admin@eduverse.com, instructor@eduverse.com, student@eduverse.com must exist');
            process.exit(1);
        }

        // Extra students
        const bcrypt = require('bcryptjs');
        const extraStudents = [
            { name: 'Maria Garcia', email: 'maria@example.com' },
            { name: 'James Liu', email: 'james@example.com' },
            { name: 'Priya Patel', email: 'priya@example.com' },
            { name: 'Tom Wilson', email: 'tom@example.com' },
        ];
        const studentIds = [student.id];
        for (const s of extraStudents) {
            const ex = await client.query('SELECT id FROM users WHERE email=$1', [s.email]);
            if (!ex.rows.length) {
                const hash = await bcrypt.hash('Student@123', 10);
                const r = await client.query(
                    `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'student') RETURNING id`,
                    [s.name, s.email, hash]
                );
                studentIds.push(r.rows[0].id);
                console.log(`  + student: ${s.email}`);
            } else {
                studentIds.push(ex.rows[0].id);
            }
        }

        // Courses
        const courseData = [
            { title: 'Advanced Machine Learning', description: 'Deep dive into ML algorithms, neural networks, and practical applications.', difficulty_level: 'advanced', category: 'Machine Learning', status: 'published', price: 99.99 },
            { title: 'Deep Learning Fundamentals', description: 'CNN, RNN, transformers and modern deep learning architectures.', difficulty_level: 'intermediate', category: 'Deep Learning', status: 'published', price: 79.99 },
            { title: 'NLP Basics', description: 'Natural Language Processing from tokenization to transformers.', difficulty_level: 'beginner', category: 'NLP', status: 'published', price: 49.99 },
            { title: 'Python for Data Science', description: 'Pandas, NumPy, Matplotlib and data analysis workflows.', difficulty_level: 'beginner', category: 'Data Science', status: 'draft', price: 39.99 },
        ];

        const courseIds = [];
        for (const c of courseData) {
            const ex = await client.query('SELECT id FROM courses WHERE title=$1 AND instructor_id=$2', [c.title, instructor.id]);
            if (!ex.rows.length) {
                const r = await client.query(
                    `INSERT INTO courses (instructor_id,title,description,difficulty_level,category,status,price)
                     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
                    [instructor.id, c.title, c.description, c.difficulty_level, c.category, c.status, c.price]
                );
                courseIds.push(r.rows[0].id);
                console.log(`  + course: ${c.title}`);
            } else {
                courseIds.push(ex.rows[0].id);
            }
        }

        // Lessons for first 3 courses
        const lessonSets = [
            [
                { title: 'Introduction to ML', text_content: 'Machine learning is a subset of AI that enables systems to learn from data.', duration_minutes: 15 },
                { title: 'Supervised Learning', text_content: 'Supervised learning uses labeled training data to learn a mapping function.', duration_minutes: 20 },
                { title: 'Neural Networks Basics', text_content: 'Neural networks are computing systems inspired by biological neural networks.', duration_minutes: 25 },
                { title: 'Backpropagation', text_content: 'Backpropagation is the algorithm used to train neural networks.', duration_minutes: 30 },
            ],
            [
                { title: 'What is Deep Learning?', text_content: 'Deep learning uses multiple layers to progressively extract higher-level features.', duration_minutes: 15 },
                { title: 'Convolutional Neural Networks', text_content: 'CNNs are specialized for processing grid-like data such as images.', duration_minutes: 25 },
                { title: 'Recurrent Neural Networks', text_content: 'RNNs are designed to work with sequential data.', duration_minutes: 20 },
            ],
            [
                { title: 'Text Preprocessing', text_content: 'Tokenization, stemming, lemmatization and stop word removal.', duration_minutes: 15 },
                { title: 'Word Embeddings', text_content: 'Word2Vec, GloVe and contextual embeddings.', duration_minutes: 20 },
                { title: 'Sentiment Analysis', text_content: 'Classifying text as positive, negative or neutral.', duration_minutes: 20 },
            ],
        ];

        const lessonIdsByCourse = {};
        for (let i = 0; i < 3; i++) {
            lessonIdsByCourse[courseIds[i]] = [];
            for (let j = 0; j < lessonSets[i].length; j++) {
                const l = lessonSets[i][j];
                const ex = await client.query('SELECT id FROM lessons WHERE course_id=$1 AND title=$2', [courseIds[i], l.title]);
                if (!ex.rows.length) {
                    const r = await client.query(
                        `INSERT INTO lessons (course_id,title,text_content,content_type,order_index,duration_minutes)
                         VALUES ($1,$2,$3,'text',$4,$5) RETURNING id`,
                        [courseIds[i], l.title, l.text_content, j + 1, l.duration_minutes]
                    );
                    lessonIdsByCourse[courseIds[i]].push(r.rows[0].id);
                } else {
                    lessonIdsByCourse[courseIds[i]].push(ex.rows[0].id);
                }
            }
            console.log(`  + ${lessonSets[i].length} lessons for course ${i + 1}`);
        }

        // Enrollments with progress
        const enrollments = [
            { studentIdx: 0, courseIdx: 0, progress: 65 },
            { studentIdx: 0, courseIdx: 1, progress: 30 },
            { studentIdx: 1, courseIdx: 0, progress: 100 },
            { studentIdx: 1, courseIdx: 2, progress: 80 },
            { studentIdx: 2, courseIdx: 0, progress: 45 },
            { studentIdx: 2, courseIdx: 1, progress: 90 },
            { studentIdx: 3, courseIdx: 2, progress: 20 },
            { studentIdx: 4, courseIdx: 0, progress: 55 },
            { studentIdx: 4, courseIdx: 1, progress: 70 },
        ];

        for (const e of enrollments) {
            await client.query(
                `INSERT INTO enrollments (student_id,course_id,progress_percent)
                 VALUES ($1,$2,$3) ON CONFLICT (student_id,course_id) DO UPDATE SET progress_percent=$3`,
                [studentIds[e.studentIdx], courseIds[e.courseIdx], e.progress]
            );
        }
        console.log(`  + ${enrollments.length} enrollments`);

        // Lesson progress for student 0 in course 0
        const s0c0Lessons = lessonIdsByCourse[courseIds[0]] || [];
        for (let i = 0; i < Math.ceil(s0c0Lessons.length * 0.65); i++) {
            await client.query(
                `INSERT INTO lesson_progress (student_id,lesson_id,completed,completed_at)
                 VALUES ($1,$2,true,NOW() - INTERVAL '${i} days')
                 ON CONFLICT (student_id,lesson_id) DO NOTHING`,
                [studentIds[0], s0c0Lessons[i]]
            );
        }
        console.log('  + lesson progress');

        // Quizzes
        const quizData = [
            { courseIdx: 0, title: 'ML Fundamentals Quiz', passing_score: 70 },
            { courseIdx: 1, title: 'Deep Learning Quiz', passing_score: 65 },
            { courseIdx: 2, title: 'NLP Basics Quiz', passing_score: 60 },
        ];

        const quizIds = [];
        for (const q of quizData) {
            const ex = await client.query('SELECT id FROM quizzes WHERE course_id=$1 AND title=$2', [courseIds[q.courseIdx], q.title]);
            if (!ex.rows.length) {
                const r = await client.query(
                    `INSERT INTO quizzes (course_id,title,time_limit_minutes,max_attempts,passing_score)
                     VALUES ($1,$2,30,3,$3) RETURNING id`,
                    [courseIds[q.courseIdx], q.title, q.passing_score]
                );
                quizIds.push(r.rows[0].id);

                // Add questions
                const questions = [
                    { question: 'What is supervised learning?', type: 'mcq', options: JSON.stringify(['Learning with labels', 'Learning without labels', 'Reinforcement learning', 'Transfer learning']), answer: 'Learning with labels', points: 2 },
                    { question: 'Neural networks are inspired by the human brain.', type: 'true_false', options: JSON.stringify(['True', 'False']), answer: 'True', points: 1 },
                    { question: 'What does CNN stand for?', type: 'mcq', options: JSON.stringify(['Convolutional Neural Network', 'Connected Neural Node', 'Computed Neuron Network', 'Cascaded Neural Net']), answer: 'Convolutional Neural Network', points: 2 },
                ];
                for (const qq of questions) {
                    await client.query(
                        `INSERT INTO quiz_questions (quiz_id,question,question_type,options,correct_answer,points)
                         VALUES ($1,$2,$3,$4,$5,$6)`,
                        [r.rows[0].id, qq.question, qq.type, qq.options, qq.answer, qq.points]
                    );
                }
            } else {
                quizIds.push(ex.rows[0].id);
            }
        }
        console.log(`  + ${quizData.length} quizzes with questions`);

        // Quiz attempts
        const attempts = [
            { studentIdx: 0, quizIdx: 0, score: 85 },
            { studentIdx: 0, quizIdx: 1, score: 72 },
            { studentIdx: 1, quizIdx: 0, score: 95 },
            { studentIdx: 2, quizIdx: 0, score: 60 },
            { studentIdx: 2, quizIdx: 2, score: 88 },
            { studentIdx: 3, quizIdx: 1, score: 78 },
        ];
        for (const a of attempts) {
            await client.query(
                `INSERT INTO quiz_attempts (student_id,quiz_id,score,answers)
                 VALUES ($1,$2,$3,$4)`,
                [studentIds[a.studentIdx], quizIds[a.quizIdx], a.score, JSON.stringify({})]
            );
        }
        console.log(`  + ${attempts.length} quiz attempts`);

        // Live session
        const lsEx = await client.query('SELECT id FROM live_sessions WHERE title=$1', ['Neural Networks Deep Dive']);
        if (!lsEx.rows.length) {
            await client.query(
                `INSERT INTO live_sessions (course_id,title,description,scheduled_at,duration_minutes,status)
                 VALUES ($1,$2,$3,NOW() + INTERVAL '2 days',60,'scheduled')`,
                [courseIds[0], 'Neural Networks Deep Dive', 'Live walkthrough of backpropagation and gradient descent']
            );
            console.log('  + live session');
        }

        // Badges
        await client.query(
            `INSERT INTO badges (student_id,badge_type) VALUES ($1,'fast_learner') ON CONFLICT DO NOTHING`,
            [studentIds[0]]
        );
        await client.query(
            `INSERT INTO badges (student_id,badge_type) VALUES ($1,'quiz_master') ON CONFLICT DO NOTHING`,
            [studentIds[1]]
        );
        console.log('  + badges');

        // Knowledge trace
        const concepts = ['supervised_learning', 'neural_networks', 'backpropagation'];
        for (const concept of concepts) {
            await client.query(
                `INSERT INTO knowledge_trace (student_id,course_id,concept,mastery_score)
                 VALUES ($1,$2,$3,$4) ON CONFLICT (student_id,course_id,concept) DO UPDATE SET mastery_score=$4`,
                [studentIds[0], courseIds[0], concept, Math.random() * 0.5 + 0.4]
            );
        }
        console.log('  + knowledge trace');

        // Audit log entry
        await client.query(
            `INSERT INTO audit_logs (action,resource,details) VALUES ('SYSTEM_SEED','database','{"note":"demo data seeded"}')`
        );

        console.log('\n✅ Seed complete!');
    } catch (err) {
        console.error('Seed error:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
