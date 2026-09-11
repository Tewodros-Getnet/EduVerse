import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Assignments() {
    const { courseId } = useParams();
    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissionText, setSubmissionText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [viewingSubmission, setViewingSubmission] = useState(null);
    const [filter, setFilter] = useState('all'); // all, pending, submitted, graded
    const [sortBy, setSortBy] = useState('due_date'); // due_date, title, points

    useEffect(() => {
        Promise.all([
            api.get(`/assignments/course/${courseId}`),
            api.get('/assignments/student/submissions'),
        ]).then(([assignRes, subRes]) => {
            setAssignments(Array.isArray(assignRes.data) ? assignRes.data : assignRes.data.assignments || []);
            const subMap = {};
            (subRes.data.submissions || []).forEach(s => {
                subMap[s.assignment_id] = s;
            });
            setSubmissions(subMap);
        }).catch(() => toast.error('Failed to load assignments'))
            .finally(() => setLoading(false));
    }, [courseId]);

    const handleSubmit = async () => {
        if (!submissionText.trim()) {
            toast.error('Please enter your submission');
            return;
        }
        setSubmitting(true);
        try {
            await api.post(`/assignments/${selectedAssignment.id}/submit`, {
                submission_text: submissionText,
                course_id: courseId,
            });

            toast.success('Assignment submitted successfully!');
            setSubmissionText('');
            setSelectedAssignment(null);
            setShowSubmissionModal(false);

            // Refresh submissions
            const res = await api.get('/assignments/student/submissions');
            const subMap = {};
            (res.data.submissions || []).forEach(s => {
                subMap[s.assignment_id] = s;
            });
            setSubmissions(subMap);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const openSubmissionModal = (assignment) => {
        setSelectedAssignment(assignment);
        setShowSubmissionModal(true);
        setSubmissionText('');
    };

    const closeSubmissionModal = () => {
        setShowSubmissionModal(false);
        setSelectedAssignment(null);
        setSubmissionText('');
    };

    const viewSubmissionDetails = (assignment, submission) => {
        setViewingSubmission({ assignment, submission });
    };

    const getAssignmentStatus = (assignment, submission) => {
        if (!submission) return 'pending';
        if (submission && submission.score !== null) return 'graded';
        return 'submitted';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'graded': return 'bg-green-500/20 text-green-300 border border-green-500/30';
            case 'submitted': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
            case 'overdue': return 'bg-red-500/20 text-red-300 border border-red-500/30';
            default: return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
        }
    };

    const isOverdue = (assignment) => {
        return new Date(assignment.due_date) < new Date() && !submissions[assignment.id];
    };

    const getDaysUntilDue = (dueDate) => {
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        return `Due in ${diffDays} days`;
    };

    const getFilteredAndSortedAssignments = () => {
        let filtered = assignments || [];

        // Apply filter
        if (filter !== 'all') {
            filtered = filtered.filter(assignment => {
                const submission = submissions[assignment.id];
                const status = getAssignmentStatus(assignment, submission);

                switch (filter) {
                    case 'pending': return !submission;
                    case 'submitted': return submission && submission.score === null;
                    case 'graded': return submission && submission.score !== null;
                    default: return true;
                }
            });
        }

        // Apply sorting
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'points':
                    return b.max_points - a.max_points;
                case 'due_date':
                default:
                    return new Date(a.due_date) - new Date(b.due_date);
            }
        });
    };

    if (loading) return <div className="text-center py-20 text-gray-400">Loading assignments...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Assignments</h1>
                <div className="text-sm text-gray-400">
                    {(assignments || []).length} assignments • {Object.keys(submissions || {}).length} submitted
                </div>
            </div>

            {/* Filters and Sorting */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                <div className="flex flex-wrap gap-3">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm"
                    >
                        <option value="all">All Assignments</option>
                        <option value="pending">Pending</option>
                        <option value="submitted">Submitted</option>
                        <option value="graded">Graded</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm"
                    >
                        <option value="due_date">Sort by Due Date</option>
                        <option value="title">Sort by Title</option>
                        <option value="points">Sort by Points</option>
                    </select>
                </div>
            </div>

            {(assignments || []).length === 0 ? (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center text-gray-400">
                    <div className="mb-4">
                        <div className="w-16 h-16 bg-[#1a1a35] rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">📋</span>
                        </div>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No assignments yet</h3>
                    <p className="text-sm text-gray-400">Check back later for new assignments from your instructor</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {getFilteredAndSortedAssignments().map(assignment => {
                        const submission = submissions[assignment.id];
                        const status = getAssignmentStatus(assignment, submission);
                        const overdue = isOverdue(assignment);

                        return (
                            <div key={assignment.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-white">{assignment.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(overdue ? 'overdue' : status)}`}>
                                                {overdue ? 'Overdue' : status.charAt(0).toUpperCase() + status.slice(1)}
                                                    {submission && submission.score !== null && ` - ${submission.score}/${assignment.max_points}`}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-3">{assignment.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <span>📅 {getDaysUntilDue(assignment.due_date)}</span>
                                            <span>⭐ {assignment.max_points} points</span>
                                            {submission && (
                                                <span>📝 Submitted {new Date(submission.submitted_at).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Submission Preview */}
                                {submission ? (
                                    <div className="bg-[#1a1a35] rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-gray-300 font-medium mb-2">Your Submission</p>
                                                <p className="text-gray-400 text-sm line-clamp-3">
                                                    {submission.content || 'No text submission'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => viewSubmissionDetails(assignment, submission)}
                                                className="px-3 py-1 bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-300 hover:bg-purple-600/40 transition"
                                            >
                                                View Details
                                            </button>
                                        </div>

                                        {submission && submission.feedback && (
                                            <div className="mt-3 pt-3 border-t border-purple-900/30">
                                                <p className="text-purple-300 text-xs font-medium mb-1">Instructor Feedback:</p>
                                                <p className="text-gray-400 text-sm">{submission.feedback}</p>
                                            </div>
                                        )}

                                        {submission && submission.score !== null && (
                                            <div className="mt-3 pt-3 border-t border-purple-900/30">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-sm">Grade:</span>
                                                    <span className="text-lg font-bold text-green-400">
                                                        {submission.score}/{assignment.max_points}
                                                        ({Math.round((submission.score / assignment.max_points) * 100)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => openSubmissionModal(assignment)}
                                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${overdue
                                                ? 'bg-red-600/30 border border-red-500/30 text-red-300 hover:bg-red-600/40'
                                                : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90'
                                                }`}
                                        >
                                            {overdue ? 'Submit (Late)' : 'Submit Assignment'}
                                        </button>
                                        {assignment.instructions_url && (
                                            <a
                                                href={assignment.instructions_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-sm text-gray-400 hover:text-white transition"
                                            >
                                                📄 Instructions
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Submission Modal */}
            {showSubmissionModal && selectedAssignment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold text-white">Submit: {selectedAssignment.title}</h2>
                            <button
                                onClick={closeSubmissionModal}
                                className="text-gray-400 hover:text-white"
                            >
                                ←
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-400 mb-2">{selectedAssignment.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span>📅 Due: {new Date(selectedAssignment.due_date).toLocaleDateString()}</span>
                                <span>⭐ {selectedAssignment.max_points} points</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Your Answer</label>
                                <textarea
                                    value={submissionText}
                                    onChange={(e) => setSubmissionText(e.target.value)}
                                    placeholder="Enter your submission..."
                                    rows={6}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm resize-none"
                                />
                            </div>

                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Submit Assignment'}
                            </button>
                            <button
                                onClick={closeSubmissionModal}
                                className="px-6 py-3 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 hover:text-white transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submission Details Modal */}
            {viewingSubmission && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold text-white">Submission Details</h2>
                            <button
                                onClick={() => setViewingSubmission(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ←
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-white font-medium mb-2">{viewingSubmission.assignment.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span>📅 Submitted: {new Date(viewingSubmission.submission.submitted_at).toLocaleDateString()}</span>
                                    {viewingSubmission.submission.score !== null && (
                                        <span>⭐ Grade: {viewingSubmission.submission.score}/{viewingSubmission.assignment.max_points}</span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-[#1a1a35] rounded-xl p-4">
                                <h4 className="text-white font-medium mb-2">Your Submission</h4>
                                <p className="text-gray-300">{viewingSubmission.submission.content || 'No text submission'}</p>
                            </div>

                            {viewingSubmission.submission.feedback && (
                                <div className="bg-[#1a1a35] rounded-xl p-4">
                                    <h4 className="text-white font-medium mb-2">Instructor Feedback</h4>
                                    <p className="text-gray-300">{viewingSubmission.submission.feedback}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
