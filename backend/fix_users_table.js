const { query } = require('./src/db');

async function fixUsersTable() {
    try {
        console.log('Checking and adding last_login_at column to users table...');
        await query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
        `);

        console.log('Users table fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing users table:', error);
        process.exit(1);
    }
}

fixUsersTable();
