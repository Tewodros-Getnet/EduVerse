import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

export default function InstructorStudents() {
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showStudentDetails, setShowStudentDetails] = useState(null);
    const [studentDetails, setStudentDetails] = useState(null);
    const [showMessageModal, setShowMessageModal] = useState(null);
    const [messageForm, setMessageForm] = useState({ subject: '', message: '' });
    const [sendingMessage, setSendingMessage] = useState(false);

    useEffect(() => {
        fetchStudents();
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse !== 'all') {
            fetchStudents();
        }
    }, [selectedCourse]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const url = selectedCourse === 'all'
                ? '/students/instructor/all'
                : `/students/instructor/course/${selectedCourse}`;
            const response = await api.get(url);
            setStudents(response.data.students || []);
        } catch (error) {
            toast.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses/instructor');
            setCourses(Array.isArray(response.data) ? response.data : response.data.courses || []);
        } catch (error) {
            toast.error('Failed to fetch courses');
        }
    };

    const fetchStudentDetails = async (studentId) => {
        try {
            const response = await api.get(`/students/instructor/${studentId}`);
            setStudentDetails(response.data);
            setShowStudentDetails(studentId);
        } catch (error) {
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
                message: messageForm.message
            });
            toast.success('Message sent successfully!');
            setShowMessageModal(null);
            setMessageForm({ subject: '', message: '' });
        } catch (error) {
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

            // Create download link
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `students_${selectedCourse === 'all' ? 'all' : `course_${selectedCourse}`}.json`;
            a.click();
            window.URL.revokeObjectURL(downloadUrl);

            toast.success('Student data exported successfully!');
        } catch (error) {
            toast.error('Failed to export student data');
        }
    };

    const getProgressColor = (progress) => {
        if (progress >= 80) return 'text-green-400';
        if (progress >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getEngagementLevel = (student) => {
        const activityScore = (student.lesson_count || 0) * 2 +
            (student.quiz_attempts || 0) * 3 +
            (student.assignment_submissions || 0) * 2;

        if (activityScore >= 20) return { level: 'High', color: 'text-green-400' };
        if (activityScore >= 10) return { level: 'Medium', color: 'text-yellow-400' };
        return { level: 'Low', color: 'text-red-400' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Student Management</h1>
                <button
                    onClick={handleExportStudents}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition"
                >
                    Export Data
                </button>
            </div>

            {/* Course Filter */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-400">Filter by Course:</label>
                    <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-lg text-white text-sm"
                    >
                        <option value="all">All Courses</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                    <span className="text-sm text-gray-400">
                        {students.length} students found
                    </span>
                </div>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map(student => {
                    const engagement = getEngagementLevel(student);
                    return (
                        <div key={student.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center">
                                        <span className="text-purple-400 font-bold">
                                            {student.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{student.name}</h3>
                                        <p className="text-sm text-gray-400">{student.email}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${engagement.color}`}>
                                    {engagement.level}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Progress</span>
                                    <span className={`font-medium ${getProgressColor(student.avg_progress || 0)}`}>
                                        {Math.round(student.avg_progress || 0)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{ width: `${student.avg_progress || 0}%` }}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mt-3">
                                    <div className="text-center">
                                        <div className="font-medium text-white">{student.course_count || 0}</div>
                                        <div>Courses</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-white">{student.lesson_count || 0}</div>
                                        <div>Lessons</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-white">{student.quiz_attempts || 0}</div>
                                        <div>Quizzes</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchStudentDetails(student.id)}
                                    className="flex-1 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-purple-400 text-sm hover:bg-purple-600/20 transition"
                                >
                                    View Details
                                </button>
                                <button
                                    onClick={() => setShowMessageModal(student.id)}
                                    className="px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                                >
                                    Message
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {students.length === 0 && (
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 mb-4">No students found.</p>
                </div>
            )}

            {/* Student Details Modal */}
            {showStudentDetails && studentDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Student Details</h3>
                            <button
                                onClick={() => setShowStudentDetails(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ←
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Student Info */}
                            <div className="bg-[#1a1a35] rounded-xl p-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
                                        <span className="text-purple-400 font-bold text-xl">
                                            {studentDetails.student.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white text-lg">{studentDetails.student.name}</h4>
                                        <p className="text-gray-400">{studentDetails.student.email}</p>
                                        <p className="text-sm text-gray-500">Enrolled: {new Date(studentDetails.student.enrolled_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Course Progress */}
                            <div className="bg-[#1a1a35] rounded-xl p-4">
                                <h4 className="font-medium text-white mb-3">Course Progress</h4>
                                <div className="space-y-3">
                                    {studentDetails.courses.map(course => (
                                        <div key={course.id} className="flex justify-between items-center">
                                            <div>
                                                <p className="text-white font-medium">{course.title}</p>
                                                <p className="text-sm text-gray-400">Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-bold ${getProgressColor(course.progress_percent || 0)}`}>
                                                    {Math.round(course.progress_percent || 0)}%
                                                </span>
                                                <div className="w-24 bg-gray-700 rounded-full h-2 mt-1">
                                                    <div
                                                        className="bg-purple-500 h-2 rounded-full"
                                                        style={{ width: `${course.progress_percent || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Summary */}
                            <div className="bg-[#1a1a35] rounded-xl p-4">
                                <h4 className="font-medium text-white mb-3">Activity Summary</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-400">{studentDetails.activity.total_lessons || 0}</div>
                                        <p className="text-sm text-gray-400">Lessons Completed</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-400">{studentDetails.activity.quiz_attempts || 0}</div>
                                        <p className="text-sm text-gray-400">Quiz Attempts</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-400">{Math.round(studentDetails.activity.avg_quiz_score || 0)}%</div>
                                        <p className="text-sm text-gray-400">Avg Quiz Score</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-400">{studentDetails.activity.assignment_submissions || 0}</div>
                                        <p className="text-sm text-gray-400">Assignments</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-[#1a1a35] rounded-xl p-4">
                                <h4 className="font-medium text-white mb-3">Recent Activity</h4>
                                <div className="space-y-2">
                                    {studentDetails.recent_activity?.map((activity, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">{activity.type}: {activity.title}</span>
                                            <span className="text-gray-500">{new Date(activity.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    )) || <p className="text-gray-400 text-sm">No recent activity</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Send Message</h3>
                            <button
                                onClick={() => setShowMessageModal(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ←
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">To:</label>
                                <p className="text-white">
                                    {students.find(s => s.id === showMessageModal)?.name}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={messageForm.subject}
                                    onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-lg text-white text-sm"
                                    placeholder="Enter subject"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Message</label>
                                <textarea
                                    value={messageForm.message}
                                    onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-lg text-white text-sm resize-none"
                                    rows={4}
                                    placeholder="Enter your message"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleSendMessage(showMessageModal)}
                                    disabled={sendingMessage}
                                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {sendingMessage ? 'Sending...' : 'Send Message'}
                                </button>
                                <button
                                    onClick={() => setShowMessageModal(null)}
                                    className="px-4 py-2 bg-[#1a1a35] border border-purple-900/40 rounded-lg text-gray-400 text-sm hover:text-white"
                                >
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
