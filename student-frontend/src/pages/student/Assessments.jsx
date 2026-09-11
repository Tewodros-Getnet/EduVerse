import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

// Types that have online exam-taking
const EXAM_TYPES = ['exam', 'midterm', 'final'];

const TYPE_COLORS = {
    exam:    'bg-purple-500/20 text-purple-300 border-purple-500/30',
    midterm: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    final:   'bg-red-500/20    text-red-300    border-red-500/30',
    project: 'bg-green-500/20  text-green-300  border-green-500/30',
};

const Assessments = () => {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [filter,      setFilter]      = useState('all');

    useEffect(() => {
        api.get('/assessments/student')
            .then(res => setAssessments(res.data.assessments || []))
            .catch(() => toast.error('Failed to load assessments'))
            .finally(() => setLoading(false));
    }, []);

    const getStatus = (assessment) => {
        if (assessment.submitted) return 'completed';
        const now       = new Date();
        const start     = new Date(assessment.scheduled_date);
        const end       = new Date(start.getTime() + assessment.duration_minutes * 60000);
        if (now < start) return 'upcoming';
        if (now <= end)  return 'available'; // window is open
        return 'closed'; // window passed without submission
    };

    const getStatusBadge = (status) => {
        const map = {
            completed: 'bg-green-500/20  text-green-400  Completed',
            upcoming:  'bg-blue-500/20   text-blue-400   Upcoming',
            available: 'bg-purple-500/20 text-purple-400 Available',
            closed:    'bg-gray-500/20   text-gray-400   Closed',
        };
        const [bg, text, label] = (map[status] || map.upcoming).split(' ');
        return <span className={`px-2 py-1 ${bg} ${text} rounded-full text-xs font-medium`}>{label}</span>;
    };

    const filtered = filter === 'all'
        ? assessments
        : assessments.filter(a => getStatus(a) === filter);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">Assessments</h1>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {['all', 'upcoming', 'available', 'completed', 'closed'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                            filter === f
                                ? 'bg-purple-600 text-white'
                                : 'bg-[#12122a] text-gray-400 border border-purple-900/30 hover:text-white'
                        }`}>
                        {f}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center text-gray-400">
                    <p className="text-lg font-medium text-white mb-2">No assessments found</p>
                    <p className="text-sm">Your instructor will schedule assessments for your enrolled courses</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(assessment => {
                        const status     = getStatus(assessment);
                        const isExamType = EXAM_TYPES.includes(assessment.type);
                        const canStart   = isExamType && status === 'available' && assessment.has_questions;
                        const isWindow   = status === 'available';

                        return (
                            <div key={assessment.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 flex-wrap mb-2">
                                            <h3 className="font-semibold text-white">{assessment.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full border capitalize ${TYPE_COLORS[assessment.type] || TYPE_COLORS.exam}`}>
                                                {assessment.type}
                                            </span>
                                            {getStatusBadge(status)}
                                        </div>
                                        {assessment.description && (
                                            <p className="text-sm text-gray-400 mb-2">{assessment.description}</p>
                                        )}
                                        <p className="text-xs text-purple-400 mb-3">
                                            📚 {assessment.course_name || assessment.courseName}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <span>📅 {new Date(assessment.scheduled_date).toLocaleString()}</span>
                                            <span>⏱️ {assessment.duration_minutes} min</span>
                                            {isExamType && <span>🎯 Pass: {assessment.passing_score || 60}%</span>}
                                        </div>
                                    </div>

                                    {/* Score display if graded */}
                                    {assessment.submitted && assessment.score !== null && (
                                        <div className="text-right ml-4 flex-shrink-0">
                                            <div className={`text-2xl font-bold ${
                                                assessment.score >= 80 ? 'text-green-400' :
                                                assessment.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                                {assessment.score}%
                                            </div>
                                            <div className="text-xs text-gray-400">Score</div>
                                        </div>
                                    )}
                                </div>

                                {/* Remarks / Feedback */}
                                {assessment.submitted && assessment.remarks && (
                                    <div className="mt-3 pt-3 border-t border-purple-900/30">
                                        <p className="text-xs text-purple-300 font-medium mb-1">Instructor Remarks:</p>
                                        <p className="text-sm text-gray-300">{assessment.remarks}</p>
                                    </div>
                                )}
                                {assessment.submitted && assessment.feedback && (
                                    <div className="mt-2">
                                        <p className="text-xs text-blue-300 font-medium mb-1">Feedback:</p>
                                        <p className="text-sm text-gray-300">{assessment.feedback}</p>
                                    </div>
                                )}

                                {/* Action area */}
                                {!assessment.submitted && (
                                    <div className="mt-3 pt-3 border-t border-purple-900/30">
                                        {canStart ? (
                                            /* Online exam available — show Start button */
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-green-400 font-medium">
                                                    🟢 Exam window is open — good luck!
                                                </p>
                                                <button
                                                    onClick={() => navigate(`/student/exam/${assessment.id}`)}
                                                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition shadow-lg shadow-purple-500/25"
                                                >
                                                    🚀 Start Exam
                                                </button>
                                            </div>
                                        ) : isWindow && isExamType && !assessment.has_questions ? (
                                            /* Window open but no questions added yet */
                                            <p className="text-xs text-orange-400">
                                                ⚠️ Your instructor hasn't added questions to this exam yet.
                                            </p>
                                        ) : (
                                            /* Not an exam type (project) or not in window */
                                            <p className="text-xs text-gray-500">
                                                {status === 'upcoming'
                                                    ? `Starts ${new Date(assessment.scheduled_date).toLocaleString()}`
                                                    : status === 'closed'
                                                    ? 'The exam window has passed.'
                                                    : assessment.type === 'project'
                                                    ? 'Submit your project as directed by your instructor.'
                                                    : 'Your instructor will record your score after the assessment.'}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Assessments;
