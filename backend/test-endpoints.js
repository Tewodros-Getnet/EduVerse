require('dotenv').config();
const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({
            hostname: 'localhost', port: 5001, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(path, token) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 5001, path, method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log('=== EduVerse Endpoint Tests ===\n');

    // Test admin login
    let r = await post('/api/auth/login', { email: 'admin@eduverse.com', password: 'Admin@123', role: 'admin' });
    console.log(`Admin login: ${r.status} - ${r.status === 200 ? 'OK ✓' : 'FAIL ✗'}`);
    const adminToken = r.body.accessToken;

    // Test instructor login
    r = await post('/api/auth/login', { email: 'instructor@eduverse.com', password: 'Instructor@123' });
    console.log(`Instructor login: ${r.status} - ${r.status === 200 ? 'OK ✓' : 'FAIL ✗'}`);
    const instrToken = r.body.accessToken;

    // Test student login
    r = await post('/api/auth/login', { email: 'student@eduverse.com', password: 'Student@123' });
    console.log(`Student login: ${r.status} - ${r.status === 200 ? 'OK ✓' : 'FAIL ✗'}`);
    const stuToken = r.body.accessToken;

    // Test live sessions (was 500)
    r = await get('/api/live/sessions', instrToken);
    console.log(`GET /api/live/sessions: ${r.status} - ${r.status === 200 ? 'OK ✓' : 'FAIL ✗'}`);

    // Test analytics instructor dashboard (was 500)
    r = await get('/api/analytics/instructor/dashboard', instrToken);
    console.log(`GET /api/analytics/instructor/dashboard: ${r.status} - ${r.status === 200 ? 'OK ✓' : 'FAIL ✗'}`);

    // Test student analytics dashboard
    r = await get('/api/analytics/student/dashboard', stuToken);
    console.log(`GET /api/analytics/student/dashboard: ${r.status} - ${r.status === 200 ? 'OK ✓' : 'FAIL ✗'}`);

    // Test admin dashboard
    r = await get('/api/admin/dashboard', adminToken);
    console.log(`GET /api/admin/dashboard: ${r.status} - ${r.status === 200 ? 'OK ✓' : 'FAIL ✗'}`);

    // Test courses
    r = await get('/api/courses', stuToken);
    console.log(`GET /api/courses: ${r.status} - ${r.status === 200 ? 'OK ✓' : 'FAIL ✗'}`);

    // Test AI chat (was 400/500)
    r = await post('/api/ai/chat', { question: 'What is machine learning?' });
    // No token — should be 401
    console.log(`POST /api/ai/chat (no auth): ${r.status} - ${r.status === 401 ? 'OK ✓' : 'FAIL ✗'}`);

    console.log('\n=== Credentials Summary ===');
    console.log('Admin:      admin@eduverse.com / Admin@123       → http://localhost:3001');
    console.log('Instructor: instructor@eduverse.com / Instructor@123 → http://localhost:3000');
    console.log('Student:    student@eduverse.com / Student@123   → http://localhost:3000');
}

run().catch(console.error);
