require("dotenv").config({ path: require("path").resolve(__dirname, '../.env') });
const redisClient = require("./src/utils/redis");

async function clearRedisMemory() {
  try {
    await redisClient.connect();
    console.log("Connected to Redis.");

    const keys = await redisClient.keys('*');
    if (keys.length > 0) {
      await redisClient.flushall();
      console.log(`Cleared ${keys.length} keys from Redis.`);
    } else {
      console.log("Redis is already empty. No keys to clear.");
    }
  } catch (error) {
    console.error("Error clearing Redis memory:", error);
  } finally {
    if (redisClient.isReady) {
      await redisClient.disconnect();
      console.log("Disconnected from Redis.");
    }
  }
}

clearRedisMemory();