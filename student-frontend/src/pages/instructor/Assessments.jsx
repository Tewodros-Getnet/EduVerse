import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

// Types that support online exam-taking (have questions)
const EXAM_TYPES = ['exam', 'midterm', 'final'];
const ALL_TYPES  = ['exam', 'midterm', 'final', 'project'];

const TYPE_LABELS = {
    exam:    '📝 Exam',
    midterm: '📋 Midterm',
    final:   '🎓 Final',
    project: '🗂️ Project',
};

const TYPE_COLORS = {
    exam:    'bg-purple-500/20 text-purple-300 border-purple-500/30',
    midterm: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    final:   'bg-red-500/20    text-red-300    border-red-500/30',
    project: 'bg-green-500/20  text-green-300  border-green-500/30',
};

const emptyQuestion = () => ({
    question: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
});

const InstructorAssessments = () => {
    const [assessments,      setAssessments]      = useState([]);
    const [courses,          setCourses]          = useState([]);
    const [loading,          setLoading]          = useState(true);
    const [showCreateForm,   setShowCreateForm]   = useState(false);

    // Results modal
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [showResultsModal,   setShowResultsModal]   = useState(false);
    const [assessmentResults,  setAssessmentResults]  = useState([]);
    const [enrolledStudents,   setEnrolledStudents]   = useState([]);
    const [resultsLoading,     setResultsLoading]     = useState(false);
    const [savingGrade,        setSavingGrade]        = useState(null);
    const [gradeInputs,        setGradeInputs]        = useState({});

    // Question editor modal
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [editingAssessment,  setEditingAssessment]  = useState(null);
    const [questions,          setQuestions]          = useState([emptyQuestion()]);
    const [passingScore,       setPassingScore]       = useState(60);
    const [savingQuestions,    setSavingQuestions]    = useState(false);
    const [loadingQuestions,   setLoadingQuestions]   = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false, title: '', message: '',
        confirmLabel: 'Confirm', cancelLabel: 'Cancel', onConfirm: null,
    });
    const openConfirm = (opts) => setConfirmDialog({ open: true, ...opts });
    const closeConfirm = () => setConfirmDialog(p => ({ ...p, open: false, onConfirm: null }));

    const [formData, setFormData] = useState({
        title: '', description: '', courseId: '', type: 'exam', startDate: '', duration: 60,
    });

    useEffect(() => { fetchAssessments(); fetchCourses(); }, []);

    const fetchAssessments = async () => {
        try {
            const res = await api.get('/assessments/instructor');
            setAssessments(Array.isArray(res.data) ? res.data : res.data.assessments || []);
        } catch { toast.error('Failed to load assessments'); setAssessments([]); }
        finally  { setLoading(false); }
    };

    const fetchCourses = async () => {
        try {
            const res = await api.get('/courses/instructor');
            setCourses(Array.isArray(res.data) ? res.data : res.data.courses || []);
        } catch { toast.error('Failed to load courses'); }
    };

    // ── Create ─────────────────────────────────────────────────────────────
    const handleCreateAssessment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/assessments', formData);
            toast.success('Assessment created! Now add questions if needed.');
            setShowCreateForm(false);
            setFormData({ title: '', description: '', courseId: '', type: 'exam', startDate: '', duration: 60 });
            fetchAssessments();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create assessment');
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────
    const handleDeleteAssessment = (id) => {
        openConfirm({
            title: 'Delete assessment',
            message: 'Are you sure? This will also delete all questions and student attempts.',
            confirmLabel: 'Delete', cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`/assessments/${id}`);
                    toast.success('Assessment deleted');
                    fetchAssessments();
                } catch { toast.error('Failed to delete assessment'); }
                finally { closeConfirm(); }
            },
        });
    };

    // ── Results modal ──────────────────────────────────────────────────────
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
            const results  = resultsRes.data.results  || [];
            const students = studentsRes.data.students || [];
            setAssessmentResults(results);
            setEnrolledStudents(students);
            const inputs = {};
            results.forEach(r => { inputs[r.student_id] = { score: r.score ?? '', remarks: r.remarks || '' }; });
            students.forEach(s => { if (!inputs[s.id]) inputs[s.id] = { score: '', remarks: '' }; });
            setGradeInputs(inputs);
        } catch {
            toast.error('Failed to load results');
            setShowResultsModal(false);
        } finally { setResultsLoading(false); }
    };

    const handleSaveGrade = async (studentId) => {
        const input = gradeInputs[studentId];
        if (input.score === '' || input.score === null) { toast.error('Please enter a score'); return; }
        const score = parseInt(input.score);
        if (isNaN(score) || score < 0 || score > 100) { toast.error('Score must be 0–100'); return; }
        setSavingGrade(studentId);
        try {
            await api.post(`/assessments/${selectedAssessment.id}/results`, {
                student_id: studentId, score, remarks: input.remarks,
            });
            toast.success('Grade saved');
            const res = await api.get(`/assessments/${selectedAssessment.id}/results`);
            setAssessmentResults(res.data.results || []);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to save grade'); }
        finally { setSavingGrade(null); }
    };

    // ── Question editor ────────────────────────────────────────────────────
    const openQuestionsModal = async (assessment) => {
        setEditingAssessment(assessment);
        setPassingScore(assessment.passing_score || 60);
        setShowQuestionsModal(true);
        setLoadingQuestions(true);
        try {
            const res = await api.get(`/assessments/${assessment.id}/questions`);
            const qs = res.data.questions || [];
            setQuestions(qs.length > 0 ? qs.map(q => ({
                ...q,
                options: q.options || ['', '', '', ''],
            })) : [emptyQuestion()]);
        } catch { toast.error('Failed to load questions'); }
        finally { setLoadingQuestions(false); }
    };

    const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);

    const removeQuestion = (i) => {
        if (questions.length === 1) { toast.error('At least one question is required'); return; }
        setQuestions(prev => prev.filter((_, idx) => idx !== i));
    };

    const updateQuestion = (i, field, value) => {
        setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
    };

    const updateOption = (qi, oi, value) => {
        setQuestions(prev => prev.map((q, idx) => {
            if (idx !== qi) return q;
            const opts = [...(q.options || ['', '', '', ''])];
            opts[oi] = value;
            return { ...q, options: opts };
        }));
    };

    const handleSaveQuestions = async () => {
        // Validate
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) { toast.error(`Question ${i + 1}: text is required`); return; }
            if (q.question_type === 'mcq') {
                if (q.options.some(o => !o.trim())) { toast.error(`Question ${i + 1}: all options must be filled`); return; }
                if (!q.correct_answer) { toast.error(`Question ${i + 1}: select the correct answer`); return; }
            }
            if (q.question_type === 'true_false' && !q.correct_answer) {
                toast.error(`Question ${i + 1}: select True or False`); return;
            }
        }

        setSavingQuestions(true);
        try {
            await api.post(`/assessments/${editingAssessment.id}/questions`, { questions });
            toast.success(`${questions.length} question${questions.length > 1 ? 's' : ''} saved!`);
            setShowQuestionsModal(false);
            fetchAssessments(); // refresh has_questions flag
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save questions');
        } finally { setSavingQuestions(false); }
    };

    // ── Edit assessment ────────────────────────────────────────────────────
    const [editingId,   setEditingId]   = useState(null);
    const [editForm,    setEditForm]    = useState({});
    const [savingEdit,  setSavingEdit]  = useState(false);

    const openEdit = (assessment) => {
        setEditingId(assessment.id);
        setEditForm({
            title:            assessment.title,
            description:      assessment.description || '',
            type:             assessment.type,
            startDate:        assessment.scheduled_date
                                  ? new Date(assessment.scheduled_date).toISOString().slice(0, 16)
                                  : '',
            duration:         assessment.duration_minutes || 60,
        });
    };

    const handleSaveEdit = async () => {
        setSavingEdit(true);
        try {
            const res = await api.put(`/assessments/${editingId}`, editForm);
            setAssessments(prev => prev.map(a =>
                a.id === editingId ? { ...a, ...(res.data.assessment || res.data) } : a
            ));
            setEditingId(null);
            toast.success('Assessment updated');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update');
        } finally { setSavingEdit(false); }
    };


    const totalPoints = (qs) => qs.reduce((s, q) => s + (parseInt(q.points) || 1), 0);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Assessments</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                >
                    + Create Assessment
                </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-4">Create New Assessment</h2>
                    <form onSubmit={handleCreateAssessment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input type="text" value={formData.title} required
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Course</label>
                                <select value={formData.courseId} required
                                    onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm">
                                    <option value="">Select a course</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Type</label>
                                <select value={formData.type} required
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm">
                                    {ALL_TYPES.map(t => (
                                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Duration (min)</label>
                                <input type="number" value={formData.duration} min="1" required
                                    onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Scheduled Date</label>
                                <input type="datetime-local" value={formData.startDate} required
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Description</label>
                            <textarea value={formData.description} rows={3} placeholder="Describe what this assessment covers..."
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 text-sm resize-none" />
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition">
                                Create Assessment
                            </button>
                            <button type="button" onClick={() => setShowCreateForm(false)}
                                className="px-5 py-2.5 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Assessment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessments.map(assessment => {
                    const isExamType = EXAM_TYPES.includes(assessment.type);
                    const hasQ = assessment.has_questions;
                    const upcoming = new Date(assessment.scheduled_date) > new Date();
                    return (
                        <div key={assessment.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                            {/* Card header */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h3 className="font-semibold text-white">{assessment.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${TYPE_COLORS[assessment.type] || TYPE_COLORS.exam}`}>
                                            {assessment.type}
                                        </span>
                                        {isExamType && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hasQ ? 'bg-green-500/20 text-green-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                                {hasQ ? '✓ Questions added' : '⚠ No questions yet'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">{assessment.course_title}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${upcoming ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                                    {upcoming ? 'Upcoming' : 'Past'}
                                </span>
                            </div>

                            <p className="text-sm text-gray-300 mb-3 line-clamp-2">{assessment.description}</p>

                            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                                <span>📅 {new Date(assessment.scheduled_date).toLocaleString()}</span>
                                <span>⏱️ {assessment.duration_minutes} min</span>
                                {isExamType && <span>🎯 Pass: {assessment.passing_score || 60}%</span>}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap">
                                {/* Questions button — only for exam types */}
                                {isExamType && (
                                    <button
                                        onClick={() => openQuestionsModal(assessment)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                                            hasQ
                                                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30'
                                                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                                        }`}
                                    >
                                        {hasQ ? '✏️ Edit Questions' : '+ Add Questions'}
                                    </button>
                                )}
                                <button
                                    onClick={() => openEdit(assessment)}
                                    className="px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                                    title="Edit assessment details"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleViewResults(assessment)}
                                    className="flex-1 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-purple-400 text-sm hover:bg-purple-600/20 transition"
                                >
                                    Results
                                </button>
                                <button
                                    onClick={() => handleDeleteAssessment(assessment.id)}
                                    className="px-3 py-2 bg-red-600/20 border border-red-600/40 rounded-xl text-red-400 text-sm hover:bg-red-600/30 transition"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {assessments.length === 0 && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-white font-medium mb-2">No assessments yet</p>
                    <p className="text-gray-400 text-sm mb-4">Create your first exam or midterm for your students</p>
                    <button onClick={() => setShowCreateForm(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition">
                        Create Your First Assessment
                    </button>
                </div>
            )}

            <ConfirmModal
                open={confirmDialog.open} title={confirmDialog.title} message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel} cancelLabel={confirmDialog.cancelLabel}
                onConfirm={confirmDialog.onConfirm} onCancel={closeConfirm}
            />

            {/* ── Question Editor Modal ────────────────────────────────── */}
            {showQuestionsModal && editingAssessment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl w-full max-w-3xl my-4">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-purple-900/30">
                            <div>
                                <h2 className="text-xl font-bold text-white">Exam Questions</h2>
                                <p className="text-sm text-gray-400 mt-0.5">{editingAssessment.title}</p>
                            </div>
                            <button onClick={() => setShowQuestionsModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Passing score */}
                            <div className="flex items-center gap-4 bg-[#1a1a35] rounded-xl p-4">
                                <label className="text-sm text-gray-300 font-medium whitespace-nowrap">Passing Score (%)</label>
                                <input type="number" min="1" max="100" value={passingScore}
                                    onChange={e => setPassingScore(parseInt(e.target.value) || 60)}
                                    className="w-24 bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500 text-center" />
                                <span className="text-xs text-gray-400">Total points: {totalPoints(questions)}</span>
                            </div>

                            {/* Loading */}
                            {loadingQuestions ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Question list */}
                                    {questions.map((q, qi) => (
                                        <div key={qi} className="bg-[#1a1a35] border border-purple-900/30 rounded-xl p-5 space-y-4">
                                            {/* Q header */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-purple-300">Question {qi + 1}</span>
                                                <button onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                                            </div>

                                            {/* Question text */}
                                            <textarea
                                                value={q.question}
                                                onChange={e => updateQuestion(qi, 'question', e.target.value)}
                                                placeholder="Enter question text..."
                                                rows={2}
                                                className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                                            />

                                            {/* Type + Points row */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Question Type</label>
                                                    <select value={q.question_type}
                                                        onChange={e => updateQuestion(qi, 'question_type', e.target.value)}
                                                        className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                                                        <option value="mcq">Multiple Choice</option>
                                                        <option value="true_false">True / False</option>
                                                        <option value="short_answer">Short Answer</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Points</label>
                                                    <input type="number" min="1" value={q.points}
                                                        onChange={e => updateQuestion(qi, 'points', parseInt(e.target.value) || 1)}
                                                        className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                                </div>
                                            </div>

                                            {/* MCQ options */}
                                            {q.question_type === 'mcq' && (
                                                <div className="space-y-2">
                                                    <label className="block text-xs text-gray-400">Options — select the correct answer</label>
                                                    {(q.options || ['', '', '', '']).map((opt, oi) => (
                                                        <div key={oi} className="flex items-center gap-2">
                                                            <input type="radio" name={`correct-${qi}`}
                                                                checked={q.correct_answer === opt && opt !== ''}
                                                                onChange={() => updateQuestion(qi, 'correct_answer', opt)}
                                                                className="accent-purple-500 flex-shrink-0" />
                                                            <input type="text"
                                                                value={opt}
                                                                onChange={e => updateOption(qi, oi, e.target.value)}
                                                                placeholder={`Option ${oi + 1}`}
                                                                className="flex-1 bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* True/False */}
                                            {q.question_type === 'true_false' && (
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-2">Correct Answer</label>
                                                    <div className="flex gap-3">
                                                        {['True', 'False'].map(val => (
                                                            <button key={val} type="button"
                                                                onClick={() => updateQuestion(qi, 'correct_answer', val)}
                                                                className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                                                                    q.correct_answer === val
                                                                        ? 'bg-purple-600 text-white'
                                                                        : 'bg-[#0d0d1a] border border-purple-900/40 text-gray-400 hover:text-white'
                                                                }`}>
                                                                {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Short answer — no correct answer, instructor grades manually */}
                                            {q.question_type === 'short_answer' && (
                                                <p className="text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
                                                    ⚠️ Short answer questions require manual grading after submission.
                                                </p>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add question button */}
                                    <button onClick={addQuestion}
                                        className="w-full py-3 border border-dashed border-purple-700/50 rounded-xl text-purple-400 text-sm hover:bg-purple-600/10 transition">
                                        + Add Question
                                    </button>
                                </>
                            )}

                            {/* Footer buttons */}
                            <div className="flex gap-3 pt-2 border-t border-purple-900/30">
                                <button onClick={handleSaveQuestions} disabled={savingQuestions}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:opacity-90 transition disabled:opacity-50">
                                    {savingQuestions ? '⏳ Saving...' : `💾 Save ${questions.length} Question${questions.length > 1 ? 's' : ''}`}
                                </button>
                                <button onClick={() => setShowQuestionsModal(false)}
                                    className="px-6 py-3 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 hover:text-white transition">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Results Modal ──────────────────────────────────────────── */}
            {showResultsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-purple-900/30">
                            <div>
                                <h2 className="text-xl font-bold text-white">Assessment Results</h2>
                                {selectedAssessment && <p className="text-sm text-gray-400 mt-0.5">{selectedAssessment.title}</p>}
                            </div>
                            <button onClick={() => setShowResultsModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {resultsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {assessmentResults.filter(r => r.score !== null).length > 0 && (
                                        <div className="grid grid-cols-3 gap-4 mb-2">
                                            {[
                                                { label: 'Graded', value: `${assessmentResults.filter(r => r.score !== null).length}`, color: 'text-white' },
                                                { label: 'Average', value: `${Math.round(assessmentResults.filter(r => r.score !== null).reduce((s, r) => s + r.score, 0) / assessmentResults.filter(r => r.score !== null).length)}%`, color: 'text-green-400' },
                                                { label: 'Highest', value: `${Math.max(...assessmentResults.filter(r => r.score !== null).map(r => r.score))}%`, color: 'text-blue-400' },
                                            ].map(s => (
                                                <div key={s.label} className="bg-[#1a1a35] border border-purple-900/40 rounded-xl p-4 text-center">
                                                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                                                    <div className="text-sm text-gray-400">{s.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {enrolledStudents.length === 0 ? (
                                        <p className="text-center text-gray-400 py-12">No students enrolled yet.</p>
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
                                                        <div key={student.id} className="px-4 py-4 flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                                                                    {student.name[0].toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-white font-medium truncate">{student.name}</p>
                                                                    <p className="text-xs text-gray-400 truncate">{student.email}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <div className="flex items-center gap-1">
                                                                    <input type="number" min="0" max="100" placeholder="Score"
                                                                        value={input.score}
                                                                        onChange={e => setGradeInputs(p => ({ ...p, [student.id]: { ...p[student.id], score: e.target.value } }))}
                                                                        className="w-20 bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500 text-center" />
                                                                    <span className="text-gray-500 text-sm">%</span>
                                                                </div>
                                                                <input type="text" placeholder="Remarks (optional)"
                                                                    value={input.remarks}
                                                                    onChange={e => setGradeInputs(p => ({ ...p, [student.id]: { ...p[student.id], remarks: e.target.value } }))}
                                                                    className="w-36 bg-[#0d0d1a] border border-purple-900/40 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                                                                <button onClick={() => handleSaveGrade(student.id)} disabled={savingGrade === student.id}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${isGraded ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30' : 'bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30'}`}>
                                                                    {savingGrade === student.id ? '⏳' : isGraded ? 'Update' : 'Save'}
                                                                </button>
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

            {/* ── Edit Assessment Modal ──────────────────────────────────── */}
            {editingId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b border-purple-900/30">
                            <h2 className="text-lg font-bold text-white">Edit Assessment</h2>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input value={editForm.title}
                                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                                    <select value={editForm.type}
                                        onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
                                        {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Duration (min)</label>
                                    <input type="number" min="1" value={editForm.duration}
                                        onChange={e => setEditForm(f => ({ ...f, duration: parseInt(e.target.value) || 60 }))}
                                        className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Scheduled Date</label>
                                <input type="datetime-local" value={editForm.startDate}
                                    onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea rows={3} value={editForm.description}
                                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full bg-[#1a1a35] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleSaveEdit} disabled={savingEdit}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                                    {savingEdit ? '⏳ Saving...' : '✓ Save Changes'}
                                </button>
                                <button onClick={() => setEditingId(null)}
                                    className="px-5 py-2.5 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition">
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

export default InstructorAssessments;
