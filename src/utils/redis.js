const redis = require('redis');

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
  const { Redis: UpstashRedis } = require('@upstash/redis');
  const upstash = new UpstashRedis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });
  // Provide a compatibility wrapper that normalizes method names to node-redis style
  client = {
    // Basic commands
    get: async (key) => upstash.get(key),
    set: async (key, value, opts) => {
      // Support both { EX } and { ex }
      const ex = opts?.EX ?? opts?.ex;
      if (ex != null) {
        return upstash.set(key, value, { ex });
      }
      return upstash.set(key, value);
    },
    del: async (...keys) => {
      const flat = keys.flat();
      return upstash.del(...flat);
    },
    // Hash commands
    hset: async (key, field, value) => {
      if (typeof field === 'object' && value === undefined) {
        // Handle hset(key, object) format
        return upstash.hset(key, field);
      }
      // Handle hset(key, field, value) format
      return upstash.hset(key, { [field]: value });
    },
    hget: async (key, field) => upstash.hget(key, field),
    hgetall: async (key) => upstash.hgetall(key),
    hdel: async (key, ...fields) => upstash.hdel(key, ...fields.flat()),
    // Expiration
    expire: async (key, seconds) => upstash.expire(key, seconds),
    // Additional Redis methods
    setex: async (key, seconds, value) => upstash.set(key, value, { ex: seconds }),
    lpush: async (key, ...values) => upstash.lpush(key, ...values.flat()),
    lrange: async (key, start, stop) => upstash.lrange(key, start, stop),
    // Set commands
    sAdd: async (key, ...members) => upstash.sadd(key, ...members.flat()),
    sadd: async (key, ...members) => upstash.sadd(key, ...members.flat()),
    sMembers: async (key) => upstash.smembers(key),
    smembers: async (key) => upstash.smembers(key),
    sRem: async (key, ...members) => upstash.srem(key, ...members.flat()),
    srem: async (key, ...members) => upstash.srem(key, ...members.flat()),
    // Set cardinality
    scard: async (key) => upstash.scard(key),
    // Utility
    ping: async () => 'PONG',
    keys: async () => {
      throw new Error('KEYS not supported on Upstash');
    },
  };
  module.exports = client;
} else {
  // Default Redis configuration for local development
  const redisHost = REDIS_HOST || 'localhost';
  const redisPort = REDIS_PORT || 6379;
  
  let redisUrl = 'redis://';
  if (REDIS_USERNAME && REDIS_PASSWORD) {
    redisUrl += `${REDIS_USERNAME}:${REDIS_PASSWORD}@`;
  }
  redisUrl += `${redisHost}:${redisPort}`;

  console.log('Connecting to Redis at:', redisUrl);

  try {
    client = redis.createClient({
      url: redisUrl,
    });

    client.on('error', (err) => {
      console.log('Redis Client Error:', err.message);
      // Don't crash the app if Redis is not available
    });

    client.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });

    client.connect().catch((err) => {
      console.log('❌ Failed to connect to Redis:', err.message);
      console.log('⚠️  Redis is not available. Some features may not work properly.');
    });

    // Add compatibility methods for consistency
    const originalClient = client;
    client = {
      ...originalClient,
      // Ensure all methods are available with consistent naming
      sAdd: originalClient.sAdd || originalClient.sadd,
      sMembers: originalClient.sMembers || originalClient.smembers,
      sRem: originalClient.sRem || originalClient.srem,
      scard: originalClient.scard,
    };

  } catch (error) {
    console.error('❌ Redis initialization failed:', error.message);
    // Create a mock client that doesn't crash the app
    client = {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 0,
      hset: async () => 0,
      hget: async () => null,
      hgetall: async () => ({}),
      hdel: async () => 0,
      expire: async () => 0,
      sAdd: async () => 0,
      sadd: async () => 0,
      sMembers: async () => [],
      smembers: async () => [],
      sRem: async () => 0,
      srem: async () => 0,
      setex: async () => 'OK',
      lpush: async () => 0,
      lrange: async () => [],
      ping: async () => 'PONG',
      keys: async () => [],
    };
  }

  module.exports = client;
}
