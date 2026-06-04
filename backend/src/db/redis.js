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
        pingInterval: 10000, // Ping every 10 seconds (aggressive keep-alive for Upstash)
        socket: {
            family: 4, // Force IPv4
            tls: redisUrl.startsWith('rediss://'),
            rejectUnauthorized: false, // Prevent TLS drop in strict environments
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
            keepAlive: 10000 // Match aggressive ping
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
