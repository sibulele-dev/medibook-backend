const redis = require("redis");

// Build the Redis URL from environment variables
const { REDIS_USERNAME, REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } = process.env;

let redisUrl = "redis://";
if (REDIS_USERNAME && REDIS_PASSWORD) {
  redisUrl += `${REDIS_USERNAME}:${REDIS_PASSWORD}@`;
}
redisUrl += `${REDIS_HOST}:${REDIS_PORT}`;

const client = redis.createClient({
  url: redisUrl,
});

client.on("error", (err) => console.log("Redis Client Error", err));

client.connect().catch(console.error);

module.exports = client;
