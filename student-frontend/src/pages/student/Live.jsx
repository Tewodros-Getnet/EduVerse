import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Live() {
    const { id } = useParams();
    const [session, setSession] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isJoined, setIsJoined] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [screenShare, setScreenShare] = useState(false);
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, live, recordings

    useEffect(() => {
        fetchLiveSessions();
        if (id) {
            fetchSessionDetails();
        }
    }, [id, activeTab]);

    const fetchLiveSessions = async () => {
        try {
            const res = await api.get('/live/sessions');
            const allSessions = res.data.sessions || [];
            
            // Filter sessions based on active tab
            const now = new Date();
            let filteredSessions = [];
            
            switch (activeTab) {
                case 'live':
                    filteredSessions = allSessions.filter(s => s.status === 'live');
                    break;
                case 'upcoming':
                    filteredSessions = allSessions.filter(s => 
                        s.status === 'scheduled' && new Date(s.scheduled_at) > now
                    );
                    break;
                case 'recordings':
                    filteredSessions = allSessions.filter(s => s.status === 'ended');
                    break;
                default:
                    filteredSessions = allSessions;
            }
            
            setSessions(filteredSessions);
            
            // Fetch recordings for the recordings tab
            if (activeTab === 'recordings') {
                const recordingsData = await Promise.all(
                    filteredSessions.map(async (session) => {
                        try {
                            const recordingRes = await api.get(`/live/sessions/${session.id}/recordings`);
                            return { ...session, recordings: recordingRes.data.recordings || [] };
                        } catch {
                            return { ...session, recordings: [] };
                        }
                    })
                );
                setRecordings(recordingsData);
            }
        } catch (error) {
            toast.error('Failed to load live sessions');
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionDetails = async () => {
        try {
            const res = await api.get(`/live/sessions/${id}`);
            setSession(res.data.session);
            setParticipants(res.data.participants || []);
            setChatMessages(res.data.chat || []);
        } catch (error) {
            toast.error('Failed to load session details');
        }
    };

    const joinSession = async () => {
        if (!session) return;
        
        try {
            const res = await api.post(`/live/sessions/${session.id}/join`);
            setIsJoined(true);
            toast.success('Joined live session successfully!');
            
            // Start polling for updates
            const pollInterval = setInterval(async () => {
                try {
                    const updates = await api.get(`/live/sessions/${session.id}/updates`);
                    setParticipants(updates.data.participants || []);
                    setChatMessages(updates.data.chat || []);
                } catch (error) {
                    console.error('Failed to get session updates:', error);
                }
            }, 5000);
            
            return () => clearInterval(pollInterval);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to join session');
        }
    };

    const leaveSession = async () => {
        if (!session) return;
        
        try {
            await api.post(`/live/sessions/${session.id}/leave`);
            setIsJoined(false);
            toast.success('Left live session');
        } catch (error) {
            toast.error('Failed to leave session');
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !session) return;
        
        try {
            await api.post(`/live/sessions/${session.id}/chat`, {
                message: newMessage.trim()
            });
            setNewMessage('');
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (screenShare) {
                await api.post(`/live/sessions/${session.id}/screen-share/stop`);
                setScreenShare(false);
            } else {
                await api.post(`/live/sessions/${session.id}/screen-share/start`);
                setScreenShare(true);
            }
        } catch (error) {
            toast.error('Failed to toggle screen share');
        }
    };

    const toggleMic = async () => {
        try {
            await api.post(`/live/sessions/${session.id}/audio/${micEnabled ? 'mute' : 'unmute'}`);
            setMicEnabled(!micEnabled);
        } catch (error) {
            toast.error('Failed to toggle microphone');
        }
    };

    const toggleCamera = async () => {
        try {
            await api.post(`/live/sessions/${session.id}/video/${cameraEnabled ? 'stop' : 'start'}`);
            setCameraEnabled(!cameraEnabled);
        } catch (error) {
            toast.error('Failed to toggle camera');
        }
    };

    const formatSessionTime = (scheduledAt) => {
        const date = new Date(scheduledAt);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSessionStatus = (session) => {
        const now = new Date();
        const scheduled = new Date(session.scheduled_at);
        
        if (session.status === 'live') return { text: 'LIVE NOW', color: 'text-red-400', bg: 'bg-red-500/20' };
        if (session.status === 'ended') return { text: 'ENDED', color: 'text-gray-400', bg: 'bg-gray-500/20' };
        if (scheduled <= now) return { text: 'STARTING SOON', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
        return { text: 'UPCOMING', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    };

    if (id && session) {
        // Individual Session View
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{session.title}</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {session.course_title} • {session.instructor_name}
                        </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSessionStatus(session).bg} ${getSessionStatus(session).color}`}>
                        {getSessionStatus(session).text}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Video Area */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl overflow-hidden">
                            <div className="aspect-video bg-black relative">
                                {session.status === 'live' ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                                <span className="text-3xl">🔴</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Live Session</h3>
                                            <p className="text-gray-400">
                                                {isJoined ? 'You are in the session' : 'Join to participate'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-20 h-20 bg-[#1a1a35] rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-3xl">📹</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">
                                                {session.status === 'ended' ? 'Session Ended' : 'Session Not Started'}
                                            </h3>
                                            <p className="text-gray-400">
                                                {session.status === 'ended' 
                                                    ? 'Check recordings below' 
                                                    : `Starts at ${formatSessionTime(session.scheduled_at)}`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            {session.status === 'live' && (
                                <div className="p-4 border-t border-purple-900/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            {!isJoined ? (
                                                <button
                                                    onClick={joinSession}
                                                    className="px-4 py-2 bg-red-600/30 border border-red-500/30 rounded-xl text-red-300 font-medium hover:bg-red-600/40 transition"
                                                >
                                                    Join Session
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={leaveSession}
                                                        className="px-4 py-2 bg-gray-600/30 border border-gray-500/30 rounded-xl text-gray-300 font-medium hover:bg-gray-600/40 transition"
                                                    >
                                                        Leave
                                                    </button>
                                                    <button
                                                        onClick={toggleMic}
                                                        className={`p-2 rounded-lg transition ${
                                                            micEnabled 
                                                                ? 'bg-blue-600/30 border border-blue-500/30 text-blue-300' 
                                                                : 'bg-gray-600/30 border border-gray-500/30 text-gray-400'
                                                        }`}
                                                    >
                                                        🎤
                                                    </button>
                                                    <button
                                                        onClick={toggleCamera}
                                                        className={`p-2 rounded-lg transition ${
                                                            cameraEnabled 
                                                                ? 'bg-blue-600/30 border border-blue-500/30 text-blue-300' 
                                                                : 'bg-gray-600/30 border border-gray-500/30 text-gray-400'
                                                        }`}
                                                    >
                                                        📷
                                                    </button>
                                                    <button
                                                        onClick={toggleScreenShare}
                                                        className={`p-2 rounded-lg transition ${
                                                            screenShare 
                                                                ? 'bg-green-600/30 border border-green-500/30 text-green-300' 
                                                                : 'bg-gray-600/30 border border-gray-500/30 text-gray-400'
                                                        }`}
                                                    >
                                                        🖥️
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {participants.length} participants
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat */}
                        {isJoined && (
                            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                                <h3 className="font-semibold text-white mb-4">Live Chat</h3>
                                <div className="h-64 overflow-y-auto mb-4 space-y-2">
                                    {chatMessages.map((msg, index) => (
                                        <div key={index} className="flex gap-2">
                                            <span className="text-purple-400 text-sm font-medium">{msg.user_name}:</span>
                                            <span className="text-gray-300 text-sm">{msg.message}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-[#1a1a35] border border-purple-900/40 rounded-xl px-3 py-2 text-white placeholder-gray-500 text-sm"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        className="px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:bg-purple-600/40 transition"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Session Info */}
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                            <h3 className="font-semibold text-white mb-3">Session Details</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Instructor:</span>
                                    <span className="text-white">{session.instructor_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Course:</span>
                                    <span className="text-white">{session.course_title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Duration:</span>
                                    <span className="text-white">{session.duration_minutes} min</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Scheduled:</span>
                                    <span className="text-white">{formatSessionTime(session.scheduled_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Participants */}
                        {isJoined && (
                            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                                <h3 className="font-semibold text-white mb-3">Participants ({participants.length})</h3>
                                <div className="space-y-2">
                                    {participants.map((participant, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                                <span className="text-xs text-white">
                                                    {participant.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-300">{participant.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recordings */}
                        {session.status === 'ended' && (
                            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                                <h3 className="font-semibold text-white mb-3">Recordings</h3>
                                <div className="space-y-2">
                                    <a
                                        href="#"
                                        className="block p-3 bg-[#1a1a35] rounded-lg text-sm text-purple-400 hover:text-purple-300 transition"
                                    >
                                        📹 Session Recording
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Sessions List View
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Live Learning</h1>
                <p className="text-gray-400 text-sm mt-1">Join live classes and watch recordings</p>
            </div>

            {/* Tabs */}
            <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-1">
                <div className="flex gap-1">
                    {[
                        { id: 'upcoming', label: 'Upcoming', icon: '📅' },
                        { id: 'live', label: 'Live Now', icon: '🔴' },
                        { id: 'recordings', label: 'Recordings', icon: '📹' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                                activeTab === tab.id
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {sessions.length === 0 ? (
                        <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8 text-center">
                            <div className="mb-4">
                                <div className="w-16 h-16 bg-[#1a1a35] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">
                                        {activeTab === 'live' ? '🔴' : activeTab === 'recordings' ? '📹' : '📅'}
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">
                                {activeTab === 'live' ? 'No live sessions' : 
                                 activeTab === 'recordings' ? 'No recordings available' : 
                                 'No upcoming sessions'}
                            </h3>
                            <p className="text-sm text-gray-400">
                                {activeTab === 'live' ? 'Check back later for live sessions' : 
                                 activeTab === 'recordings' ? 'Recordings will appear here after sessions end' : 
                                 'New sessions will appear here when scheduled'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeTab === 'recordings' ? (
                                recordings.map(session => (
                                    <div key={session.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4">
                                        <div className="aspect-video bg-black rounded-lg mb-4 flex items-center justify-center">
                                            <span className="text-3xl">📹</span>
                                        </div>
                                        <h3 className="font-semibold text-white mb-2">{session.title}</h3>
                                        <p className="text-sm text-gray-400 mb-3">{session.course_title}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                            <span>{session.instructor_name}</span>
                                            <span>{new Date(session.scheduled_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {session.recordings.map((recording, index) => (
                                                <a
                                                    key={index}
                                                    href={recording.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full py-2 bg-purple-600/30 border border-purple-500/30 rounded-lg text-center text-purple-300 text-sm hover:bg-purple-600/40 transition"
                                                >
                                                    📹 Watch Recording
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                sessions.map(session => {
                                    const status = getSessionStatus(session);
                                    return (
                                        <Link
                                            key={session.id}
                                            to={`/student/live/${session.id}`}
                                            className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-4 hover:border-purple-500/50 transition block"
                                        >
                                            <div className="aspect-video bg-black rounded-lg mb-4 relative overflow-hidden">
                                                {session.status === 'live' && (
                                                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                                                        LIVE
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-3xl">
                                                        {session.status === 'live' ? '🔴' : '📹'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h3 className="font-semibold text-white mb-2">{session.title}</h3>
                                            <p className="text-sm text-gray-400 mb-3">{session.course_title}</p>
                                            <div className="flex items-center justify-between">
                                                <div className={`text-xs px-2 py-1 rounded-full font-medium ${status.bg} ${status.color}`}>
                                                    {status.text}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {formatSessionTime(session.scheduled_at)}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
