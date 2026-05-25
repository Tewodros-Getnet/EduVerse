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
    const [resultsLoading, setResultsLoading] = useState(false);
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
        startDate: '',
        endDate: '',
        duration: 60,
        questions: []
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
        if (formData.questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }

        try {
            await api.post('/assessments', formData);
            toast.success('Assessment created successfully!');
            setShowCreateForm(false);
            setFormData({
                title: '',
                description: '',
                courseId: '',
                startDate: '',
                endDate: '',
                duration: 60,
                questions: []
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

    const handleViewResults = async (assessmentId) => {
        setResultsLoading(true);
        setShowResultsModal(true);
        try {
            const response = await api.get(`/assessments/${assessmentId}/results`);
            setAssessmentResults(response.data.results);
        } catch (error) {
            toast.error('Failed to load assessment results');
            setShowResultsModal(false);
        } finally {
            setResultsLoading(false);
        }
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            questions: [...formData.questions, {
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0,
                points: 10
            }]
        });
    };

    const updateQuestion = (index, field, value) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[index][field] = value;
        setFormData({ ...formData, questions: updatedQuestions });
    };

    const removeQuestion = (index) => {
        setFormData({
            ...formData,
            questions: formData.questions.filter((_, i) => i !== index)
        });
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
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">End Date</label>
                                <input
                                    type="datetime-local"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    required
                                />
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

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-medium">Questions</h3>
                                <button
                                    type="button"
                                    onClick={addQuestion}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition"
                                >
                                    + Add Question
                                </button>
                            </div>

                            {formData.questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-[#1a1a35] border border-purple-900/40 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-white text-sm font-medium">Question {qIndex + 1}</h4>
                                        <button
                                            type="button"
                                            onClick={() => removeQuestion(qIndex)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Question text"
                                            value={q.question}
                                            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                            className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            required
                                        />
                                        {q.options.map((option, oIndex) => (
                                            <div key={oIndex} className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name={`correct-${qIndex}`}
                                                    checked={q.correctAnswer === oIndex}
                                                    onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                                    className="text-purple-500"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder={`Option ${oIndex + 1}`}
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...q.options];
                                                        newOptions[oIndex] = e.target.value;
                                                        updateQuestion(qIndex, 'options', newOptions);
                                                    }}
                                                    className="flex-1 bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                                    required
                                                />
                                            </div>
                                        ))}
                                        <input
                                            type="number"
                                            placeholder="Points"
                                            value={q.points}
                                            onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                                            className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            min="1"
                                            required
                                        />
                                    </div>
                                </div>
                            ))}
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
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${assessment.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                                }`}>
                                {assessment.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-4 line-clamp-2">{assessment.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                            <span>📅 {new Date(assessment.start_date).toLocaleDateString()}</span>
                            <span>⏱️ {assessment.duration} min</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleViewResults(assessment.id)}
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
                            <h2 className="text-xl font-bold text-white">Assessment Results</h2>
                            <button
                                onClick={() => setShowResultsModal(false)}
                                className="text-gray-400 hover:text-white transition"
                            >
                                ←
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {resultsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : assessmentResults.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-400">No results available yet.</p>
                                    <p className="text-sm text-gray-500 mt-2">Students haven't taken this assessment yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-[#1a1a35] border border-purple-900/40 rounded-xl p-4 text-center">
                                            <div className="text-2xl font-bold text-white">{assessmentResults.length}</div>
                                            <div className="text-sm text-gray-400">Total Submissions</div>
                                        </div>
                                        <div className="bg-[#1a1a35] border border-purple-900/40 rounded-xl p-4 text-center">
                                            <div className="text-2xl font-bold text-green-400">
                                                {Math.round(assessmentResults.reduce((sum, r) => sum + (r.score || 0), 0) / assessmentResults.length)}%
                                            </div>
                                            <div className="text-sm text-gray-400">Average Score</div>
                                        </div>
                                        <div className="bg-[#1a1a35] border border-purple-900/40 rounded-xl p-4 text-center">
                                            <div className="text-2xl font-bold text-blue-400">
                                                {Math.max(...assessmentResults.map(r => r.score || 0))}%
                                            </div>
                                            <div className="text-sm text-gray-400">Highest Score</div>
                                        </div>
                                    </div>

                                    {/* Results Table */}
                                    <div className="bg-[#1a1a35] border border-purple-900/40 rounded-xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-purple-900/40">
                                            <h3 className="font-semibold text-white">Student Results</h3>
                                        </div>
                                        <div className="divide-y divide-purple-900/20">
                                            {assessmentResults.map((result, index) => (
                                                <div key={result.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#0d0d1a] transition">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                                            {(result.student_name || '?')[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium">{result.student_name}</p>
                                                            <p className="text-xs text-gray-400">
                                                                Submitted: {new Date(result.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-lg font-bold ${result.score >= 80 ? 'text-green-400' :
                                                            result.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                                                            }`}>
                                                            {result.score}%
                                                        </div>
                                                        {result.remarks && (
                                                            <p className="text-xs text-gray-400 mt-1">{result.remarks}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
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
