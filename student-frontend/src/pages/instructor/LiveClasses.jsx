import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

export default function InstructorLiveClasses() {
    const [sessions, setSessions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showSessionDetails, setShowSessionDetails] = useState(null);
    const [showAnalytics, setShowAnalytics] = useState(null);
    const [sessionDetails, setSessionDetails] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [startingSession, setStartingSession] = useState(null);
    const [endingSession, setEndingSession] = useState(null);
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

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        courseId: '',
        scheduled_at: '',
        duration_minutes: 60,
        meeting_url: ''
    });

    useEffect(() => {
        fetchSessions();
        fetchCourses();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await api.get('/live/instructor/sessions');
            setSessions(response.data.sessions);
        } catch (error) {
            toast.error('Failed to fetch live sessions');
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

    const handleCreateSession = async (e) => {
        e.preventDefault();
        try {
            await api.post('/live/sessions', {
                ...formData,
                course_id: formData.courseId,  // backend expects course_id
            });
            toast.success('Live session created successfully!');
            setShowCreateForm(false);
            setFormData({
                title: '',
                description: '',
                courseId: '',
                scheduled_at: '',
                duration_minutes: 60,
                meeting_url: ''
            });
            fetchSessions();
        } catch (error) {
            toast.error('Failed to create live session');
        }
    };

    const handleDeleteSession = (id) => {
        openConfirm({
            title: 'Delete live session',
            message: 'Are you sure you want to delete this live session?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                try {
                    await api.delete(`/live/sessions/${id}`);
                    toast.success('Live session deleted successfully!');
                    fetchSessions();
                } catch (error) {
                    toast.error('Failed to delete live session');
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const handleStartSession = async (sessionId) => {
        setStartingSession(sessionId);
        try {
            const response = await api.post(`/live/sessions/${sessionId}/start`);
            setSessions(prev => prev.map(s => s.id === sessionId ? response.data.session : s));
            toast.success('Live session started!');
        } catch (error) {
            toast.error('Failed to start live session');
        } finally {
            setStartingSession(null);
        }
    };

    const handleEndSession = async (sessionId) => {
        setEndingSession(sessionId);
        try {
            const response = await api.post(`/live/sessions/${sessionId}/end`);
            setSessions(prev => prev.map(s => s.id === sessionId ? response.data.session : s));
            toast.success('Live session ended!');
        } catch (error) {
            toast.error('Failed to end live session');
        } finally {
            setEndingSession(null);
        }
    };

    const handleDuplicateSession = async (sessionId, newTitle) => {
        try {
            const response = await api.post(`/live/sessions/${sessionId}/duplicate`, {
                new_title: newTitle,
                new_scheduled_at: new Date().toISOString()
            });
            setSessions(prev => [response.data.session, ...prev]);
            toast.success('Live session duplicated successfully!');
        } catch (error) {
            toast.error('Failed to duplicate live session');
        }
    };

    const fetchSessionDetails = async (sessionId) => {
        try {
            const response = await api.get(`/live/sessions/${sessionId}`);
            setSessionDetails(response.data.session);
            setShowSessionDetails(sessionId);
        } catch (error) {
            toast.error('Failed to fetch session details');
        }
    };

    const fetchAnalytics = async (sessionId) => {
        try {
            const response = await api.get(`/live/sessions/${sessionId}/analytics`);
            setAnalytics(response.data);
            setShowAnalytics(sessionId);
        } catch (error) {
            toast.error('Failed to fetch session analytics');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-500/20 text-blue-300';
            case 'live': return 'bg-red-500/20 text-red-300';
            case 'completed': return 'bg-green-500/20 text-green-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    const formatDateTime = (dateTime) => {
        if (!dateTime) return 'Not scheduled';
        return new Date(dateTime).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">🎥 Live Classes</h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition shadow-lg shadow-purple-500/25"
                >
                    + Schedule Live Class
                </button>
            </div>

            {showCreateForm && (
                <div className="bg-gradient-to-br from-[#1a1a35] to-[#12122a] border border-purple-900/30 rounded-2xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">📅 Schedule New Live Class</h2>
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(false)}
                            className="text-gray-400 hover:text-white transition"
                        >
                            ←
                        </button>
                    </div>
                    <form onSubmit={handleCreateSession} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Class Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    placeholder="Enter class title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Course *</label>
                                <select
                                    value={formData.courseId}
                                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    required
                                >
                                    <option value="">Select a course</option>
                                    {(courses || []).map(course => (
                                        <option key={course.id} value={course.id}>{course.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm resize-none"
                                placeholder="Describe what this live class will cover..."
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">📅 Date & Time *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduled_at}
                                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">⏱️ Duration (min) *</label>
                                <input
                                    type="number"
                                    min="15"
                                    max="480"
                                    value={formData.duration_minutes}
                                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">🔗 Meeting URL</label>
                                <input
                                    type="url"
                                    value={formData.meeting_url}
                                    onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                                    className="w-full bg-[#0d0d1a] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                                    placeholder="https://zoom.us/j/..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:opacity-90 transition shadow-lg shadow-purple-500/25"
                            >
                                ✨ Schedule Live Class
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="flex-1 py-3 bg-[#0d0d1a] border border-gray-600/40 rounded-xl text-gray-300 font-semibold hover:bg-gray-800/50 hover:text-white transition"
                            >
                                ← Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map(session => (
                    <div key={session.id} className="bg-gradient-to-br from-[#1a1a35] to-[#12122a] border border-purple-900/30 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-lg mb-1">{session.title}</h3>
                                <p className="text-sm text-gray-400">{session.course_title}</p>
                            </div>
                            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide ${getStatusColor(session.status)} shadow-lg`}>
                                {session.status === 'live' && '🔴 Live'}
                                {session.status === 'scheduled' && '⏰ Scheduled'}
                                {session.status === 'completed' && '✓ Completed'}
                            </span>
                        </div>

                        <p className="text-sm text-gray-300 mb-4 line-clamp-2 min-h-[2.5rem]">{session.description}</p>

                        <div className="space-y-2 mb-4 bg-[#0d0d1a] rounded-xl p-3">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1">📅 {formatDateTime(session.scheduled_at)}</span>
                                <span className="flex items-center gap-1">⏱️ {session.duration_minutes} min</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1">👥 {session.attendance_count || 0} attendees</span>
                                {session.meeting_url && <span className="flex items-center gap-1">🔗 Meeting ready</span>}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => fetchSessionDetails(session.id)}
                                className="flex-1 py-2.5 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-medium hover:bg-purple-600/30 transition"
                            >
                                View Details
                            </button>
                            <button
                                onClick={() => fetchAnalytics(session.id)}
                                className="px-3 py-2.5 bg-[#0d0d1a] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                            >
                                📊 Analytics
                            </button>
                            {session.status === 'scheduled' && (
                                <button
                                    onClick={() => handleStartSession(session.id)}
                                    disabled={startingSession === session.id}
                                    className="px-3 py-2.5 bg-green-600/20 border border-green-500/30 rounded-xl text-green-300 text-sm font-medium hover:bg-green-600/30 transition disabled:opacity-50"
                                >
                                    {startingSession === session.id ? '⏳' : '▶️ Start'}
                                </button>
                            )}
                            {session.status === 'live' && (
                                <>
                                    <Link
                                        to={`/instructor/live/${session.id}`}
                                        className="px-3 py-2.5 bg-cyan-600/20 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm font-medium hover:bg-cyan-600/30 transition"
                                    >
                                        📹 Join as Host
                                    </Link>
                                    <button
                                        onClick={() => handleEndSession(session.id)}
                                        disabled={endingSession === session.id}
                                        className="px-3 py-2.5 bg-red-600/20 border border-red-500/30 rounded-xl text-red-300 text-sm font-medium hover:bg-red-600/30 transition disabled:opacity-50"
                                    >
                                        {endingSession === session.id ? '⏳' : '⏹️ End'}
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => {
                                    const newTitle = prompt('Enter title for duplicated session:', `${session.title} (Copy)`);
                                    if (newTitle) handleDuplicateSession(session.id, newTitle);
                                }}
                                className="px-3 py-2.5 bg-[#0d0d1a] border border-purple-900/40 rounded-xl text-gray-400 text-sm hover:text-white transition"
                            >
                                📋
                            </button>
                            <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="px-3 py-2.5 bg-red-600/20 border border-red-500/30 rounded-xl text-red-300 text-sm hover:bg-red-600/30 transition"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {sessions.length === 0 && (
                <div className="bg-gradient-to-br from-[#1a1a35] to-[#12122a] border border-purple-900/30 rounded-2xl p-12 text-center shadow-xl">
                    <div className="text-6xl mb-4">🎥</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Live Classes Scheduled Yet</h3>
                    <p className="text-gray-400 mb-6">Start engaging with your students through live sessions</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold hover:opacity-90 transition shadow-lg shadow-purple-500/25"
                    >
                        ✨ Schedule Your First Live Class
                    </button>
                </div>
            )}

            <ConfirmModal
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                cancelLabel={confirmDialog.cancelLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />

            {/* Session Details Modal */}
            {showSessionDetails && sessionDetails && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gradient-to-br from-[#1a1a35] to-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">📋 Live Class Details</h3>
                            <button
                                onClick={() => setShowSessionDetails(null)}
                                className="text-gray-400 hover:text-white transition text-2xl"
                            >
                                ←
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Session Info */}
                            <div className="bg-[#0d0d1a] rounded-xl p-5 border border-purple-900/30">
                                <h4 className="font-bold text-white text-lg mb-2">{sessionDetails.title}</h4>
                                <p className="text-sm text-gray-400 mb-3">{sessionDetails.course_title}</p>
                                <p className="text-sm text-gray-300 mb-4">{sessionDetails.description}</p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-1">📅 {formatDateTime(sessionDetails.scheduled_at)}</span>
                                    <span className="flex items-center gap-1">⏱️ {sessionDetails.duration_minutes} min</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(sessionDetails.status)}`}>{sessionDetails.status}</span>
                                </div>
                                {sessionDetails.status === 'live' && (
                                    <div className="mt-4">
                                        <Link
                                            to={`/instructor/live/${sessionDetails.id}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-medium hover:bg-purple-600/30 transition"
                                        >
                                            🔗 Join Meeting
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Attendance */}
                            <div className="bg-[#0d0d1a] rounded-xl p-5 border border-purple-900/30">
                                <h4 className="font-bold text-white mb-3">👥 Attendance</h4>
                                <div className="text-center text-gray-400 py-4">
                                    <p>Attendance details will be available after the session starts</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Modal */}
            {showAnalytics && analytics && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gradient-to-br from-[#1a1a35] to-[#12122a] border border-purple-900/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">📊 Live Class Analytics</h3>
                            <button
                                onClick={() => setShowAnalytics(null)}
                                className="text-gray-400 hover:text-white transition text-2xl"
                            >
                                ←
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Session Details */}
                            <div className="bg-[#0d0d1a] rounded-xl p-5 border border-purple-900/30">
                                <h4 className="font-bold text-white text-lg mb-2">{analytics.session_details.title}</h4>
                                <p className="text-sm text-gray-400 mb-3">{analytics.session_details.course_title}</p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-1">📅 {formatDateTime(analytics.session_details.scheduled_at)}</span>
                                    <span className="flex items-center gap-1">⏱️ {analytics.session_details.duration_minutes} min</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(analytics.session_details.status)}`}>{analytics.session_details.status}</span>
                                </div>
                            </div>

                            {/* Attendance Stats */}
                            <div className="bg-[#0d0d1a] rounded-xl p-5 border border-purple-900/30">
                                <h4 className="font-bold text-white mb-4">👥 Attendance Statistics</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 rounded-xl p-4 border border-purple-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Total Attendees</p>
                                        <p className="text-white text-2xl font-bold">{analytics.attendance_stats.total_attendees || 0}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 rounded-xl p-4 border border-blue-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Joined</p>
                                        <p className="text-white text-2xl font-bold">{analytics.attendance_stats.joined_count || 0}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 rounded-xl p-4 border border-green-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Completed</p>
                                        <p className="text-white text-2xl font-bold">{analytics.attendance_stats.completed_count || 0}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 rounded-xl p-4 border border-orange-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Avg Duration</p>
                                        <p className="text-white text-2xl font-bold">{Math.round(analytics.attendance_stats.avg_duration_minutes || 0)} min</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recording Stats */}
                            <div className="bg-[#0d0d1a] rounded-xl p-5 border border-purple-900/30">
                                <h4 className="font-bold text-white mb-4">🎥 Recordings</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-pink-600/20 to-pink-900/20 rounded-xl p-4 border border-pink-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Total Recordings</p>
                                        <p className="text-white text-2xl font-bold">{analytics.recording_stats.total_recordings || 0}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-900/20 rounded-xl p-4 border border-cyan-500/30">
                                        <p className="text-gray-400 text-sm mb-1">Total Duration</p>
                                        <p className="text-white text-2xl font-bold">{Math.round(analytics.recording_stats.total_duration || 0)} min</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
