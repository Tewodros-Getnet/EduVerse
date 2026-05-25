# EduVerse System Workflow Documentation

## Current User Registration & Access Workflow

### 1. Student Registration Process

**Current State: Open Registration (No Approval Required)**

**Steps:**
1. User navigates to `/register` page
2. Fills in registration form:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
   - Role selection: Student or Instructor
3. Clicks "Create Account"
4. System validates input (password length, required fields)
5. Backend creates user account in database with `role = 'student'`
6. User receives JWT access token immediately
7. User is automatically redirected to `/student` dashboard
8. User has full access to student features immediately

**API Endpoint:** `POST /api/auth/register`
**Database Table:** `users` (columns: id, name, email, password_hash, role, is_active, created_at)

### 2. Instructor Registration Process

**Current State: Open Registration (No Approval Required)**

**Steps:**
1. User navigates to `/register` page
2. Fills in registration form:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
   - Role selection: Instructor
3. Clicks "Create Account"
4. System validates input (password length, required fields)
5. Backend creates user account in database with `role = 'instructor'`
6. User receives JWT access token immediately
7. User is automatically redirected to `/instructor` dashboard
8. User has full access to instructor features immediately (can create courses, lessons, quizzes, etc.)

**API Endpoint:** `POST /api/auth/register`
**Database Table:** `users` (columns: id, name, email, password_hash, role, is_active, created_at)

### 3. Login Process

**Student Login:**
1. User navigates to `/login` page
2. Selects "Student" role tab
3. Enters email and password
4. Clicks "Student Sign In"
5. Backend validates credentials
6. User receives JWT access token
7. Redirected to `/student` dashboard

**Instructor Login:**
1. User navigates to `/login` page
2. Selects "Instructor" role tab
3. Enters email and password
4. Clicks "Instructor Sign In"
5. Backend validates credentials
6. User receives JWT access token
7. Redirected to `/instructor` dashboard

**Admin Login:**
1. Admin must use separate admin portal at `localhost:3001`
2. Admin login is handled through admin-frontend
3. Redirects to admin dashboard

**API Endpoint:** `POST /api/auth/login`
**Security:** JWT tokens with 1-hour expiration, refresh tokens with 7-day expiration

### 4. Account Status

**Current Implementation:**
- All new accounts are automatically set to `is_active = true`
- No pending approval state
- No email verification
- No instructor vetting process
- No waiting period

**Database Check:** Login endpoint checks `user.is_active` flag
- If `is_active = false`: Returns 403 error "Account deactivated"
- If `is_active = true`: Proceeds with login

### 5. Course Enrollment Workflow

**Current State: Self-Enrollment**

**Student Side:**
1. Student logs in
2. Navigates to `/student/courses`
3. Can browse all available courses
4. Can enroll in courses directly (if enrollment is open)
5. Access to course content depends on course settings

**Instructor Side:**
1. Instructor logs in
2. Navigates to `/instructor/courses`
3. Can create new courses
4. Can publish courses (makes them visible to students)
5. Can manage course content (lessons, quizzes, assignments)

### 6. Current System Limitations

**No Approval Process:**
- ❌ No instructor approval workflow
- ❌ No student enrollment approval
- ❌ No email verification
- ❌ No account pending state
- ❌ No admin review for new instructors
- ❌ No background checks for instructors

**Security Considerations:**
- Anyone can register as an instructor
- No verification of instructor credentials
- No vetting of course content before publication
- Potential for spam or low-quality content

---

## Recommended Approval Workflow (Future Enhancement)

### Option 1: Instructor Approval Required

**Proposed Workflow:**
1. User registers as instructor
2. Account created with `is_active = false` and `status = 'pending'`
3. Admin receives notification of new instructor registration
4. Admin reviews instructor profile/credentials
5. Admin approves or rejects instructor application
6. If approved: `is_active = true`, instructor receives email notification
7. If rejected: Account remains inactive, instructor receives rejection email

**Database Changes Needed:**
- Add `status` column to users table (enum: 'active', 'pending', 'rejected', 'suspended')
- Add `approval_notes` column for admin comments
- Add `approved_at` and `approved_by` columns

**Frontend Changes Needed:**
- Show pending state on login page
- Add instructor application form with credentials upload
- Add admin approval interface in admin dashboard
- Add email notification system

### Option 2: Email Verification Required

**Proposed Workflow:**
1. User registers (student or instructor)
2. Account created with `is_active = false` and `email_verified = false`
3. System sends verification email
4. User clicks verification link
5. Account activated: `is_active = true`, `email_verified = true`
6. User can now log in

**Database Changes Needed:**
- Add `email_verified` column to users table
- Add `email_verification_token` column
- Add `email_verification_expires` column

**Frontend Changes Needed:**
- Add email verification page
- Show "Check your email" message after registration
- Add resend verification email option

### Option 3: Course Approval Required

**Proposed Workflow:**
1. Instructor creates course
2. Course marked as `status = 'draft'`
3. Instructor submits course for review
4. Admin reviews course content
5. Admin approves or rejects course
6. If approved: Course becomes visible to students
7. If rejected: Instructor receives feedback

**Database Changes Needed:**
- Add `status` column to courses table (enum: 'draft', 'pending', 'published', 'rejected')
- Add `review_notes` column
- Add `reviewed_at` and `reviewed_by` columns

---

## Current User Roles & Permissions

### Student
- ✅ View published courses
- ✅ Enroll in courses
- ✅ View lessons and course content
- ✅ Submit assignments
- ✅ Take quizzes/assessments
- ✅ View grades and progress
- ✅ Use AI Tutor
- ❌ Cannot create courses
- ❌ Cannot create lessons
- ❌ Cannot create quizzes

### Instructor
- ✅ Create and manage courses
- ✅ Create and manage lessons (video, PDF, text)
- ✅ Create and manage quizzes
- ✅ Create and manage assignments
- ✅ Create and manage assessments
- ✅ Host live classes
- ✅ View student analytics
- ✅ Use AI tools (quiz generator, content suggestions, etc.)
- ❌ Cannot access admin panel
- ❌ Cannot approve other instructors

### Admin
- ✅ Full system access
- ✅ Manage all users
- ✅ View system analytics
- ✅ Manage announcements
- ✅ Monitor security
- ✅ Access admin dashboard

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Student Endpoints
- `GET /api/courses` - View available courses
- `POST /api/enrollments` - Enroll in course
- `GET /api/assignments/student` - View assignments
- `POST /api/assignments/submit` - Submit assignment
- `GET /api/quiz/student` - View quizzes
- `POST /api/quiz/submit` - Submit quiz
- `GET /api/ai/student/generate-quiz` - AI quiz generation

### Instructor Endpoints
- `GET /api/courses/instructor` - View instructor's courses
- `POST /api/courses` - Create course
- `POST /api/lessons/upload` - Upload lesson content
- `GET /api/quiz/instructor` - View instructor's quizzes
- `POST /api/quiz/instructor` - Create quiz
- `POST /api/assessments/instructor` - Create assessment
- `GET /api/live/instructor/sessions` - View live sessions
- `POST /api/ai/instructor/*` - AI tools for instructors

### Admin Endpoints
- `GET /api/analytics/admin/dashboard` - Admin dashboard analytics
- `GET /api/notifications/admin` - Admin notifications
- `POST /api/announcements` - Create announcement
- `GET /api/security/sessions` - View active sessions

---

