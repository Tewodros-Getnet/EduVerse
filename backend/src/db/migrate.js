require('dotenv').config();
const { pool } = require('./index');
const bcrypt = require('bcryptjs');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running migrations...');

        // Add missing columns to existing tables
        await client.query(`
            ALTER TABLE lessons 
            ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'text',
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        `);
        console.log('✓ lessons columns');

        await client.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS link TEXT
        `);
        console.log('✓ notifications.link');

        await client.query(`
            ALTER TABLE notifications
            ADD COLUMN IF NOT EXISTS read_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
            ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP
        `);
        console.log('✓ notifications extra columns');

        await client.query(`
            ALTER TABLE courses 
            ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0
        `);
        console.log('✓ courses.price');

        await client.query(`
            ALTER TABLE courses
            ADD COLUMN IF NOT EXISTS published_at TIMESTAMP
        `);
        console.log('✓ courses.published_at');

        // Create live_sessions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS live_sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                scheduled_at TIMESTAMP NOT NULL,
                duration_minutes INTEGER,
                meeting_url TEXT,
                status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ live_sessions table');

        await client.query(`
            ALTER TABLE live_sessions
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP
        `);
        console.log('✓ live_sessions started_at/ended_at');

        // Create session_attendance table
        await client.query(`
            CREATE TABLE IF NOT EXISTS session_attendance (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                joined_at TIMESTAMP DEFAULT NOW(),
                left_at TIMESTAMP,
                UNIQUE(session_id, student_id)
            )
        `);
        console.log('✓ session_attendance table');

        // Create lesson_progress table
        await client.query(`
            CREATE TABLE IF NOT EXISTS lesson_progress (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
                completed BOOLEAN DEFAULT false,
                completed_at TIMESTAMP,
                UNIQUE(student_id, lesson_id)
            )
        `);
        console.log('✓ lesson_progress table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS session_recordings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
                recording_url TEXT NOT NULL,
                duration_minutes INTEGER,
                title VARCHAR(500),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ session_recordings table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS session_chat (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                user_name VARCHAR(255),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ session_chat table');

        // Create assignments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                due_date TIMESTAMP NOT NULL,
                total_points INTEGER DEFAULT 100,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ assignments table');

        // Create assignment_submissions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS assignment_submissions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                submission_text TEXT,
                file_url TEXT,
                score INTEGER,
                feedback TEXT,
                submitted_at TIMESTAMP DEFAULT NOW(),
                graded_at TIMESTAMP,
                graded_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(assignment_id, student_id)
            )
        `);
        console.log('✓ assignment_submissions table');

        // Create enrollments table
        await client.query(`
            CREATE TABLE IF NOT EXISTS enrollments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                progress_percent INTEGER DEFAULT 0,
                enrolled_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(student_id, course_id)
            )
        `);
        console.log('✓ enrollments table');

        // Create course_notes table
        await client.query(`
            CREATE TABLE IF NOT EXISTS course_notes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                instructor_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                content TEXT NOT NULL,
                is_public BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ course_notes table');

        // Create assessments table (mid-term, final, practical, etc.)
        await client.query(`
            CREATE TABLE IF NOT EXISTS assessments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                type VARCHAR(50) NOT NULL CHECK (type IN ('midterm', 'final', 'practical', 'project')),
                scheduled_date TIMESTAMP NOT NULL,
                duration_minutes INTEGER DEFAULT 120,
                description TEXT,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ assessments table');

        // Create assessment_results table
        await client.query(`
            CREATE TABLE IF NOT EXISTS assessment_results (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                score DECIMAL(5,2),
                remarks TEXT,
                graded_by UUID REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(assessment_id, student_id)
            )
        `);
        console.log('✓ assessment_results table');

        // Create chat_history table for AI tutor
        await client.query(`
            CREATE TABLE IF NOT EXISTS chat_history (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                ai_source VARCHAR(50) DEFAULT 'demo',
                response_time_ms INTEGER,
                helpful_flag BOOLEAN,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ chat_history table');

        // Add indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_course_notes_course ON course_notes(course_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_assessments_course ON assessments(course_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_assessment_results_student ON assessment_results(student_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_history_student ON chat_history(student_id)`);
        console.log('✓ indexes');

        // Security tables for SecurityManager
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                ip_address VARCHAR(50),
                user_agent TEXT,
                last_activity TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ user_sessions table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(255) NOT NULL,
                details TEXT,
                level VARCHAR(20) DEFAULT 'info',
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ activity_logs table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS security_events (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                event_type VARCHAR(100) NOT NULL,
                description TEXT,
                severity VARCHAR(20) DEFAULT 'low',
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ security_events table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(`
            INSERT INTO roles (name) VALUES ('admin'), ('instructor'), ('student')
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✓ roles table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
                resource VARCHAR(100) NOT NULL,
                action VARCHAR(50) NOT NULL,
                granted BOOLEAN DEFAULT true,
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(role_id, resource, action)
            )
        `);
        console.log('✓ role_permissions table');

        // Add missing columns to users table for security features
        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS lock_reason TEXT,
            ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
        `);
        console.log('✓ users security columns');

        // Ensure quizzes has publish fields and timestamps needed by routes
        await client.query(`
            ALTER TABLE quizzes
            ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 70,
            ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
            ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER
        `);
        console.log('✓ quizzes publish columns and defaults');

        // Ensure quiz_attempts has started_at for analytics
        await client.query(`
            ALTER TABLE quiz_attempts
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMP
        `);
        console.log('✓ quiz_attempts.started_at');

        // Seed admin user
        const adminEmail = 'admin@eduverse.com';
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        if (!existing.rows.length) {
            const hash = await bcrypt.hash('Admin@123', 12);
            await client.query(
                `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
                ['EduVerse Admin', adminEmail, hash]
            );
            console.log('✓ admin user created: admin@eduverse.com / Admin@123');
        } else {
            console.log('✓ admin user already exists: admin@eduverse.com / Admin@123');
        }

        // Seed demo instructor
        const instrEmail = 'instructor@eduverse.com';
        const instrExists = await client.query('SELECT id FROM users WHERE email = $1', [instrEmail]);
        if (!instrExists.rows.length) {
            const hash = await bcrypt.hash('Instructor@123', 12);
            await client.query(
                `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'instructor')`,
                ['Dr. Sarah Chen', instrEmail, hash]
            );
            console.log('✓ instructor created: instructor@eduverse.com / Instructor@123');
        } else {
            console.log('✓ instructor already exists');
        }

        // Seed demo student
        const stuEmail = 'student@eduverse.com';
        const stuExists = await client.query('SELECT id FROM users WHERE email = $1', [stuEmail]);
        if (!stuExists.rows.length) {
            const hash = await bcrypt.hash('Student@123', 12);
            await client.query(
                `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student')`,
                ['Alex Johnson', stuEmail, hash]
            );
            console.log('✓ student created: student@eduverse.com / Student@123');
        } else {
            console.log('✓ student already exists');
        }

        console.log('\nAll migrations complete!');
    } catch (err) {
        console.error('Migration error:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    migrate()
        .then(() => pool.end())
        .catch(async (err) => {
            console.error('Migration error:', err.message);
            try { await pool.end(); } catch (_) {}
            process.exit(1);
        });
}

module.exports = { migrate };
