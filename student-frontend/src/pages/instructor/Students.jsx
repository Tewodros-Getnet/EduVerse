import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

// â”€â”€ Avatar helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shows profile image if available, otherwise a coloured initial circle.
// clickable=true adds a cursor-pointer and calls onClick.
function Avatar({ name = '', avatarUrl, size = 12, textSize = 'text-base', clickable = false, onClick }) {
    const initial = name.charAt(0).toUpperCase();
    const base = `w-${size} h-${size} rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center`;
    const cursor = clickable ? 'cursor-pointer ring-2 ring-purple-500/40 hover:ring-purple-400 transition' : '';

    return (
        <div className={`${base} ${cursor}`} onClick={clickable ? onClick : undefined}>
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className={`w-full h-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center ${textSize} font-bold text-[var(--text)]`}>
                    {initial}
                </div>
            )}
        </div>
    );
}

export default function InstructorStudents() {
    const [students,           setStudents]           = useState([]);
    const [courses,            setCourses]            = useState([]);
    const [selectedCourse,     setSelectedCourse]     = useState('all');
    const [loading,            setLoading]            = useState(true);
    const [showStudentDetails, setShowStudentDetails] = useState(null);
    const [studentDetails,     setStudentDetails]     = useState(null);
    const [showMessageModal,   setShowMessageModal]   = useState(null);
    const [messageForm,        setMessageForm]        = useState({ subject: '', message: '' });
    const [sendingMessage,     setSendingMessage]     = useState(false);
    // Avatar lightbox
    const [lightboxUrl,        setLightboxUrl]        = useState(null);
    const [lightboxName,       setLightboxName]       = useState('');

    // â”€â”€ Data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        fetchStudents();
        fetchCourses();
    }, []);

    // Re-fetch whenever the course filter changes (including switching back to 'all')
    useEffect(() => {
        fetchStudents();
    }, [selectedCourse]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const url = selectedCourse === 'all'
                ? '/students/instructor/all'
                : `/students/instructor/course/${selectedCourse}`;
            const response = await api.get(url);
            setStudents(response.data.students || []);
        } catch {
            toast.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses/instructor');
            setCourses(Array.isArray(response.data) ? response.data : response.data.courses || []);
        } catch {
            toast.error('Failed to fetch courses');
        }
    };

    const fetchStudentDetails = async (studentId) => {
        try {
            const response = await api.get(`/students/instructor/${studentId}`);
            setStudentDetails(response.data);
            setShowStudentDetails(studentId);
        } catch {
            toast.error('Failed to fetch student details');
        }
    };

    const handleSendMessage = async (studentId) => {
        if (!messageForm.subject || !messageForm.message) {
            toast.error('Please fill in both subject and message');
            return;
        }
        setSendingMessage(true);
        try {
            await api.post('/messages/instructor/send', {
                recipient_id: studentId,
                subject: messageForm.subject,
                message: messageForm.message,
            });
            toast.success('Message sent successfully!');
            setShowMessageModal(null);
            setMessageForm({ subject: '', message: '' });
        } catch {
            toast.error('Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleExportStudents = async () => {
        try {
            const url = selectedCourse === 'all'
                ? '/students/instructor/export'
                : `/students/instructor/course/${selectedCourse}/export`;
            const response = await api.get(url);
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `students_${selectedCourse === 'all' ? 'all' : `course_${selectedCourse}`}.json`;
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            toast.success('Student data exported!');
        } catch {
            toast.error('Failed to export student data');
        }
    };

    // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const getProgressColor = (p) => p >= 80 ? 'text-green-400' : p >= 50 ? 'text-yellow-400' : 'text-red-400';

    const getEngagementLevel = (student) => {
        const score = (student.lesson_count || 0) * 2
            + (student.quiz_attempts || 0) * 3
            + (student.assignment_submissions || 0) * 2;
        if (score >= 20) return { level: 'High',   color: 'text-green-400' };
        if (score >= 10) return { level: 'Medium', color: 'text-yellow-400' };
        return               { level: 'Low',    color: 'text-red-400' };
    };

    const openLightbox = (url, name) => { setLightboxUrl(url); setLightboxName(name); };
    const closeLightbox = () => setLightboxUrl(null);

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[var(--text)]">Student Management</h1>
                <button onClick={handleExportStudents}
                    className="px-4 py-2 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] text-sm font-medium hover:opacity-90 transition">
                    Export Data
                </button>
            </div>

            {/* Course Filter */}
            <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <label className="text-sm text-[var(--muted)]">Filter by Course:</label>
                    <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                        className="px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-lg text-[var(--text)] text-sm">
                        <option value="all">All Courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <span className="text-sm text-[var(--muted)]">{students.length} students found</span>
                </div>
            </div>

            {/* Student Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map(student => {
                    const engagement = getEngagementLevel(student);
                    const progress   = Math.round(student.avg_progress || 0);
                    return (
                        <div key={student.id} className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-5">
                            {/* Card header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {/* Clickable avatar */}
                                    <Avatar
                                        name={student.name}
                                        avatarUrl={student.avatar_url}
                                        size={12}
                                        textSize="text-lg"
                                        clickable={!!student.avatar_url}
                                        onClick={() => openLightbox(student.avatar_url, student.name)}
                                    />
                                    <div>
                                        <h3 className="font-semibold text-[var(--text)]">{student.name}</h3>
                                        <p className="text-sm text-[var(--muted)]">{student.email}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${engagement.color}`}>
                                    {engagement.level}
                                </span>
                            </div>

                            {/* Progress */}
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--muted)]">Progress</span>
                                    <span className={`font-medium ${getProgressColor(progress)}`}>{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div className="bg-purple-500 h-2 rounded-full transition-all"
                                        style={{ width: `${progress}%` }} />
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 text-xs text-[var(--muted)] mt-3">
                                    <div className="text-center">
                                        <div className="font-medium text-[var(--text)]">{student.course_count || 0}</div>
                                        <div>Courses</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-[var(--text)]">{student.lesson_count || 0}</div>
                                        <div>Lessons</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-[var(--text)]">{student.quiz_attempts || 0}</div>
                                        <div>Quizzes</div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button onClick={() => fetchStudentDetails(student.id)}
                                    className="flex-1 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--accent-primary)] text-sm hover:bg-[var(--accent-primary)]/20 transition">
                                    View Details
                                </button>
                                <button onClick={() => setShowMessageModal(student.id)}
                                    className="px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] text-sm hover:text-[var(--text)] transition">
                                    Message
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {students.length === 0 && (
                <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <p className="text-[var(--muted)]">No students found.</p>
                </div>
            )}

            {/* â”€â”€ Avatar Lightbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={closeLightbox}
                >
                    <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                        <img
                            src={lightboxUrl}
                            alt={lightboxName}
                            className="w-72 h-72 rounded-full object-cover ring-4 ring-purple-500/50 shadow-2xl shadow-purple-500/30"
                        />
                        <p className="text-[var(--text)] font-semibold text-lg">{lightboxName}</p>
                        <button onClick={closeLightbox}
                            className="px-5 py-2 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] text-sm hover:text-[var(--text)] transition">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* â”€â”€ Student Details Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {showStudentDetails && studentDetails && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                            <h3 className="text-lg font-semibold text-[var(--text)]">Student Details</h3>
                            <button onClick={() => setShowStudentDetails(null)} className="text-[var(--muted)] hover:text-[var(--text)] text-xl transition">x</button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Student info */}
                            <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                <div className="flex items-center gap-4">
                                    <Avatar
                                        name={studentDetails.student.name}
                                        avatarUrl={studentDetails.student.avatar_url}
                                        size={16}
                                        textSize="text-2xl"
                                        clickable={!!studentDetails.student.avatar_url}
                                        onClick={() => openLightbox(studentDetails.student.avatar_url, studentDetails.student.name)}
                                    />
                                    <div>
                                        <h4 className="font-semibold text-[var(--text)] text-lg">{studentDetails.student.name}</h4>
                                        <p className="text-[var(--muted)]">{studentDetails.student.email}</p>
                                        <p className="text-sm text-[var(--muted)]">
                                            Member since {new Date(studentDetails.student.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Course progress */}
                            <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                <h4 className="font-medium text-[var(--text)] mb-3">Course Progress</h4>
                                <div className="space-y-3">
                                    {studentDetails.courses.map(course => (
                                        <div key={course.id} className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[var(--text)] font-medium">{course.title}</p>
                                                <p className="text-sm text-[var(--muted)]">
                                                    Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-bold ${getProgressColor(course.progress_percent || 0)}`}>
                                                    {Math.round(course.progress_percent || 0)}%
                                                </span>
                                                <div className="w-24 bg-gray-700 rounded-full h-2 mt-1">
                                                    <div className="bg-purple-500 h-2 rounded-full"
                                                        style={{ width: `${course.progress_percent || 0}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activity summary */}
                            <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                <h4 className="font-medium text-[var(--text)] mb-3">Activity Summary</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Lessons Completed', value: studentDetails.activity.total_lessons || 0 },
                                        { label: 'Quiz Attempts',     value: studentDetails.activity.quiz_attempts || 0 },
                                        { label: 'Avg Quiz Score',    value: `${Math.round(studentDetails.activity.avg_quiz_score || 0)}%` },
                                        { label: 'Assignments',       value: studentDetails.activity.assignment_submissions || 0 },
                                    ].map(s => (
                                        <div key={s.label} className="text-center">
                                            <div className="text-2xl font-bold text-[var(--accent-primary)]">{s.value}</div>
                                            <p className="text-sm text-[var(--muted)] mt-0.5">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent activity */}
                            <div className="bg-[var(--surface-2)] rounded-xl p-4">
                                <h4 className="font-medium text-[var(--text)] mb-3">Recent Activity</h4>
                                {studentDetails.recent_activity?.length > 0 ? (
                                    <div className="space-y-2">
                                        {studentDetails.recent_activity.map((a, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]/80 capitalize">{a.type}</span>
                                                    <span className="text-[var(--muted)] truncate">{a.title}</span>
                                                </div>
                                                <span className="text-[var(--muted)] flex-shrink-0 ml-2">
                                                    {new Date(a.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[var(--muted)] text-sm">No recent activity</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* â”€â”€ Message Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-purple-900/30">
                            <h3 className="text-lg font-semibold text-[var(--text)]">Send Message</h3>
                            <button onClick={() => setShowMessageModal(null)} className="text-[var(--muted)] hover:text-[var(--text)] text-xl transition">x</button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">To</label>
                                <div className="flex items-center gap-3 bg-[var(--surface-2)] rounded-xl px-4 py-2.5">
                                    {(() => {
                                        const s = students.find(st => st.id === showMessageModal);
                                        return s ? (
                                            <>
                                                <Avatar name={s.name} avatarUrl={s.avatar_url} size={7} textSize="text-xs" />
                                                <div>
                                                    <p className="text-[var(--text)] text-sm font-medium">{s.name}</p>
                                                    <p className="text-[var(--muted)] text-xs">{s.email}</p>
                                                </div>
                                            </>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Subject</label>
                                <input type="text" value={messageForm.subject}
                                    onChange={e => setMessageForm({ ...messageForm, subject: e.target.value })}
                                    placeholder="Enter subject"
                                    className="w-full px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent-primary)]" />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--muted)] mb-1">Message</label>
                                <textarea value={messageForm.message}
                                    onChange={e => setMessageForm({ ...messageForm, message: e.target.value })}
                                    placeholder="Enter your message"
                                    rows={4}
                                    className="w-full px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--text)] text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)]" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => handleSendMessage(showMessageModal)} disabled={sendingMessage}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] rounded-xl text-[var(--text)] text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                                    {sendingMessage ? 'Sending...' : 'Send Message'}
                                </button>
                                <button onClick={() => setShowMessageModal(null)}
                                    className="px-5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)]/40 rounded-xl text-[var(--muted)] text-sm hover:text-[var(--text)] transition">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}












