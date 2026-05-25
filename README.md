# EduVerse — AI Smart Learning Platform

Three-folder monorepo: backend API, admin panel, and student/instructor frontend.

## Project Structure

```
eduverse/
├── backend/              # Node.js + Express REST API
├── admin-frontend/       # React admin panel (port 3001)
└── student-frontend/     # React student + instructor app (port 3000)
```

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in your values
npm install
# Create PostgreSQL DB, then run:
psql -d your_db -f src/db/schema.sql
npm run dev               # runs on port 5000
```

### 2. Student Frontend

```bash
cd student-frontend
cp .env.example .env
npm install
npm run dev               # runs on port 3000
```

### 3. Admin Frontend

```bash
cd admin-frontend
cp .env.example .env
npm install
npm run dev               # runs on port 3001
```

## Default Roles

| Role       | Login Button         | Redirect         |
|------------|----------------------|------------------|
| Student    | Sign In as Student   | /student         |
| Instructor | Sign In as Instructor| /instructor      |
| Admin      | Sign In as Admin     | localhost:3001   |

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Redis, Socket.io
- **Frontend**: React 18, Tailwind CSS, Recharts, React Router v6
- **AI**: Groq (fast) + Gemini (deep reasoning) with auto-routing
- **Auth**: JWT + bcrypt, role-based access control

## Environment Variables (backend)

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | Groq API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `JWT_SECRET` | JWT signing secret |
| `REDIS_URL` | Redis connection URL |
