import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function StudentLiveClasses() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, live, recordings

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

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const filterSessions = () => {
        const now = new Date();
        return sessions.filter(session => {
            if (activeTab === 'upcoming') {
                return new Date(session.scheduled_at) > now && session.status === 'scheduled';
            } else if (activeTab === 'live') {
                return session.status === 'live';
            } else {
                return session.status === 'completed';
            }
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
                <h1 className="text-2xl font-bold text-white">Live Classes</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#1a1a35] rounded-xl p-1">
                {['upcoming', 'live', 'recordings'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                            activeTab === tab
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
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
                        <p className="text-gray-400">
                            {activeTab === 'upcoming' && 'No upcoming live classes'}
                            {activeTab === 'live' && 'No live classes currently running'}
                            {activeTab === 'recordings' && 'No recorded classes available'}
                        </p>
                    </div>
                ) : (
                    filteredSessions.map(session => (
                        <div key={session.id} className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white">{session.title}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{session.course_title}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    session.status === 'live' 
                                        ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                                        : session.status === 'scheduled'
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                                        : 'bg-gray-600/20 text-gray-400 border border-gray-600/40'
                                }`}>
                                    {session.status}
                                </span>
                            </div>

                            <p className="text-sm text-gray-300 mb-3">{session.description}</p>

                            <div className="flex gap-4 mb-4 text-sm text-gray-400">
                                <span>Scheduled: {formatDateTime(session.scheduled_at)}</span>
                                <span>Duration: {session.duration_minutes} min</span>
                            </div>

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
                                {session.status === 'completed' && (
                                    <button
                                        className="flex-1 py-2 bg-gray-600/20 border border-gray-600/40 rounded-xl text-gray-400 text-sm hover:bg-gray-600/30 transition"
                                        disabled
                                    >
                                        Recording Available
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
