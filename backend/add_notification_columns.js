/**
 * Migration: Add action_url, action_text, and read_at columns to notifications table
 * Run on Render: node add_notification_columns.js
 * Or locally: node backend/add_notification_columns.js
 */

require('dotenv').config();
const { query } = require('./src/db');

async function addNotificationColumns() {
    try {
        console.log('🔧 Migrating notifications table...');

        // Check if columns already exist
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name IN ('action_url', 'action_text', 'read_at');
        `;
        
        const existing = await query(checkQuery);
        const existingColumns = existing.rows.map(r => r.column_name);

        console.log('📋 Existing columns:', existingColumns);

        let changes = 0;

        // Add read_at column if missing
        if (!existingColumns.includes('read_at')) {
            await query(`ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP;`);
            console.log('✅ Added read_at column');
            changes++;
        }

        // Add action_url column if missing
        if (!existingColumns.includes('action_url')) {
            await query(`ALTER TABLE notifications ADD COLUMN action_url TEXT;`);
            console.log('✅ Added action_url column');
            changes++;
        }

        // Add action_text column if missing
        if (!existingColumns.includes('action_text')) {
            await query(`ALTER TABLE notifications ADD COLUMN action_text VARCHAR(255);`);
            console.log('✅ Added action_text column');
            changes++;
        }

        if (changes === 0) {
            console.log('✅ All columns already exist. Nothing to do.');
        } else {
            console.log(`✅ Migration completed! ${changes} column(s) added.`);
        }

        // Show current schema
        const schemaQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            ORDER BY ordinal_position;
        `;
        const schema = await query(schemaQuery);
        console.log('\n📊 Current notifications table schema:');
        console.table(schema.rows);

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addNotificationColumns();
