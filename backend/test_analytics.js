const { query } = require('./src/db');

async function testAnalytics() {
    try {
        const result = await query('SELECT created_by FROM assignments WHERE id = $1', ['c08d4269-0930-4219-b5da-9fcbcbdbed07']);
        console.log('Assignment check:', result.rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testAnalytics();
