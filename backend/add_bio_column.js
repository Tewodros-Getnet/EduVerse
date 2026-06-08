/**
 * Migration: add bio column to users table
 * Run once: node add_bio_column.js
 */
require('dotenv').config();
const { query } = require('./src/db');

async function migrate() {
    try {
        await query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS bio TEXT;
        `);
        console.log('✅  bio column added to users table (or already existed)');
        process.exit(0);
    } catch (err) {
        console.error('❌  Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
