import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

export default function InstructorQuizzes() {
    const [quizzes, setQuizzes] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showAttempts, setShowAttempts] = useState(null);
    const [showAnalytics, setShowAnalytics] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [publishingQuiz, setPublishingQuiz] = useState(null);
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
        courseId: '',
        lesson_id: '',
        time_limit_minutes: 30,
        max_attempts: 3,
        passing_score: 70,
        questions: []
    });

    useEffect(() => {
        fetchQuizzes();
        fetchCourses();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const response = await api.get('/quiz/instructor');
            setQuizzes(response.data.quizzes);
        } catch (error) {
            toast.error('Failed to load quizzes');
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

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        if (formData.questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }

        try {
            const payload = {
                ...formData,
                course_id: formData.courseId,
                lesson_id: formData.lesson_id && formData.lesson_id.trim() !== '' ? formData.lesson_id : null,
            };
            delete payload.courseId;
            await api.post('/quiz', payload);
            toast.success('Quiz created successfully!');
            setShowCreateForm(false);
            setFormData({
                title: '',
                courseId: '',
                lesson_id: '',
                time_limit_minutes: 30,
                max_attempts: 3,
                passing_score: 70,
                questions: []
            });
            fetchQuizzes();
        } catch (error) {
            toast.error('Failed to create quiz');
        }
    };

    const handleDeleteQuiz = (id) => {
        openConfirm({
            title: 'Delete quiz',
            message: 'Are you sure you want to delete this quiz?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`/quiz/${id}`);
                    toast.success('Quiz deleted successfully!');
                    fetchQuizzes();
                } catch (error) {
                    toast.error('Failed to delete quiz');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const handlePublishQuiz = async (quizId) => {
        setPublishingQuiz(quizId);
        try {
            const response = await api.post(`/quiz/${quizId}/publish`);
            setQuizzes(prev => prev.map(q => q.id === quizId ? response.data.quiz : q));
            toast.success('Quiz published successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to publish quiz');
        } finally {
            setPublishingQuiz(null);
        }
    };

    const handleDuplicateQuiz = async (quizId, newTitle) => {
        try {
            const response = await api.post(`/quiz/${quizId}/duplicate`, { new_title: newTitle });
            setQuizzes(prev => [response.data.quiz, ...prev]);
            toast.success('Quiz duplicated successfully!');
        } catch (error) {
            toast.error('Failed to duplicate quiz');
        }
    };

    const fetchAttempts = async (quizId) => {
        try {
            const response = await api.get(`/quiz/${quizId}/attempts`);
            setAttempts(response.data.attempts);
            setShowAttempts(quizId);
        } catch (error) {
            toast.error('Failed to fetch quiz attempts');
        }
    };

    const fetchAnalytics = async (quizId) => {
        try {
            const response = await api.get(`/quiz/${quizId}/analytics`);
            setAnalytics(response.data);
            setShowAnalytics(quizId);
        } catch (error) {
            toast.error('Failed to fetch quiz analytics');
        }
    };

    const handleExport = async (quizId, format = 'json') => {
        try {
            const response = await api.get(`/quiz/${quizId}/export?format=${format}`);

            if (format === 'csv') {
                // Create download link for CSV
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quiz_${quizId}_results.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                // Download JSON
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quiz_${quizId}_results.json`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            toast.error('Failed to export data');
        }
    };

    const addQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, {
                question: '',
                question_type: 'mcq',
                options: ['', '', '', ''],
                correct_answer: '',
                points: 1
            }]
        }));
    };

    const updateQuestion = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) =>
                i === index ? { ...q, [field]: value } : q
            )
        }));
    };

    const removeQuestion = (index) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
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
                <h1 className="text-2xl font-bold text-white">Quizzes</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                >
                    + Create Quiz
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-gradient-to-br from-[#1a1a35] to-[#12122a] border border-purple-900/30 rounded-2xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">📝 Create New Quiz</h2>
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(false)}
                            className="text-gray-400 hover:text-white transition"
                        >
                            ←
                        </button>
                    </div>
                    <form onSubmit={handleCreateQuiz} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Quiz Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    placeholder="Enter quiz title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Course *</label>
                                <select
                                    value={formData.courseId}
                                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    required
                                >
                                    <option value="">Select a course</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>{course.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">⏱️ Time Limit (min)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.time_limit_minutes}
                                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">🔄 Max Attempts</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.max_attempts}
                                    onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">🎯 Passing Score (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.passing_score}
                                    onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-white">Questions ({formData.questions.length})</h3>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-medium hover:opacity-90 transition shadow-lg shadow-purple-500/25"
                                    >
                                        + Add Question
                                    </button>
                                </div>
                            </div>

                            {formData.questions.map((question, index) => (
                                <div key={index} className="bg-[#0d0d1a] rounded-xl p-5 space-y-4 border border-purple-900/30">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            Question {index + 1}
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => removeQuestion(index)}
                                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                                        >
                                            🗑️ Remove
                                        </button>
                                    </div>

                                    <textarea
                                        placeholder="Enter your question here..."
                                        value={question.question}
                                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                                        className="w-full px-4 py-3 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                                        rows={2}
                                        required
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <select
                                            value={question.question_type}
                                            onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                                            className="px-4 py-3 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition"
                                        >
                                            <option value="mcq">📝 Multiple Choice</option>
                                            <option value="true_false">✅ True/False</option>
                                            <option value="short_answer">💬 Short Answer</option>
                                        </select>

                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Points"
                                            value={question.points}
                                            onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 1)}
                                            className="px-4 py-3 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition"
                                            required
                                        />
                                    </div>

                                    {(question.question_type === 'multiple_choice' || question.question_type === 'mcq') && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-300">Options (mark correct answer)</label>
                                            {question.options.map((option, optIndex) => (
                                                <div key={optIndex} className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name={`correct-${index}`}
                                                        checked={question.correct_answer === option}
                                                        onChange={() => updateQuestion(index, 'correct_answer', option)}
                                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder={`Option ${optIndex + 1}`}
                                                        value={option}
                                                        onChange={(e) => {
                                                            const newOptions = [...question.options];
                                                            newOptions[optIndex] = e.target.value;
                                                            updateQuestion(index, 'options', newOptions);
                                                        }}
                                                        className={`flex-1 px-4 py-2.5 bg-[#1a1a35] border rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition ${question.correct_answer === option ? 'border-green-500 bg-green-500/10' : 'border-purple-900/40'
                                                            }`}
                                                        required
                                                    />
                                                    {question.correct_answer === option && (
                                                        <span className="text-green-400 text-sm">✓</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {question.question_type === 'true_false' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-300">Select Correct Answer</label>
                                            <div className="flex gap-4">
                                                {['true', 'false'].map((value) => (
                                                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`correct-${index}`}
                                                            checked={question.correct_answer === value}
                                                            onChange={() => updateQuestion(index, 'correct_answer', value)}
                                                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                                        />
                                                        <span className="text-white capitalize">{value}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {question.question_type === 'short_answer' && (
                                        <div>
                                            <label className="text-sm font-semibold text-gray-300 mb-2">Correct Answer (for reference)</label>
                                            <input
                                                type="text"
                                                placeholder="Enter the correct answer"
                                                value={question.correct_answer}
                                                onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:opacity-90 transition shadow-lg shadow-purple-500/25"
                            >
                                ✨ Create Quiz
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="flex-1 py-3 bg-[#0d0d1a] border border-gray-600/40 rounded-xl text-gray-300 font-semibold hover:bg-gray-800/50 hover:text-white transition"
                            >
                                ← Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map(quiz => (
                    <div key={quiz.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-white">{quiz.title}</h3>
                                <p className="text-sm text-gray-400 mt-1">{quiz.course_title}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${quiz.is_published ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                                }`}>
                                {quiz.is_published ? 'Published' : 'Draft'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                            <span>⏱️ {quiz.time_limit_minutes} min</span>
                            <span>🎯 {quiz.passing_score}% passing</span>
                            <span>📝 {quiz.attempt_count || 0} attempts</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => fetchAttempts(quiz.id)}
                                className="flex-1 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-purple-400 text-sm hover:bg-purple-600/20 transition"
                            >
                                View Attempts
                            </button>
                            <button
                                onClick={() => fetchAnalytics(quiz.id)}
                                className="px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                            >
                                Analytics
                            </button>
                            <button
                                onClick={() => handleExport(quiz.id, 'csv')}
                                className="px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                            >
                                Export
                            </button>
                            {!quiz.is_published && (
                                <button
                                    onClick={() => handlePublishQuiz(quiz.id)}
                                    disabled={publishingQuiz === quiz.id}
                                    className="px-3 py-2 bg-green-600/20 border border-green-600/40 rounded-xl text-green-400 text-sm hover:bg-green-600/30 transition disabled:opacity-50"
                                >
                                    {publishingQuiz === quiz.id ? 'Publishing...' : 'Publish'}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    const newTitle = prompt('Enter title for duplicated quiz:', `${quiz.title} (Copy)`);
                                    if (newTitle) handleDuplicateQuiz(quiz.id, newTitle);
                                }}
                                className="px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                            >
                                Duplicate
                            </button>
                            <button
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                className="px-3 py-2 bg-red-600/20 border border-red-600/40 rounded-xl text-red-400 text-sm hover:bg-red-600/30 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {quizzes.length === 0 && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 mb-4">No quizzes created yet.</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                    >
                        Create Your First Quiz
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

            {/* Attempts Modal */}
            {showAttempts && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Quiz Attempts</h3>
                            <button
                                onClick={() => setShowAttempts(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ←
                            </button>
                        </div>

                        <div className="space-y-4">
                            {attempts.map(attempt => (
                                <div key={attempt.id} className="bg-[#1a1a35] rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-medium text-white">{attempt.name}</h4>
                                            <p className="text-sm text-gray-400">{attempt.email}</p>
                                            <p className="text-xs text-gray-500">Completed: {new Date(attempt.completed_at).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-lg font-bold ${attempt.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                                                {attempt.score}%
                                            </span>
                                            <p className="text-sm text-gray-400">{attempt.passed ? 'Passed' : 'Failed'}</p>
                                        </div>
                                    </div>

                                    {attempt.answers && (
                                        <div className="p-2 bg-[#12122a] rounded text-sm text-gray-300">
                                            <strong>Answers:</strong> {JSON.stringify(attempt.answers)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Modal */}
            {showAnalytics && analytics && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Quiz Analytics</h3>
                            <button
                                onClick={() => setShowAnalytics(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ←
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Quiz Details */}
                            <div className="bg-[#1a1a35] rounded-xl p-4">
                                <h4 className="font-medium text-white mb-2">{analytics.quiz_details.title}</h4>
                                <p className="text-sm text-gray-400">{analytics.quiz_details.course_title}</p>
                                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                                    <span>Time Limit: {analytics.quiz_details.time_limit_minutes} min</span>
                                    <span>Passing Score: {analytics.quiz_details.passing_score}%</span>
                                </div>
                            </div>

                            {/* Attempt Stats */}
                            <div className="bg-[#1a1a35] rounded-xl p-4">
                                <h4 className="font-medium text-white mb-3">Attempt Statistics</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-gray-400 text-sm">Total Attempts</p>
                                        <p className="text-white text-xl font-bold">{analytics.attempt_stats.total_attempts || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Unique Students</p>
                                        <p className="text-white text-xl font-bold">{analytics.attempt_stats.unique_students || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Average Score</p>
                                        <p className="text-white text-xl font-bold">{Math.round(analytics.attempt_stats.avg_score || 0)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Passed</p>
                                        <p className="text-white text-xl font-bold">{analytics.attempt_stats.passed_count || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Highest Score</p>
                                        <p className="text-white text-xl font-bold">{Math.round(analytics.attempt_stats.max_score || 0)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Lowest Score</p>
                                        <p className="text-white text-xl font-bold">{Math.round(analytics.attempt_stats.min_score || 0)}%</p>
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
                                                        style={{ width: `${(dist.count / (analytics.attempt_stats.total_attempts || 1)) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-white font-medium w-8">{dist.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Question Analysis */}
                            {analytics.question_analysis.length > 0 && (
                                <div className="bg-[#1a1a35] rounded-xl p-4">
                                    <h4 className="font-medium text-white mb-3">Question Analysis</h4>
                                    <div className="space-y-2">
                                        {analytics.question_analysis.map((qa, index) => (
                                            <div key={index} className="flex justify-between items-center">
                                                <span className="text-sm text-gray-400 truncate flex-1 mr-2">{qa.question}</span>
                                                <span className="text-sm text-white font-medium">{Math.round(qa.correct_rate || 0)}% correct</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
