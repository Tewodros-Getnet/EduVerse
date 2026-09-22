import React, { useState, useEffect, useRef } from 'react';
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
    const [submissions,    setSubmissions]    = useState([]);
    const [notSubmitted,   setNotSubmitted]   = useState([]);
    const [currentAssignment, setCurrentAssignment] = useState(null);
    const [gradeInputs,    setGradeInputs]    = useState({}); // { [submissionId]: { score, feedback } }
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
        instructions: '',
        courseId: '',
        dueDate: '',
        maxPoints: 100,
        attachment_url:  '',
        attachment_name: '',
    });

    // Brief file upload (create form)
    const [uploadingBrief,     setUploadingBrief]     = useState(false);
    const briefInputRef = useRef(null);

    // Edit assignment
    const [editingId,          setEditingId]          = useState(null);
    const [editForm,           setEditForm]           = useState({});
    const [savingEdit,         setSavingEdit]         = useState(false);
    const [uploadingEditBrief, setUploadingEditBrief] = useState(false);
    const editBriefInputRef = useRef(null);

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

    const handleBriefUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { toast.error('File must be under 20 MB'); return; }
        setUploadingBrief(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/assignments/upload-brief', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setFormData(f => ({ ...f, attachment_url: res.data.url, attachment_name: res.data.name || file.name }));
            toast.success('Brief uploaded');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Upload failed');
        } finally {
            setUploadingBrief(false);
            if (briefInputRef.current) briefInputRef.current.value = '';
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
                instructions: '',
                courseId: '',
                dueDate: '',
                maxPoints: 100,
                attachment_url:  '',
                attachment_name: '',
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
            const subs = response.data.submissions || [];
            setSubmissions(subs);
            setNotSubmitted(response.data.not_submitted || []);
            setCurrentAssignment(response.data.assignment || null);
            // Pre-fill grade inputs with existing scores so instructor can edit them
            const inputs = {};
            subs.forEach(s => {
                inputs[s.id] = {
                    score: s.score !== null && s.score !== undefined ? String(s.score) : '',
                    feedback: s.feedback || '',
                };
            });
            setGradeInputs(inputs);
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

    const openEdit = (assignment) => {
        setEditingId(assignment.id);
        setEditForm({
            title:           assignment.title,
            description:     assignment.description     || '',
            instructions:    assignment.instructions    || '',
            due_date:        assignment.due_date
                                 ? new Date(assignment.due_date).toISOString().slice(0, 16)
                                 : '',
            max_points:      assignment.max_points      || 100,
            attachment_url:  assignment.attachment_url  || '',
            attachment_name: assignment.attachment_name || '',
        });
    };

    const handleEditBriefUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { toast.error('File must be under 20 MB'); return; }
        setUploadingEditBrief(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/assignments/upload-brief', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setEditForm(f => ({ ...f, attachment_url: res.data.url, attachment_name: res.data.name || file.name }));
            toast.success('Brief uploaded');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Upload failed');
        } finally {
            setUploadingEditBrief(false);
            if (editBriefInputRef.current) editBriefInputRef.current.value = '';
        }
    };

    const handleSaveEdit = async () => {
        if (!editForm.title?.trim()) { toast.error('Title is required'); return; }
        setSavingEdit(true);
        try {
            const res = await api.put(`/assignments/${editingId}`, editForm);
            setAssignments(prev => prev.map(a =>
                a.id === editingId ? { ...a, ...res.data } : a
            ));
            setEditingId(null);
            toast.success('Assignment updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update assignment');
        } finally {
            setSavingEdit(false);
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
                <h1 className="text-2xl font-bold text-[var(--text)]">Assignments</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] text-sm font-medium hover:opacity-90 transition"
                >
                    + Create Assignment
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-6">
                    <h2 className="font-semibold text-[var(--text)] mb-4">Create New Assignment</h2>
                    <form onSubmit={handleCreateAssignment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Course</label>
                                <select
                                    value={formData.courseId}
                                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
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
                            <label className="block text-sm text-[var(--muted)] mb-1">Description <span className="text-gray-600">(short summary shown on card)</span></label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--muted)] mb-1">
                                Instructions <span className="text-gray-600">(full assignment brief -” students read this before submitting)</span>
                            </label>
                            <textarea
                                value={formData.instructions}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                rows={5}
                                placeholder="Write the full assignment instructions here -” what students must do, requirements, evaluation criteria..."
                                className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] placeholder-gray-600 focus:outline-none focus:border-[var(--accent-primary)] text-sm resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--muted)] mb-1">
                                Assignment Brief File <span className="text-gray-600">(optional -” PDF or Word doc)</span>
                            </label>
                            {formData.attachment_url ? (
                                <div className="flex items-center justify-between bg-[var(--surface-2)] border border-green-500/30 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-green-400 text-lg">ðŸ“Ž</span>
                                        <div className="min-w-0">
                                            <p className="text-sm text-[var(--text)] truncate">{formData.attachment_name}</p>
                                            <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-blue-400 hover:text-blue-300 transition">Preview ↗</a>
                                        </div>
                                    </div>
                                    <button type="button"
                                        onClick={() => setFormData(f => ({ ...f, attachment_url: '', attachment_name: '' }))}
                                        className="text-red-400 hover:text-red-300 text-sm ml-3 transition">
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <button type="button"
                                    onClick={() => briefInputRef.current?.click()}
                                    disabled={uploadingBrief}
                                    className="w-full py-3 border border-dashed border-purple-700/50 rounded-xl text-[var(--accent-primary)] text-sm hover:bg-[var(--accent-primary)]/10 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                    {uploadingBrief
                                        ? <><div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                                        : <>Upload brief file (PDF / Word)</>}
                                </button>
                            )}
                            <input ref={briefInputRef} type="file" accept=".pdf,.doc,.docx"
                                onChange={handleBriefUpload} className="hidden" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Due Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Max Points</label>
                                <input
                                    type="number"
                                    value={formData.maxPoints}
                                    onChange={(e) => setFormData({ ...formData, maxPoints: parseInt(e.target.value) })}
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] text-sm font-medium hover:opacity-90 transition"
                            >
                                Create Assignment
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="px-5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] text-sm hover:text-[var(--text)] transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(assignments || []).map(assignment => (
                    <div key={assignment.id} className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-[var(--text)]">{assignment.title}</h3>
                                <p className="text-sm text-[var(--muted)] mt-1">{assignment.course_title}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                assignment.status === 'active' ? 'bg-green-500/20 text-green-300' :
                                assignment.status === 'due_soon' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-red-500/20 text-red-300'
                            }`}>
                                {assignment.status === 'active' ? 'Active' :
                                 assignment.status === 'due_soon' ? 'Due Soon' : 'Overdue'}
                            </span>
                        </div>
                        <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">{assignment.description}</p>
                        {assignment.attachment_url && (
                            <a href={assignment.attachment_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mb-3 text-xs text-blue-400 hover:text-blue-300 transition bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
                                ðŸ“Ž {assignment.attachment_name || 'Assignment Brief'} ↗
                            </a>
                        )}
                        <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-4">
                            <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                            <span>{assignment.max_points} pts</span>
                            <span>{assignment.submission_count || 0} submitted ({assignment.graded_count || 0} graded)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => fetchSubmissions(assignment.id)}
                                className="flex-1 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--accent-primary)] text-sm hover:bg-[var(--accent-primary)]/20 transition"
                            >
                                View Submissions
                            </button>
                            <button
                                onClick={() => openEdit(assignment)}
                                className="px-3 py-2 bg-blue-600/20 border border-[var(--accent-tertiary)]/30 rounded-xl text-blue-300 text-sm hover:bg-blue-600/30 transition"
                            >
                                âœï¸ Edit
                            </button>
                            <button
                                onClick={() => fetchAnalytics(assignment.id)}
                                className="px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] text-sm hover:text-[var(--text)] transition"
                            >
                                Analytics
                            </button>
                            <button
                                onClick={() => handleExport(assignment.id, 'csv')}
                                className="px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] text-sm hover:text-[var(--text)] transition"
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
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <p className="text-[var(--muted)] mb-4">No assignments created yet.</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] text-sm font-medium hover:opacity-90 transition"
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/30 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text)]">
                                    {currentAssignment?.title || 'Submissions'}
                                </h3>
                                <p className="text-xs text-[var(--muted)] mt-0.5">
                                    {submissions.length} submitted Â· {notSubmitted.length} not submitted Â· max {currentAssignment?.max_points || 100} pts
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setGradingMode(!gradingMode)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${gradingMode ? 'bg-[var(--accent-primary)] text-[var(--text)]' : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'}`}
                                >
                                    {gradingMode ? 'Exit Bulk Grade' : 'Bulk Grade'}
                                </button>
                                <button
                                    onClick={() => { setShowSubmissions(null); setGradingMode(false); setBulkGrades({}); setGradeInputs({}); }}
                                    className="text-[var(--muted)] hover:text-[var(--text)] text-xl transition"
                                >
                                    x
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Bulk grade banner */}
                            {gradingMode && (
                                <div className="bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30 rounded-xl p-4 flex items-center justify-between">
                                    <p className="text-[var(--accent-primary)]/80 text-sm">Fill scores below and submit all at once</p>
                                    <button onClick={handleBulkGrade}
                                        className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text)] rounded-lg text-sm font-medium hover:bg-purple-700 transition">
                                        Submit All Grades
                                    </button>
                                </div>
                            )}

                            {/* â”€â”€ Submitted students â”€â”€ */}
                            {submissions.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                                        Submitted ({submissions.length})
                                    </h4>
                                    <div className="space-y-4">
                                        {submissions.map(submission => (
                                            <div key={submission.id} className="bg-[var(--surface-2)] border border-purple-900/20 rounded-xl p-4">
                                                {/* Student header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center">
                                                            {submission.student_avatar
                                                                ? <img src={submission.student_avatar} alt={submission.student_name} className="w-full h-full object-cover" />
                                                                : <div className="w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-sm font-bold text-[var(--text)]">{submission.student_name?.[0]?.toUpperCase() || '?'}</div>
                                                            }
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-[var(--text)]">{submission.student_name}</p>
                                                            <p className="text-xs text-[var(--muted)]">{submission.student_email}</p>
                                                            <p className="text-xs text-[var(--muted)]">
                                                                Submitted {new Date(submission.submitted_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        {submission.score !== null ? (
                                                            <span className={`text-lg font-bold ${
                                                                (submission.score / (currentAssignment?.max_points || 100)) * 100 >= 80 ? 'text-green-400' :
                                                                (submission.score / (currentAssignment?.max_points || 100)) * 100 >= 60 ? 'text-yellow-400' : 'text-red-400'
                                                            }`}>
                                                                {submission.score}/{currentAssignment?.max_points || 100}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">Not graded</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Student answer */}
                                                {(submission.content || submission.file_url) && (
                                                    <div className="mb-3 bg-[var(--bg)] rounded-xl p-3 border border-purple-900/20">
                                                        <p className="text-xs text-[var(--accent-primary)]/80 font-medium mb-2">Student's Answer</p>
                                                        {submission.content && (
                                                            <p className="text-sm text-[var(--muted)] whitespace-pre-wrap leading-relaxed">
                                                                {submission.content}
                                                            </p>
                                                        )}
                                                        {submission.file_url && (
                                                            <a href={submission.file_url} target="_blank" rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 mt-2 text-xs text-blue-400 hover:text-blue-300 transition">
                                                                ðŸ“Ž View attached file
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Existing feedback display */}
                                                {submission.feedback && !gradingMode && (
                                                    <div className="mb-3 bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                                                        <p className="text-xs text-blue-300 font-medium mb-1">Your Feedback</p>
                                                        <p className="text-sm text-[var(--muted)]">{submission.feedback}</p>
                                                    </div>
                                                )}

                                                {/* Grade inputs */}
                                                {gradingMode ? (
                                                    // Bulk grade mode
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="number" placeholder={`Score (/${currentAssignment?.max_points || 100})`}
                                                            min="0" max={currentAssignment?.max_points || 100}
                                                            value={bulkGrades[submission.id]?.score || ''}
                                                            onChange={e => setBulkGrades(prev => ({ ...prev, [submission.id]: { ...prev[submission.id], score: parseInt(e.target.value) || '' } }))}
                                                            className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)]/40 rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent-primary)]" />
                                                        <textarea placeholder="Feedback (optional)"
                                                            value={bulkGrades[submission.id]?.feedback || ''}
                                                            onChange={e => setBulkGrades(prev => ({ ...prev, [submission.id]: { ...prev[submission.id], feedback: e.target.value } }))}
                                                            className="px-3 py-2 bg-[var(--bg)] border border-[var(--border)]/40 rounded-lg text-[var(--text)] text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)]"
                                                            rows={2} />
                                                    </div>
                                                ) : (
                                                    // Individual grade mode -” always visible (allow editing existing grades too)
                                                    <div className="flex gap-2 items-start">
                                                        <input type="number"
                                                            placeholder={`Score (/${currentAssignment?.max_points || 100})`}
                                                            min="0" max={currentAssignment?.max_points || 100}
                                                            value={gradeInputs[submission.id]?.score ?? ''}
                                                            onChange={e => setGradeInputs(prev => ({ ...prev, [submission.id]: { ...prev[submission.id], score: e.target.value } }))}
                                                            className="w-36 px-3 py-2 bg-[var(--bg)] border border-[var(--border)]/40 rounded-lg text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent-primary)]" />
                                                        <textarea
                                                            placeholder="Feedback (optional)"
                                                            value={gradeInputs[submission.id]?.feedback ?? ''}
                                                            onChange={e => setGradeInputs(prev => ({ ...prev, [submission.id]: { ...prev[submission.id], feedback: e.target.value } }))}
                                                            className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--border)]/40 rounded-lg text-[var(--text)] text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)]"
                                                            rows={2} />
                                                        <button
                                                            onClick={() => {
                                                                const input = gradeInputs[submission.id];
                                                                const score = parseInt(input?.score);
                                                                if (!input?.score || isNaN(score)) { toast.error('Enter a valid score'); return; }
                                                                handleGradeSubmission(submission.id, score, input?.feedback || '');
                                                            }}
                                                            className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text)] rounded-lg text-sm font-medium hover:bg-purple-700 transition self-start">
                                                            {submission.score !== null ? 'Update' : 'Grade'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* â”€â”€ Not submitted students â”€â”€ */}
                            {notSubmitted.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-400 rounded-full" />
                                        Not Submitted ({notSubmitted.length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {notSubmitted.map(student => (
                                            <div key={student.id} className="flex items-center gap-3 bg-[var(--surface-2)] border border-red-900/20 rounded-xl px-3 py-2.5">
                                                <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center">
                                                    {student.avatar_url
                                                        ? <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xs font-bold text-[var(--text)]">{student.name?.[0]?.toUpperCase() || '?'}</div>
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-[var(--text)] font-medium truncate">{student.name}</p>
                                                    <p className="text-xs text-[var(--muted)] truncate">{student.email}</p>
                                                </div>
                                                <span className="text-xs text-red-400 flex-shrink-0 ml-auto">Missing</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {submissions.length === 0 && notSubmitted.length === 0 && (
                                <p className="text-center text-[var(--muted)] py-12">No students enrolled in this course yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Modal -” independent, not nested inside Submissions Modal */}
            {showAnalytics && analytics && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-[var(--text)]">Assignment Analytics</h3>
                                        <button
                                            onClick={() => setShowAnalytics(null)}
                                            className="text-[var(--muted)] hover:text-[var(--text)] text-xl transition"
                                        >
                                            x
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Assignment Details */}
                                        <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                            <h4 className="font-medium text-[var(--text)] mb-2">{analytics.assignment_details.title}</h4>
                                            <p className="text-sm text-[var(--muted)]">{analytics.assignment_details.course_title}</p>
                                            <div className="flex gap-4 mt-2 text-sm text-[var(--muted)]">
                                                <span>Due: {new Date(analytics.assignment_details.due_date).toLocaleDateString()}</span>
                                                <span>Max Points: {analytics.assignment_details.max_points}</span>
                                            </div>
                                        </div>

                                        {/* Submission Stats */}
                                        <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                            <h4 className="font-medium text-[var(--text)] mb-3">Submission Statistics</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-[var(--muted)] text-sm">Total Submissions</p>
                                                    <p className="text-[var(--text)] text-xl font-bold">{analytics.submission_stats.total_submissions || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[var(--muted)] text-sm">Graded Submissions</p>
                                                    <p className="text-[var(--text)] text-xl font-bold">{analytics.submission_stats.graded_submissions || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[var(--muted)] text-sm">Average Score</p>
                                                    <p className="text-[var(--text)] text-lg font-bold">{Math.round(analytics.submission_stats.avg_score || 0)}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-[var(--muted)] text-sm">On-Time Submissions</p>
                                                    <p className="text-[var(--text)] text-xl font-bold">{analytics.submission_stats.on_time_submissions || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[var(--muted)] text-sm">Highest Score</p>
                                                    <p className="text-[var(--text)] text-xl font-bold">{Math.round(analytics.submission_stats.max_score || 0)}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-[var(--muted)] text-sm">Lowest Score</p>
                                                    <p className="text-[var(--text)] text-xl font-bold">{Math.round(analytics.submission_stats.min_score || 0)}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Distribution */}
                                        <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                            <h4 className="font-medium text-[var(--text)] mb-3">Grade Distribution</h4>
                                            <div className="space-y-2">
                                                {analytics.score_distribution.map(dist => (
                                                    <div key={dist.grade_range} className="flex items-center justify-between">
                                                        <span className="text-sm text-[var(--muted)]">{dist.grade_range}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-32 bg-gray-700 rounded-full h-2">
                                                                <div
                                                                    className="bg-purple-500 h-2 rounded-full"
                                                                    style={{ width: `${(dist.count / (analytics.submission_stats.total_submissions || 1)) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm text-[var(--text)] font-medium w-8">{dist.count}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Time Analysis */}
                                        <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                            <h4 className="font-medium text-[var(--text)] mb-3">Time Analysis</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[var(--muted)] text-sm">Late Submissions</p>
                                                    <p className="text-[var(--text)] text-lg font-bold">{analytics.time_analysis.late_submissions || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[var(--muted)] text-sm">Avg Hours Late</p>
                                                    <p className="text-[var(--text)] text-lg font-bold">{Math.round(analytics.time_analysis.avg_hours_late || 0)}h</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
            {/* â”€â”€ Edit Assignment Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {editingId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                            <h2 className="text-lg font-bold text-[var(--text)]">Edit Assignment</h2>
                            <button onClick={() => setEditingId(null)} className="text-[var(--muted)] hover:text-[var(--text)] text-xl transition">x</button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Title</label>
                                <input type="text" value={editForm.title || ''}
                                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Description <span className="text-gray-600">(short summary on card)</span></label>
                                <textarea value={editForm.description || ''} rows={2}
                                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm resize-none" />
                            </div>

                            {/* Instructions */}
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Instructions <span className="text-gray-600">(students read before submitting)</span></label>
                                <textarea value={editForm.instructions || ''} rows={5}
                                    onChange={e => setEditForm(f => ({ ...f, instructions: e.target.value }))}
                                    placeholder="Full assignment instructions, requirements, evaluation criteria..."
                                    className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] placeholder-gray-600 focus:outline-none focus:border-[var(--accent-primary)] text-sm resize-none" />
                            </div>

                            {/* Brief file */}
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Assignment Brief File <span className="text-gray-600">(optional -” PDF or Word)</span></label>
                                {editForm.attachment_url ? (
                                    <div className="flex items-center justify-between bg-[var(--surface-2)] border border-green-500/30 rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-green-400 text-lg">ðŸ“Ž</span>
                                            <div className="min-w-0">
                                                <p className="text-sm text-[var(--text)] truncate">{editForm.attachment_name}</p>
                                                <a href={editForm.attachment_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-blue-400 hover:text-blue-300 transition">Preview ↗</a>
                                            </div>
                                        </div>
                                        <button type="button"
                                            onClick={() => setEditForm(f => ({ ...f, attachment_url: '', attachment_name: '' }))}
                                            className="text-red-400 hover:text-red-300 text-sm ml-3 transition">
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <button type="button"
                                        onClick={() => editBriefInputRef.current?.click()}
                                        disabled={uploadingEditBrief}
                                        className="w-full py-3 border border-dashed border-purple-700/50 rounded-xl text-[var(--accent-primary)] text-sm hover:bg-[var(--accent-primary)]/10 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                        {uploadingEditBrief
                                            ? <><div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                                            : <>Upload brief file (PDF / Word)</>}
                                    </button>
                                )}
                                <input ref={editBriefInputRef} type="file" accept=".pdf,.doc,.docx"
                                    onChange={handleEditBriefUpload} className="hidden" />
                            </div>

                            {/* Due date + Max points */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--muted)] mb-1">Due Date</label>
                                    <input type="datetime-local" value={editForm.due_date || ''}
                                        onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                                        className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--muted)] mb-1">Max Points</label>
                                    <input type="number" min="1" value={editForm.max_points || 100}
                                        onChange={e => setEditForm(f => ({ ...f, max_points: parseInt(e.target.value) || 100 }))}
                                        className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-2.5 text-[var(--text)] focus:outline-none focus:border-[var(--accent-primary)] text-sm" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleSaveEdit} disabled={savingEdit}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                                    {savingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button onClick={() => setEditingId(null)}
                                    className="px-5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] text-sm hover:text-[var(--text)] transition">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorAssignments;













