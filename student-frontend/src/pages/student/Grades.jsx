import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Grades() {
    const [grades, setGrades] = useState({
        quizzes: [],
        assignments: [],
        assessments: [],
        overallGPA: 0,
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        Promise.all([
            api.get('/quiz/student/results'),
            api.get('/assignments/student/submissions'),
            api.get('/assessments/my/results'),
        ]).then(([quizRes, assignRes, assessRes]) => {
            const quizzes = (quizRes.data.attempts || []).map(a => ({
                type: 'quiz',
                name: a.quiz_title || a.title,
                score: a.score,
                date: a.completed_at,
            }));

            const assignments = (assignRes.data.submissions || [])
                .filter(s => s.score !== null)
                .map(s => ({
                    type: 'assignment',
                    name: s.title,
                    score: s.score,
                    date: s.submitted_at,
                    maxPoints: s.total_points || s.max_points,
                }));

            const assessments = (assessRes.data.results || []).map(r => ({
                type: 'assessment',
                name: r.assessment_title,
                score: r.score,
                date: r.updated_at || r.created_at,
                assessmentType: r.assessment_type,
            }));

            const allGrades = [...quizzes, ...assignments, ...assessments];
            const avg = allGrades.length > 0
                ? (allGrades.reduce((sum, g) => sum + (g.score || 0), 0) / allGrades.length)
                : 0;

            setGrades({
                quizzes,
                assignments,
                assessments,
                overallGPA: Math.round(avg),
            });
        }).catch(() => toast.error('Failed to load grades'))
            .finally(() => setLoading(false));
    }, []);

    const getDisplayGrades = () => {
        if (filter === 'quizzes') return grades.quizzes;
        if (filter === 'assignments') return grades.assignments;
        if (filter === 'assessments') return grades.assessments;
        return [...grades.quizzes, ...grades.assignments, ...grades.assessments];
    };

    const displayGrades = getDisplayGrades();

    if (loading) return <div className="text-center py-20 text-gray-400">Loading grades...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">📊 My Grades</h1>
            </div>

            {/* GPA Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Overall GPA', value: grades.overallGPA, icon: '🎯', color: 'from-purple-600 to-pink-600' },
                    { label: 'Quizzes', value: grades.quizzes.length, icon: '📝', color: 'from-blue-600 to-cyan-500' },
                    { label: 'Assignments', value: grades.assignments.length, icon: '📋', color: 'from-green-600 to-emerald-500' },
                    { label: 'Assessments', value: grades.assessments.length, icon: '📑', color: 'from-yellow-600 to-orange-500' },
                ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all duration-300`}>
                        <div className="text-3xl mb-2">{s.icon}</div>
                        <div className="text-3xl font-bold">{s.value}</div>
                        <div className="text-sm opacity-90 mt-1 font-medium">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'quizzes', 'assignments', 'assessments'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition capitalize ${filter === f ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25' : 'bg-[#12122a] text-gray-400 border border-purple-900/30 hover:text-white hover:border-purple-500/50'}`}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Grades Table */}
            <div className="bg-gradient-to-br from-[#1a1a35] to-[#12122a] border border-purple-900/30 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-purple-900/30 bg-[#0d0d1a]">
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Type</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Score</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-300 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayGrades.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-16 text-gray-500">
                                    <div className="text-4xl mb-3">📊</div>
                                    <div className="text-lg font-medium">No grades yet</div>
                                    <div className="text-sm mt-1">Complete quizzes, assignments, and assessments to see your grades here</div>
                                </td></tr>
                            ) : (
                                displayGrades.map((grade, i) => (
                                    <tr key={i} className="border-b border-purple-900/20 hover:bg-purple-900/10 transition">
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wide ${grade.type === 'quiz' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' :
                                                grade.type === 'assignment' ? 'bg-green-600/20 text-green-300 border border-green-500/30' :
                                                    'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30'
                                                }`}>
                                                {grade.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-white">{grade.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-bold ${grade.score >= 80 ? 'text-green-400' : grade.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {grade.score}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{new Date(grade.date).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
