/**
 * cache.js — All Redis-backed features using @upstash/redis (HTTP client).
 *
 * WHY @upstash/redis and NOT node-redis here:
 *   node-redis uses a persistent TCP socket. On Render (free tier) the process
 *   sleeps between requests, killing the socket and causing ECONNRESET on wake.
 *   @upstash/redis makes a plain HTTPS REST call per command — no socket to
 *   keep alive, no reconnection logic needed, works perfectly on serverless.
 *
 *   node-redis is kept ONLY in rateLimiter.js because rate-limit-redis needs
 *   the sendCommand() interface. Everything else goes through this file.
 *
 * REQUIRED env vars (Upstash Console → REST API tab):
 *   UPSTASH_REDIS_REST_URL    https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN  AXxx...
 *
 * Key namespace  (prefix: eduverse:)
 *   eduverse:cache:*        response cache
 *   eduverse:session:*      online presence
 *   eduverse:room:*         live-class room membership
 *   eduverse:notif:count:*  unread notification badge counts
 *   eduverse:quiz:lock:*    quiz submit de-dup lock
 *   eduverse:rt:*           refresh token whitelist
 *   eduverse:rt:user:*      per-user token hash set (for revoke-all)
 *   eduverse:rl:*           rate limiter (owned by rateLimiter.js)
 */

const { Redis } = require('@upstash/redis');

const P = 'eduverse:'; // namespace prefix

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client = null;

function getClient() {
    if (_client) return _client;

    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        // Return null — every helper below checks for null and degrades gracefully
        return null;
    }

    _client = new Redis({ url, token });
    return _client;
}

// ─── Low-level primitives ─────────────────────────────────────────────────────

async function get(key) {
    const r = getClient();
    if (!r) return null;
    try {
        // @upstash/redis auto-deserializes JSON stored as strings
        return await r.get(P + key);
    } catch { return null; }
}

async function set(key, value, ttlSeconds) {
    const r = getClient();
    if (!r) return false;
    try {
        if (ttlSeconds) {
            await r.set(P + key, value, { ex: ttlSeconds });
        } else {
            await r.set(P + key, value);
        }
        return true;
    } catch { return false; }
}

async function del(...keys) {
    const r = getClient();
    if (!r) return;
    try {
        await r.del(...keys.map(k => P + k));
    } catch { /* silent */ }
}

/**
 * Delete all keys matching a glob pattern using SCAN (non-blocking).
 * Upstash supports SCAN in serverless — safe to use.
 */
async function delPattern(pattern) {
    const r = getClient();
    if (!r) return;
    try {
        let cursor = 0;
        do {
            const [nextCursor, keys] = await r.scan(cursor, {
                match: P + pattern,
                count: 100,
            });
            cursor = nextCursor;
            if (keys.length) await r.del(...keys);
        } while (cursor !== 0);
    } catch { /* silent */ }
}

// ─── 1. Response Cache ────────────────────────────────────────────────────────

/**
 * Express middleware — cache a GET handler's JSON response.
 *
 * Usage:
 *   router.get('/dashboard', cacheMiddleware('admin:dashboard', 120), handler)
 *
 * The first request hits the DB and stores the result.
 * Subsequent requests within `ttl` seconds return from Redis instantly.
 * Sends an X-Cache: HIT | MISS header so you can verify it in DevTools.
 */
function cacheMiddleware(keyName, ttl = 60) {
    return async (req, res, next) => {
        const cached = await get(`cache:${keyName}`);
        if (cached !== null) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached);
        }

        // Intercept res.json so we can store the response before sending it
        const originalJson = res.json.bind(res);
        res.json = async (data) => {
            res.setHeader('X-Cache', 'MISS');
            await set(`cache:${keyName}`, data, ttl);
            return originalJson(data);
        };
        next();
    };
}

/**
 * Bust cached keys after a mutation.
 * Pass exact names or glob patterns (e.g. 'courses:*').
 *
 * await invalidateCache('admin:dashboard', 'courses:*')
 */
async function invalidateCache(...keys) {
    for (const key of keys) {
        if (key.includes('*')) {
            await delPattern(`cache:${key}`);
        } else {
            await del(`cache:${key}`);
        }
    }
}

// ─── 2. Online Presence / Session ─────────────────────────────────────────────

/**
 * Mark a user as online when their socket connects.
 * TTL of 5 min means stale entries self-expire if the server crashes.
 */
async function setUserOnline(userId, metadata = {}) {
    await set(`session:online:${userId}`, { userId, ...metadata, since: Date.now() }, 5 * 60);
}

/**
 * Slide the TTL forward — call this on each socket heartbeat or activity.
 */
async function keepAlive(userId) {
    const r = getClient();
    if (!r) return;
    try {
        await r.expire(P + `session:online:${userId}`, 5 * 60);
    } catch { /* silent */ }
}

/** Remove online record on socket disconnect. */
async function setUserOffline(userId) {
    await del(`session:online:${userId}`);
}

/** Returns true if the user has an active online entry. */
async function isUserOnline(userId) {
    return (await get(`session:online:${userId}`)) !== null;
}

// ─── 3. Live-class room membership ───────────────────────────────────────────
//
// We store each room's member set as a Redis Set.
// Socket handlers call joinRoom / leaveRoom on connect/disconnect events.

async function joinRoom(userId, roomId) {
    const r = getClient();
    if (!r) return;
    try {
        await r.sadd(P + `room:${roomId}`, userId);
        await r.expire(P + `room:${roomId}`, 6 * 60 * 60); // 6-hour max live session
    } catch { /* silent */ }
}

async function leaveRoom(userId, roomId) {
    const r = getClient();
    if (!r) return;
    try {
        await r.srem(P + `room:${roomId}`, userId);
    } catch { /* silent */ }
}

/**
 * Return an array of online-user metadata objects for everyone in a room.
 * Combines room membership set + per-user session data.
 */
async function getRoomParticipants(roomId) {
    const r = getClient();
    if (!r) return [];
    try {
        const members = await r.smembers(P + `room:${roomId}`);
        if (!members.length) return [];
        const results = await Promise.all(members.map(uid => get(`session:online:${uid}`)));
        return results.filter(Boolean);
    } catch { return []; }
}

// ─── 4. Notification badge count ─────────────────────────────────────────────

/**
 * Cheap unread count — avoids a DB COUNT(*) on every page load.
 * Returns null on a cold cache so the caller knows to query the DB.
 */
async function getUnreadCount(userId) {
    return get(`notif:count:${userId}`);
}

async function setUnreadCount(userId, count) {
    await set(`notif:count:${userId}`, count, 60); // 60-second TTL
}

/** Call after inserting a notification or marking as read. */
async function invalidateUnreadCount(userId) {
    await del(`notif:count:${userId}`);
}

// ─── 5. Quiz submit lock (prevent double-submit) ──────────────────────────────

/**
 * Atomically acquire a 30-second exclusive lock for a (student, quiz) pair.
 *
 * Returns true  → lock granted, safe to process the submission.
 * Returns false → another request already holds the lock (duplicate submit).
 *
 * The lock auto-expires after 30 s even if the handler crashes.
 */
async function acquireQuizLock(studentId, quizId) {
    const r = getClient();
    if (!r) return true; // Redis down → allow through (fail open)
    try {
        // SET NX EX is atomic in Redis — exactly what we need
        const result = await r.set(
            P + `quiz:lock:${studentId}:${quizId}`,
            '1',
            { nx: true, ex: 30 }
        );
        // @upstash/redis returns 'OK' on success, null when NX condition fails
        return result === 'OK';
    } catch { return true; }
}

async function releaseQuizLock(studentId, quizId) {
    await del(`quiz:lock:${studentId}:${quizId}`);
}

// ─── 6. Refresh token whitelist ───────────────────────────────────────────────
//
// The auth route issues JWT refresh tokens with a 7-day expiry.
// Without a server-side record, logout can't actually invalidate a token —
// anyone with the token can keep refreshing until it naturally expires.
//
// Solution: store a hashed copy in Redis when issued; delete it on logout or
// password change. The /refresh endpoint checks the whitelist before accepting.

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Store a refresh token hash when it is issued.
 * Also adds the hash to a per-user set so we can revoke all tokens at once.
 */
async function storeRefreshToken(token, userId) {
    const r = getClient();
    if (!r) return;
    const hash = _shortHash(token);
    try {
        await Promise.all([
            // Store as 'active' so we can distinguish from 'revoked'
            r.set(P + `rt:${hash}`, JSON.stringify({ userId, issuedAt: Date.now(), status: 'active' }), { ex: REFRESH_TTL }),
            r.sadd(P + `rt:user:${userId}`, hash),
            r.expire(P + `rt:user:${userId}`, REFRESH_TTL),
        ]);
    } catch { /* silent */ }
}

/**
 * Returns the stored record if the token is active, or null if not found / expired.
 */
async function validateRefreshToken(token) {
    return get(`rt:${_shortHash(token)}`);
}

/**
 * Revoke a single refresh token (normal logout) — marks it as 'revoked'.
 */
async function revokeRefreshToken(token, userId) {
    const hash = _shortHash(token);
    const r = getClient();
    if (!r) return;
    try {
        await Promise.all([
            // Mark as revoked with a short TTL so the key lingers long enough
            // to reject any concurrent retry attempts (30 minutes)
            r.set(P + `rt:${hash}`, 'revoked', { ex: 30 * 60 }),
            userId ? r.srem(P + `rt:user:${userId}`, hash) : Promise.resolve(),
        ]);
    } catch { /* silent */ }
}

/**
 * Revoke ALL refresh tokens for a user — "log out of all devices".
 * Call after password change or account compromise.
 */
async function revokeAllRefreshTokens(userId) {
    const r = getClient();
    if (!r) return;
    try {
        const setKey = P + `rt:user:${userId}`;
        const hashes = await r.smembers(setKey);
        if (hashes.length) {
            const tokenKeys = hashes.map(h => P + `rt:${h}`);
            await r.del(...tokenKeys, setKey);
        } else {
            await r.del(setKey);
        }
    } catch { /* silent */ }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Fast non-cryptographic hash — used only to shorten token strings for keys.
 * The JWT itself is never stored; only this hash.
 */
function _shortHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    // Raw access (use sparingly — prefer the named helpers below)
    cacheGet: get,
    cacheSet: set,
    cacheDel: del,

    // Response cache
    cacheMiddleware,
    invalidateCache,

    // Online presence
    setUserOnline,
    keepAlive,
    setUserOffline,
    isUserOnline,

    // Live-class rooms
    joinRoom,
    leaveRoom,
    getRoomParticipants,

    // Notification badge
    getUnreadCount,
    setUnreadCount,
    invalidateUnreadCount,

    // Quiz submit lock
    acquireQuizLock,
    releaseQuizLock,

    // Refresh tokens
    storeRefreshToken,
    validateRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokens,
};
