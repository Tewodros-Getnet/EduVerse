const { query } = require('../db');

async function checkAssessmentsConstraint() {
    try {
        console.log('Checking assessments table constraints...');

        // Get the constraint details
        const constraintCheck = await query(`
            SELECT conname, conkey 
            FROM pg_constraint 
            WHERE conrelid = 'assessments'::regclass AND contype = 'c'
        `);

        console.log('Constraints found:', constraintCheck.rows);

        // Get table structure
        const tableInfo = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'assessments'
            ORDER BY ordinal_position
        `);

        console.log('Table structure:', tableInfo.rows);

    } catch (error) {
        console.error('Error checking constraints:', error);
    }
}

// Run the check
checkAssessmentsConstraint().then(() => {
    console.log('Constraint check completed');
    process.exit(0);
}).catch(error => {
    console.error('Constraint check failed:', error);
    process.exit(1);
});
