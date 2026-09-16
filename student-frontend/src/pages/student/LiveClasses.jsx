import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function StudentLiveClasses() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [recordings, setRecordings] = useState({});
    const [expandedRecordings, setExpandedRecordings] = useState(null);

    useEffect(() => {
        fetchLiveSessions();
    }, [activeTab]);

    const fetchLiveSessions = async () => {
        try {
            const res = await api.get('/live/sessions');
            setSessions(res.data.sessions || []);
        } catch (error) {
            toast.error('Failed to fetch live sessions');
        } finally {
            setLoading(false);
        }
    };

    const joinSession = (sessionId) => {
        window.open(`/student/live/${sessionId}`, '_blank');
    };

    const fetchRecordings = async (sessionId) => {
        if (expandedRecordings === sessionId) {
            setExpandedRecordings(null);
            return;
        }
        try {
            const res = await api.get(`/live/sessions/${sessionId}/recordings`);
            setRecordings(prev => ({ ...prev, [sessionId]: res.data.recordings || [] }));
            setExpandedRecordings(sessionId);
        } catch {
            toast.error('Failed to load recordings');
        }
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const filterSessions = () => {
        const now = new Date();
        return sessions.filter(session => {
            if (activeTab === 'upcoming') {
                // Show both scheduled future sessions AND currently live sessions
                return session.status === 'live' ||
                    (new Date(session.scheduled_at) > now && session.status === 'scheduled');
            }
            if (activeTab === 'live') return session.status === 'live';
            return session.status === 'completed' || session.status === 'ended';
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const filteredSessions = filterSessions();

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[var(--text)]">Live Classes</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--surface-2)] rounded-xl p-1">
                {['upcoming', 'live', 'recordings'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                            activeTab === tab
                                ? 'bg-[var(--accent-primary)] text-[var(--text)]'
                                : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                    >
                        {tab === 'recordings' ? 'Recordings' : tab}
                    </button>
                ))}
            </div>

            {/* Sessions List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <p className="text-[var(--muted)]">
                            {activeTab === 'upcoming' && 'No upcoming live classes'}
                            {activeTab === 'live' && 'No live classes currently running'}
                            {activeTab === 'recordings' && 'No recorded classes available'}
                        </p>
                    </div>
                ) : (
                    filteredSessions.map(session => (
                        <div key={session.id} className="bg-[var(--surface)] border border-purple-900/30 rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-[var(--text)]">{session.title}</h3>
                                    <p className="text-sm text-[var(--muted)] mt-1">{session.course_title}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    session.status === 'live' 
                                        ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                                        : session.status === 'scheduled'
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                                        : 'bg-gray-600/20 text-[var(--muted)] border border-gray-600/40'
                                }`}>
                                    {session.status}
                                </span>
                            </div>

                            <p className="text-sm text-[var(--muted)] mb-3">{session.description}</p>

                            <div className="flex gap-4 mb-4 text-sm text-[var(--muted)]">
                                <span>Scheduled: {formatDateTime(session.scheduled_at)}</span>
                                <span>Duration: {session.duration_minutes} min</span>
                            </div>
                            {session.meeting_url && (
                                <div className="mb-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <p className="text-xs text-green-400">🔗 External meeting link available</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {session.status === 'live' && (
                                    <button
                                        onClick={() => joinSession(session.id)}
                                        className="flex-1 py-2 bg-green-600/20 border border-green-600/40 rounded-xl text-green-400 text-sm hover:bg-green-600/30 transition"
                                    >
                                        Join Now
                                    </button>
                                )}
                                {session.status === 'scheduled' && (
                                    <button
                                        className="flex-1 py-2 bg-blue-600/20 border border-blue-600/40 rounded-xl text-blue-400 text-sm hover:bg-blue-600/30 transition"
                                        disabled
                                    >
                                        Starts {formatDateTime(session.scheduled_at)}
                                    </button>
                                )}
                                {session.status === 'completed' || session.status === 'ended' ? (
                                        <div className="w-full">
                                            <button
                                                onClick={() => fetchRecordings(session.id)}
                                                className="w-full py-2 bg-[var(--accent-primary)]/20 border border-purple-600/40 rounded-xl text-[var(--accent-primary)] text-sm hover:bg-[var(--accent-primary)]/30 transition"
                                            >
                                                {expandedRecordings === session.id ? 'Hide Recordings' : '▶ View Recordings'}
                                            </button>
                                            {expandedRecordings === session.id && (
                                                <div className="mt-3 space-y-2">
                                                    {(recordings[session.id] || []).length === 0 ? (
                                                        <p className="text-xs text-[var(--muted)] text-center py-2">No recordings available yet</p>
                                                    ) : (
                                                        (recordings[session.id] || []).map(rec => (
                                                            <a
                                                                key={rec.id}
                                                                href={rec.recording_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded-xl text-sm text-[var(--accent-primary)]/80 hover:text-[var(--text)] transition"
                                                            >
                                                                <span>🎥</span>
                                                                <span className="flex-1 truncate">{rec.title || 'Recording'}</span>
                                                                {rec.duration_minutes && <span className="text-xs text-[var(--muted)]">{rec.duration_minutes}min</span>}
                                                            </a>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}







