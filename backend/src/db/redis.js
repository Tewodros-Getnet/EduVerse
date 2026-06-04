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
        pingInterval: 1000 * 60 * 3, // Ping every 3 minutes to keep connection alive
        socket: {
            family: 4, // Force IPv4 to fix ECONNRESET issues with Upstash on Render
            tls: redisUrl.startsWith('rediss://'),
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
            keepAlive: 30000 // Ensure TCP keep-alive is active
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
