import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

const Assessments = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        api.get('/assessments/student')
            .then(res => setAssessments(res.data.assessments || []))
            .catch(() => toast.error('Failed to load assessments'))
            .finally(() => setLoading(false));
    }, []);

    const getStatus = (assessment) => {
        if (assessment.submitted) return 'completed';
        const now = new Date();
        const scheduled = new Date(assessment.scheduled_date);
        if (now < scheduled) return 'upcoming';
        return 'available';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed': return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">Completed</span>;
            case 'upcoming':  return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">Upcoming</span>;
            default:          return <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">Scheduled</span>;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'midterm':   return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'final':     return 'bg-red-500/20 text-red-300 border-red-500/30';
            case 'practical': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'project':   return 'bg-green-500/20 text-green-300 border-green-500/30';
            default:          return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        }
    };

    const filtered = filter === 'all'
        ? assessments
        : assessments.filter(a => getStatus(a) === filter);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">Assessments</h1>

            {/* Filter tabs */}
            <div className="flex gap-2">
                {['all', 'upcoming', 'available', 'completed'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                            filter === f
                                ? 'bg-purple-600 text-white'
                                : 'bg-[#12122a] text-gray-400 border border-purple-900/30 hover:text-white'
                        }`}
                    >
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
                        const status = getStatus(assessment);
                        return (
                            <div key={assessment.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-white">{assessment.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full border capitalize ${getTypeColor(assessment.type)}`}>
                                                {assessment.type}
                                            </span>
                                            {getStatusBadge(status)}
                                        </div>
                                        {assessment.description && (
                                            <p className="text-sm text-gray-400 mb-2">{assessment.description}</p>
                                        )}
                                        <p className="text-xs text-purple-400 mb-3">Course: {assessment.course_name}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <span>📅 {new Date(assessment.scheduled_date).toLocaleString()}</span>
                                            <span>⏱️ {assessment.duration_minutes} min</span>
                                        </div>
                                    </div>

                                    {assessment.submitted && assessment.score !== null && (
                                        <div className="text-right ml-4">
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

                                {!assessment.submitted && (
                                    <div className="mt-3 pt-3 border-t border-purple-900/30">
                                        <p className="text-xs text-gray-500">
                                            {status === 'upcoming'
                                                ? 'This assessment has not started yet. Your instructor will update your score after it takes place.'
                                                : 'Attend this assessment as scheduled. Your instructor will record your score.'}
                                        </p>
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
