import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import NotificationButton from './NotificationButton';

export default function ModernStudentDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashData, setDashData] = useState(null);
    const [timeRange, setTimeRange] = useState('week');
    const [animationsLoaded, setAnimationsLoaded] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, [timeRange]);

    useEffect(() => {
        if (!loading && dashData) {
            // Trigger animations after data loads
            const timer = setTimeout(() => setAnimationsLoaded(true), 200);
            return () => clearTimeout(timer);
        }
    }, [loading, dashData]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [progress, recommendations, sessions, analytics, activity] = await Promise.all([
                api.get('/users/progress'),
                api.get('/recommendations/next'),
                api.get('/live/sessions'),
                api.get(`/analytics/student/progress?time_range=${timeRange}`),
                api.get('/analytics/student/recent-activity'),
            ]);

            setDashData({
                progress: progress.data,
                recommendation: recommendations.data?.recommendation,
                suggestedCourses: recommendations.data?.suggested_courses || [],
                sessions: (sessions.data.sessions || []).filter(s => ['live', 'scheduled'].includes(s.status)).slice(0, 3),
                analytics: analytics.data,
                activities: activity.data.activities || [],
            });
        } catch (error) {
            toast.error('Failed to load dashboard');
            console.error(error);
            setDashData(null);
        } finally {
            setLoading(false);
        }
    };

    const calculateOverallProgress = () => {
        if (!dashData?.analytics?.courses || dashData.analytics.courses.length === 0) return 0;
        const total = dashData.analytics.courses.reduce((sum, c) => sum + (c.progress_percent || 0), 0);
        return Math.round(total / dashData.analytics.courses.length);
    };

    const calculateAverageGrade = () => {
        if (!dashData?.analytics?.grades || dashData.analytics.grades.length === 0) return 0;
        const total = dashData.analytics.grades.reduce((sum, g) => sum + (g.score || 0), 0);
        return Math.round(total / dashData.analytics.grades.length);
    };

    const learningStreakDays = () => {
        const activities = dashData?.activities || [];
        if (!activities.length) return 0;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayHasActivity = (d) =>
            activities.some(a => {
                const raw = a.timestamp || a.created_at;
                if (!raw) return false;
                return new Date(raw).toDateString() === d.toDateString();
            });
        if (dayHasActivity(today)) return Math.min(7, Math.max(1, activities.length));
        if (dayHasActivity(yesterday)) return 1;
        return 0;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!dashData) {
        return (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center space-y-4">
                <p className="text-[var(--muted)]">We could not load your dashboard.</p>
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

    const overallProgress = calculateOverallProgress();
    const averageGrade = calculateAverageGrade();
    const streak = learningStreakDays();
    const nextExploreId = dashData.suggestedCourses?.[0]?.id;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6 space-y-8">
            <div className="flex flex-wrap items-center justify-end gap-3">
                <select
                    value={timeRange}
                    onChange={e => setTimeRange(e.target.value)}
                    className="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                    <option value="all">All time</option>
                </select>
                <NotificationButton />
            </div>

            {/* Welcome Section */}
            <div className={`bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl shadow-lg p-8 text-white relative overflow-hidden transform transition-all duration-1000 ${
                animationsLoaded ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
            }`}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20 animate-pulse"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold mb-2 animate-fade-in">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                    <p className="text-indigo-100 text-lg animate-fade-in animation-delay-300">You're making great progress. Keep up the momentum!</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transform transition-all duration-1000 delay-300 ${
                animationsLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
                <StatCard
                    icon="📚"
                    label="Courses Enrolled"
                    value={dashData?.analytics?.courses?.length || 0}
                    color="from-blue-500 to-cyan-400"
                />
                <StatCard
                    icon="🎯"
                    label="Overall Progress"
                    value={`${overallProgress}%`}
                    color="from-purple-500 to-pink-500"
                />
                <StatCard
                    icon="⭐"
                    label="Average Grade"
                    value={`${averageGrade}%`}
                    color="from-emerald-500 to-teal-500"
                />
                <StatCard
                    icon="🔥"
                    label="Learning Streak"
                    value={streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : 'Start today'}
                    color="from-orange-500 to-rose-500"
                />
            </div>

            {/* Main Content Grid */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transform transition-all duration-1000 delay-500 ${
                animationsLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
                {/* Left Column - Large Cards */}
                <div className={`lg:col-span-2 space-y-6 animate-slide-in-left ${
                    animationsLoaded ? 'opacity-100' : 'opacity-0'
                }`}>
                    {/* AI Recommendation Card */}
                    {(dashData?.recommendation?.message || (dashData?.suggestedCourses?.length > 0)) && (
                        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 hover:shadow-md transition-all">
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">🤖</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI recommendation</h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                                        {dashData.recommendation?.message || 'Browse a suggested course to keep your momentum.'}
                                    </p>
                                    <Link
                                        to={nextExploreId ? `/student/courses/${nextExploreId}` : '/student/courses'}
                                        className="inline-block px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition"
                                    >
                                        {nextExploreId ? 'View suggested course' : 'Browse courses'}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Continue Learning */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Continue Learning</h2>
                            <Link to="/student/courses" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-medium">
                                View All →
                            </Link>
                        </div>
                        {dashData?.analytics?.courses && dashData.analytics.courses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {dashData.analytics.courses.slice(0, 2).map(course => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-slate-700">
                                <p className="text-gray-500 dark:text-gray-400 mb-4">No courses yet</p>
                                <Link
                                    to="/student/courses"
                                    className="inline-block px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition"
                                >
                                    Browse Courses
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Live Classes */}
                    {dashData?.sessions && dashData.sessions.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Upcoming Live Classes</h2>
                            <div className="space-y-3">
                                {dashData.sessions.map(session => (
                                    <div
                                        key={session.id}
                                        className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 hover:shadow-md transition-all flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                                session.status === 'live'
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                            }`}>
                                                {session.status === 'live' ? '🔴' : '⏰'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{session.title}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(session.scheduled_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/student/live/${session.id}`}
                                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                                session.status === 'live'
                                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                        >
                                            {session.status === 'live' ? 'Join Now' : 'View'}
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Sidebar */}
                <div className={`space-y-6 animate-slide-in-right ${
                    animationsLoaded ? 'opacity-100' : 'opacity-0'
                }`}>
                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-3">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Access</h3>
                        <QuickActionButton icon="🧠" label="AI Tutor" to="/student/ai-tutor" />
                        <QuickActionButton icon="📝" label="Assignments" to="/student/assignments" />
                        <QuickActionButton icon="🎯" label="Take Quiz" to="/student/courses" />
                        <QuickActionButton icon="📊" label="View Progress" to="/student/progress" />
                    </div>

                    {/* Recent Activity */}
                    {dashData?.activities && dashData.activities.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {dashData.activities.slice(0, 5).map((activity, idx) => (
                                    <div key={idx} className="flex gap-3 pb-3 border-b border-gray-200 dark:border-slate-700 last:border-b-0 last:pb-0">
                                        <span className="text-2xl flex-shrink-0">{getActivityIcon(activity.activity_type || activity.type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {activity.title || activity.description || 'Activity'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatTime(activity.timestamp || activity.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Learning Tips */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3">💡 Learning Tip</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            Take short breaks every 25 minutes while studying. It helps improve retention and keeps you focused!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    const [animatedValue, setAnimatedValue] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation when component mounts
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        // Extract numeric value for animation
        const numericValue = typeof value === 'string' 
            ? parseInt(value.replace(/[^\d]/g, '')) || 0 
            : value || 0;
        
        const duration = 1000; // 1 second
        const steps = 60;
        const increment = numericValue / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= numericValue) {
                setAnimatedValue(numericValue);
                clearInterval(timer);
            } else {
                setAnimatedValue(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value, isVisible]);

    const displayValue = typeof value === 'string' 
        ? value.replace(/\d+/, animatedValue.toString())
        : animatedValue;

    return (
        <div className={`bg-gradient-to-br ${color} rounded-2xl shadow-lg p-6 text-white transform transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
        } hover:scale-105 hover:shadow-xl transition-all duration-300`}>
            <div className="text-4xl mb-3 animate-pulse">{icon}</div>
            <p className="text-white/80 text-sm font-medium">{label}</p>
            <p className="text-4xl font-bold transition-all duration-300">{displayValue}</p>
        </div>
    );
}

function CourseCard({ course }) {
    const progress = course.progress_percent || 0;
    
    return (
        <Link
            to={`/student/courses/${course.id}`}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
        >
            {/* Course Header with Gradient */}
            <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-8 -mt-8"></div>
                </div>
                <div className="relative h-full flex items-end p-4">
                    <span className="text-3xl">{course.category === 'Programming' ? '💻' : '📚'}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{course.instructor_name}</p>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function QuickActionButton({ icon, label, to }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/40 dark:hover:to-purple-900/40 transition-all group"
        >
            <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        </Link>
    );
}

function getActivityIcon(type) {
    const icons = {
        enrollment: '📚',
        lesson_completed: '✅',
        quiz_submitted: '🎯',
        assignment_submitted: '📝',
        course_enrolled: '📚',
        grade_received: '⭐',
        note_created: '📝',
    };
    return icons[type] || '📌';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
