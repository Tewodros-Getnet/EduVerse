import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Assignments() {
    const { courseId } = useParams();
    const [assignments,  setAssignments]  = useState([]);
    const [submissions,  setSubmissions]  = useState({});
    const [loading,      setLoading]      = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissionText, setSubmissionText] = useState('');
    const [submitting,   setSubmitting]   = useState(false);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [viewingSubmission,   setViewingSubmission]   = useState(null);
    const [filter,  setFilter]  = useState('all');
    const [sortBy,  setSortBy]  = useState('due_date');

    // File upload state
    const [uploadedFile,  setUploadedFile]  = useState(null); // { url, name }
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef(null);

    // ── Load data ──────────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            api.get(`/assignments/course/${courseId}`),
            api.get('/assignments/student/submissions'),
        ]).then(([assignRes, subRes]) => {
            setAssignments(Array.isArray(assignRes.data) ? assignRes.data : assignRes.data.assignments || []);
            const subMap = {};
            (subRes.data.submissions || []).forEach(s => { subMap[s.assignment_id] = s; });
            setSubmissions(subMap);
        }).catch(() => toast.error('Failed to load assignments'))
            .finally(() => setLoading(false));
    }, [courseId]);

    // ── File upload ────────────────────────────────────────────────────────
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 20 * 1024 * 1024; // 20 MB
        if (file.size > maxSize) {
            toast.error('File size must be under 20 MB');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setUploadingFile(true);
        try {
            const res = await api.post('/assignments/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadedFile({ url: res.data.url, name: res.data.name || file.name });
            toast.success('File uploaded successfully');
        } catch (err) {
            toast.error(err.response?.data?.error || 'File upload failed');
        } finally {
            setUploadingFile(false);
            // Reset input so same file can be re-selected if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Submit assignment ──────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!submissionText.trim() && !uploadedFile) {
            toast.error('Please enter your answer or attach a file');
            return;
        }
        setSubmitting(true);
        try {
            await api.post(`/assignments/${selectedAssignment.id}/submit`, {
                submission_text: submissionText,
                file_url:  uploadedFile?.url  || null,
                file_name: uploadedFile?.name || null,
            });

            toast.success('Assignment submitted successfully!');
            closeSubmissionModal();

            // Refresh submissions map
            const res = await api.get('/assignments/student/submissions');
            const subMap = {};
            (res.data.submissions || []).forEach(s => { subMap[s.assignment_id] = s; });
            setSubmissions(subMap);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Modal helpers ──────────────────────────────────────────────────────
    const openSubmissionModal = (assignment) => {
        setSelectedAssignment(assignment);
        setShowSubmissionModal(true);
        setSubmissionText('');
        setUploadedFile(null);
    };

    const closeSubmissionModal = () => {
        setShowSubmissionModal(false);
        setSelectedAssignment(null);
        setSubmissionText('');
        setUploadedFile(null);
    };

    // ── Status helpers ─────────────────────────────────────────────────────
    const getAssignmentStatus = (assignment, submission) => {
        if (!submission) return 'pending';
        if (submission.score !== null) return 'graded';
        return 'submitted';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'graded':    return 'bg-green-500/20 text-green-300 border border-green-500/30';
            case 'submitted': return 'bg-blue-500/20  text-blue-300  border border-blue-500/30';
            case 'overdue':   return 'bg-red-500/20   text-red-300   border border-red-500/30';
            default:          return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
        }
    };

    const isOverdue = (assignment) =>
        new Date(assignment.due_date) < new Date() && !submissions[assignment.id];

    const getDaysUntilDue = (dueDate) => {
        const diffDays = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        return `Due in ${diffDays} days`;
    };

    const getFilteredAndSortedAssignments = () => {
        let filtered = assignments || [];
        if (filter !== 'all') {
            filtered = filtered.filter(a => {
                const s = submissions[a.id];
                const status = getAssignmentStatus(a, s);
                if (filter === 'pending')   return !s;
                if (filter === 'submitted') return s && s.score === null;
                if (filter === 'graded')    return s && s.score !== null;
                return true;
            });
        }
        return filtered.sort((a, b) => {
            if (sortBy === 'title')  return a.title.localeCompare(b.title);
            if (sortBy === 'points') return b.max_points - a.max_points;
            return new Date(a.due_date) - new Date(b.due_date);
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

            {/* Filters */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                <div className="flex flex-wrap gap-3">
                    <select value={filter} onChange={e => setFilter(e.target.value)}
                        className="px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm">
                        <option value="all">All Assignments</option>
                        <option value="pending">Pending</option>
                        <option value="submitted">Submitted</option>
                        <option value="graded">Graded</option>
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm">
                        <option value="due_date">Sort by Due Date</option>
                        <option value="title">Sort by Title</option>
                        <option value="points">Sort by Points</option>
                    </select>
                </div>
            </div>

            {(assignments || []).length === 0 ? (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center text-gray-400">
                    <div className="text-4xl mb-3">📋</div>
                    <h3 className="text-lg font-medium text-white mb-2">No assignments yet</h3>
                    <p className="text-sm">Check back later for new assignments from your instructor</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {getFilteredAndSortedAssignments().map(assignment => {
                        const submission = submissions[assignment.id];
                        const status  = getAssignmentStatus(assignment, submission);
                        const overdue = isOverdue(assignment);

                        return (
                            <div key={assignment.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h3 className="font-semibold text-white">{assignment.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(overdue ? 'overdue' : status)}`}>
                                                {overdue ? 'Overdue' : status.charAt(0).toUpperCase() + status.slice(1)}
                                                {submission?.score !== null && submission?.score !== undefined && ` — ${submission.score}/${assignment.max_points}`}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-3">{assignment.description}</p>

                                        {/* Instructions — shown prominently so student reads before submitting */}
                                        {assignment.instructions && (
                                            <div className="mb-3 bg-[#1a1a35] border border-purple-900/20 rounded-xl p-3">
                                                <p className="text-xs text-purple-300 font-semibold mb-1.5">📋 Assignment Instructions</p>
                                                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed line-clamp-4">
                                                    {assignment.instructions}
                                                </p>
                                            </div>
                                        )}

                                        {/* Brief file download */}
                                        {assignment.attachment_url && (
                                            <a href={assignment.attachment_url} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 mb-3 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition">
                                                📎 Download Brief: {assignment.attachment_name || 'Assignment Brief'}
                                            </a>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                                            <span>📅 {getDaysUntilDue(assignment.due_date)}</span>
                                            <span>⭐ {assignment.max_points} points</span>
                                            {submission && (
                                                <span>📝 Submitted {new Date(submission.submitted_at).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Submission preview */}
                                {submission ? (
                                    <div className="bg-[#1a1a35] rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-300 font-medium mb-2 text-sm">Your Submission</p>
                                                {submission.content && (
                                                    <p className="text-gray-400 text-sm line-clamp-3">{submission.content}</p>
                                                )}
                                                {submission.file_url && (
                                                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-400 hover:text-blue-300 transition">
                                                        📎 View attached file
                                                    </a>
                                                )}
                                                {!submission.content && !submission.file_url && (
                                                    <p className="text-gray-500 text-sm italic">No content</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => viewSubmissionDetails(assignment, submission)}
                                                className="ml-3 flex-shrink-0 px-3 py-1 bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-300 hover:bg-purple-600/40 transition"
                                            >
                                                View Details
                                            </button>
                                        </div>

                                        {submission.feedback && (
                                            <div className="mt-3 pt-3 border-t border-purple-900/30">
                                                <p className="text-purple-300 text-xs font-medium mb-1">Instructor Feedback:</p>
                                                <p className="text-gray-400 text-sm">{submission.feedback}</p>
                                            </div>
                                        )}

                                        {submission.score !== null && (
                                            <div className="mt-3 pt-3 border-t border-purple-900/30 flex items-center justify-between">
                                                <span className="text-gray-400 text-sm">Grade:</span>
                                                <span className={`text-lg font-bold ${
                                                    (submission.score / assignment.max_points) >= 0.8 ? 'text-green-400' :
                                                    (submission.score / assignment.max_points) >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                    {submission.score}/{assignment.max_points}
                                                    <span className="text-sm font-normal text-gray-400 ml-1">
                                                        ({Math.round((submission.score / assignment.max_points) * 100)}%)
                                                    </span>
                                                </span>
                                            </div>
                                        )}

                                        {/* Allow resubmission */}
                                        {submission.score === null && (
                                            <button
                                                onClick={() => openSubmissionModal(assignment)}
                                                className="mt-3 w-full py-2 bg-[#12122a] border border-purple-900/40 rounded-xl text-purple-400 text-xs hover:bg-purple-600/10 transition"
                                            >
                                                ✏️ Edit Submission
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => openSubmissionModal(assignment)}
                                        className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${
                                            overdue
                                                ? 'bg-red-600/30 border border-red-500/30 text-red-300 hover:bg-red-600/40'
                                                : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90'
                                        }`}
                                    >
                                        {overdue ? 'Submit (Late)' : 'Submit Assignment'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Submission Modal ──────────────────────────────────────────── */}
            {showSubmissionModal && selectedAssignment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                            <div>
                                <h2 className="font-semibold text-white">{selectedAssignment.title}</h2>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span>📅 Due: {new Date(selectedAssignment.due_date).toLocaleString()}</span>
                                    <span>⭐ {selectedAssignment.max_points} pts</span>
                                </div>
                            </div>
                            <button onClick={closeSubmissionModal} className="text-gray-400 hover:text-white text-xl transition">✕</button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Instructions — full text so student can read while writing answer */}
                            {selectedAssignment.instructions ? (
                                <div className="bg-[#1a1a35] border border-purple-900/20 rounded-xl p-4">
                                    <p className="text-xs text-purple-300 font-semibold mb-2">📋 Assignment Instructions</p>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {selectedAssignment.instructions}
                                    </p>
                                </div>
                            ) : selectedAssignment.description ? (
                                <div className="bg-[#1a1a35] rounded-xl p-4">
                                    <p className="text-xs text-purple-300 font-medium mb-1">Assignment Description</p>
                                    <p className="text-sm text-gray-300">{selectedAssignment.description}</p>
                                </div>
                            ) : null}

                            {/* Brief file download */}
                            {selectedAssignment.attachment_url && (
                                <a href={selectedAssignment.attachment_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 hover:bg-blue-500/20 transition">
                                    <span className="text-xl">📎</span>
                                    <div>
                                        <p className="text-sm font-medium">{selectedAssignment.attachment_name || 'Assignment Brief'}</p>
                                        <p className="text-xs text-gray-400">Click to open / download</p>
                                    </div>
                                    <span className="ml-auto text-xs">↗</span>
                                </a>
                            )}

                            {/* Text answer */}
                            <div>
                                <label className="block text-sm text-gray-300 font-medium mb-2">
                                    Your Answer <span className="text-gray-500 font-normal">(optional if you attach a file)</span>
                                </label>
                                <textarea
                                    value={submissionText}
                                    onChange={e => setSubmissionText(e.target.value)}
                                    placeholder="Type your answer here..."
                                    rows={6}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-sm resize-none transition"
                                />
                            </div>

                            {/* File attachment */}
                            <div>
                                <label className="block text-sm text-gray-300 font-medium mb-2">
                                    Attach a File <span className="text-gray-500 font-normal">(PDF, Word, image — max 20 MB)</span>
                                </label>

                                {uploadedFile ? (
                                    /* Uploaded file preview */
                                    <div className="flex items-center justify-between bg-[#1a1a35] border border-green-500/30 rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-green-400 text-lg flex-shrink-0">📎</span>
                                            <div className="min-w-0">
                                                <p className="text-sm text-white truncate">{uploadedFile.name}</p>
                                                <a href={uploadedFile.url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-blue-400 hover:text-blue-300 transition">
                                                    Preview ↗
                                                </a>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setUploadedFile(null)}
                                            className="text-red-400 hover:text-red-300 text-sm flex-shrink-0 ml-3 transition"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    /* Upload button */
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingFile}
                                        className="w-full py-3 border border-dashed border-purple-700/50 rounded-xl text-purple-400 text-sm hover:bg-purple-600/10 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                    >
                                        {uploadingFile ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>📤 Click to upload a file</>
                                        )}
                                    </button>
                                )}

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || uploadingFile}
                                    className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition disabled:opacity-50"
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
                </div>
            )}

            {/* ── Submission Details Modal ──────────────────────────────────── */}
            {viewingSubmission && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                            <h2 className="font-semibold text-white">Submission Details</h2>
                            <button onClick={() => setViewingSubmission(null)} className="text-gray-400 hover:text-white text-xl transition">✕</button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <h3 className="text-white font-medium mb-2">{viewingSubmission.assignment.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                                    <span>📅 Submitted: {new Date(viewingSubmission.submission.submitted_at).toLocaleString()}</span>
                                    {viewingSubmission.submission.score !== null && (
                                        <span>⭐ Grade: {viewingSubmission.submission.score}/{viewingSubmission.assignment.max_points}</span>
                                    )}
                                </div>
                            </div>

                            {/* Assignment brief download — shown so student can re-read the brief */}
                            {viewingSubmission.assignment.attachment_url && (
                                <a href={viewingSubmission.assignment.attachment_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 hover:bg-blue-500/20 transition">
                                    <span className="text-xl">📎</span>
                                    <div>
                                        <p className="text-sm font-medium">{viewingSubmission.assignment.attachment_name || 'Assignment Brief'}</p>
                                        <p className="text-xs text-gray-400">Click to open / download</p>
                                    </div>
                                    <span className="ml-auto text-xs">↗</span>
                                </a>
                            )}

                            {/* Answer text */}
                            {viewingSubmission.submission.content && (
                                <div className="bg-[#1a1a35] rounded-xl p-4">
                                    <p className="text-xs text-purple-300 font-medium mb-2">Your Answer</p>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                        {viewingSubmission.submission.content}
                                    </p>
                                </div>
                            )}

                            {/* Attached file */}
                            {viewingSubmission.submission.file_url && (
                                <div className="bg-[#1a1a35] rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">📎</span>
                                        <p className="text-sm text-white">Attached file</p>
                                    </div>
                                    <a href={viewingSubmission.submission.file_url} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 text-xs hover:bg-blue-600/30 transition">
                                        Open ↗
                                    </a>
                                </div>
                            )}

                            {/* Feedback */}
                            {viewingSubmission.submission.feedback && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                    <p className="text-blue-300 text-xs font-medium mb-2">Instructor Feedback</p>
                                    <p className="text-gray-300 text-sm">{viewingSubmission.submission.feedback}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
