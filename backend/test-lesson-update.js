require('dotenv').config();
const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port: 5001, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function put(path, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port: 5001, path, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    try {
        console.log('Logging in as instructor...');
        let r = await post('/api/auth/login', { email: 'instructor@eduverse.com', password: 'Instructor@123' });
        if (r.status !== 200) return console.error('Login failed', r);
        const token = r.body.accessToken;
        console.log('Logged in, token length', token.length);

        const lessonId = process.argv[2] || 'ae76c749-dade-42f8-81d0-1488a4456a23';
        console.log('Updating lesson', lessonId);
        const update = {
            title: 'Test Update YouTube',
            content_type: 'video',
            video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            text_content: '',
            duration_minutes: 10,
            order_index: 1
        };

        r = await put(`/api/lessons/${lessonId}`, update, token);
        console.log('PUT status', r.status);
        console.log('Body:', r.body);
    } catch (err) {
        console.error('Error during test', err);
    }
}

run();
