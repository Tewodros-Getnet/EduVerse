import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

const BADGE_ICONS = { streak: '', quiz_master: '', fast_learner: '', helper: '🤝' };

export default function Progress() {
    const [data, setData] = useState(null);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        api.get('/users/progress').then(res => setData(res.data)).catch(() => { });
        api.get('/quiz/student/results').then(res => {
            const attempts = res.data.attempts || [];
            // Group by week and compute average score per week
            const weekMap = {};
            attempts.forEach(a => {
                const d = new Date(a.completed_at);
                const week = `${d.getFullYear()}-W${Math.ceil((d.getDate()) / 7)}`;
                if (!weekMap[week]) weekMap[week] = { scores: [], label: `Week ${Object.keys(weekMap).length + 1}` };
                weekMap[week].scores.push(a.score);
            });
            const built = Object.values(weekMap).map(w => ({
                week: w.label,
                score: Math.round(w.scores.reduce((a, b) => a + b, 0) / w.scores.length),
            }));
            setChartData(built.length > 0 ? built : []);
        }).catch(() => { });
    }, []);

    const enrolled = data?.enrollments || [];
    const badges = data?.badges || [];
    const avgScore = parseFloat(data?.quiz_stats?.avg_score || 0).toFixed(0);
    const totalAttempts = data?.quiz_stats?.total_attempts || 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-[var(--text)]">My Progress</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Courses Enrolled', value: enrolled.length, icon: '', color: 'from-[var(--accent-tertiary)] to-[var(--accent-tertiary)]/80' },
                    { label: 'Avg Quiz Score', value: `${avgScore}%`, icon: '', color: 'from-green-500 to-cyan-400' },
                    { label: 'Quiz Attempts', value: totalAttempts, icon: '', color: 'from-orange-500 to-yellow-400' },
                    { label: 'Badges', value: badges.length, icon: '', color: 'from-[var(--accent-secondary)] to-[var(--accent-primary)]' },
                ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-[var(--text)]`}>
                        <div className="text-2xl mb-2">{s.icon}</div>
                        <div className="text-2xl font-bold">{s.value}</div>
                        <div className="text-xs opacity-80 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Score Chart */}
            <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-5">
                <h2 className="font-semibold text-[var(--text)] mb-4">Quiz Score Trend</h2>
                {chartData.length === 0 ? (
                    <p className="text-[var(--muted)] text-sm text-center py-8">Complete quizzes to see your score trend</p>
                ) : (
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" />
                        <XAxis dataKey="week" stroke="#6b7280" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid #7c3aed', borderRadius: 8 }} />
                        <Line type="monotone" dataKey="score" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899' }} />
                    </LineChart>
                </ResponsiveContainer>
                )}
            </div>

            {/* Course Progress */}
            <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-5">
                <h2 className="font-semibold text-[var(--text)] mb-4">Course Progress</h2>
                {enrolled.length === 0 ? (
                    <p className="text-[var(--muted)] text-sm">No courses enrolled yet.</p>
                ) : (
                    <div className="space-y-4">
                        {enrolled.map(course => (
                            <div key={course.id}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-[var(--text)] font-medium">{course.title}</span>
                                    <span className="text-[var(--muted)]">{course.progress_percent || 0}%</span>
                                </div>
                                <div className="w-full bg-[var(--surface-2)] rounded-full h-2">
                                    <div className="bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] h-2 rounded-full transition-all"
                                        style={{ width: `${course.progress_percent || 0}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Badges */}
            <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-5">
                <h2 className="font-semibold text-[var(--text)] mb-4">Badges Earned</h2>
                {badges.length === 0 ? (
                    <p className="text-[var(--muted)] text-sm">Complete courses and quizzes to earn badges!</p>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {badges.map(badge => (
                            <div key={badge.id} className="flex items-center gap-2 bg-[var(--surface-2)] border border-purple-900/30 rounded-xl px-4 py-2">
                                <span className="text-2xl">{BADGE_ICONS[badge.badge_type] || '🏅'}</span>
                                <span className="text-sm text-[var(--text)] capitalize">{badge.badge_type.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}




