import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import LessonForm from '../../components/LessonForm';
import ConfirmModal from '../../components/ConfirmModal';

export default function InstructorCourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showLessonForm, setShowLessonForm] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [showAssignmentForm, setShowAssignmentForm] = useState(false);
    const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', due_date: '', max_points: 100 });
    const [savingAssignment, setSavingAssignment] = useState(false);
    const [showAssessmentForm, setShowAssessmentForm] = useState(false);
    const [assessmentForm, setAssessmentForm] = useState({ title: '', description: '', type: 'midterm', scheduled_date: '', duration_minutes: 120 });
    const [savingAssessment, setSavingAssessment] = useState(false);
    const [viewingSubmissions, setViewingSubmissions] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [notes, setNotes] = useState([]);
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteForm, setNoteForm] = useState({ title: '', content: '', is_public: true });
    const [savingNote, setSavingNote] = useState(false);
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

    useEffect(() => {
        fetchCourseData();
    }, [id]);

    const fetchCourseData = async () => {
        try {
            const [courseRes, studentsRes, assignmentsRes, assessmentsRes, lessonsRes, notesRes] = await Promise.all([
                api.get(`/courses/${id}`),
                api.get(`/courses/${id}/students`),
                api.get(`/assignments/course/${id}`),
                api.get(`/assessments/course/${id}`),
                api.get(`/lessons/course/${id}`),
                api.get(`/assessments/course/${id}/notes`),
            ]);

            setCourse(courseRes.data.course);
            setStudents(studentsRes.data.students || []);
            setAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
            setAssessments(Array.isArray(assessmentsRes.data) ? assessmentsRes.data : []);
            setLessons(Array.isArray(lessonsRes.data.lessons) ? lessonsRes.data.lessons : []);
            setNotes(notesRes.data.notes || []);
        } catch (error) {
            toast.error('Failed to load course data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCourse = () => {
        openConfirm({
            title: 'Delete course',
            message: 'Are you sure you want to delete this course?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`/courses/${id}`);
                    toast.success('Course deleted successfully');
                    navigate('/instructor/courses');
                } catch (error) {
                    toast.error('Failed to delete course');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const handleCreateLesson = async (lessonData) => {
        try {
            const response = await api.post('/lessons', {
                ...lessonData,
                course_id: id,
                order_index: lessons.length
            });
            setLessons([...lessons, response.data.lesson]);
            setShowLessonForm(false);
            toast.success('Lesson created successfully');
        } catch (error) {
            const msg = error?.response?.data?.error || error?.message || 'Failed to create lesson';
            toast.error(msg);
        }
    };

    const handleUpdateLesson = async (lessonData) => {
        try {
            const response = await api.put(`/lessons/${editingLesson.id}`, lessonData);
            setLessons(lessons.map(l => l.id === editingLesson.id ? response.data.lesson : l));
            setEditingLesson(null);
            setShowLessonForm(false);
            toast.success('Lesson updated successfully');
        } catch (error) {
            const msg = error?.response?.data?.error || error?.message || 'Failed to update lesson';
            toast.error(msg);
        }
    };

    const handleDeleteLesson = (lessonId) => {
        openConfirm({
            title: 'Delete lesson',
            message: 'Are you sure you want to delete this lesson?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`/lessons/${lessonId}`);
                    setLessons(lessons.filter(l => l.id !== lessonId));
                    toast.success('Lesson deleted successfully');
                } catch (error) {
                    toast.error('Failed to delete lesson');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const openLessonForm = (lesson = null) => {
        setEditingLesson(lesson);
        setShowLessonForm(true);
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setSavingAssignment(true);
        try {
            const res = await api.post('/assignments', {
                ...assignmentForm,
                courseId: id,
                dueDate: assignmentForm.due_date,
                maxPoints: assignmentForm.max_points,
            });
            setAssignments(prev => [res.data, ...prev]);
            setShowAssignmentForm(false);
            setAssignmentForm({ title: '', description: '', due_date: '', max_points: 100 });
            toast.success('Assignment created');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create assignment');
        } finally { setSavingAssignment(false); }
    };

    const handleCreateAssessment = async (e) => {
        e.preventDefault();
        setSavingAssessment(true);
        try {
            const res = await api.post('/assessments', {
                ...assessmentForm,
                courseId: id,
                startDate: assessmentForm.scheduled_date,
                duration: assessmentForm.duration_minutes,
            });
            setAssessments(prev => [res.data.assessment || res.data, ...prev]);
            setShowAssessmentForm(false);
            setAssessmentForm({ title: '', description: '', type: 'midterm', scheduled_date: '', duration_minutes: 120 });
            toast.success('Assessment created');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create assessment');
        } finally { setSavingAssessment(false); }
    };

    const fetchSubmissions = async (assignmentId) => {
        try {
            const res = await api.get(`/assignments/${assignmentId}/submissions`);
            setSubmissions(res.data.submissions || []);
            setViewingSubmissions(assignmentId);
        } catch {
            toast.error('Failed to load submissions');
        }
    };

    const handleCreateNote = async (e) => {
        e.preventDefault();
        setSavingNote(true);
        try {
            await api.post('/assessments/notes', { ...noteForm, course_id: id });
            toast.success('Note created');
            setShowNoteForm(false);
            setNoteForm({ title: '', content: '', is_public: true });
            const res = await api.get(`/assessments/course/${id}/notes`);
            setNotes(res.data.notes || []);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create note');
        } finally { setSavingNote(false); }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            await api.delete(`/assessments/notes/${noteId}`);
            setNotes(prev => prev.filter(n => n.id !== noteId));
            toast.success('Note deleted');
        } catch {
            toast.error('Failed to delete note');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400">Course not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{course.title}</h1>
                    <p className="text-gray-400 mt-1">{course.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span>📚 {course.category}</span>
                        <span>🎯 {course.difficulty_level}</span>
                        <span>👥 {students.length} students</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/instructor/courses')}
                        className="px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleDeleteCourse}
                        className="px-4 py-2 bg-red-600/20 border border-red-600/40 rounded-xl text-red-400 text-sm hover:bg-red-600/30 transition"
                    >
                        Delete Course
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#1a1a35] rounded-xl p-1">
                {['overview', 'lessons', 'students', 'assignments', 'assessments', 'notes'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition capitalize ${activeTab === tab
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Course Overview</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#1a1a35] rounded-xl p-4">
                                    <div className="text-sm text-gray-400 mb-1">Status</div>
                                    <div className="text-white font-medium">{course.status}</div>
                                </div>
                                <div className="bg-[#1a1a35] rounded-xl p-4">
                                    <div className="text-sm text-gray-400 mb-1">Created</div>
                                    <div className="text-white font-medium">
                                        {new Date(course.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="bg-[#1a1a35] rounded-xl p-4">
                                    <div className="text-sm text-gray-400 mb-1">Total Students</div>
                                    <div className="text-white font-medium">{students.length}</div>
                                </div>
                                <div className="bg-[#1a1a35] rounded-xl p-4">
                                    <div className="text-sm text-gray-400 mb-1">Assignments</div>
                                    <div className="text-white font-medium">{assignments.length}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                            <p className="text-gray-300">{course.description}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'lessons' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Course Lessons ({lessons.length})</h3>
                            <button
                                onClick={() => openLessonForm()}
                                className="px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:bg-purple-600/40 transition"
                            >
                                Add Lesson
                            </button>
                        </div>

                        {showLessonForm && (
                            <LessonForm
                                lesson={editingLesson}
                                onSubmit={editingLesson ? handleUpdateLesson : handleCreateLesson}
                                onCancel={() => {
                                    setShowLessonForm(false);
                                    setEditingLesson(null);
                                }}
                            />
                        )}

                        <div className="space-y-3">
                            {lessons.map((lesson, index) => (
                                <div key={lesson.id} className="bg-[#1a1a35] rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 bg-purple-600/30 rounded-full flex items-center justify-center text-purple-300 text-sm font-medium">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <h4 className="font-medium text-white">{lesson.title}</h4>
                                                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                                        <span>📹 {lesson.content_type || 'text'}</span>
                                                        {lesson.duration_minutes && <span>⏱️ {lesson.duration_minutes}min</span>}
                                                        {lesson.video_url && <span>🎥 Video</span>}
                                                        {lesson.pdf_url && <span>📄 PDF</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openLessonForm(lesson)}
                                                className="px-3 py-1 bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-sm hover:bg-blue-600/40 transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLesson(lesson.id)}
                                                className="px-3 py-1 bg-red-600/30 border border-red-500/30 rounded-lg text-red-300 text-sm hover:bg-red-600/40 transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {lessons.length === 0 && (
                                <div className="text-center py-8 text-gray-400">
                                    <p>No lessons created yet</p>
                                    <button
                                        onClick={() => openLessonForm()}
                                        className="mt-4 px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:bg-purple-600/40 transition"
                                    >
                                        Create First Lesson
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Enrolled Students ({students.length})</h3>
                        <div className="space-y-3">
                            {students.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {student.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{student.name}</p>
                                            <p className="text-xs text-gray-400">{student.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {students.length === 0 && (
                                <p className="text-gray-400 text-center py-8">No students enrolled yet</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Assignments ({assignments.length})</h3>
                            <button
                                onClick={() => setShowAssignmentForm(v => !v)}
                                className="px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:bg-purple-600/40 transition"
                            >
                                {showAssignmentForm ? 'Cancel' : '+ Add Assignment'}
                            </button>
                        </div>

                        {showAssignmentForm && (
                            <form onSubmit={handleCreateAssignment} className="bg-[#1a1a35] rounded-xl p-4 mb-4 space-y-3">
                                <input
                                    required
                                    placeholder="Assignment title"
                                    value={assignmentForm.title}
                                    onChange={e => setAssignmentForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                                <textarea
                                    placeholder="Description"
                                    value={assignmentForm.description}
                                    onChange={e => setAssignmentForm(f => ({ ...f, description: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Due Date</label>
                                        <input
                                            required
                                            type="datetime-local"
                                            value={assignmentForm.due_date}
                                            onChange={e => setAssignmentForm(f => ({ ...f, due_date: e.target.value }))}
                                            className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Max Points</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={assignmentForm.max_points}
                                            onChange={e => setAssignmentForm(f => ({ ...f, max_points: parseInt(e.target.value) || 100 }))}
                                            className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={savingAssignment}
                                    className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {savingAssignment ? 'Creating...' : 'Create Assignment'}
                                </button>
                            </form>
                        )}

                        <div className="space-y-3">
                            {assignments.map(assignment => (
                                <div key={assignment.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">{assignment.title}</p>
                                        <p className="text-xs text-gray-400">Due: {new Date(assignment.due_date).toLocaleDateString()} · {assignment.max_points} pts</p>
                                    </div>
                                    <button
                                        onClick={() => fetchSubmissions(assignment.id)}
                                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition"
                                    >
                                        View Submissions
                                    </button>
                                </div>
                            ))}
                            {assignments.length === 0 && (
                                <p className="text-gray-400 text-center py-8">No assignments created yet</p>
                            )}
                        </div>

                        {/* Submissions panel */}
                        {viewingSubmissions && (
                            <div className="mt-4 bg-[#1a1a35] rounded-xl p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-white">Submissions ({submissions.length})</h4>
                                    <button onClick={() => setViewingSubmissions(null)} className="text-gray-400 hover:text-white text-sm">Close</button>
                                </div>
                                {submissions.length === 0 ? (
                                    <p className="text-gray-400 text-sm">No submissions yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {submissions.map(sub => (
                                            <div key={sub.id} className="p-3 bg-[#12122a] rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-white text-sm font-medium">{sub.student_name}</p>
                                                        <p className="text-xs text-gray-400">{sub.student_email}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{sub.content || 'No text submission'}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${sub.score !== null ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                                        {sub.score !== null ? `${sub.score} pts` : 'Ungraded'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'assessments' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Assessments ({assessments.length})</h3>
                            <button
                                onClick={() => setShowAssessmentForm(v => !v)}
                                className="px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:bg-purple-600/40 transition"
                            >
                                {showAssessmentForm ? 'Cancel' : '+ Add Assessment'}
                            </button>
                        </div>

                        {showAssessmentForm && (
                            <form onSubmit={handleCreateAssessment} className="bg-[#1a1a35] rounded-xl p-4 mb-4 space-y-3">
                                <input
                                    required
                                    placeholder="Assessment title"
                                    value={assessmentForm.title}
                                    onChange={e => setAssessmentForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                                <textarea
                                    placeholder="Description"
                                    value={assessmentForm.description}
                                    onChange={e => setAssessmentForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                                />
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Type</label>
                                        <select
                                            value={assessmentForm.type}
                                            onChange={e => setAssessmentForm(f => ({ ...f, type: e.target.value }))}
                                            className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                        >
                                            <option value="midterm">Midterm</option>
                                            <option value="final">Final</option>
                                            <option value="practical">Practical</option>
                                            <option value="project">Project</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Scheduled Date</label>
                                        <input
                                            required
                                            type="datetime-local"
                                            value={assessmentForm.scheduled_date}
                                            onChange={e => setAssessmentForm(f => ({ ...f, scheduled_date: e.target.value }))}
                                            className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Duration (min)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={assessmentForm.duration_minutes}
                                            onChange={e => setAssessmentForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 120 }))}
                                            className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={savingAssessment}
                                    className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {savingAssessment ? 'Creating...' : 'Create Assessment'}
                                </button>
                            </form>
                        )}

                        <div className="space-y-3">
                            {assessments.map(assessment => (
                                <div key={assessment.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">{assessment.title}</p>
                                        <p className="text-xs text-gray-400 capitalize">{assessment.type} · {assessment.duration_minutes} min · {new Date(assessment.scheduled_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            {assessments.length === 0 && (
                                <p className="text-gray-400 text-center py-8">No assessments created yet</p>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'notes' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Course Notes ({notes.length})</h3>
                            <button
                                onClick={() => setShowNoteForm(v => !v)}
                                className="px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:bg-purple-600/40 transition"
                            >
                                {showNoteForm ? 'Cancel' : '+ Add Note'}
                            </button>
                        </div>

                        {showNoteForm && (
                            <form onSubmit={handleCreateNote} className="bg-[#1a1a35] rounded-xl p-4 mb-4 space-y-3">
                                <input
                                    required
                                    placeholder="Note title"
                                    value={noteForm.title}
                                    onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                                <textarea
                                    required
                                    placeholder="Note content..."
                                    value={noteForm.content}
                                    onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
                                    rows={4}
                                    className="w-full bg-[#12122a] border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                                />
                                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={noteForm.is_public}
                                        onChange={e => setNoteForm(f => ({ ...f, is_public: e.target.checked }))}
                                        className="rounded"
                                    />
                                    Visible to students
                                </label>
                                <button
                                    type="submit"
                                    disabled={savingNote}
                                    className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {savingNote ? 'Saving...' : 'Publish Note'}
                                </button>
                            </form>
                        )}

                        <div className="space-y-3">
                            {notes.map(note => (
                                <div key={note.id} className="bg-[#1a1a35] rounded-xl p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-medium text-white">{note.title}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {new Date(note.created_at).toLocaleDateString()} ·{' '}
                                                <span className={note.is_public ? 'text-green-400' : 'text-yellow-400'}>
                                                    {note.is_public ? 'Public' : 'Private'}
                                                </span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-lg text-red-300 text-xs hover:bg-red-600/30 transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.content}</p>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <p className="text-gray-400 text-center py-8">No notes yet. Add notes for your students.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                cancelLabel={confirmDialog.cancelLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />
        </div>
    );
}
