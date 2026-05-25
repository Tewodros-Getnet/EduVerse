import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ModernInstructorDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashData, setDashData] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [courseRes, analyticsRes, sessionsRes] = await Promise.all([
                api.get('/courses/my/teaching'),
                api.get('/analytics/instructor/dashboard'),
                api.get('/live/sessions'),
            ]);

            setDashData({
                courses: courseRes.data.courses || [],
                analytics: analyticsRes.data || {},
                sessions: (sessionsRes.data.sessions || [])
                    .filter(s => s.status !== 'ended')
                    .slice(0, 3),
            });
        } catch (error) {
            toast.error('Failed to load dashboard');
            console.error(error);
            setDashData(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!dashData) {
        return (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center space-y-4">
                <p className="text-[var(--muted)]">We could not load your instructor dashboard.</p>
                <button
                    type="button"
                    onClick={() => fetchDashboardData()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition"
                >
                    Try again
                </button>
            </div>
        );
    }

    const totalStudents = dashData?.analytics?.total_students || 0;
    const totalCourses = dashData?.analytics?.total_courses || 0;
    const avgCompletion = dashData?.analytics?.avg_engagement ?? dashData?.analytics?.avg_completion_rate ?? 0;
    const totalRevenue = dashData?.analytics?.total_revenue || 0;
    const revenueDisplay =
        totalRevenue >= 1000
            ? `$${(totalRevenue / 1000).toFixed(1)}k`
            : `$${Math.round(totalRevenue).toLocaleString()}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-lg p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}! 👨‍🏫</h1>
                    <p className="text-indigo-100 text-lg">Your courses are thriving. Keep inspiring your students!</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    icon="📚"
                    label="Active Courses"
                    value={totalCourses}
                    color="from-blue-500 to-cyan-400"
                    trend="Published & draft courses you own"
                />
                <MetricCard
                    icon="👥"
                    label="Total Students"
                    value={totalStudents.toLocaleString()}
                    color="from-purple-500 to-pink-500"
                    trend="Unique learners across enrollments"
                />
                <MetricCard
                    icon="📊"
                    label="Avg completion"
                    value={`${Math.round(avgCompletion)}%`}
                    color="from-emerald-500 to-teal-500"
                    trend="Mean progress across enrollments"
                />
                <MetricCard
                    icon="💰"
                    label="Total revenue"
                    value={revenueDisplay}
                    color="from-orange-500 to-rose-500"
                    trend="Sum of course price at enrollment"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Courses & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ActionCard
                            icon="✨"
                            title="Create Course"
                            description="Build a new course"
                            color="from-indigo-600 to-purple-600"
                            to="/instructor/courses"
                        />
                        <ActionCard
                            icon="🔴"
                            title="Start Live Class"
                            description="Begin a live session"
                            color="from-red-600 to-pink-600"
                            to="/instructor/live-classes"
                        />
                        <ActionCard
                            icon="📊"
                            title="View Analytics"
                            description="See detailed reports"
                            color="from-emerald-600 to-teal-600"
                            to="/instructor/analytics"
                        />
                    </div>

                    {/* My Courses */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h2>
                            <Link to="/instructor/courses" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-medium">
                                View All →
                            </Link>
                        </div>

                        {dashData?.courses && dashData.courses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {dashData.courses.slice(0, 2).map(course => (
                                    <InstructorCourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-slate-700">
                                <p className="text-gray-500 dark:text-gray-400 mb-4">No courses created yet</p>
                                <Link
                                    to="/instructor/courses"
                                    className="inline-block px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition"
                                >
                                    Create Your First Course
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Live Sessions */}
                    {dashData?.sessions && dashData.sessions.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">📹 Upcoming Live Classes</h2>
                            <div className="space-y-3">
                                {dashData.sessions.map(session => (
                                    <div
                                        key={session.id}
                                        className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 hover:shadow-md transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30">
                                                🔴
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{session.title}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(session.scheduled_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/instructor/live/${session.id}`}
                                            className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition"
                                        >
                                            Manage
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Sidebar Stats */}
                <div className="space-y-6">
                    {/* Performance Overview */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-6">📈 Performance</h3>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Course Completion</span>
                                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Math.round(avgCompletion)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full"
                                        style={{ width: `${avgCompletion}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Student Satisfaction</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">4.8/5</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full" style={{ width: '96%' }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Assignment Turn-in</span>
                                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">82%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-gradient-to-r from-orange-500 to-rose-500 h-full" style={{ width: '82%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Tools Access */}
                    <Link
                        to="/instructor/ai-tools"
                        className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-6 hover:shadow-lg transition-all group"
                    >
                        <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🤖</div>
                        <h3 className="font-bold mb-1">AI Tools</h3>
                        <p className="text-sm text-indigo-100">Generate quizzes, content, & feedback</p>
                    </Link>

                    {/* Student Management */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">👥 Manage</h3>
                        <div className="space-y-2">
                            <ManageLink icon="📋" label="View All Students" to="/instructor/students" />
                            <ManageLink icon="📝" label="Assignments" to="/instructor/assignments" />
                            <ManageLink icon="🎯" label="Quizzes" to="/instructor/quizzes" />
                            <ManageLink icon="📑" label="Assessments" to="/instructor/assessments" />
                        </div>
                    </div>

                    {/* Recent Feedback */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3">💬 Student Feedback</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            "Your course is excellent! I learned so much." - Student
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">⭐⭐⭐⭐⭐ 5/5</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color, trend }) {
    return (
        <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-lg p-6 text-white`}>
            <div className="text-4xl mb-3">{icon}</div>
            <p className="text-white/80 text-sm font-medium">{label}</p>
            <p className="text-3xl font-bold my-2">{value}</p>
            <p className="text-sm text-white/70">{trend}</p>
        </div>
    );
}

function ActionCard({ icon, title, description, color, to }) {
    return (
        <Link
            to={to}
            className={`bg-gradient-to-br ${color} text-white rounded-2xl p-6 hover:shadow-lg hover:scale-105 transition-all group`}
        >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
            <h3 className="font-bold mb-1">{title}</h3>
            <p className="text-sm text-white/80">{description}</p>
        </Link>
    );
}

function InstructorCourseCard({ course }) {
    const studentsEnrolled = course.enrollment_count || 0;
    
    return (
        <Link
            to={`/instructor/courses/${course.id}`}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
        >
            {/* Header with Gradient */}
            <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -mr-4 -mt-4"></div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-2">{course.title}</h3>

                {/* Stats */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">👥 Students</span>
                        <span className="font-bold text-gray-900 dark:text-white">{studentsEnrolled}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">📊 Status</span>
                        <span className={`font-bold ${course.status === 'published' ? 'text-emerald-600' : 'text-orange-600'}`}>
                            {course.status === 'published' ? '✓ Published' : '○ Draft'}
                        </span>
                    </div>
                </div>

                {/* Action Button */}
                <span className="block w-full text-center py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm group-hover:opacity-90 transition">
                    Manage course
                </span>
            </div>
        </Link>
    );
}

function ManageLink({ icon, label, to }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/40 dark:hover:to-purple-900/40 transition-all group"
        >
            <span className="text-xl">{icon}</span>
            <span className="font-medium text-gray-900 dark:text-white text-sm">{label}</span>
        </Link>
    );
}
