-- EduVerse Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
  avatar_url TEXT,
  google_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  category VARCHAR(100),
  tags TEXT[],
  price NUMERIC(10,2) DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  video_url TEXT,
  pdf_url TEXT,
  text_content TEXT,
  content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'video', 'pdf', 'mixed')),
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  progress_percent INTEGER DEFAULT 0,
  UNIQUE(student_id, course_id)
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  time_limit_minutes INTEGER,
  max_attempts INTEGER DEFAULT 3,
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(20) CHECK (question_type IN ('mcq', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER,
  answers JSONB,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Chat History (AI Tutor)
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  ai_source VARCHAR(20) CHECK (ai_source IN ('groq', 'gemini', 'error', 'demo')),
  helpful_flag BOOLEAN,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge Trace
CREATE TABLE IF NOT EXISTS knowledge_trace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  concept VARCHAR(255) NOT NULL,
  mastery_score FLOAT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, course_id, concept)
);

-- Live Classes (legacy, kept for compatibility)
CREATE TABLE IF NOT EXISTS live_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  room_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Live Sessions (used by live routes)
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER,
  meeting_url TEXT,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Session Attendance
CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  UNIQUE(session_id, student_id)
);

-- Lesson Progress
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  UNIQUE(student_id, lesson_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255),
  ip_address VARCHAR(50),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR(100) NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW()
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  max_points INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Assignment Submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  score INTEGER,
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);

-- Assessments
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) CHECK (type IN ('quiz', 'exam', 'assignment')),
  scheduled_date TIMESTAMP,
  duration_minutes INTEGER,
  total_points INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Assessment Results
CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER,
  remarks TEXT,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(assessment_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_student ON chat_history(student_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_trace_student ON knowledge_trace(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id);
