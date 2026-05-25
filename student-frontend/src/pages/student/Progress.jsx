import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

const MOCK_CHART = [
    { week: 'Week 1', score: 45 }, { week: 'Week 2', score: 58 },
    { week: 'Week 3', score: 67 }, { week: 'Week 4', score: 74 },
];

const BADGE_ICONS = { streak: '', quiz_master: '', fast_learner: '', helper: '🤝' };

export default function Progress() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get('/users/progress').then(res => setData(res.data)).catch(() => { });
    }, []);

    const enrolled = data?.enrollments || [];
    const badges = data?.badges || [];
    const avgScore = parseFloat(data?.quiz_stats?.avg_score || 0).toFixed(0);
    const totalAttempts = data?.quiz_stats?.total_attempts || 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">My Progress</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Courses Enrolled', value: enrolled.length, icon: '', color: 'from-blue-500 to-cyan-400' },
                    { label: 'Avg Quiz Score', value: `${avgScore}%`, icon: '', color: 'from-green-500 to-emerald-400' },
                    { label: 'Quiz Attempts', value: totalAttempts, icon: '', color: 'from-orange-500 to-yellow-400' },
                    { label: 'Badges', value: badges.length, icon: '', color: 'from-pink-500 to-purple-500' },
                ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white`}>
                        <div className="text-2xl mb-2">{s.icon}</div>
                        <div className="text-2xl font-bold">{s.value}</div>
                        <div className="text-xs opacity-80 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Score Chart */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                <h2 className="font-semibold text-white mb-4">Quiz Score Trend</h2>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={MOCK_CHART}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a35" />
                        <XAxis dataKey="week" stroke="#6b7280" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: '#1a1a35', border: '1px solid #7c3aed', borderRadius: 8 }} />
                        <Line type="monotone" dataKey="score" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899' }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Course Progress */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                <h2 className="font-semibold text-white mb-4">Course Progress</h2>
                {enrolled.length === 0 ? (
                    <p className="text-gray-400 text-sm">No courses enrolled yet.</p>
                ) : (
                    <div className="space-y-4">
                        {enrolled.map(course => (
                            <div key={course.id}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-white font-medium">{course.title}</span>
                                    <span className="text-gray-400">{course.progress_percent || 0}%</span>
                                </div>
                                <div className="w-full bg-[#1a1a35] rounded-full h-2">
                                    <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all"
                                        style={{ width: `${course.progress_percent || 0}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Badges */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                <h2 className="font-semibold text-white mb-4">Badges Earned</h2>
                {badges.length === 0 ? (
                    <p className="text-gray-400 text-sm">Complete courses and quizzes to earn badges!</p>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {badges.map(badge => (
                            <div key={badge.id} className="flex items-center gap-2 bg-[#1a1a35] border border-purple-900/30 rounded-xl px-4 py-2">
                                <span className="text-2xl">{BADGE_ICONS[badge.badge_type] || '🏅'}</span>
                                <span className="text-sm text-white capitalize">{badge.badge_type.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
