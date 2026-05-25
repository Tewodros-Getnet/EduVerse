const { query } = require('./src/db');

async function fixAssessmentResultsTable() {
    try {
        console.log('Adding missing feedback column to assessment_results table...');
        
        // Add feedback column to assessment_results table
        await query(`
            ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS feedback TEXT
        `);

        console.log('Assessment results table fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing assessment results table:', error);
        process.exit(1);
    }
}

fixAssessmentResultsTable();
