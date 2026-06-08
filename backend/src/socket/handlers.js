const jwt = require('jsonwebtoken');
const { query } = require('../db');
const {
    setUserOnline,
    setUserOffline,
    keepAlive,
    joinRoom,
    leaveRoom,
} = require('../lib/cache');

function setupSocketHandlers(io) {
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: No token provided'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            const result = await query('SELECT name, role FROM users WHERE id = $1', [decoded.userId]);
            if (!result.rows.length) return next(new Error('User not found'));
            socket.userName = result.rows[0].name;
            socket.userRole = result.rows[0].role;
            next();
        } catch (err) {
            next(new Error(`Authentication error: ${err.message}`));
        }
    });

    io.on('connection', async (socket) => {
        console.log(`[LIVE] User connected: ${socket.userId} (${socket.userRole}) - Session: ${socket.id}`);

        // Mark user online in Redis
        await setUserOnline(socket.userId, { name: socket.userName, role: socket.userRole, socketId: socket.id });

        // --- Live Class Room ---
        socket.on('join-class', async (classId) => {
            if (!classId) { socket.emit('error', { message: 'Invalid class ID' }); return; }

            socket.join(`class-${classId}`);
            socket.currentRoomId = classId; // track for cleanup on disconnect
            await joinRoom(socket.userId, classId);
            console.log(`[LIVE] User joined class: ${classId}`);

            socket.to(`class-${classId}`).emit('user-joined', {
                userId: socket.userId,
                name: socket.userName,
                role: socket.userRole,
            });

            const room = io.sockets.adapter.rooms.get(`class-${classId}`);
            const participants = room ? [...room].map(sid => {
                const s = io.sockets.sockets.get(sid);
                return s ? { userId: s.userId, name: s.userName, role: s.userRole } : null;
            }).filter(Boolean) : [];
            socket.emit('room-participants', participants);
        });

        socket.on('leave-class', async (classId) => {
            socket.leave(`class-${classId}`);
            await leaveRoom(socket.userId, classId);
            console.log(`[LIVE] User left class: ${classId}`);
            socket.to(`class-${classId}`).emit('user-left', { userId: socket.userId });
        });

        socket.on('chat-message', ({ classId, message }) => {
            if (!classId || !message) {
                socket.emit('error', { message: 'Invalid message data' });
                return;
            }
            io.to(`class-${classId}`).emit('chat-message', {
                userId: socket.userId,
                name: socket.userName,
                message,
                timestamp: new Date(),
            });
        });

        socket.on('raise-hand', (classId) => {
            if (!classId) return;
            io.to(`class-${classId}`).emit('hand-raised', {
                userId: socket.userId,
                name: socket.userName,
            });
        });

        socket.on('lower-hand', (classId) => {
            if (!classId) return;
            io.to(`class-${classId}`).emit('hand-lowered', { userId: socket.userId });
        });

        // --- WebRTC Signaling ---
        socket.on('webrtc-offer', ({ classId, targetUserId, offer }) => {
            if (!classId || !offer) return;
            // Find the target user's socket and send directly
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetUserId && s.rooms.has(`class-${classId}`));
            if (targetSocket) {
                targetSocket.emit('webrtc-offer', {
                    fromUserId: socket.userId,
                    offer,
                });
            }
        });

        socket.on('webrtc-answer', ({ classId, targetUserId, answer }) => {
            if (!classId || !answer) return;
            // Find the target user's socket and send directly
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetUserId && s.rooms.has(`class-${classId}`));
            if (targetSocket) {
                targetSocket.emit('webrtc-answer', {
                    fromUserId: socket.userId,
                    answer,
                });
            }
        });

        socket.on('webrtc-ice-candidate', ({ classId, targetUserId, candidate }) => {
            if (!classId || !candidate) return;
            // Find the target user's socket and send directly
            const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === targetUserId && s.rooms.has(`class-${classId}`));
            if (targetSocket) {
                targetSocket.emit('webrtc-ice-candidate', {
                    fromUserId: socket.userId,
                    candidate,
                });
            }
        });

        // Media state changes (mic/video toggle)
        socket.on('media-state', ({ classId, videoOn, micOn }) => {
            if (!classId) return;
            keepAlive(socket.userId); // slide the online TTL forward
            socket.to(`class-${classId}`).emit('peer-media-state', {
                userId: socket.userId,
                videoOn,
                micOn,
            });
        });

        // Screen share state broadcast
        socket.on('screen-share-state', ({ classId, sharing }) => {
            if (!classId) return;
            socket.to(`class-${classId}`).emit('screen-share-state', {
                userId: socket.userId,
                sharing,
            });
        });

        socket.on('disconnect', async () => {
            console.log(`[LIVE] User disconnected: ${socket.userId}`);
            // Clean up online presence and room membership
            await setUserOffline(socket.userId);
            if (socket.currentRoomId) {
                await leaveRoom(socket.userId, socket.currentRoomId);
                socket.to(`class-${socket.currentRoomId}`).emit('user-left', { userId: socket.userId });
            }
        });

        socket.on('error', (error) => {
            console.error(`[LIVE] Socket error for user ${socket.userId}:`, error);
        });
    });
}

module.exports = { setupSocketHandlers };
