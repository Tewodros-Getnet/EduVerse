import React, { useEffect, useState } from 'react';
import { BarChart2, Target, FileText, ClipboardList, FileCheck } from 'lucide-react';
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
                course: a.course_title || '—',
                score: a.score,
                date: a.completed_at,
            }));

            const assignments = (assignRes.data.submissions || [])
                .filter(s => s.score !== null)
                .map(s => {
                    const maxPoints = s.total_points || s.max_points || 100;
                    const pct = Math.min(100, Math.round((s.score / maxPoints) * 100));
                    return {
                        type: 'assignment',
                        name: s.title,
                        course: s.course_title || '—',
                        score: pct,
                        rawScore: s.score,
                        maxPoints,
                        date: s.submitted_at,
                    };
                });

            const assessments = (assessRes.data.results || []).map(r => ({
                type: 'assessment',
                name: r.assessment_title,
                course: r.course_title || '—',
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

    if (loading) return <div className="text-center py-20 text-[var(--muted)]">Loading grades...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">My Grades</h1>
            </div>

            {/* GPA Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Avg Score', value: `${grades.overallGPA}%`, Icon: BarChart2, color: 'from-[var(--accent-primary)]/80 to-[var(--accent-secondary)]/80' },
                    { label: 'Quizzes', value: grades.quizzes.length, Icon: Target, color: 'from-[var(--status-info)]/80 to-[var(--status-info)]/60' },
                    { label: 'Assignments', value: grades.assignments.length, Icon: ClipboardList, color: 'from-[var(--status-success)]/80 to-[var(--status-success)]/60' },
                    { label: 'Assessments', value: grades.assessments.length, Icon: FileCheck, color: 'from-[var(--status-warning)]/80 to-[var(--status-warning)]/60' },
                ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-[var(--text)] shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all duration-300`}>
                        <div className="mb-2">
                            <s.Icon className="w-6 h-6 text-[var(--text)]/80" />
                        </div>
                        <div className="text-3xl font-bold">{s.value}</div>
                        <div className="text-sm opacity-90 mt-1 font-medium">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'quizzes', 'assignments', 'assessments'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition capitalize ${filter === f ? 'bg-gradient-to-r from-[var(--accent-primary)]/80 to-[var(--accent-secondary)]/80 text-[var(--text)] shadow-lg shadow-purple-500/25' : 'bg-[var(--surface)] text-[var(--muted)] border border-purple-900/30 hover:text-[var(--text)] hover:border-purple-500/50'}`}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Grades Table */}
            <div className="bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] border border-purple-900/30 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-purple-900/30 bg-[var(--bg)]">
                                <th className="text-left px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Type</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Name</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Course</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Score</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayGrades.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-16 text-[var(--muted)]">
                                    <div className="text-4xl mb-3">📊</div>
                                    <div className="text-lg font-medium">No grades yet</div>
                                    <div className="text-sm mt-1">Complete quizzes, assignments, and assessments to see your grades here</div>
                                </td></tr>
                            ) : (
                                displayGrades.map((grade, i) => (
                                    <tr key={i} className="border-b border-purple-900/20 hover:bg-purple-900/10 transition">
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wide ${grade.type === 'quiz' ? 'bg-blue-600/20 text-blue-300 border border-[var(--accent-tertiary)]/30' :
                                                grade.type === 'assignment' ? 'bg-green-600/20 text-green-300 border border-green-500/30' :
                                                    'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30'
                                                }`}>
                                                {grade.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-[var(--text)]">{grade.name}</td>
                                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{grade.course}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-bold ${grade.score >= 80 ? 'text-green-400' : grade.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {grade.score}%
                                                {grade.type === 'assignment' && grade.maxPoints !== 100 && (
                                                    <span className="text-xs font-normal text-[var(--muted)] ml-1">
                                                        ({grade.rawScore}/{grade.maxPoints})
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{new Date(grade.date).toLocaleDateString()}</td>
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




