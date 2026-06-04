const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../db/redis');

let rateLimiter = null;

function buildInMemoryLimiter() {
    console.warn('Rate limiter: using in-memory store (Redis unavailable)');
    return rateLimit({
        windowMs: 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    });
}

async function initRateLimiter() {
    try {
        const redisClient = await getRedisClient();

        if (!redisClient) {
            rateLimiter = buildInMemoryLimiter();
            return;
        }

        rateLimiter = rateLimit({
            windowMs: 60 * 1000,
            max: 100,
            message: 'Too many requests from this IP, please try again later',
            standardHeaders: true,
            legacyHeaders: false,
            store: new RedisStore({
                sendCommand: (...args) => redisClient.sendCommand(args),
                // Prefix namespaces this project's keys so they don't collide
                // with other projects sharing the same Upstash Redis instance.
                // Keys look like: eduverse:rl:192.168.1.1
                prefix: 'eduverse:rl:',
            }),
        });
        console.log('Rate limiter: using Redis store');
    } catch (err) {
        console.error('Rate limiter init error:', err.message);
        rateLimiter = buildInMemoryLimiter();
    }
}

// Middleware wrapper — initialises lazily on first request, never crashes
const rateLimiterMiddleware = async (req, res, next) => {
    if (!rateLimiter) {
        await initRateLimiter();
    }
    try {
        return rateLimiter(req, res, next);
    } catch (err) {
        // If Redis dies mid-request, rebuild with in-memory and continue
        console.error('Rate limiter error, rebuilding:', err.message);
        rateLimiter = buildInMemoryLimiter();
        return rateLimiter(req, res, next);
    }
};

module.exports = { rateLimiter: rateLimiterMiddleware };
