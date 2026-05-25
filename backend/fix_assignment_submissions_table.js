const { query } = require('./src/db');

async function fixAssignmentSubmissionsTable() {
    try {
        console.log('Adding missing columns to assignment_submissions table...');
        await query(`
            ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE
        `);

        console.log('Assignment submissions table fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing assignment submissions table:', error);
        process.exit(1);
    }
}

fixAssignmentSubmissionsTable();
