const { createClient } = require('redis');

let client = null;
let isConnected = false;

async function getRedisClient() {
    if (client && isConnected) return client;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.warn('REDIS_URL not set — Redis features disabled');
        return null;
    }

    client = createClient({
        url: redisUrl,
        socket: {
            tls: redisUrl.startsWith('rediss://'),
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
        },
    });

    client.on('error', (err) => console.error('Redis client error:', err.message));
    client.on('connect', () => {
        isConnected = true;
        console.log('Redis connected');
    });
    client.on('end', () => {
        isConnected = false;
    });

    await client.connect();
    return client;
}

module.exports = { getRedisClient };
