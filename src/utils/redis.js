const redis = require("redis");

// Prefer Upstash if configured; fallback to native Redis client
const {
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
  REDIS_USERNAME,
  REDIS_PASSWORD,
  REDIS_HOST,
  REDIS_PORT,
} = process.env;

let client;

if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  // Lazy-require to avoid dependency if not used
  const { Redis: UpstashRedis } = require("@upstash/redis");
  client = new UpstashRedis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });
  module.exports = client;
} else {
  let redisUrl = "redis://";
  if (REDIS_USERNAME && REDIS_PASSWORD) {
    redisUrl += `${REDIS_USERNAME}:${REDIS_PASSWORD}@`;
  }
  redisUrl += `${REDIS_HOST}:${REDIS_PORT}`;

  client = redis.createClient({
    url: redisUrl,
  });

  client.on("error", (err) => console.log("Redis Client Error", err));

  client.connect().catch(console.error);

  module.exports = client;
}
