import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Quiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [quizStarted, setQuizStarted] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [attemptHistory, setAttemptHistory] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [reviewMode, setReviewMode] = useState(false);
    const [confirmSubmit, setConfirmSubmit] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get(`/quiz/${id}`),
            api.get(`/quiz/${id}/results`)
        ]).then(([quizRes, attemptsRes]) => {
            setQuiz(quizRes.data.quiz);
            setQuestions(quizRes.data.questions);
            setAttemptHistory(attemptsRes.data.attempts || []);
            if (quizRes.data.quiz.time_limit_minutes) {
                setTimeLeft(quizRes.data.quiz.time_limit_minutes * 60);
            }
        })
            .catch(() => toast.error('Failed to load quiz'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || result || !quizStarted) return;
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, result, quizStarted]);

    useEffect(() => {
        if (timeLeft === 0 && !result && quizStarted) {
            handleSubmit();
        }
    }, [timeLeft, quizStarted]);

    const startQuiz = () => {
        setQuizStarted(true);
        setSelectedAnswers({});
        setCurrentQuestion(0);
        toast.success('Quiz started! Good luck!');
    };

    const handleAnswerSelect = (questionId, answer) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const navigateToQuestion = (index) => {
        setCurrentQuestion(index);
    };

    const goToPreviousQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const goToNextQuestion = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const getAnsweredCount = () => {
        return Object.keys(selectedAnswers).length;
    };

    const getQuizProgress = () => {
        return (getAnsweredCount() / questions.length) * 100;
    };

    const handleSubmit = async () => {
        if (!confirmSubmit) {
            setConfirmSubmit(true);
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/quiz/submit', {
                quiz_id: id,
                answers: selectedAnswers
            });
            setResult(res.data);
            setShowResults(true);
            setQuizStarted(false);
            // Re-fetch attempt history so retry button shows correct state
            const attemptsRes = await api.get(`/quiz/${id}/results`);
            setAttemptHistory(attemptsRes.data.attempts || []);
            toast.success('Quiz submitted successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Submission failed');
        } finally {
            setSubmitting(false);
            setConfirmSubmit(false);
        }
    };

    const retryQuiz = () => {
        setQuizStarted(false);
        setSelectedAnswers({});
        setCurrentQuestion(0);
        setResult(null);
        setShowResults(false);
        setTimeLeft(quiz.time_limit_minutes * 60);
        setReviewMode(false);
    };

    const viewDetailedResults = () => {
        setReviewMode(true);
    };

    const calculateGrade = (score) => {
        if (score >= 90) return { grade: 'A', color: 'text-green-400' };
        if (score >= 80) return { grade: 'B', color: 'text-blue-400' };
        if (score >= 70) return { grade: 'C', color: 'text-yellow-400' };
        if (score >= 60) return { grade: 'D', color: 'text-orange-400' };
        return { grade: 'F', color: 'text-red-400' };
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    if (loading) return <div className="text-center py-20 text-[var(--muted)]">Loading quiz...</div>;
    if (!quiz) return <div className="text-center py-20 text-[var(--muted)]">Quiz not found</div>;

    // Quiz Start Screen
    if (!quizStarted && !showResults) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">📝</span>
                        </div>
                        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">{quiz.title}</h1>
                        <p className="text-[var(--muted)]">{quiz.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-[var(--surface-2)] rounded-xl p-4">
                            <div className="text-2xl font-bold text-[var(--accent-primary)]">{questions.length}</div>
                            <div className="text-sm text-[var(--muted)]">Questions</div>
                        </div>
                        {quiz.time_limit_minutes && (
                            <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                <div className="text-2xl font-bold text-blue-400">{quiz.time_limit_minutes}</div>
                                <div className="text-sm text-[var(--muted)]">Minutes</div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-6">
                        <div className="text-lg font-bold text-yellow-400">{quiz.passing_score}%</div>
                        <div className="text-sm text-[var(--muted)]">Passing Score</div>
                    </div>

                    {/* Attempt History */}
                    {attemptHistory.length > 0 && (
                        <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-6">
                            <h3 className="text-[var(--text)] font-medium mb-3">Previous Attempts</h3>
                            <div className="space-y-2">
                                {attemptHistory.slice(-3).map((attempt, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--muted)]">
                                            {new Date(attempt.completed_at).toLocaleDateString()}
                                        </span>
                                        <span className={`font-medium ${attempt.passed ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {attempt.score}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={startQuiz}
                        className="w-full py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] font-semibold hover:opacity-90 transition"
                    >
                        Start Quiz
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-3 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] hover:text-[var(--text)] transition"
                    >
                        Back to Course
                    </button>
                </div>
            </div>
        );
    }

    // Quiz Results Screen
    if (showResults && result) {
        const gradeInfo = calculateGrade(result.score);
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <div className="mb-6">
                        <div className={`text-6xl mb-4 ${result.passed ? '🎉' : '😔'}`}>
                            {result.passed ? '🎉' : '😔'}
                        </div>
                        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
                            {result.passed ? 'Congratulations!' : 'Keep Practicing!'}
                        </h1>
                        <div className={`text-6xl font-extrabold ${gradeInfo.color} mb-2`}>
                            {result.score}%
                        </div>
                        <div className={`text-2xl font-bold ${gradeInfo.color} mb-4`}>
                            Grade: {gradeInfo.grade}
                        </div>
                        <p className="text-[var(--muted)]">Passing score: {quiz.passing_score}%</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-[var(--surface-2)] rounded-xl p-4">
                            <div className="text-2xl font-bold text-green-400">{result.correct_answers}</div>
                            <div className="text-sm text-[var(--muted)]">Correct</div>
                        </div>
                        <div className="bg-[var(--surface-2)] rounded-xl p-4">
                            <div className="text-2xl font-bold text-red-400">{result.incorrect_answers}</div>
                            <div className="text-sm text-[var(--muted)]">Incorrect</div>
                        </div>
                        <div className="bg-[var(--surface-2)] rounded-xl p-4">
                            <div className="text-2xl font-bold text-yellow-400">{result.time_taken || 'N/A'}</div>
                            <div className="text-sm text-[var(--muted)]">Time Taken</div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={viewDetailedResults}
                            className="flex-1 py-3 bg-blue-600/30 border border-[var(--accent-tertiary)]/30 rounded-xl text-blue-300 font-medium hover:bg-blue-600/40 transition"
                        >
                            Review Answers
                        </button>
                        {attemptHistory.length < quiz.max_attempts && (
                            <button
                                onClick={retryQuiz}
                                className="flex-1 py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] font-medium hover:opacity-90 transition"
                            >
                                Retry Quiz
                            </button>
                        )}
                        <button
                            onClick={() => navigate(-1)}
                            className="flex-1 py-3 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] hover:text-[var(--text)] transition"
                        >
                            Back to Course
                        </button>
                    </div>
                </div>

                {/* Detailed Results */}
                {reviewMode && (
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-[var(--text)]">Answer Review</h3>
                            <button
                                onClick={() => setReviewMode(false)}
                                className="text-[var(--muted)] hover:text-[var(--text)]"
                            >
                                ←
                            </button>
                        </div>
                        <div className="space-y-3">
                            {result.graded_answers?.map((answer, index) => {
                                const question = questions.find(q => q.id === answer.question_id) || questions[index];
                                return (
                                    <div key={index} className={`p-4 rounded-xl text-sm ${answer.correct
                                        ? 'bg-green-500/10 border border-green-500/20'
                                        : 'bg-red-500/10 border border-red-500/20'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${answer.correct ? 'bg-green-500 text-[var(--text)]' : 'bg-red-500 text-[var(--text)]'
                                                }`}>
                                                {answer.correct ? '✓' : '✗'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[var(--text)] font-medium mb-2">
                                                    {index + 1}. {question?.question}
                                                </p>
                                                <div className="space-y-1">
                                                    <p className={`${answer.correct ? 'text-green-400' : 'text-red-400'}`}>
                                                        Your answer: {answer.user_answer || 'No answer'}
                                                    </p>
                                                    {!answer.correct && (
                                                        <p className="text-[var(--muted)]">
                                                            Correct: {answer.correct_answer}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Quiz Taking Screen
    if (quizStarted) {
        const currentQ = questions[currentQuestion];
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Quiz Header */}
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-[var(--text)]">{quiz.title}</h1>
                            <p className="text-sm text-[var(--muted)]">
                                Question {currentQuestion + 1} of {questions.length}
                            </p>
                        </div>
                        {timeLeft !== null && (
                            <div className={`text-lg font-bold px-4 py-2 rounded-xl ${timeLeft < 60
                                ? 'bg-red-500/20 text-red-400 animate-pulse'
                                : 'bg-[var(--surface-2)] text-[var(--text)] border border-purple-900/30'
                                }`}>
                                ⏱ {formatTime(timeLeft)}
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getQuizProgress()}%` }}
                            />
                        </div>
                        <div className="mt-2 text-xs text-[var(--muted)]">
                            {getAnsweredCount()} of {questions.length} questions answered
                        </div>
                    </div>
                </div>

                {/* Question Navigation */}
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-4">
                    <div className="flex gap-2 flex-wrap">
                        {questions.map((q, index) => (
                            <button
                                key={q.id}
                                onClick={() => navigateToQuestion(index)}
                                className={`w-10 h-10 rounded-lg text-sm font-medium transition ${index === currentQuestion
                                    ? 'bg-[var(--accent-primary)] text-[var(--text)]'
                                    : selectedAnswers[q.id]
                                        ? 'bg-green-600/30 border border-green-500/30 text-green-300'
                                        : 'bg-[var(--surface-2)] border border-purple-900/30 text-[var(--muted)] hover:border-purple-500/50'
                                    }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Current Question */}
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-[var(--text)] mb-4">
                        {currentQuestion + 1}. {currentQ.question}
                    </h3>

                    {/* Multiple Choice */}
                    {(currentQ.question_type === 'multiple_choice' || currentQ.question_type === 'mcq') && currentQ.options && (
                        <div className="space-y-3">
                            {(typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : currentQ.options).map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(currentQ.id, option)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition ${selectedAnswers[currentQ.id] === option
                                        ? 'bg-[var(--accent-primary)]/30 border border-purple-500 text-[var(--text)]'
                                        : 'bg-[var(--surface-2)] border border-purple-900/30 text-[var(--muted)] hover:border-purple-500/50'
                                        }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* True/False */}
                    {currentQ.question_type === 'true_false' && (
                        <div className="flex gap-3">
                            {['True', 'False'].map(option => (
                                <button
                                    key={option}
                                    onClick={() => handleAnswerSelect(currentQ.id, option)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${selectedAnswers[currentQ.id] === option
                                        ? 'bg-[var(--accent-primary)]/30 border border-purple-500 text-[var(--text)]'
                                        : 'bg-[var(--surface-2)] border border-purple-900/30 text-[var(--muted)] hover:border-purple-500/50'
                                        }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Short Answer */}
                    {currentQ.question_type === 'short_answer' && (
                        <input
                            type="text"
                            value={selectedAnswers[currentQ.id] || ''}
                            onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
                        />
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={goToPreviousQuestion}
                        disabled={currentQuestion === 0}
                        className="px-6 py-3 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] hover:text-[var(--text)] transition disabled:opacity-50"
                    >
                        Previous
                    </button>

                    {currentQuestion === questions.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || getAnsweredCount() === 0}
                            className="flex-1 py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] font-semibold hover:opacity-90 transition disabled:opacity-50"
                        >
                            {submitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                    ) : (
                        <button
                            onClick={goToNextQuestion}
                            className="flex-1 py-3 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--text)] hover:border-purple-500 transition"
                        >
                            Next Question
                        </button>
                    )}
                </div>

                {/* Submit Confirmation Modal */}
                {confirmSubmit && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Submit Quiz?</h3>
                            <p className="text-[var(--muted)] mb-6">
                                You have answered {getAnsweredCount()} out of {questions.length} questions.
                                {getAnsweredCount() < questions.length && ' Unanswered questions will be marked as incorrect.'}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] font-medium hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Confirm Submit'}
                                </button>
                                <button
                                    onClick={() => setConfirmSubmit(false)}
                                    className="flex-1 py-3 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] hover:text-[var(--text)] transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}









