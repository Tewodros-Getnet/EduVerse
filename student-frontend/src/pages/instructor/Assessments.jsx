import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

const InstructorAssessments = () => {
    const [assessments, setAssessments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [assessmentResults, setAssessmentResults] = useState([]);
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [savingGrade, setSavingGrade] = useState(null); // studentId being saved
    const [gradeInputs, setGradeInputs] = useState({}); // { [studentId]: { score, remarks } }
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
        type: 'exam',
        startDate: '',
        duration: 60,
    });

    useEffect(() => {
        fetchAssessments();
        fetchCourses();
    }, []);

    const fetchAssessments = async () => {
        try {
            const response = await api.get('/assessments/instructor');
            setAssessments(Array.isArray(response.data) ? response.data : response.data.assessments || []);
        } catch (error) {
            toast.error('Failed to load assessments');
            setAssessments([]);
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
            setCourses([]);
        }
    };

    const handleCreateAssessment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/assessments', formData);
            toast.success('Assessment created successfully!');
            setShowCreateForm(false);
            setFormData({
                title: '',
                description: '',
                courseId: '',
                type: 'exam',
                startDate: '',
                duration: 60,
            });
            fetchAssessments();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create assessment');
        }
    };

    const handleDeleteAssessment = (id) => {
        openConfirm({
            title: 'Delete assessment',
            message: 'Are you sure you want to delete this assessment?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`/assessments/${id}`);
                    toast.success('Assessment deleted successfully!');
                    fetchAssessments();
                } catch (error) {
                    toast.error('Failed to delete assessment');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const handleViewResults = async (assessment) => {
        setSelectedAssessment(assessment);
        setResultsLoading(true);
        setShowResultsModal(true);
        setGradeInputs({});
        try {
            const [resultsRes, studentsRes] = await Promise.all([
                api.get(`/assessments/${assessment.id}/results`),
                api.get(`/courses/${assessment.course_id}/students`),
            ]);
            const results = resultsRes.data.results || [];
            const students = studentsRes.data.students || [];
            setAssessmentResults(results);
            setEnrolledStudents(students);
            // Pre-fill grade inputs with existing scores so instructor can edit them
            const inputs = {};
            results.forEach(r => {
                inputs[r.student_id] = { score: r.score ?? '', remarks: r.remarks || '' };
            });
            // Students with no result yet get empty inputs
            students.forEach(s => {
                if (!inputs[s.id]) inputs[s.id] = { score: '', remarks: '' };
            });
            setGradeInputs(inputs);
        } catch (error) {
            toast.error('Failed to load assessment results');
            setShowResultsModal(false);
        } finally {
            setResultsLoading(false);
        }
    };

    const handleSaveGrade = async (studentId) => {
        const input = gradeInputs[studentId];
        if (input.score === '' || input.score === null) {
            toast.error('Please enter a score');
            return;
        }
        const score = parseInt(input.score);
        if (isNaN(score) || score < 0 || score > 100) {
            toast.error('Score must be a number between 0 and 100');
            return;
        }
        setSavingGrade(studentId);
        try {
            await api.post(`/assessments/${selectedAssessment.id}/results`, {
                student_id: studentId,
                score,
                remarks: input.remarks,
            });
            toast.success('Grade saved');
            // Refresh results
            const res = await api.get(`/assessments/${selectedAssessment.id}/results`);
            setAssessmentResults(res.data.results || []);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save grade');
        } finally {
            setSavingGrade(null);
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
                <h1 className="text-2xl font-bold text-white">Assessments</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                >
                    + Create Assessment
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-4">Create New Assessment</h2>
                    <form onSubmit={handleCreateAssessment} className="space-y-4">
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
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>{course.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    required
                                >
                                    {['exam', 'midterm', 'final', 'quiz', 'assignment', 'project', 'practical'].map(t => (
                                        <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Duration (min)</label>
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Scheduled Date</label>
                            <input
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm resize-none"
                                placeholder="Describe what this assessment covers..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                            >
                                Create Assessment
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
                {assessments.map(assessment => (
                    <div key={assessment.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-white">{assessment.title}</h3>
                                <p className="text-sm text-gray-400 mt-1">{assessment.course_title}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                                new Date(assessment.scheduled_date) > new Date()
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'bg-green-500/20 text-green-300'
                            }`}>
                                {new Date(assessment.scheduled_date) > new Date() ? 'Upcoming' : 'Past'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-4 line-clamp-2">{assessment.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                            <span>📅 {new Date(assessment.scheduled_date).toLocaleDateString()}</span>
                            <span>⏱️ {assessment.duration_minutes} min</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleViewResults(assessment)}
                                className="flex-1 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-purple-400 text-sm hover:bg-purple-600/20 transition"
                            >
                                View Results
                            </button>
                            <button
                                onClick={() => handleDeleteAssessment(assessment.id)}
                                className="px-3 py-2 bg-red-600/20 border border-red-600/40 rounded-xl text-red-400 text-sm hover:bg-red-600/30 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {assessments.length === 0 && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 mb-4">No assessments created yet.</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                    >
                        Create Your First Assessment
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

            {/* Assessment Results Modal */}
            {showResultsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-purple-900/30">
                            <div>
                                <h2 className="text-xl font-bold text-white">Assessment Results</h2>
                                {selectedAssessment && (
                                    <p className="text-sm text-gray-400 mt-0.5">{selectedAssessment.title}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowResultsModal(false)}
                                className="text-gray-400 hover:text-white transition text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {resultsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary Stats — only shown when there are graded results */}
                                    {assessmentResults.filter(r => r.score !== null).length > 0 && (
                                        <div className="grid grid-cols-3 gap-4 mb-2">
                                            <div className="bg-[#1a1a35] border border-purple-900/40 rounded-xl p-4 text-center">
                                                <div className="text-2xl font-bold text-white">
                                                    {assessmentResults.filter(r => r.score !== null).length}
                                                </div>
                                                <div className="text-sm text-gray-400">Graded</div>
                                            </div>
                                            <div className="bg-[#1a1a35] border border-purple-900/40 rounded-xl p-4 text-center">
                                                <div className="text-2xl font-bold text-green-400">
                                                    {Math.round(
                                                        assessmentResults
                                                            .filter(r => r.score !== null)
                                                            .reduce((sum, r) => sum + r.score, 0) /
                                                        assessmentResults.filter(r => r.score !== null).length
                                                    )}%
                                                </div>
                                                <div className="text-sm text-gray-400">Average</div>
                                            </div>
                                            <div className="bg-[#1a1a35] border border-purple-900/40 rounded-xl p-4 text-center">
                                                <div className="text-2xl font-bold text-blue-400">
                                                    {Math.max(...assessmentResults.filter(r => r.score !== null).map(r => r.score))}%
                                                </div>
                                                <div className="text-sm text-gray-400">Highest</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Student Grade List */}
                                    {enrolledStudents.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <p>No students enrolled in this course yet.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-[#1a1a35] border border-purple-900/40 rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 border-b border-purple-900/40 flex items-center justify-between">
                                                <h3 className="font-semibold text-white">Students ({enrolledStudents.length})</h3>
                                                <span className="text-xs text-gray-400">Enter scores 0–100</span>
                                            </div>
                                            <div className="divide-y divide-purple-900/20">
                                                {enrolledStudents.map(student => {
                                                    const existing = assessmentResults.find(r => r.student_id === student.id);
                                                    const input = gradeInputs[student.id] || { score: '', remarks: '' };
                                                    const isGraded = existing && existing.score !== null;
                                                    return (
                                                        <div key={student.id} className="px-4 py-4">
                                                            <div className="flex items-center justify-between gap-4">
                                                                {/* Student info */}
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                                                                        {student.name[0].toUpperCase()}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-white font-medium truncate">{student.name}</p>
                                                                        <p className="text-xs text-gray-400 truncate">{student.email}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Grade inputs */}
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            placeholder="Score"
                                                                            value={input.score}
                                                                            onChange={e => setGradeInputs(prev => ({
                                                                                ...prev,
                                                                                [student.id]: { ...prev[student.id], score: e.target.value }
                                                                            }))}
                                                                            className="w-20 bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500 text-center"
                                                                        />
                                                                        <span className="text-gray-500 text-sm">%</span>
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Remarks (optional)"
                                                                        value={input.remarks}
                                                                        onChange={e => setGradeInputs(prev => ({
                                                                            ...prev,
                                                                            [student.id]: { ...prev[student.id], remarks: e.target.value }
                                                                        }))}
                                                                        className="w-36 bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleSaveGrade(student.id)}
                                                                        disabled={savingGrade === student.id}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                                            isGraded
                                                                                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30'
                                                                                : 'bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30'
                                                                        } disabled:opacity-50`}
                                                                    >
                                                                        {savingGrade === student.id ? '⏳' : isGraded ? 'Update' : 'Save'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorAssessments;
