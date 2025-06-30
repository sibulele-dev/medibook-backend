const { createClient } = require("redis");

const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connecting to Redis..."));
redisClient.on("ready", () => console.log("Redis connection established!"));

(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;
