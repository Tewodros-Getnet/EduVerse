import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    BookOpen,
    Users,
    TrendingUp,
    DollarSign,
    PlusCircle,
    Video,
    BarChart3,
    Bot,
    ClipboardList,
    HelpCircle,
    FileText,
    GraduationCap,
    Radio,
} from 'lucide-react';

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
            setDashData(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!dashData) {
        return (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center space-y-4">
                <p className="text-[var(--muted)]">Could not load your dashboard.</p>
                <button
                    type="button"
                    onClick={fetchDashboardData}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition"
                >
                    Try again
                </button>
            </div>
        );
    }

    const totalStudents  = dashData?.analytics?.total_students || 0;
    const totalCourses   = dashData?.analytics?.total_courses || 0;
    const avgCompletion  = dashData?.analytics?.avg_engagement ?? dashData?.analytics?.avg_completion_rate ?? 0;
    const totalRevenue   = dashData?.analytics?.total_revenue || 0;
    const revenueDisplay = totalRevenue >= 1000
        ? `$${(totalRevenue / 1000).toFixed(1)}k`
        : `$${Math.round(totalRevenue).toLocaleString()}`;

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6 space-y-6 overflow-x-hidden">

            {/* ── Welcome Banner ─────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white shadow-lg shadow-purple-500/20">
                {/* Decorative blobs */}
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-center gap-4">
                    {/* Instructor avatar */}
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-4 ring-white/30 flex-shrink-0">
                        {user?.avatar_url
                            ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                                {user?.name?.[0]?.toUpperCase()}
                              </div>
                        }
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">
                            Welcome back, {user?.name?.split(' ')[0]}!
                        </h1>
                        <p className="text-purple-100 mt-1">Your courses are thriving. Keep inspiring your students!</p>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    Icon={BookOpen}
                    label="Active Courses"
                    value={totalCourses}
                    accent="bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400"
                    trend="Published & draft courses you own"
                />
                <MetricCard
                    Icon={Users}
                    label="Total Students"
                    value={totalStudents.toLocaleString()}
                    accent="bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400"
                    trend="Unique learners across enrollments"
                />
                <MetricCard
                    Icon={TrendingUp}
                    label="Avg Completion"
                    value={`${Math.round(avgCompletion)}%`}
                    accent="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    trend="Mean progress across enrollments"
                />
                <MetricCard
                    Icon={DollarSign}
                    label="Total Revenue"
                    value={revenueDisplay}
                    accent="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                    trend="Sum of course price at enrollment"
                />
            </div>

            {/* ── Main Content ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">

                {/* Left — Courses & Actions */}
                <div className="lg:col-span-2 space-y-6 min-w-0">

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <ActionCard
                            Icon={PlusCircle}
                            title="Create Course"
                            description="Build a new course"
                            gradient="from-violet-600 to-purple-600"
                            to="/instructor/courses"
                        />
                        <ActionCard
                            Icon={Video}
                            title="Start Live Class"
                            description="Begin a live session"
                            gradient="from-rose-600 to-pink-600"
                            to="/instructor/live-classes"
                        />
                        <ActionCard
                            Icon={BarChart3}
                            title="View Analytics"
                            description="See detailed reports"
                            gradient="from-emerald-600 to-teal-600"
                            to="/instructor/analytics"
                        />
                    </div>

                    {/* My Courses */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-[var(--text)]">My Courses</h2>
                            <Link to="/instructor/courses"
                                className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                                View All →
                            </Link>
                        </div>

                        {dashData?.courses?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {dashData.courses.slice(0, 2).map(course => (
                                    <InstructorCourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
                                <GraduationCap className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                                <p className="text-[var(--muted)] mb-4">No courses created yet</p>
                                <Link to="/instructor/courses"
                                    className="inline-block px-6 py-2 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition">
                                    Create Your First Course
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Live Sessions */}
                    {dashData?.sessions?.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Radio className="w-5 h-5 text-red-500" />
                                <h2 className="text-xl font-bold text-[var(--text)]">Upcoming Live Classes</h2>
                            </div>
                            <div className="space-y-3">
                                {dashData.sessions.map(session => (
                                    <div key={session.id}
                                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between hover:border-purple-500/50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                                <Video className="w-5 h-5 text-red-500" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[var(--text)]">{session.title}</p>
                                                <p className="text-sm text-[var(--muted)]">
                                                    {new Date(session.scheduled_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Link to={`/instructor/live/${session.id}`}
                                            className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition">
                                            Manage
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right — Sidebar */}
                <div className="space-y-6 min-w-0 overflow-hidden">

                    {/* Performance */}
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                            <h3 className="font-bold text-[var(--text)]">Performance</h3>
                        </div>
                        <div className="space-y-4">
                            <ProgressRow
                                label="Course Completion"
                                value={`${Math.round(avgCompletion)}%`}
                                pct={avgCompletion}
                                color="from-violet-500 to-purple-600"
                                textColor="text-purple-600 dark:text-purple-400"
                            />
                            <ProgressRow
                                label="Student Satisfaction"
                                value="4.8/5"
                                pct={96}
                                color="from-emerald-500 to-teal-500"
                                textColor="text-emerald-600 dark:text-emerald-400"
                            />
                            <ProgressRow
                                label="Assignment Turn-in"
                                value="82%"
                                pct={82}
                                color="from-orange-500 to-rose-500"
                                textColor="text-orange-600 dark:text-orange-400"
                            />
                        </div>
                    </div>

                    {/* AI Tools */}
                    <Link to="/instructor/ai-tools"
                        className="group block overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-6 hover:shadow-lg hover:shadow-purple-500/25 transition">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3 group-hover:bg-white/30 transition">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">AI Tools</h3>
                        <p className="text-sm text-purple-100">Generate quizzes, content & feedback</p>
                    </Link>

                    {/* Quick Links */}
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-purple-500" />
                            <h3 className="font-bold text-[var(--text)]">Manage</h3>
                        </div>
                        <div className="space-y-1.5">
                            <ManageLink Icon={Users}        label="View All Students" to="/instructor/students" />
                            <ManageLink Icon={ClipboardList} label="Assignments"        to="/instructor/assignments" />
                            <ManageLink Icon={HelpCircle}   label="Quizzes"            to="/instructor/quizzes" />
                            <ManageLink Icon={FileText}     label="Assessments"        to="/instructor/assessments" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ Icon, label, value, accent, trend }) {
    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-purple-500/40 transition group">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${accent}`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-[var(--muted)] font-medium">{label}</p>
            <p className="text-3xl font-bold text-[var(--text)] mt-1 mb-1">{value}</p>
            <p className="text-xs text-[var(--muted)]">{trend}</p>
        </div>
    );
}

function ActionCard({ Icon, title, description, gradient, to }) {
    return (
        <Link to={to}
            className={`group block rounded-2xl bg-gradient-to-br ${gradient} text-white p-6 hover:shadow-lg hover:scale-[1.02] transition-all`}>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:bg-white/30 transition">
                <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold mb-1">{title}</h3>
            <p className="text-sm text-white/80">{description}</p>
        </Link>
    );
}

function InstructorCourseCard({ course }) {
    return (
        <Link to={`/instructor/courses/${course.id}`}
            className="group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-purple-500/50 hover:shadow-md transition">
            {/* Header strip */}
            <div className="h-20 bg-gradient-to-br from-violet-500 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5" />
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
            </div>
            <div className="p-4">
                <h3 className="font-bold text-[var(--text)] line-clamp-2 mb-3">{course.title}</h3>
                <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-1.5 text-[var(--muted)]">
                        <Users className="w-4 h-4" />
                        <span>{course.enrollment_count || 0} students</span>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        course.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    }`}>
                        {course.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                </div>
                <span className="block w-full text-center py-2 rounded-xl bg-purple-600 text-white font-medium text-sm group-hover:bg-purple-700 transition">
                    Manage course
                </span>
            </div>
        </Link>
    );
}

function ProgressRow({ label, value, pct, color, textColor }) {
    return (
        <div>
            <div className="flex justify-between mb-1.5">
                <span className="text-sm text-[var(--muted)]">{label}</span>
                <span className={`text-sm font-bold ${textColor}`}>{value}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all`}
                    style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
        </div>
    );
}

function ManageLink({ Icon, label, to }) {
    return (
        <Link to={to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-purple-500/10 dark:hover:bg-purple-500/10 transition group">
            <Icon className="w-4 h-4 text-purple-500 group-hover:text-purple-400 flex-shrink-0" />
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );
}
