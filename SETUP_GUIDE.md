# EduVerse Setup Guide

## Prerequisites

- Node.js v16+
- PostgreSQL 12+
- Redis (optional, for caching)

## Database Setup

### 1. Create PostgreSQL Database

```bash
createdb eduverse
```

### 2. Set Up Backend Environment

Create/update `backend/.env`:

```env
PORT=5001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:Post0908@localhost:5432/eduverse

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT Secrets (use strong values in production)
JWT_SECRET=eduverse_jwt_secret_2026_super_secure
JWT_REFRESH_SECRET=eduverse_refresh_secret_2026_super_secure
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ⭐ AI APIs (IMPORTANT: Add your actual API keys from these services)
GROQ_API_KEY=gsk_your_actual_groq_key_here
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Service (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password

# Frontend URLs
STUDENT_FRONTEND_URL=http://localhost:3000
ADMIN_FRONTEND_URL=http://localhost:3001
```

## Getting API Keys

### Groq API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up/login
3. Navigate to API Keys section
4. Create and copy your API key
5. Add to `GROQ_API_KEY` in `.env`

### Google Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Copy and add to `GEMINI_API_KEY` in `.env`

## Installation & Running

### Backend

```bash
cd backend
npm install
npm run dev
# Migrations and seeding will run automatically on first start
# Default credentials:
# Admin: admin@eduverse.com / Admin@123
# Instructor: instructor@eduverse.com / Instructor@123
# Student: student@eduverse.com / Student@123
```

### Student Frontend

```bash
cd student-frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Admin Frontend

```bash
cd admin-frontend
npm install
npm run dev
# Opens at http://localhost:3001
```

## System Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Admin Frontend │         │ Student Frontend │
│  (React Vite)   │         │  (React Vite)    │
│  :3001          │         │   :3000/:3000    │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         └───────────┬───────────────┘
                     │ (HTTP/WebSocket)
                     ▼
            ┌──────────────────┐
            │  Backend Server  │
            │  (Node/Express)  │
            │      :5001       │
            └────────┬─────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    PostgreSQL    Redis        AI APIs
                            (Groq/Gemini)
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Courses

- `GET /api/courses` - Get all published courses
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create course (instructor/admin)
- `PUT /api/courses/:id` - Update course (instructor/admin)
- `POST /api/courses/:id/enroll` - Enroll in course (student)
- `GET /api/courses/my/teaching` - Get instructor's courses
- `GET /api/courses/my/enrolled` - Get enrolled courses (student)

### AI Tutor

- `POST /api/ai/chat` - Ask AI tutor
- `GET /api/ai/history` - Get chat history

### Live Sessions

- `GET /api/live/sessions` - Get live sessions
- `GET /api/live/sessions/:id` - Get session details
- `POST /api/live/sessions` - Create session (instructor)
- `PATCH /api/live/sessions/:id/status` - Update session status

## Key Features

### ✅ Implemented

- User authentication (JWT-based)
- Course management (create, edit, publish)
- Student enrollment
- AI Tutor (GPT-powered Q&A)
- Live classroom with:
  - Real-time chat via Socket.io
  - Participant management
  - Mic/Video toggle status
  - Hand raise feature
  - Screen share UI (placeholder)
- Analytics & dashboards
- Mobile-friendly UI

### 🔄 Real-time Features (Socket.io)

**Events:**

- `join-class` - Join live session
- `leave-class` - Leave live session
- `chat-message` - Send chat message
- `raise-hand` / `lower-hand` - Hand raising
- `media-state` - Mic/Video status changes
- `webrtc-offer/answer/ice-candidate` - WebRTC signaling

### 🎥 WebRTC Implementation

The application supports WebRTC peer-to-peer connections for video streaming. The signaling is handled via Socket.io. To implement actual video:

1. Initialize getUserMedia() on page load
2. Create RTCPeerConnection for each participant
3. Exchange offer/answer/ICE candidates via Socket.io events
4. Attach media streams to video elements

## Troubleshooting

### Socket.io Connection Error (400 Bad Request)

**Issue:** `GET http://localhost:5001/socket.io/?... 400 (Bad Request)`
**Solution:** Ensure:

1. Backend is running on port 5001
2. Frontend uses correct socket URL (without `/api` suffix)
3. Token is valid and passed in `auth` parameter

### AI Tutor Returns 400

**Issue:** `POST /api/ai/chat 400 (Bad Request)`
**Solution:**

1. Check if API keys are configured in `.env`
2. Validate Groq and Gemini API keys are not placeholder values
3. App will fall back to demo mode if keys missing

### Students Don't See Courses

**Issue:** Courses page is empty
**Solution:**

1. Run database migrations: `npm run migrate` (in backend)
2. Seed demo data: `npm run seed` (in backend)
3. Ensure courses have `status = 'published'`
4. Refresh browser cache

### Database Connection Failed

**Solution:**

```bash
# Test connection
psql -U postgres -h localhost -d eduverse

# If database doesn't exist
createdb eduverse

# Check PostgreSQL is running
# Windows: Services app > PostgreSQL
# Mac: brew services list
# Linux: sudo systemctl status postgresql
```

## Development Tips

### Hot Reloading

- Backend: Nodemon watches for changes
- Frontends: Vite provides instant HMR

### Database Queries

```bash
# Connect to database
psql eduverse

# Useful queries
SELECT * FROM users;
SELECT * FROM courses WHERE status='published';
SELECT COUNT(*) FROM enrollments;
```

### Debugging Socket.io

Add to browser console:

```javascript
localStorage.debug = "*"; // Enable all debug logs
```

## Deployment Notes

### Production Checklist

- [ ] Set strong JWT secrets
- [ ] Configure real email service
- [ ] Enable HTTPS/SSL
- [ ] Set up proper database backups
- [ ] Configure CDN for assets
- [ ] Set up monitoring/logging
- [ ] Test rate limiting
- [ ] Configure CORS properly
- [ ] Environment-specific configs

### Environment Variables for Production

```env
NODE_ENV=production
JWT_SECRET=[strong-random-secret]
DATABASE_URL=[production-db-url]
REDIS_URL=[production-redis-url]
STUDENT_FRONTEND_URL=https://yourdomain.com
ADMIN_FRONTEND_URL=https://admin.yourdomain.com
```

## Support

For issues or questions:

1. Check TROUBLESHOOTING section above
2. Review error messages in browser console
3. Check backend logs: `npm run dev` output
4. Check database connectivity

---

**Last Updated:** May 8, 2026
**Version:** 1.0.0
