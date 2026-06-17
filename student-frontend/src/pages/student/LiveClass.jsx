import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

export default function StudentLiveClass() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const socketRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const remoteStreamsRef = useRef({});
    const screenStreamRef = useRef(null);

    const [tab, setTab] = useState('chat');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [handRaised, setHandRaised] = useState(false);
    const [screenSharing, setScreenSharing] = useState(false);
    const [session, setSession] = useState(null);
    const [joined, setJoined] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const chatEndRef = useRef(null);
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteVideoRefs = useRef({});

    useEffect(() => {
        api.get(`/live/sessions/${id}`)
            .then(res => setSession(res.data.session))
            .catch(() => { toast.error('Session not found'); navigate('/student'); });
    }, [id]);

    const setupLocalMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            toast.error('Unable to access camera and microphone. You can still join the class for chat.');
            return null;
        }
    };

    // Create a peer connection with another participant
    const createPeerConnection = async (targetUserId, initiator = false) => {
        try {
            const peerConnection = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionsRef.current[targetUserId] = peerConnection;

            // Add local stream tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStreamRef.current);
                });
            }

            // Handle remote stream
            peerConnection.ontrack = (event) => {
                console.log('Received remote track:', event.track);
                if (event.streams && event.streams[0]) {
                    remoteStreamsRef.current[targetUserId] = event.streams[0];
                    setRemoteStreams(prev => ({
                        ...prev,
                        [targetUserId]: {
                            name: participants.find(p => p.userId === targetUserId)?.name || 'User',
                            stream: event.streams[0]
                        }
                    }));

                    // Attach to video element if exists
                    if (remoteVideoRefs.current[targetUserId]) {
                        remoteVideoRefs.current[targetUserId].srcObject = event.streams[0];
                    }
                }
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socketRef.current?.emit('webrtc-ice-candidate', {
                        classId: id,
                        targetUserId,
                        candidate: event.candidate
                    });
                }
            };

            // Connection state changes
            peerConnection.onconnectionstatechange = () => {
                console.log(`Connection state with ${targetUserId}:`, peerConnection.connectionState);
                if (peerConnection.connectionState === 'failed') {
                    console.log('Connection failed, attempting restart');
                    peerConnection.restartIce?.();
                }
            };

            // If initiator, create and send offer
            if (initiator) {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socketRef.current?.emit('webrtc-offer', {
                    classId: id,
                    targetUserId,
                    offer: offer
                });
            }

            return peerConnection;
        } catch (err) {
            console.error('Error creating peer connection:', err);
            toast.error('Failed to establish peer connection');
            return null;
        }
    };

    const joinSession = async () => {
        try {
            const stream = await setupLocalMedia();
            await api.post(`/live/sessions/${id}/join`);
            setJoined(true);

            const token = localStorage.getItem('student_token') || localStorage.getItem('instructor_token');
            const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
            const socket = io(socketUrl, {
                auth: { token },
            });
            socketRef.current = socket;

            socket.on('connect', () => socket.emit('join-class', id));

            socket.on('room-participants', async (list) => {
                const filteredList = list.filter(p => p.userId !== user?.id);
                setParticipants(filteredList);
                
                // Create peer connections with all participants
                if (stream) {
                    for (const participant of filteredList) {
                        if (!peerConnectionsRef.current[participant.userId]) {
                            await createPeerConnection(participant.userId, true); // Initiator
                        }
                    }
                }
            });

            socket.on('user-joined', async (data) => {
                if (data.userId === user?.id) return;
                setParticipants(prev => prev.find(p => p.userId === data.userId) ? prev : [...prev, data]);
                toast(`${data.name} joined`, { icon: '👋', duration: 2000 });
                
                // Create peer connection if not exists (non-initiator will wait for offer)
                if (stream && !peerConnectionsRef.current[data.userId]) {
                    await createPeerConnection(data.userId, false); // Non-initiator
                }
            });

            socket.on('user-left', ({ userId }) => {
                setParticipants(prev => prev.filter(p => p.userId !== userId));
                // Clean up peer connection
                if (peerConnectionsRef.current[userId]) {
                    peerConnectionsRef.current[userId].close();
                    delete peerConnectionsRef.current[userId];
                }
                // Remove remote stream
                setRemoteStreams(prev => {
                    const newStreams = { ...prev };
                    delete newStreams[userId];
                    return newStreams;
                });
            });

            socket.on('chat-message', (msg) => {
                setMessages(prev => [...prev, msg]);
            });

            socket.on('hand-raised', ({ name }) => {
                toast(`✋ ${name} raised their hand`, { duration: 3000 });
            });

            socket.on('peer-media-state', ({ userId, videoOn: v, micOn: m }) => {
                setParticipants(prev => prev.map(p =>
                    p.userId === userId ? { ...p, videoOn: v, micOn: m } : p
                ));
            });

            socket.on('screen-share-state', ({ userId, sharing }) => {
                setParticipants(prev => prev.map(p =>
                    p.userId === userId ? { ...p, screenSharing: sharing } : p
                ));
                if (sharing) {
                    const sharer = participants.find(p => p.userId === userId);
                    toast(`🖥️ ${sharer?.name || 'Someone'} started sharing their screen`, { duration: 3000 });
                }
            });

            // WebRTC Signaling Handlers
            socket.on('webrtc-offer', async (data) => {
                try {
                    const peerConnection = peerConnectionsRef.current[data.fromUserId] || 
                        await createPeerConnection(data.fromUserId, false);
                    
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    
                    socket.emit('webrtc-answer', {
                        classId: id,
                        targetUserId: data.fromUserId,
                        answer: answer
                    });
                } catch (err) {
                    console.error('Error handling offer:', err);
                }
            });

            socket.on('webrtc-answer', async (data) => {
                try {
                    const peerConnection = peerConnectionsRef.current[data.fromUserId];
                    if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                    }
                } catch (err) {
                    console.error('Error handling answer:', err);
                }
            });

            socket.on('webrtc-ice-candidate', async (data) => {
                try {
                    const peerConnection = peerConnectionsRef.current[data.fromUserId];
                    if (peerConnection && data.candidate) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            });
        } catch (err) {
            console.error('Join session error:', err);
            toast.error('Failed to join session');
        }
    };

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave-class', id);
                socketRef.current.disconnect();
            }
            Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
            peerConnectionsRef.current = {};
            remoteStreamsRef.current = {};

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
            }
        };
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Attach remote streams to video elements as they become available
        Object.entries(remoteStreams).forEach(([userId, remoteData]) => {
            if (remoteVideoRefs.current[userId]) {
                remoteVideoRefs.current[userId].srcObject = remoteData.stream;
            }
        });
    }, [remoteStreams]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socketRef.current) return;
        socketRef.current.emit('chat-message', { classId: id, message });
        setMessage('');
    };

    const toggleMic = () => {
        const next = !micOn;
        setMicOn(next);
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = next; });
        }
        socketRef.current?.emit('media-state', { classId: id, videoOn, micOn: next });
    };

    const toggleVideo = () => {
        const next = !videoOn;
        setVideoOn(next);
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = next; });
        }
        socketRef.current?.emit('media-state', { classId: id, videoOn: next, micOn });
    };

    const toggleHand = () => {
        const next = !handRaised;
        setHandRaised(next);
        if (next) socketRef.current?.emit('raise-hand', id);
        else socketRef.current?.emit('lower-hand', id);
    };

    const toggleScreenShare = async () => {
        if (screenSharing) {
            // Stop screen share — restore camera track in all peer connections
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }

            // Replace screen track with camera track in every peer connection
            const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
            if (cameraTrack) {
                Object.values(peerConnectionsRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(cameraTrack);
                });
                // Show camera in local preview
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                }
            }

            setScreenSharing(false);
            socketRef.current?.emit('screen-share-state', { classId: id, sharing: false });
            toast('Screen sharing stopped', { icon: '🖥️', duration: 2000 });
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false,
                });
                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];

                // Replace camera track with screen track in every peer connection
                Object.values(peerConnectionsRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });

                // Show screen in local preview
                if (localVideoRef.current) {
                    const previewStream = new MediaStream([
                        screenTrack,
                        ...(localStreamRef.current?.getAudioTracks() || [])
                    ]);
                    localVideoRef.current.srcObject = previewStream;
                }

                setScreenSharing(true);
                socketRef.current?.emit('screen-share-state', { classId: id, sharing: true });
                toast.success('Screen sharing started');

                // Auto-stop when user clicks browser's "Stop sharing" button
                screenTrack.onended = () => {
                    toggleScreenShare();
                };
            } catch (err) {
                if (err.name !== 'NotAllowedError') {
                    toast.error('Failed to start screen sharing');
                }
            }
        }
    };

    if (!session) return <div className="text-center py-20 text-gray-400">Loading session...</div>;

    if (!joined) {
        return (
            <div className="max-w-lg mx-auto mt-20 text-center space-y-6">
                <div className="bg-[#12122a] border border-purple-900/30 rounded-2xl p-8">
                    <div className="text-5xl mb-4">📹</div>
                    <h1 className="text-xl font-bold text-white mb-2">{session.title}</h1>
                    <p className="text-gray-400 text-sm mb-1">{session.course_title}</p>
                    <p className="text-gray-400 text-xs mb-1">{session.instructor_name && `by ${session.instructor_name}`}</p>
                    <p className="text-gray-500 text-xs mb-6">
                        {session.status === 'live' ? '🔴 Live now' : `Scheduled: ${new Date(session.scheduled_at).toLocaleString()}`}
                    </p>
                    {session.status === 'live' ? (
                        <div className="space-y-3">
                            {/* In-app WebRTC join */}
                            <button onClick={joinSession}
                                className="w-full px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-semibold hover:opacity-90 transition">
                                📹 Join with In-App Video
                            </button>
                            {/* External meeting URL fallback */}
                            {session.meeting_url && (
                                <a
                                    href={session.meeting_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-semibold hover:opacity-90 transition text-center"
                                >
                                    🔗 Join via External Meeting Link
                                </a>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="text-yellow-400 text-sm mb-4">This session hasn't started yet.</p>
                            {session.meeting_url && (
                                <p className="text-gray-400 text-xs mb-4">
                                    Meeting link will be available once the session starts.
                                </p>
                            )}
                            <Link to="/student/live" className="px-6 py-2.5 bg-[#1a1a35] border border-purple-900/40 rounded-xl text-gray-300 text-sm hover:text-white transition">
                                Back to Live Classes
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col bg-[#0d0d1a]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#12122a] border-b border-purple-900/30">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-white">{session.title}</span>
                    <span className="text-xs text-gray-400">({session.course_title})</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">👥 {participants.length}</span>
                    <button onClick={() => navigate('/student')}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition">
                        Leave
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col p-4 gap-4">
                    {/* Video Grid - Responsive layout */}
                    <div className="flex-1 bg-black rounded-2xl overflow-auto" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1rem',
                        padding: '0.5rem'
                    }}>
                        {/* Local Video */}
                        <div className="bg-black rounded-2xl overflow-hidden min-h-[250px] relative">
                            {localStream ? (
                                <>
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-2 left-2 bg-[#12122a]/80 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                                        {screenSharing && <span className="text-green-400">🖥️</span>}
                                        You (Local)
                                    </div>
                                    {screenSharing && (
                                        <div className="absolute top-2 right-2 bg-green-500/90 px-2 py-1 rounded text-xs text-white font-medium animate-pulse">
                                            Sharing Screen
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 px-4">
                                    <div className="text-5xl mb-3">📹</div>
                                    <p className="text-sm">Local camera preview</p>
                                    <p className="text-xs text-gray-400 mt-2">Allow camera and microphone access to join with video.</p>
                                </div>
                            )}
                        </div>

                        {/* Remote Videos Grid */}
                        {Object.entries(remoteStreams).map(([userId, remoteData]) => (
                            <div key={userId} className="bg-black rounded-2xl overflow-hidden min-h-[250px] relative">
                                <video
                                    ref={el => { if (el) remoteVideoRefs.current[userId] = el; }}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-2 left-2 bg-[#12122a]/80 px-2 py-1 rounded text-xs text-white">
                                    {remoteData.name}
                                </div>
                            </div>
                        ))}

                        {/* Empty State */}
                        {Object.keys(remoteStreams).length === 0 && localStream && (
                            <div className="h-[150px] bg-[#1a1a35] rounded-2xl flex items-center justify-center text-gray-400 text-xs col-span-full">
                                Waiting for other participants to join...
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 py-2">
                        {[
                            { icon: videoOn ? '📹' : '📷', label: 'Video', action: toggleVideo, active: videoOn },
                            { icon: micOn ? '🎤' : '🔇', label: 'Mic', action: toggleMic, active: micOn },
                            { icon: screenSharing ? '🛑' : '🖥️', label: screenSharing ? 'Stop Share' : 'Share Screen', action: toggleScreenShare, active: !screenSharing, highlight: screenSharing },
                            { icon: handRaised ? '✋' : '🖐️', label: handRaised ? 'Lower Hand' : 'Raise Hand', action: toggleHand, active: !handRaised },
                            { icon: '💬', label: 'Chat', action: () => setTab('chat') },
                            { icon: '👥', label: 'People', action: () => setTab('participants') },
                        ].map(ctrl => (
                            <button key={ctrl.label} onClick={ctrl.action}
                                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition text-sm ${
                                    ctrl.highlight
                                        ? 'bg-green-500/30 text-green-300 border border-green-500/40 animate-pulse'
                                        : ctrl.active === false
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-[#12122a] text-gray-300 hover:bg-[#1a1a35] hover:text-white'
                                }`}>
                                <span className="text-xl">{ctrl.icon}</span>
                                <span className="text-xs">{ctrl.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-72 bg-[#12122a] border-l border-purple-900/30 flex flex-col">
                    <div className="flex border-b border-purple-900/30">
                        {['chat', 'participants'].map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`flex-1 py-3 text-sm font-medium capitalize transition ${tab === t ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>
                                {t === 'chat' ? `💬 Chat` : `👥 People (${participants.length})`}
                            </button>
                        ))}
                    </div>

                    {tab === 'chat' ? (
                        <>
                            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                {messages.length === 0 && <p className="text-center text-gray-500 text-xs mt-4">No messages yet</p>}
                                {messages.map((msg, i) => (
                                    <div key={i}>
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs font-medium text-purple-300">{msg.name || msg.userId}</span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 bg-[#1a1a35] rounded-xl px-3 py-2">{msg.message}</p>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={sendMessage} className="p-3 border-t border-purple-900/30 flex gap-2">
                                <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Type a message..."
                                    className="flex-1 bg-[#1a1a35] border border-purple-900/40 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                                <button type="submit" className="px-3 py-2 bg-purple-600 rounded-xl text-white text-sm hover:bg-purple-500 transition">→</button>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                            {participants.map(p => (
                                <div key={p.userId} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#1a1a35] transition">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                            {(p.name || '?')[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm text-white">{p.name}</p>
                                            {p.role === 'instructor' && <span className="text-xs text-blue-400">Instructor</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 text-sm">
                                        <span className={p.videoOn !== false ? 'text-green-400' : 'text-gray-600'}>📹</span>
                                        <span className={p.micOn !== false ? 'text-green-400' : 'text-gray-600'}>🎤</span>
                                        {p.screenSharing && <span className="text-green-400">🖥️</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
