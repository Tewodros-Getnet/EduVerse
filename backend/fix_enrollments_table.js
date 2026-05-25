const { query } = require('./src/db');

async function fixEnrollmentsTable() {
    try {
        console.log('Adding missing columns to enrollments table...');
        await query(`
            ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
        `);
        await query(`
            ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0
        `);

        console.log('Enrollments table fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing enrollments table:', error);
        process.exit(1);
    }
}

fixEnrollmentsTable();
