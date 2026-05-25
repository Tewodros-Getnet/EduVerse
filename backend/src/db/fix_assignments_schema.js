const { query } = require('../db');

async function fixAssignmentsSchema() {
    try {
        console.log('Checking assignments table schema...');
        
        // Check if max_points column exists
        const maxPointsCheck = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'assignments' AND column_name = 'max_points'
        `);
        
        if (maxPointsCheck.rows.length === 0) {
            console.log('Adding max_points column to assignments table...');
            await query(`
                ALTER TABLE assignments 
                ADD COLUMN max_points INTEGER DEFAULT 100
            `);
            console.log('max_points column added successfully');
        } else {
            console.log('max_points column already exists');
        }
        
        // Check if total_points column exists in assessments (for assessments route error)
        const totalPointsCheck = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'assessments' AND column_name = 'total_points'
        `);
        
        if (totalPointsCheck.rows.length === 0) {
            console.log('Adding total_points column to assessments table...');
            await query(`
                ALTER TABLE assessments 
                ADD COLUMN total_points INTEGER DEFAULT 100
            `);
            console.log('total_points column added successfully');
        } else {
            console.log('total_points column already exists');
        }
        
        console.log('Schema fix completed successfully');
        
    } catch (error) {
        console.error('Error fixing schema:', error);
    }
}

// Run the fix
fixAssignmentsSchema().then(() => {
    console.log('Schema fix script completed');
    process.exit(0);
}).catch(error => {
    console.error('Schema fix failed:', error);
    process.exit(1);
});
