import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

const InstructorAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [showSubmissions, setShowSubmissions] = useState(null);
    const [showAnalytics, setShowAnalytics] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [gradingMode, setGradingMode] = useState(false);
    const [bulkGrades, setBulkGrades] = useState({});
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        onConfirm: null
    });

    const openConfirm = ({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm }) => {
        setConfirmDialog({ open: true, title, message, confirmLabel, cancelLabel, onConfirm });
    };

    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, open: false, onConfirm: null }));

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        courseId: '',
        dueDate: '',
        maxPoints: 100,
        instructions: ''
    });

    useEffect(() => {
        fetchAssignments();
        fetchCourses();
    }, []);

    const fetchAssignments = async () => {
        try {
            const response = await api.get('/assignments/instructor');
            setAssignments(response.data);
        } catch (error) {
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses/instructor');
            setCourses(Array.isArray(response.data) ? response.data : response.data.courses || []);
        } catch (error) {
            toast.error('Failed to load courses');
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/assignments', formData);
            toast.success('Assignment created successfully!');
            setShowCreateForm(false);
            setFormData({
                title: '',
                description: '',
                courseId: '',
                dueDate: '',
                maxPoints: 100,
                instructions: ''
            });
            fetchAssignments();
        } catch (error) {
            toast.error('Failed to create assignment');
        }
    };

    const handleDeleteAssignment = (id) => {
        openConfirm({
            title: 'Delete assignment',
            message: 'Are you sure you want to delete this assignment?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`/assignments/${id}`);
                    toast.success('Assignment deleted successfully!');
                    fetchAssignments();
                } catch (error) {
                    toast.error('Failed to delete assignment');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const fetchSubmissions = async (assignmentId) => {
        try {
            const response = await api.get(`/assignments/${assignmentId}/submissions`);
            setSubmissions(response.data.submissions);
            setShowSubmissions(assignmentId);
        } catch (error) {
            toast.error('Failed to fetch submissions');
        }
    };

    const fetchAnalytics = async (assignmentId) => {
        try {
            const response = await api.get(`/assignments/${assignmentId}/analytics`);
            setAnalytics(response.data);
            setShowAnalytics(assignmentId);
        } catch (error) {
            toast.error('Failed to fetch analytics');
        }
    };

    const handleGradeSubmission = async (submissionId, score, feedback) => {
        try {
            await api.post(`/assignments/${showSubmissions}/grade`, {
                submission_id: submissionId,
                score,
                feedback
            });
            toast.success('Submission graded successfully!');
            fetchSubmissions(showSubmissions);
        } catch (error) {
            toast.error('Failed to grade submission');
        }
    };

    const handleBulkGrade = async () => {
        const grades = Object.entries(bulkGrades).map(([submissionId, grade]) => ({
            submission_id: parseInt(submissionId),
            score: grade.score,
            feedback: grade.feedback || ''
        }));

        if (grades.length === 0) {
            toast.error('No grades to submit');
            return;
        }

        try {
            await api.post(`/assignments/${showSubmissions}/bulk-grade`, { grades });
            toast.success(`${grades.length} submissions graded successfully!`);
            setBulkGrades({});
            setGradingMode(false);
            fetchSubmissions(showSubmissions);
        } catch (error) {
            toast.error('Failed to bulk grade submissions');
        }
    };

    const handleExport = async (assignmentId, format = 'json') => {
        try {
            const response = await api.get(`/assignments/${assignmentId}/export?format=${format}`);

            if (format === 'csv') {
                // Create download link for CSV
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `assignment_${assignmentId}_submissions.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                // Download JSON
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `assignment_${assignmentId}_submissions.json`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            toast.error('Failed to export data');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Assignments</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                >
                    + Create Assignment
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-4">Create New Assignment</h2>
                    <form onSubmit={handleCreateAssignment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Course</label>
                                <select
                                    value={formData.courseId}
                                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    required
                                >
                                    <option value="">Select a course</option>
                                    {(courses || []).map(course => (
                                        <option key={course.id} value={course.id}>{course.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Max Points</label>
                                <input
                                    type="number"
                                    value={formData.maxPoints}
                                    onChange={(e) => setFormData({ ...formData, maxPoints: parseInt(e.target.value) })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Instructions</label>
                            <textarea
                                value={formData.instructions}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                rows={4}
                                className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                            >
                                Create Assignment
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="px-5 py-2.5 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(assignments || []).map(assignment => (
                    <div key={assignment.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-white">{assignment.title}</h3>
                                <p className="text-sm text-gray-400 mt-1">{assignment.course_title}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${assignment.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                                } `}>
                                {assignment.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-4 line-clamp-2">{assignment.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                            <span>📅 Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                            <span>🎯 {assignment.max_points} points</span>
                            <span>📝 {assignment.submitted_count || 0}/{assignment.submission_count || 0} submitted</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => fetchSubmissions(assignment.id)}
                                className="flex-1 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-purple-400 text-sm hover:bg-purple-600/20 transition"
                            >
                                View Submissions
                            </button>
                            <button
                                onClick={() => fetchAnalytics(assignment.id)}
                                className="px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                            >
                                Analytics
                            </button>
                            <button
                                onClick={() => handleExport(assignment.id, 'csv')}
                                className="px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                            >
                                Export
                            </button>
                            <button
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="px-3 py-2 bg-red-600/20 border border-red-600/40 rounded-xl text-red-400 text-sm hover:bg-red-600/30 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {(assignments || []).length === 0 && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 mb-4">No assignments created yet.</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                    >
                        Create Your First Assignment
                    </button>
                </div>
            )}

            <ConfirmModal
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                cancelLabel={confirmDialog.cancelLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />

            {/* Submissions Modal */}
            {showSubmissions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Assignment Submissions</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setGradingMode(!gradingMode)}
                                    className={`px-3 py-1 rounded-lg text-sm ${gradingMode ? 'bg-purple-600 text-white' : 'bg-[#1a1a35] text-gray-400'}`}
                                >
                                    {gradingMode ? 'Exit Bulk Grade' : 'Bulk Grade'}
                                </button>
                                <button
                                    onClick={() => { setShowSubmissions(null); setGradingMode(false); setBulkGrades({}); }}
                                    className="text-gray-400 hover:text-white"
                                >
                                    ←
                                </button>
                            </div>
                        </div>

                        {gradingMode && (
                            <div className="mb-4 p-3 bg-purple-600/20 rounded-lg">
                                <p className="text-purple-300 text-sm mb-2">Bulk grading mode - Enter scores and feedback for all submissions</p>
                                <button
                                    onClick={handleBulkGrade}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                                >
                                    Submit All Grades
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            {submissions.map(submission => (
                                <div key={submission.id} className="bg-[#1a1a35] rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-medium text-white">{submission.student_name}</h4>
                                            <p className="text-sm text-gray-400">{submission.student_email}</p>
                                            <p className="text-xs text-gray-500">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            {submission.score !== null ? (
                                                <div>
                                                    <span className="text-lg font-bold text-green-400">{submission.score}</span>
                                                    <span className="text-sm text-gray-400">/{submissions.find(s => s.id === submission.id)?.assignment?.max_points || 100}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-yellow-400">Not graded</span>
                                            )}
                                        </div>
                                    </div>

                                    {submission.content && (
                                        <div className="mb-3 p-2 bg-[#12122a] rounded text-sm text-gray-300">
                                            {submission.content}
                                        </div>
                                    )}

                                    {gradingMode ? (
                                        <div className="space-y-2">
                                            <input
                                                type="number"
                                                placeholder="Score"
                                                max="100"
                                                value={bulkGrades[submission.id]?.score || ''}
                                                onChange={(e) => setBulkGrades(prev => ({
                                                    ...prev,
                                                    [submission.id]: { ...prev[submission.id], score: parseInt(e.target.value) || '' }
                                                }))}
                                                className="w-full px-3 py-2 bg-[#12122a] border border-purple-900/40 rounded-lg text-white text-sm"
                                            />
                                            <textarea
                                                placeholder="Feedback"
                                                value={bulkGrades[submission.id]?.feedback || ''}
                                                onChange={(e) => setBulkGrades(prev => ({
                                                    ...prev,
                                                    [submission.id]: { ...prev[submission.id], feedback: e.target.value }
                                                }))}
                                                className="w-full px-3 py-2 bg-[#12122a] border border-purple-900/40 rounded-lg text-white text-sm resize-none"
                                                rows={2}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {submission.feedback && (
                                                <div className="p-2 bg-[#12122a] rounded text-sm text-gray-300">
                                                    <strong>Feedback:</strong> {submission.feedback}
                                                </div>
                                            )}
                                            {submission.score === null && (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Score"
                                                        max="100"
                                                        id={`grade-${submission.id}`}
                                                        className="flex-1 px-3 py-2 bg-[#12122a] border border-purple-900/40 rounded-lg text-white text-sm"
                                                    />
                                                    <textarea
                                                        placeholder="Feedback"
                                                        id={`feedback-${submission.id}`}
                                                        className="flex-1 px-3 py-2 bg-[#12122a] border border-purple-900/40 rounded-lg text-white text-sm resize-none"
                                                        rows={2}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const score = document.getElementById(`grade-${submission.id}`).value;
                                                            const feedback = document.getElementById(`feedback-${submission.id}`).value;
                                                            if (score) {
                                                                handleGradeSubmission(submission.id, parseInt(score), feedback);
                                                            }
                                                        }}
                                                        className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                                                    >
                                                        Grade
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Analytics Modal */}
                        {showAnalytics && analytics && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-white">Assignment Analytics</h3>
                                        <button
                                            onClick={() => setShowAnalytics(null)}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            ←
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Assignment Details */}
                                        <div className="bg-[#1a1a35] rounded-xl p-4">
                                            <h4 className="font-medium text-white mb-2">{analytics.assignment_details.title}</h4>
                                            <p className="text-sm text-gray-400">{analytics.assignment_details.course_title}</p>
                                            <div className="flex gap-4 mt-2 text-sm text-gray-400">
                                                <span>Due: {new Date(analytics.assignment_details.due_date).toLocaleDateString()}</span>
                                                <span>Max Points: {analytics.assignment_details.max_points}</span>
                                            </div>
                                        </div>

                                        {/* Submission Stats */}
                                        <div className="bg-[#1a1a35] rounded-xl p-4">
                                            <h4 className="font-medium text-white mb-3">Submission Statistics</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-gray-400 text-sm">Total Submissions</p>
                                                    <p className="text-white text-xl font-bold">{analytics.submission_stats.total_submissions || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Graded Submissions</p>
                                                    <p className="text-white text-xl font-bold">{analytics.submission_stats.graded_submissions || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Average Score</p>
                                                    <p className="text-white text-xl font-bold">{Math.round(analytics.submission_stats.avg_score || 0)}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">On-Time Submissions</p>
                                                    <p className="text-white text-xl font-bold">{analytics.submission_stats.on_time_submissions || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Highest Score</p>
                                                    <p className="text-white text-xl font-bold">{Math.round(analytics.submission_stats.max_score || 0)}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Lowest Score</p>
                                                    <p className="text-white text-xl font-bold">{Math.round(analytics.submission_stats.min_score || 0)}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Distribution */}
                                        <div className="bg-[#1a1a35] rounded-xl p-4">
                                            <h4 className="font-medium text-white mb-3">Grade Distribution</h4>
                                            <div className="space-y-2">
                                                {analytics.score_distribution.map(dist => (
                                                    <div key={dist.grade_range} className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-400">{dist.grade_range}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-32 bg-gray-700 rounded-full h-2">
                                                                <div
                                                                    className="bg-purple-500 h-2 rounded-full"
                                                                    style={{ width: `${(dist.count / (analytics.submission_stats.total_submissions || 1)) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm text-white font-medium w-8">{dist.count}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Time Analysis */}
                                        <div className="bg-[#1a1a35] rounded-xl p-4">
                                            <h4 className="font-medium text-white mb-3">Time Analysis</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-gray-400 text-sm">Late Submissions</p>
                                                    <p className="text-white text-lg font-bold">{analytics.time_analysis.late_submissions || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Avg Hours Late</p>
                                                    <p className="text-white text-lg font-bold">{Math.round(analytics.time_analysis.avg_hours_late || 0)}h</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorAssignments;
