/**
 * Migration: Add action_url and action_text columns to notifications table
 * Run: node add_notification_columns.js
 */

require('dotenv').config();
const { query } = require('./src/db');

async function addNotificationColumns() {
    try {
        console.log('🔧 Adding action_url and action_text columns to notifications table...');

        // Check if columns already exist
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name IN ('action_url', 'action_text');
        `;
        
        const existing = await query(checkQuery);
        const existingColumns = existing.rows.map(r => r.column_name);

        if (existingColumns.includes('action_url') && existingColumns.includes('action_text')) {
            console.log('✅ Columns already exist. Nothing to do.');
            process.exit(0);
        }

        // Add action_url column if missing
        if (!existingColumns.includes('action_url')) {
            await query(`
                ALTER TABLE notifications 
                ADD COLUMN action_url TEXT;
            `);
            console.log('✅ Added action_url column');
        }

        // Add action_text column if missing
        if (!existingColumns.includes('action_text')) {
            await query(`
                ALTER TABLE notifications 
                ADD COLUMN action_text TEXT;
            `);
            console.log('✅ Added action_text column');
        }

        console.log('✅ Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addNotificationColumns();
