import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

export default function TakeExam() {
    const { id }   = useParams();
    const navigate = useNavigate();

    // Exam data
    const [assessment, setAssessment] = useState(null);
    const [questions,  setQuestions]  = useState([]);
    const [attempt,    setAttempt]    = useState(null);

    // Student answers — { [question_id]: answer_string }
    const [answers, setAnswers] = useState({});

    // UI state
    const [current,    setCurrent]    = useState(0);   // current question index
    const [loading,    setLoading]    = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted,  setSubmitted]  = useState(false);
    const [result,     setResult]     = useState(null);
    const [timeLeft,   setTimeLeft]   = useState(null); // seconds

    const timerRef    = useRef(null);
    const autoSubmitRef = useRef(false);

    // ── Load exam ──────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                // Start attempt (records started_at, validates window)
                const startRes = await api.post(`/assessments/${id}/start`);
                setAttempt(startRes.data.attempt);

                // Fetch questions (no correct_answer returned for students)
                const qRes = await api.get(`/assessments/${id}/questions`);
                setAssessment(qRes.data.assessment);
                setQuestions(qRes.data.questions || []);

                // Calculate remaining time
                const started  = new Date(startRes.data.attempt.started_at);
                const duration = qRes.data.assessment.duration_minutes * 60; // seconds
                const elapsed  = Math.floor((Date.now() - started.getTime()) / 1000);
                const remaining = Math.max(0, duration - elapsed);
                setTimeLeft(remaining);
            } catch (err) {
                const msg = err.response?.data?.error || 'Failed to load exam';
                toast.error(msg);
                navigate('/student/assessments');
            } finally {
                setLoading(false);
            }
        };
        init();
        return () => clearInterval(timerRef.current);
    }, [id]);

    // ── Countdown timer ────────────────────────────────────────────────────
    const handleAutoSubmit = useCallback(async () => {
        if (autoSubmitRef.current || submitting) return;
        autoSubmitRef.current = true;
        toast('⏰ Time is up! Submitting your exam...', { duration: 4000 });
        await submitExam(true);
    }, [submitting]);

    useEffect(() => {
        if (timeLeft === null || submitted) return;
        if (timeLeft <= 0) { handleAutoSubmit(); return; }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [timeLeft, submitted]);

    // ── Submit ─────────────────────────────────────────────────────────────
    const submitExam = async (auto = false) => {
        if (submitting || submitted) return;
        clearInterval(timerRef.current);
        setSubmitting(true);
        try {
            const res = await api.post(`/assessments/${id}/attempt`, { answers });
            setResult(res.data);
            setSubmitted(true);
            if (!auto) toast.success(res.data.message || 'Exam submitted!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Submission failed');
            setSubmitting(false);
            autoSubmitRef.current = false;
        }
    };

    const handleSubmitClick = () => {
        const unanswered = questions.filter(q => !answers[q.id]);
        if (unanswered.length > 0) {
            toast(`You have ${unanswered.length} unanswered question${unanswered.length > 1 ? 's' : ''}. Submit anyway?`, {
                duration: 4000,
                icon: '⚠️',
            });
            // Give them 4 seconds to reconsider, then confirm with a second click
        }
        submitExam(false);
    };

    // ── Helpers ────────────────────────────────────────────────────────────
    const formatTime = (secs) => {
        if (secs === null) return '--:--';
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const answeredCount = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length;
    const progress      = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
    const timerColor    = timeLeft !== null && timeLeft < 120 ? 'text-red-400' : timeLeft < 300 ? 'text-yellow-400' : 'text-green-400';

    // ── Loading ────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    // ── Results screen ─────────────────────────────────────────────────────
    if (submitted && result) {
        const score       = result.score;
        const passed      = result.passed;
        const autoGraded  = result.auto_graded;

        return (
            <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-4">
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 max-w-lg w-full text-center">
                    <div className="text-6xl mb-4">
                        {!autoGraded ? '📋' : passed ? '🎉' : '📚'}
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {!autoGraded ? 'Submitted for Review' : passed ? 'Congratulations!' : 'Keep Practising'}
                    </h1>
                    <p className="text-gray-400 mb-6">
                        {assessment?.title}
                    </p>

                    {autoGraded && score !== null ? (
                        <>
                            <div className={`text-5xl font-bold mb-2 ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {score}%
                            </div>
                            <p className={`text-lg font-semibold mb-6 ${passed ? 'text-green-400' : 'text-red-400'}`}>
                                {passed ? '✓ Passed' : '✗ Failed'} (passing score: {assessment?.passing_score || 60}%)
                            </p>
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="bg-[#1a1a35] rounded-xl p-3">
                                    <p className="text-xl font-bold text-white">{result.earned_points}</p>
                                    <p className="text-xs text-gray-400">Points Earned</p>
                                </div>
                                <div className="bg-[#1a1a35] rounded-xl p-3">
                                    <p className="text-xl font-bold text-white">{result.total_points}</p>
                                    <p className="text-xs text-gray-400">Total Points</p>
                                </div>
                                <div className="bg-[#1a1a35] rounded-xl p-3">
                                    <p className="text-xl font-bold text-white">{questions.length}</p>
                                    <p className="text-xs text-gray-400">Questions</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-left">
                            <p className="text-yellow-300 text-sm font-medium mb-1">📝 Short Answer Pending</p>
                            <p className="text-gray-400 text-sm">
                                Your answers have been recorded. Your instructor will review the short answer
                                questions and update your grade. Check back on the Assessments page.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/student/assessments')}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:opacity-90 transition"
                    >
                        Back to Assessments
                    </button>
                </div>
            </div>
        );
    }

    const q = questions[current];

    // ── Exam taking screen ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0d0d1a] flex flex-col">
            {/* Top bar */}
            <div className="bg-[#12122a] border-b border-purple-900/30 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="min-w-0">
                    <h1 className="font-bold text-white truncate">{assessment?.title}</h1>
                    <p className="text-xs text-gray-400">{answeredCount}/{questions.length} answered</p>
                </div>

                {/* Timer */}
                <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${timerColor} flex-shrink-0`}>
                    ⏱ {formatTime(timeLeft)}
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-[#1a1a35]">
                <div
                    className="h-1 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Question navigator sidebar */}
                <div className="hidden md:flex flex-col w-56 bg-[#12122a] border-r border-purple-900/30 p-4 overflow-y-auto flex-shrink-0">
                    <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wider">Questions</p>
                    <div className="grid grid-cols-5 gap-1.5">
                        {questions.map((q, i) => {
                            const answered = answers[q.id] !== undefined && answers[q.id] !== '';
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrent(i)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                                        i === current
                                            ? 'bg-purple-600 text-white'
                                            : answered
                                            ? 'bg-green-600/30 text-green-300 border border-green-600/40'
                                            : 'bg-[#1a1a35] text-gray-400 hover:text-white border border-purple-900/30'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto pt-4 space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-600/30 border border-green-600/40" />
                            <span className="text-gray-400">Answered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-[#1a1a35] border border-purple-900/30" />
                            <span className="text-gray-400">Not answered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-purple-600" />
                            <span className="text-gray-400">Current</span>
                        </div>
                    </div>
                </div>

                {/* Main question area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        {q && (
                            <div className="max-w-2xl mx-auto">
                                {/* Question header */}
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <span className="text-xs text-purple-400 font-medium uppercase tracking-wider">
                                            Question {current + 1} of {questions.length}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a35] text-gray-400 capitalize border border-purple-900/30">
                                                {q.question_type === 'mcq' ? 'Multiple Choice' : q.question_type === 'true_false' ? 'True / False' : 'Short Answer'}
                                            </span>
                                            <span className="text-xs text-gray-400">{q.points} pt{q.points > 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Question text */}
                                <p className="text-white text-lg font-medium leading-relaxed mb-8">
                                    {q.question}
                                </p>

                                {/* MCQ options */}
                                {q.question_type === 'mcq' && (
                                    <div className="space-y-3">
                                        {(q.options || []).map((opt, oi) => {
                                            const selected = answers[q.id] === opt;
                                            return (
                                                <button
                                                    key={oi}
                                                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                                                        selected
                                                            ? 'bg-purple-600/30 border-purple-500 text-white'
                                                            : 'bg-[#1a1a35] border-purple-900/30 text-gray-300 hover:border-purple-500/50 hover:text-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
                                                            selected ? 'border-purple-400 bg-purple-500' : 'border-gray-500'
                                                        }`}>
                                                            {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                        </div>
                                                        <span>{opt}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* True / False */}
                                {q.question_type === 'true_false' && (
                                    <div className="flex gap-4">
                                        {['True', 'False'].map(val => {
                                            const selected = answers[q.id] === val;
                                            return (
                                                <button
                                                    key={val}
                                                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                                                    className={`flex-1 py-5 rounded-xl text-lg font-semibold border transition-all ${
                                                        selected
                                                            ? val === 'True'
                                                                ? 'bg-green-600/30 border-green-500 text-green-300'
                                                                : 'bg-red-600/30 border-red-500 text-red-300'
                                                            : 'bg-[#1a1a35] border-purple-900/30 text-gray-300 hover:border-purple-500/50 hover:text-white'
                                                    }`}
                                                >
                                                    {val === 'True' ? '✓ True' : '✗ False'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Short answer */}
                                {q.question_type === 'short_answer' && (
                                    <div>
                                        <textarea
                                            value={answers[q.id] || ''}
                                            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                            placeholder="Type your answer here..."
                                            rows={6}
                                            className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 resize-none transition"
                                        />
                                        <p className="text-xs text-yellow-400 mt-2">
                                            📝 This answer will be reviewed by your instructor.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom navigation */}
                    <div className="border-t border-purple-900/30 bg-[#12122a] px-4 md:px-8 py-4 flex items-center justify-between flex-shrink-0">
                        <button
                            onClick={() => setCurrent(i => Math.max(0, i - 1))}
                            disabled={current === 0}
                            className="px-5 py-2.5 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                            ← Previous
                        </button>

                        {/* Mobile question counter */}
                        <span className="text-sm text-gray-400 md:hidden">
                            {current + 1} / {questions.length}
                        </span>

                        {current < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrent(i => Math.min(questions.length - 1, i + 1))}
                                className="px-5 py-2.5 bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:bg-purple-600/40 transition"
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmitClick}
                                disabled={submitting}
                                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                            >
                                {submitting ? '⏳ Submitting...' : '✓ Submit Exam'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
