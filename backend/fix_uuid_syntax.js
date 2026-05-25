const { query } = require('./src/db');

async function fixUUIDSyntax() {
    try {
        console.log('Fixing UUID syntax issues in database queries...');
        
        // Fix the assignments table - remove invalid UUID syntax
        await query(`
            ALTER TABLE assignments ALTER COLUMN id TYPE uuid USING uuid_generate_v4()
        `);
        
        // Fix the assessment_results table - remove invalid UUID syntax  
        await query(`
            ALTER TABLE assessment_results ALTER COLUMN id TYPE uuid USING uuid_generate_v4()
        `);
        
        // Fix the assignment_submissions table - remove invalid UUID syntax
        await query(`
            ALTER TABLE assignment_submissions ALTER COLUMN id TYPE uuid USING uuid_generate_v4()
        `);
        
        // Fix the assessments table - remove invalid UUID syntax
        await query(`
            ALTER TABLE assessments ALTER COLUMN id TYPE uuid USING uuid_generate_v4()
        `);

        console.log('UUID syntax issues fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing UUID syntax:', error);
        process.exit(1);
    }
}

fixUUIDSyntax();
