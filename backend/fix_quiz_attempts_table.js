const { query } = require('./src/db');

async function fixQuizAttemptsTable() {
    try {
        console.log('Adding missing columns to quiz_attempts table...');
        await query(`
            ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP DEFAULT NOW()
        `);

        console.log('Quiz attempts table fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing quiz attempts table:', error);
        process.exit(1);
    }
}

fixQuizAttemptsTable();
