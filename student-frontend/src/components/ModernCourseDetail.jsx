import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { toEmbedVideoUrl, shouldUseVideoElement } from '../utils/videoUrl';

export default function ModernCourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [activeLesson, setActiveLesson] = useState(null);
    const [enrolled, setEnrolled] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completedLessons, setCompletedLessons] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesLoading, setNotesLoading] = useState(false);

    useEffect(() => {
        fetchCourseData();
    }, [id]);

    const fetchCourseData = async () => {
        try {
            const [courseRes, progressRes, quizRes, assignmentRes] = await Promise.all([
                api.get(`/courses/${id}`),
                api.get(`/analytics/student/progress/${id}`),
                api.get(`/quiz/course/${id}`),
                api.get(`/assignments/course/${id}`),
            ]);

            const lessonList = courseRes.data.lessons || [];
            setCourse(courseRes.data.course);
            setLessons(lessonList);
            setQuizzes(quizRes.data.quizzes || []);
            setAssignments(Array.isArray(assignmentRes.data) ? assignmentRes.data : assignmentRes.data.assignments || []);

            if (progressRes.data.enrollment) {
                setEnrolled(true);
                setProgress(progressRes.data.enrollment.progress_percent || 0);
            }

            if (progressRes.data.lessons) {
                const completed = new Set(
                    progressRes.data.lessons
                        .filter(l => l.completed)
                        .map(l => l.id)
                );
                setCompletedLessons(completed);
            }

            if (lessonList.length > 0) {
                setActiveLesson(lessonList[0]);
            }
        } catch (error) {
            toast.error('Failed to load course');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async () => {
        try {
            await api.post(`/courses/${id}/enroll`);
            toast.success('Successfully enrolled in course!');
            setEnrolled(true);
            fetchCourseData();
        } catch (error) {
            toast.error('Failed to enroll in course');
        }
    };

    const markLessonComplete = async () => {
        if (!activeLesson) return;
        try {
            const { data } = await api.post(`/lessons/${activeLesson.id}/complete`, { course_id: id });
            setCompletedLessons(prev => new Set(prev).add(activeLesson.id));
            if (typeof data?.progress === 'number') {
                setProgress(data.progress);
            }
            toast.success('Lesson marked as complete!');
        } catch (error) {
            toast.error('Failed to mark lesson complete');
        }
    };

    const saveLessonNotes = async () => {
        if (!activeLesson || !lessonNotes.trim()) {
            toast.error('Notes cannot be empty');
            return;
        }
        setNotesLoading(true);
        try {
            await api.post(`/lessons/${activeLesson.id}/notes`, {
                content: lessonNotes,
            });
            toast.success('Notes saved!');
        } catch (error) {
            toast.error('Failed to save notes');
        } finally {
            setNotesLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white text-center">
                    <p className="text-xl mb-4">Course not found</p>
                    <button
                        onClick={() => navigate('/student/courses')}
                        className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                    >
                        Back to Courses
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{course.title}</h1>
                    <p className="text-indigo-100">by {course.instructor_name}</p>
                </div>
                <button
                    onClick={() => navigate('/student/courses')}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                >
                    Back
                </button>
            </div>

            {!enrolled ? (
                /* Not Enrolled View */
                <div className="max-w-5xl mx-auto p-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center">
                        <div className="mb-6">
                            <div className="text-6xl mb-4">🔒</div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Enroll to Start Learning</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">{course.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <InfoCard icon="📚" label="Lessons" value={lessons.length} />
                            <InfoCard icon="🎯" label="Quizzes" value={quizzes.length} />
                            <InfoCard icon="📝" label="Assignments" value={assignments.length} />
                        </div>

                        <button
                            onClick={handleEnroll}
                            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition"
                        >
                            Enroll Now
                        </button>
                    </div>
                </div>
            ) : (
                /* Enrolled View */
                <div className="max-w-7xl mx-auto p-6">
                    {/* Progress Bar */}
                    <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-900 dark:text-white">Course Progress</span>
                            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Left Sidebar - Lessons */}
                        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[600px]">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 font-bold">
                                Lessons ({completedLessons.size}/{lessons.length})
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {lessons.map((lesson, idx) => (
                                    <button
                                        key={lesson.id}
                                        onClick={() => setActiveLesson(lesson)}
                                        className={`w-full text-left p-4 border-b border-gray-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition ${
                                            activeLesson?.id === lesson.id
                                                ? 'bg-indigo-100 dark:bg-indigo-900/40 border-l-4 border-l-indigo-600'
                                                : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-xl flex-shrink-0 mt-1">
                                                {completedLessons.has(lesson.id) ? '✅' : `${idx + 1}`}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                                                    {lesson.title}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {lesson.duration_minutes} min
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Center - Video/Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {activeLesson && (
                                <>
                                    {/* Video Player */}
                                    <div className="bg-black rounded-2xl overflow-hidden shadow-xl">
                                        <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                            {activeLesson.video_url ? (
                                                shouldUseVideoElement(activeLesson.video_url) ? (
                                                    <video
                                                        src={activeLesson.video_url}
                                                        controls
                                                        className="w-full h-full"
                                                        title={activeLesson.title}
                                                    />
                                                ) : (
                                                    <iframe
                                                        src={toEmbedVideoUrl(activeLesson.video_url)}
                                                        className="w-full h-full border-0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                        title={activeLesson.title}
                                                    />
                                                )
                                            ) : (
                                                <div className="text-center text-slate-200 px-6 py-8 max-w-lg">
                                                    <div className="text-5xl mb-3" aria-hidden>
                                                        📖
                                                    </div>
                                                    <p className="font-medium text-white mb-1">No video for this lesson</p>
                                                    <p className="text-sm text-slate-400">
                                                        Read the lesson content below, use notes, or ask the AI tutor if you need help.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lesson Content */}
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 space-y-4">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{activeLesson.title}</h2>

                                        {activeLesson.text_content && (
                                            <div className="prose dark:prose-invert max-w-none">
                                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                                    {activeLesson.text_content}
                                                </p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                                            {!completedLessons.has(activeLesson.id) && (
                                                <button
                                                    onClick={markLessonComplete}
                                                    className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:opacity-90 transition"
                                                >
                                                    ✓ Mark Complete
                                                </button>
                                            )}
                                            <Link
                                                to={`/student/ai-tutor?lesson=${activeLesson.id}&course=${id}`}
                                                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition"
                                            >
                                                🧠 Ask AI Tutor
                                            </Link>
                                            {activeLesson.pdf_url && (
                                                <a
                                                    href={activeLesson.pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-6 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                                                >
                                                    📄 Download PDF
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Related Quizzes */}
                            {quizzes.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">📝 Quizzes</h3>
                                    <div className="space-y-2">
                                        {quizzes.map(quiz => (
                                            <Link
                                                key={quiz.id}
                                                to={`/student/quiz/${quiz.id}`}
                                                className="block p-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-900 dark:text-white">{quiz.title}</span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">{quiz.max_attempts} attempts</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar - Notes & Resources */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* AI Tutor Quick Card */}
                            <Link
                                to="/student/ai-tutor"
                                className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-6 hover:shadow-lg transition-all"
                            >
                                <div className="text-4xl mb-2">🧠</div>
                                <h3 className="font-bold mb-1">Ask AI Tutor</h3>
                                <p className="text-sm text-indigo-100">Get instant explanations and help</p>
                            </Link>

                            {/* Notes Section */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 space-y-4 h-fit">
                                <h3 className="font-bold text-gray-900 dark:text-white">📝 Notes</h3>
                                <textarea
                                    value={lessonNotes}
                                    onChange={(e) => setLessonNotes(e.target.value)}
                                    placeholder="Take notes here..."
                                    className="w-full h-40 p-3 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    onClick={saveLessonNotes}
                                    disabled={notesLoading}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {notesLoading ? 'Saving...' : 'Save Notes'}
                                </button>
                            </div>

                            {/* Resources */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4">📚 Resources</h3>
                                <div className="space-y-2">
                                    <ResourceLink as={Link} to={`/student/course-notes/${id}`} icon="📝" label="Course notes" />
                                    <ResourceLink as={Link} to={`/student/assignments/${id}`} icon="📋" label="Assignments" />
                                    <ResourceLink as={Link} to={`/student/ai-tutor?course=${id}`} icon="🧠" label="AI tutor" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoCard({ icon, label, value }) {
    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4">
            <div className="text-3xl mb-2">{icon}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

function ResourceLink({ as: Comp = 'a', to, href, icon, label, ...rest }) {
    const className =
        'flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition text-gray-900 dark:text-white font-medium text-left w-full';
    if (Comp === 'a') {
        return (
            <a href={href || '#'} className={className} {...rest}>
                <span className="text-xl" aria-hidden>
                    {icon}
                </span>
                <span className="flex-1">{label}</span>
                <span aria-hidden>→</span>
            </a>
        );
    }
    return (
        <Comp to={to || '/student'} className={className} {...rest}>
            <span className="text-xl" aria-hidden>
                {icon}
            </span>
            <span className="flex-1">{label}</span>
            <span aria-hidden>→</span>
        </Comp>
    );
}
