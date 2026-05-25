import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

const Assessments = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAssessments();
    }, []);

    const fetchAssessments = async () => {
        try {
            const response = await api.get('/assessments/student');
            setAssessments(response.data.assessments);
        } catch (error) {
            toast.error('Failed to load assessments');
        } finally {
            setLoading(false);
        }
    };

    const startAssessment = (assessment) => {
        setSelectedAssessment(assessment);
        setAnswers({});
    };

    const handleAnswerChange = (questionId, answer) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const submitAssessment = async () => {
        if (!selectedAssessment) return;

        const unanswered = selectedAssessment.questions.filter(q => !answers[q.id]);
        if (unanswered.length > 0) {
            toast.error('Please answer all questions before submitting');
            return;
        }

        setSubmitting(true);
        try {
            await api.post(`/assessments/${selectedAssessment.id}/submit`, {
                answers: Object.entries(answers).map(([questionId, answer]) => ({
                    questionId: parseInt(questionId),
                    answer
                }))
            });
            toast.success('Assessment submitted successfully!');
            setSelectedAssessment(null);
            setAnswers({});
            fetchAssessments(); // Refresh to update status
        } catch (error) {
            toast.error('Failed to submit assessment');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (assessment) => {
        const now = new Date();
        const startDate = new Date(assessment.startDate);
        const endDate = new Date(assessment.endDate);

        if (assessment.submitted) {
            return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Completed</span>;
        } else if (now < startDate) {
            return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Upcoming</span>;
        } else if (now > endDate) {
            return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Expired</span>;
        } else {
            return <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">Available</span>;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d1a] text-white p-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Assessments
                </h1>

                {!selectedAssessment ? (
                    <div className="grid gap-6">
                        {assessments.map(assessment => (
                            <div key={assessment.id} className="bg-[#1a1a35] rounded-lg p-6 border border-purple-500/20">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">{assessment.title}</h3>
                                        <p className="text-gray-400 mb-2">{assessment.description}</p>
                                        <p className="text-sm text-gray-500">
                                            Course: {assessment.courseName} | Duration: {assessment.duration} minutes
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Start: {new Date(assessment.startDate).toLocaleString()} |
                                            End: {new Date(assessment.endDate).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {getStatusBadge(assessment)}
                                        {assessment.score !== null && (
                                            <span className="text-lg font-bold text-green-400">
                                                Score: {assessment.score}%
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => startAssessment(assessment)}
                                        disabled={assessment.submitted || new Date() < new Date(assessment.startDate) || new Date() > new Date(assessment.endDate)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                                    >
                                        {assessment.submitted ? 'Completed' : 'Start Assessment'}
                                    </button>
                                    {assessment.submitted && assessment.feedback && (
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-400">
                                                <strong>Feedback:</strong> {assessment.feedback}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {assessments.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-400 text-lg">No assessments available at the moment.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-[#1a1a35] rounded-lg p-6 border border-purple-500/20">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">{selectedAssessment.title}</h2>
                            <button
                                onClick={() => setSelectedAssessment(null)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Back to Assessments
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-400 mb-2">{selectedAssessment.description}</p>
                            <p className="text-sm text-gray-500">
                                Duration: {selectedAssessment.duration} minutes | Questions: {selectedAssessment.questions.length}
                            </p>
                        </div>

                        <div className="space-y-6">
                            {selectedAssessment.questions.map((question, index) => (
                                <div key={question.id} className="bg-[#0d0d1a] rounded-lg p-4">
                                    <h3 className="text-lg font-semibold mb-3">
                                        {index + 1}. {question.question}
                                    </h3>

                                    {question.type === 'multiple_choice' && (
                                        <div className="space-y-2">
                                            {question.options.map((option, optionIndex) => (
                                                <label key={optionIndex} className="flex items-center space-x-3 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`question-${question.id}`}
                                                        value={option}
                                                        checked={answers[question.id] === option}
                                                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                        className="text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <span className="text-gray-300">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {question.type === 'true_false' && (
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-3 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`question-${question.id}`}
                                                    value="true"
                                                    checked={answers[question.id] === 'true'}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className="text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-gray-300">True</span>
                                            </label>
                                            <label className="flex items-center space-x-3 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`question-${question.id}`}
                                                    value="false"
                                                    checked={answers[question.id] === 'false'}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className="text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-gray-300">False</span>
                                            </label>
                                        </div>
                                    )}

                                    {question.type === 'short_answer' && (
                                        <textarea
                                            value={answers[question.id] || ''}
                                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                            placeholder="Enter your answer..."
                                            className="w-full px-3 py-2 bg-[#1a1a35] border border-purple-500/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                            rows={3}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={submitAssessment}
                                disabled={submitting}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold"
                            >
                                {submitting ? 'Submitting...' : 'Submit Assessment'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Assessments;