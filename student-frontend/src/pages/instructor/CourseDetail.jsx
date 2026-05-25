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
            const [courseRes, studentsRes, assignmentsRes, assessmentsRes, lessonsRes] = await Promise.all([
                api.get(`/courses/${id}`),
                api.get(`/courses/${id}/students`),
                api.get(`/assignments/course/${id}`),
                api.get(`/assessments/course/${id}`),
                api.get(`/lessons/course/${id}`)
            ]);

            setCourse(courseRes.data.course);
            setStudents(studentsRes.data.students || []);
            setAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
            setAssessments(Array.isArray(assessmentsRes.data) ? assessmentsRes.data : []);
            setLessons(Array.isArray(lessonsRes.data.lessons) ? lessonsRes.data.lessons : []);
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
                {['overview', 'lessons', 'students', 'assignments', 'assessments'].map(tab => (
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
                        <h3 className="text-lg font-semibold text-white mb-4">Assignments ({assignments.length})</h3>
                        <div className="space-y-3">
                            {assignments.map(assignment => (
                                <div key={assignment.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">{assignment.title}</p>
                                        <p className="text-xs text-gray-400">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                                    </div>
                                    <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition">
                                        View Submissions
                                    </button>
                                </div>
                            ))}
                            {assignments.length === 0 && (
                                <p className="text-gray-400 text-center py-8">No assignments created yet</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'assessments' && (
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Assessments ({assessments.length})</h3>
                        <div className="space-y-3">
                            {assessments.map(assessment => (
                                <div key={assessment.id} className="flex items-center justify-between p-3 bg-[#1a1a35] rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">{assessment.title}</p>
                                        <p className="text-xs text-gray-400">Duration: {assessment.duration_minutes} min</p>
                                    </div>
                                    <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition">
                                        View Results
                                    </button>
                                </div>
                            ))}
                            {assessments.length === 0 && (
                                <p className="text-gray-400 text-center py-8">No assessments created yet</p>
                            )}
                        </div>
                    </div>
                )}
            </div>            <ConfirmModal
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                cancelLabel={confirmDialog.cancelLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />        </div>
    );
}
