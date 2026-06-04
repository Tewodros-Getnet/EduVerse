const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../db/redis');

let rateLimiter;

async function initRateLimiter() {
    const redisClient = await getRedisClient();

    const options = {
        windowMs: 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    };

    if (redisClient) {
        options.store = new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
            // Prefix namespaces this project's keys so they don't collide
            // with other projects sharing the same Upstash Redis instance.
            // All rate-limit keys for EduVerse will look like: eduverse:rl:127.0.0.1
            prefix: 'eduverse:rl:',
        });
        console.log('Rate limiter: using Redis store');
    } else {
        console.warn('Rate limiter: using in-memory store (Redis unavailable)');
    }

    rateLimiter = rateLimit(options);
}

// Middleware wrapper — initialises lazily on first request
const rateLimiterMiddleware = async (req, res, next) => {
    if (!rateLimiter) {
        await initRateLimiter();
    }
    return rateLimiter(req, res, next);
};

module.exports = { rateLimiter: rateLimiterMiddleware };
