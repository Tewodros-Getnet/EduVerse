const { query } = require('./src/db');

async function createTables() {
    try {
        console.log('Creating assignments table...');
        await query(`
            CREATE TABLE IF NOT EXISTS assignments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                due_date TIMESTAMP,
                max_points INTEGER DEFAULT 100,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('Creating assignment_submissions table...');
        await query(`
            CREATE TABLE IF NOT EXISTS assignment_submissions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                content TEXT,
                file_url TEXT,
                score INTEGER,
                submitted_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(assignment_id, user_id)
            )
        `);

        console.log('Creating assessments table...');
        await query(`
            CREATE TABLE IF NOT EXISTS assessments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                description TEXT,
                type VARCHAR(50) CHECK (type IN ('quiz', 'exam', 'assignment')),
                scheduled_date TIMESTAMP,
                duration_minutes INTEGER,
                total_points INTEGER DEFAULT 100,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('Creating assessment_results table...');
        await query(`
            CREATE TABLE IF NOT EXISTS assessment_results (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                score INTEGER,
                remarks TEXT,
                feedback TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(assessment_id, student_id)
            )
        `);

        console.log('Adding read_at column to notifications if missing...');
        await query(`
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP
        `);

        console.log('All tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating tables:', error);
        process.exit(1);
    }
}

createTables();
