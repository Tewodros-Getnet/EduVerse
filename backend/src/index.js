const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const aiRoutes = require('./routes/ai');
const quizRoutes = require('./routes/quiz');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const recommendationRoutes = require('./routes/recommendations');
const liveRoutes = require('./routes/live');
const analyticsRoutes = require('./routes/analytics');
const lessonRoutes = require('./routes/lessons');
const assessmentRoutes = require('./routes/assessments');
const assignmentRoutes = require('./routes/assignments');
const notificationRoutes = require('./routes/notifications');
const messagesRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const securityRoutes = require('./routes/security');
const studentRoutes = require('./routes/students');
const { setupSocketHandlers } = require('./socket/handlers');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const httpServer = createServer(app);

// Trust proxy for Render
app.set('trust proxy', 1);

// Allowed origins — explicit production URLs + all Vercel preview deployments
const allowedOrigins = [
    process.env.STUDENT_FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL,
    process.env.INSTRUCTOR_FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
].filter(Boolean);

function corsOrigin(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow any Vercel deployment (preview + production) and explicit allowed origins
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
}

const io = new Server(httpServer, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/students', studentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
setupSocketHandlers(io);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`EduVerse backend running on port ${PORT}`);
});

// ── Keep-alive ping (Render free tier spins down after 15 min inactivity) ────
// Pings the health endpoint every 10 minutes so the instance stays warm.
// Only runs in production to avoid noise in local dev.
if (process.env.NODE_ENV === 'production') {
    const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    setInterval(async () => {
        try {
            const https = require('https');
            const http = require('http');
            const client = SELF_URL.startsWith('https') ? https : http;
            client.get(`${SELF_URL}/health`, (res) => {
                console.log(`[keep-alive] ping → ${res.statusCode}`);
            }).on('error', (err) => {
                console.warn('[keep-alive] ping failed:', err.message);
            });
        } catch { /* ignore */ }
    }, 10 * 60 * 1000); // every 10 minutes
}

module.exports = { app, io };
