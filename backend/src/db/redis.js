const { createClient } = require('redis');

let client = null;
let isConnected = false;
let initPromise = null;

async function getRedisClient() {
    // Return immediately if already connected
    if (client && isConnected) return client;

    // Avoid creating multiple clients if called concurrently
    if (initPromise) return initPromise;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.warn('REDIS_URL not set — Redis features disabled');
        return null;
    }

    initPromise = (async () => {
        try {
            client = createClient({
                url: redisUrl,
                socket: {
                    tls: redisUrl.startsWith('rediss://'),
                    rejectUnauthorized: false,
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            // After 10 retries, stop trying and fall back to in-memory
                            console.warn('Redis: max retries reached, disabling Redis');
                            isConnected = false;
                            client = null;
                            initPromise = null;
                            return false; // stop reconnecting
                        }
                        return Math.min(retries * 200, 3000);
                    },
                },
            });

            client.on('error', (err) => {
                // Log but don't crash — rate limiter falls back to in-memory on errors
                console.error('Redis client error:', err.message);
            });

            client.on('connect', () => {
                isConnected = true;
                console.log('Redis connected');
            });

            client.on('end', () => {
                isConnected = false;
                initPromise = null;
            });

            await client.connect();
            return client;
        } catch (err) {
            console.error('Redis connection failed:', err.message);
            console.warn('Falling back to in-memory rate limiting');
            client = null;
            initPromise = null;
            return null;
        }
    })();

    return initPromise;
}

module.exports = { getRedisClient };
