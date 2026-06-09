require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Supabase closes idle connections — these settings prevent stale pool errors
    max: 10,
    idleTimeoutMillis: 30000,       // drop idle connections after 30s
    connectionTimeoutMillis: 10000, // fail fast if DB is unreachable
});

// Log unexpected pool errors so they don't crash the process silently
pool.on('error', (err) => {
    console.error('Unexpected pg pool error:', err.message);
});

const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 2000) {
            console.warn('Slow query detected', { text: text.slice(0, 80), duration });
        }
        return res;
    } catch (error) {
        console.error('Database query error', { text: text.slice(0, 80), error: error.message });
        throw error;
    }
};

module.exports = { query, pool };
