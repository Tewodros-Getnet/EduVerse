import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { toEmbedVideoUrl, shouldUseVideoElement } from '../../utils/videoUrl';

export default function CourseDetail() {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [activeLesson, setActiveLesson] = useState(null);
    const [completedLessons, setCompletedLessons] = useState(new Set());
    const [lessonProgress, setLessonProgress] = useState({});
    const [completing, setCompleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [overallProgress, setOverallProgress] = useState(0);
    const [watchTime, setWatchTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get(`/courses/${id}`),
            api.get(`/quiz/course/${id}`),
            api.get(`/assignments/course/${id}`),
            api.get(`/analytics/student/progress/${id}`),
        ]).then(([courseRes, quizRes, assignmentRes, progressRes]) => {
            setCourse(courseRes.data.course);
            setLessons(courseRes.data.lessons || []);
            setQuizzes(quizRes.data.quizzes || []);
            setAssignments(Array.isArray(assignmentRes.data) ? assignmentRes.data : assignmentRes.data.assignments || []);

            // Check if enrolled
            if (progressRes.data.enrollment) {
                setIsEnrolled(true);
                setOverallProgress(progressRes.data.enrollment.progress_percent || 0);
            }

            if (courseRes.data.lessons && courseRes.data.lessons.length) {
                setActiveLesson(courseRes.data.lessons[0]);
            }

            // Build set of completed lesson IDs and progress data
            const completed = new Set();
            const progress = {};
            (progressRes.data.lessons || []).forEach(lesson => {
                if (lesson.completed) {
                    completed.add(lesson.id);
                }
                progress[lesson.id] = {
                    completed: lesson.completed,
                    completed_at: lesson.completed_at,
                    watch_time: lesson.watch_time || 0
                };
            });
            setCompletedLessons(completed);
            setLessonProgress(progress);
        }).catch(() => toast.error('Failed to load course'))
            .finally(() => setLoading(false));
    }, [id]);

    const markComplete = async () => {
        if (!activeLesson || completedLessons.has(activeLesson.id)) return;
        setCompleting(true);
        try {
            await api.post(`/lessons/${activeLesson.id}/complete`, { course_id: id, watch_time: watchTime });
            setCompletedLessons(prev => new Set([...prev, activeLesson.id]));
            setLessonProgress(prev => ({
                ...prev,
                [activeLesson.id]: {
                    ...prev[activeLesson.id],
                    completed: true,
                    completed_at: new Date().toISOString(),
                    watch_time: watchTime
                }
            }));
            toast.success('Lesson marked as complete!');

            // Update overall progress
            const newCompletedCount = completedLessons.size + 1;
            const newProgress = Math.round((newCompletedCount / lessons.length) * 100);
            setOverallProgress(newProgress);
        } catch {
            toast.error('Failed to mark complete');
        } finally {
            setCompleting(false);
        }
    };

    const enroll = async () => {
        try {
            await api.post(`/courses/${id}/enroll`);
            setIsEnrolled(true);
            toast.success('Enrolled successfully!');
            // Refresh course data
            window.location.reload();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Enrollment failed');
        }
    };

    const handleVideoProgress = (currentTime, duration) => {
        if (activeLesson) {
            const progress = (currentTime / duration) * 100;
            setWatchTime(Math.round(currentTime));

            // Auto-mark as complete if 90% watched
            if (progress >= 90 && !completedLessons.has(activeLesson.id)) {
                markComplete();
            }
        }
    };

    const handlePlayPause = (playing) => {
        setIsPlaying(playing);
    };

    const navigateToNextLesson = () => {
        const currentIndex = lessons.findIndex(lesson => lesson.id === activeLesson.id);
        if (currentIndex < lessons.length - 1) {
            setActiveLesson(lessons[currentIndex + 1]);
        }
    };

    const navigateToPreviousLesson = () => {
        const currentIndex = lessons.findIndex(lesson => lesson.id === activeLesson.id);
        if (currentIndex > 0) {
            setActiveLesson(lessons[currentIndex - 1]);
        }
    };

    const getLessonStatus = (lesson) => {
        if (completedLessons.has(lesson.id)) return 'completed';
        if (lessonProgress[lesson.id]?.watch_time > 0) return 'in-progress';
        return 'not-started';
    };

    const getLessonStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-500';
            case 'in-progress': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const getLessonWatchPercent = (lesson) => {
        if (!lesson) return 0;
        if (completedLessons.has(lesson.id)) return 100;
        const durationSec = (lesson.duration_minutes || 0) * 60;
        const watchSec = lessonProgress[lesson.id]?.watch_time || 0;
        if (durationSec > 0) return Math.min(100, Math.round((watchSec / durationSec) * 100));
        return watchSec > 0 ? 25 : 0;
    };
    if (!course) return <div className="text-center py-20 text-gray-400">Course not found</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header with Progress */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <span className="text-xs text-purple-400 font-medium uppercase">{course.category}</span>
                        <h1 className="text-2xl font-bold text-white mt-1">{course.title}</h1>
                        <p className="text-gray-400 mt-2 text-sm">{course.description}</p>
                        <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                            <span> {course.instructor_name}</span>
                            <span> {course.difficulty_level}</span>
                            <span> {lessons.length} lessons</span>
                            <span> {quizzes.length} quizzes</span>
                            <span> {assignments.length} assignments</span>
                        </div>

                        {/* Progress Bar */}
                        {isEnrolled && (
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">Course Progress</span>
                                    <span className="text-sm text-purple-400 font-medium">{overallProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${overallProgress}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-xs text-gray-400">
                                    {completedLessons.size} of {lessons.length} lessons completed
                                </div>
                            </div>
                        )}

                        {!isEnrolled ? (
                            <button onClick={enroll}
                                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-semibold hover:opacity-90 transition text-sm">
                                Enroll Now
                            </button>
                        ) : (
                            <div className="mt-4 flex gap-2">
                                <Link to={`/student/course-notes/${id}`}
                                    className="px-4 py-2 bg-blue-600/30 border border-blue-500/30 rounded-xl text-sm text-blue-300 hover:bg-blue-600/40 transition">
                                    Course Notes
                                </Link>
                                <Link to={`/student/assignments/${id}`}
                                    className="px-4 py-2 bg-green-600/30 border border-green-500/30 rounded-xl text-sm text-green-300 hover:bg-green-600/40 transition">
                                    Assignments
                                </Link>
                                <Link to={`/student/ai-tutor?course=${id}`}
                                    className="px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-sm text-purple-300 hover:bg-purple-600/40 transition">
                                    AI Tutor
                                </Link>
                            </div>
                        )}
                    </div>
                    {course.thumbnail_url && (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full md:w-64 h-40 object-cover rounded-xl" />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Enhanced Lesson List */}
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                    <h2 className="font-semibold text-white mb-3">Course Content</h2>

                    {/* Lessons */}
                    <div className="space-y-2">
                        {lessons.map((lesson, i) => {
                            const status = getLessonStatus(lesson);
                            const isActive = activeLesson?.id === lesson.id;
                            return (
                                <button key={lesson.id} onClick={() => setActiveLesson(lesson)}
                                    className={`w-full text-left px-3 py-3 rounded-xl text-sm transition ${isActive ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' :
                                        'text-gray-400 hover:bg-[#1a1a35] hover:text-white'
                                        }`}>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${status === 'completed' ? 'bg-green-500 text-white' :
                                                status === 'in-progress' ? 'bg-yellow-500 text-white' :
                                                    'bg-[#1a1a35] text-gray-500 border border-gray-600'
                                                }`}>
                                                {status === 'completed' ? '✓' : status === 'in-progress' ? '⏸' : i + 1}
                                            </span>
                                            {status === 'in-progress' && (
                                                <div className="w-8 h-1 bg-gray-600 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-yellow-500 rounded-full"
                                                        style={{ width: '30%' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{lesson.title}</div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                {lesson.duration_minutes && <span>{lesson.duration_minutes}min</span>}
                                                {lessonProgress[lesson.id]?.watch_time > 0 && (
                                                    <span> {Math.round(lessonProgress[lesson.id].watch_time / 60)}min watched</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Quizzes */}
                    {quizzes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-purple-900/30">
                            <h3 className="text-sm font-semibold text-white mb-2">Quizzes</h3>
                            <div className="space-y-2">
                                {quizzes.map(quiz => (
                                    <Link key={quiz.id} to={`/student/quiz/${quiz.id}`}
                                        className="block px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-[#1a1a35] hover:text-white transition">
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-400"></span>
                                            <span className="flex-1">{quiz.title}</span>
                                            <span className="text-xs text-gray-500">{quiz.max_attempts} attempts</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assignments */}
                    {assignments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-purple-900/30">
                            <h3 className="text-sm font-semibold text-white mb-2">Assignments</h3>
                            <div className="space-y-2">
                                {assignments.map(assignment => (
                                    <Link key={assignment.id} to={`/student/assignments/${id}`}
                                        className="block px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-[#1a1a35] hover:text-white transition">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400"></span>
                                            <span className="flex-1">{assignment.title}</span>
                                            <span className="text-xs text-gray-500">{assignment.max_points}pts</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Enhanced Lesson Content */}
                <div className="lg:col-span-2 bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                    {activeLesson ? (
                        <div>
                            {/* Lesson Header with Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-white">{activeLesson.title}</h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={navigateToPreviousLesson}
                                        disabled={lessons.findIndex(l => l.id === activeLesson.id) === 0}
                                        className="p-2 bg-[#1a1a35] border border-purple-900/40 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        ←
                                    </button>
                                    <button
                                        onClick={navigateToNextLesson}
                                        disabled={lessons.findIndex(l => l.id === activeLesson.id) === lessons.length - 1}
                                        className="p-2 bg-[#1a1a35] border border-purple-900/40 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        →
                                    </button>
                                </div>
                            </div>

                            {/* Video / media */}
                            {activeLesson.video_url ? (
                                <div className="aspect-video bg-black rounded-xl mb-4 overflow-hidden relative">
                                    {shouldUseVideoElement(activeLesson.video_url) ? (
                                        <video
                                            src={activeLesson.video_url}
                                            controls
                                            className="w-full h-full"
                                            onTimeUpdate={(e) => handleVideoProgress(e.target.currentTime, e.target.duration)}
                                            onPlay={() => handlePlayPause(true)}
                                            onPause={() => handlePlayPause(false)}
                                        />
                                    ) : (
                                        <iframe
                                            src={toEmbedVideoUrl(activeLesson.video_url)}
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            title={activeLesson.title}
                                        />
                                    )}
                                    {isPlaying && shouldUseVideoElement(activeLesson.video_url) && (
                                        <div className="absolute bottom-4 left-4 bg-black/50 rounded px-2 py-1">
                                            <span className="text-xs text-white">
                                                {Math.floor(watchTime / 60)}:{String(Math.floor(watchTime % 60)).padStart(2, '0')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl mb-4 border border-[var(--border)] bg-[var(--surface-2)]/80 backdrop-blur-sm p-8 text-center">
                                    <p className="text-4xl mb-2" aria-hidden>
                                        📖
                                    </p>
                                    <p className="text-[var(--text)] font-medium mb-1">No video for this lesson</p>
                                    <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
                                        Use the lesson text, course notes, and AI tutor. Mark complete when you are done with the material.
                                    </p>
                                </div>
                            )}

                            {/* Lesson Content */}
                            <div className="space-y-4">
                                {activeLesson.text_content && (
                                    <div className="prose prose-invert text-gray-300 text-sm leading-relaxed">
                                        {activeLesson.text_content}
                                    </div>
                                )}

                                {/* Learning Resources */}
                                <div className="flex flex-wrap gap-2">
                                    {activeLesson.pdf_url && (
                                        <a href={activeLesson.pdf_url} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-sm text-white hover:border-purple-500 transition">
                                            📄 Download PDF
                                        </a>
                                    )}
                                    <Link to={`/student/course-notes/${id}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/30 border border-blue-500/30 rounded-xl text-sm text-blue-300 hover:bg-blue-600/40 transition">
                                        📝 Take Notes
                                    </Link>
                                    <Link to={`/student/ai-tutor?course=${id}&lesson=${activeLesson.id}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-sm text-purple-300 hover:bg-purple-600/40 transition">
                                        🧠 Ask AI Tutor
                                    </Link>
                                </div>

                                {/* Lesson Progress */}
                                {lessonProgress[activeLesson.id] && (
                                    <div className="bg-[#1a1a35] rounded-xl p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-gray-400">Lesson Progress</span>
                                            <span className="text-sm text-purple-400">
                                                {Math.round(lessonProgress[activeLesson.id].watch_time / 60)}min watched
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${getLessonWatchPercent(activeLesson)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Lesson Actions */}
                            <div className="mt-6 pt-4 border-t border-purple-900/30 flex justify-between items-center gap-2">
                                <div className="flex gap-2">
                                    {completedLessons.has(activeLesson.id) ? (
                                        <span className="flex items-center gap-1.5 text-sm text-green-400">
                                            <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                                            Completed
                                        </span>
                                    ) : (
                                        <button
                                            onClick={markComplete}
                                            disabled={completing}
                                            className="px-4 py-2 bg-green-600/30 border border-green-500/30 rounded-xl text-sm text-green-300 hover:bg-green-600/40 transition disabled:opacity-50"
                                        >
                                            {completing ? 'Saving…' : '✓ Mark Complete'}
                                        </button>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                    <Link to={`/student/assignments/${id}`}
                                        className="px-3 py-2 bg-green-600/30 border border-green-500/30 rounded-xl text-sm text-green-300 hover:bg-green-600/40 transition">
                                        Assignments
                                    </Link>
                                    {quizzes.length > 0 && (
                                        <Link to={`/student/quiz/${quizzes[0].id}`}
                                            className="px-3 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-sm text-purple-300 hover:bg-purple-600/40 transition">
                                            Take Quiz
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <div className="mb-4">
                                <div className="w-16 h-16 bg-[#1a1a35] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl"></span>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Select a lesson to start learning</h3>
                            <p className="text-sm text-gray-400">Choose from the lessons on the left to begin your learning journey</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
