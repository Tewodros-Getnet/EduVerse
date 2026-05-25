const { query } = require('./src/db');

async function fixRemainingUUIDIssues() {
    try {
        console.log('Fixing remaining UUID syntax issues...');
        
        // Fix quiz_attempts table UUID syntax
        await query(`
            ALTER TABLE quiz_attempts ALTER COLUMN quiz_id TYPE uuid USING uuid_generate_v4()
        `);
        
        await query(`
            ALTER TABLE quiz_attempts ALTER COLUMN student_id TYPE uuid USING uuid_generate_v4()
        `);
        
        // Fix assignment_submissions table UUID syntax
        await query(`
            ALTER TABLE assignment_submissions ALTER COLUMN assignment_id TYPE uuid USING uuid_generate_v4()
        `);

        console.log('Remaining UUID syntax issues fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing remaining UUID syntax:', error);
        process.exit(1);
    }
}

fixRemainingUUIDIssues();
