-- Create missing tables for assignments and assessments

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

-- Add notifications table read_at column if missing
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
