const redis = require('redis');

const client = redis.createClient({
    host: 'weatherapplogstatus-in18nt.serverless.aps1.cache.amazonaws.com',
    port: 6379,
});
client.connect().catch(console.error);

process.on('SIGINT', async () => {
    await client.quit();  // Properly close the Redis connection
    process.exit(0);
});
client.on('error', (err) => {
    console.log('Redis error: ', err);
});

module.exports = client; // Export the client