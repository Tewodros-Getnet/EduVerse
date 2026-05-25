import React, { useEffect, useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import api from '../api/axios';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#14b8a6', '#a855f7'];

function aggregateCourseCategories(courseStats) {
    if (!courseStats?.length) return [];
    const map = {};
    courseStats.forEach((row) => {
        const key = row.category || 'Other';
        map[key] = (map[key] || 0) + parseInt(row.count, 10) || 0;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
}

export default function Analytics() {
    const [period, setPeriod] = useState('Month');
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([api.get('/analytics/admin/dashboard'), api.get('/admin/analytics')])
            .then(([dashRes, anRes]) => {
                if (!cancelled) {
                    setDashboard(dashRes.data);
                    setAnalytics(anRes.data);
                }
            })
            .catch(() => {
                toast.error('Failed to load analytics');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const overview = dashboard?.overview;

    const aiQueryTotal = useMemo(() => {
        const rows = analytics?.ai_usage || [];
        return rows.reduce((sum, r) => sum + (parseInt(r.queries, 10) || 0), 0);
    }, [analytics]);

    const userLineData = useMemo(() => {
        if (period === 'Week') {
            return [...(analytics?.user_growth || [])]
                .reverse()
                .map((r) => ({
                    label: r.week
                        ? new Date(r.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : '',
                    new_users: parseInt(r.new_users, 10) || 0,
                }));
        }
        return (dashboard?.user_growth || []).map((r) => ({
            label: r.month
                ? new Date(r.month).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                : '',
            new_users: parseInt(r.new_users, 10) || 0,
        }));
    }, [period, analytics, dashboard]);

    const aiBarData = useMemo(() => {
        return [...(analytics?.ai_usage || [])].reverse().map((r) => ({
            label: r.day ? new Date(r.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
            queries: parseInt(r.queries, 10) || 0,
        }));
    }, [analytics]);

    const pieData = useMemo(() => aggregateCourseCategories(analytics?.course_stats), [analytics]);

    const statCards = useMemo(
        () => [
            {
                label: 'Total users',
                value: overview?.total_users != null ? overview.total_users.toLocaleString() : '—',
                gradient: 'from-blue-500 to-cyan-400',
                icon: '👥',
                hint: `${overview?.active_users ?? 0} active`,
            },
            {
                label: 'Avg. completion',
                value: overview?.avg_progress != null ? `${Math.round(overview.avg_progress)}%` : '—',
                gradient: 'from-emerald-500 to-teal-400',
                icon: '🎯',
                hint: 'Mean enrollment progress',
            },
            {
                label: 'AI chat (window)',
                value: aiQueryTotal.toLocaleString(),
                gradient: 'from-indigo-500 to-purple-500',
                icon: '🧠',
                hint: 'Messages in sampled days',
            },
            {
                label: 'Avg. quiz score',
                value:
                    analytics?.quiz_stats?.avg_score != null
                        ? `${Math.round(parseFloat(analytics.quiz_stats.avg_score))}%`
                        : '—',
                gradient: 'from-orange-500 to-amber-400',
                icon: '🏆',
                hint: `${analytics?.quiz_stats?.total ?? 0} attempts`,
            },
        ],
        [overview, analytics, aiQueryTotal]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">Analytics</h1>
                    <p className="text-[var(--muted)] text-sm mt-1">Live metrics from your platform database</p>
                </div>
                <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Time range">
                    {['Week', 'Month'].map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                                period === p
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--text)]'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg`}
                    >
                        <div className="text-2xl mb-2">{card.icon}</div>
                        <div className="text-2xl sm:text-3xl font-bold">{card.value}</div>
                        <div className="text-sm opacity-90 mt-1">{card.label}</div>
                        <div className="text-xs opacity-75 mt-1">{card.hint}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-[var(--text)] mb-4">
                        {period === 'Week' ? 'New users by week' : 'New users by month'}
                    </h3>
                    {userLineData.length === 0 ? (
                        <p className="text-sm text-[var(--muted)] py-8 text-center">No user growth data yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={userLineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--surface-2)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        color: 'var(--text)',
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="new_users"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    dot={{ fill: '#6366f1', r: 3 }}
                                    name="New users"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-[var(--text)] mb-4">AI tutor messages by day</h3>
                    {aiBarData.length === 0 ? (
                        <p className="text-sm text-[var(--muted)] py-8 text-center">No AI usage logged yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={aiBarData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--surface-2)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        color: 'var(--text)',
                                    }}
                                />
                                <Bar dataKey="queries" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Queries" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-[var(--text)] mb-4">Courses by category</h3>
                    {pieData.length === 0 ? (
                        <p className="text-sm text-[var(--muted)] py-8 text-center">No course category data.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={88}
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--surface-2)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        color: 'var(--text)',
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-[var(--text)] mb-4">Quiz performance</h3>
                    <div className="space-y-4 mt-2">
                        <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                            <p className="text-sm text-[var(--muted)]">Average score (all attempts)</p>
                            <p className="text-3xl font-bold text-[var(--text)] mt-1">
                                {analytics?.quiz_stats?.avg_score != null
                                    ? `${Math.round(parseFloat(analytics.quiz_stats.avg_score))}%`
                                    : '—'}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                            <p className="text-sm text-[var(--muted)]">Total graded attempts</p>
                            <p className="text-3xl font-bold text-[var(--text)] mt-1">
                                {(analytics?.quiz_stats?.total ?? 0).toLocaleString()}
                            </p>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                            Figures come from quiz attempts and chat history stored in the database. If tables are empty,
                            charts will fill as learners use the platform.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
