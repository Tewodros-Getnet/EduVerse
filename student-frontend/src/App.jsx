import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import StudentDashboard from './pages/student/Dashboard';
import Courses from './pages/student/Courses';
import CourseDetail from './pages/student/CourseDetail';
import AITutor from './pages/student/AITutor';
import Quiz from './pages/student/Quiz';
import Progress from './pages/student/Progress';
import StudentLiveClass from './pages/student/LiveClass';
import StudentLiveClasses from './pages/student/LiveClasses';
import Notifications from './pages/student/Notifications';
import StudentLayout from './components/StudentLayout';
import InstructorLayout from './components/InstructorLayout';
import AllAssignments from './pages/student/AllAssignments';
import Assignments from './pages/student/Assignments';
import Grades from './pages/student/Grades';
import CourseNotes from './pages/student/CourseNotes';
import Assessments from './pages/student/Assessments';
import InstructorDashboard from './pages/instructor/Dashboard';
import InstructorCourses from './pages/instructor/Courses';
import InstructorCourseDetail from './pages/instructor/CourseDetail';
import InstructorAssignments from './pages/instructor/Assignments';
import InstructorAssessments from './pages/instructor/Assessments';
import InstructorQuizzes from './pages/instructor/Quizzes';
import InstructorStudents from './pages/instructor/Students';
import InstructorLiveClasses from './pages/instructor/LiveClasses';
import InstructorAnalytics from './pages/instructor/Analytics';
import InstructorAITools from './pages/instructor/AITools';
import InstructorProfile from './pages/instructor/Profile';
import StudentProfile from './pages/student/Profile';

function ProtectedRoute({ children, role }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) return <Navigate to="/" replace />;
    return children;
}

function AppRoutes() {
    const { user } = useAuth();
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />

            {/* Student routes */}
            <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
                <Route index element={<StudentDashboard />} />
                <Route path="courses" element={<Courses />} />
                <Route path="courses/:id" element={<CourseDetail />} />
                <Route path="ai-tutor" element={<AITutor />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="quiz/:id" element={<Quiz />} />
                <Route path="progress" element={<Progress />} />
                <Route path="live" element={<StudentLiveClasses />} />
                <Route path="live/:id" element={<StudentLiveClass />} />
                <Route path="assignments" element={<AllAssignments />} />
                <Route path="assignments/:courseId" element={<Assignments />} />
                <Route path="grades" element={<Grades />} />
                <Route path="course-notes/:courseId" element={<CourseNotes />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="profile" element={<StudentProfile />} />
            </Route>

            {/* Instructor routes */}
            <Route path="/instructor" element={<ProtectedRoute role="instructor"><InstructorLayout /></ProtectedRoute>}>
                <Route index element={<InstructorDashboard />} />
                <Route path="courses" element={<InstructorCourses />} />
                <Route path="courses/:id" element={<InstructorCourseDetail />} />
                <Route path="assignments" element={<InstructorAssignments />} />
                <Route path="assessments" element={<InstructorAssessments />} />
                <Route path="quizzes" element={<InstructorQuizzes />} />
                <Route path="students" element={<InstructorStudents />} />
                <Route path="live-classes" element={<InstructorLiveClasses />} />
                <Route path="live/:id" element={<StudentLiveClass />} />
                <Route path="analytics" element={<InstructorAnalytics />} />
                <Route path="ai-tools" element={<InstructorAITools />} />
                <Route path="profile" element={<InstructorProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a35', color: '#fff', border: '1px solid #7c3aed' } }} />
                <AppRoutes />
            </ThemeProvider>
        </AuthProvider>
    );
}
