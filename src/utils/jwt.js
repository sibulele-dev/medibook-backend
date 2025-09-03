const jwt = require("jsonwebtoken");
const redisClient = require("./redis");

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

async function generateRefreshToken(user) {
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );

  // Store the refresh token in Redis, associating it with the user ID
  // Key format: user:<userId>:refreshToken:<refreshTokenValue>
  await redisClient.set(`user:${user.id}:refreshToken:${refreshToken}`, user.id.toString(), {
    EX: 30 * 24 * 60 * 60, // 30-day expiry in seconds
  });

  return refreshToken;
}

async function deleteAllRefreshTokensForUser(userId) {
  // Find all refresh tokens associated with this user
  const keys = await redisClient.keys(`user:${userId}:refreshToken:*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  deleteAllRefreshTokensForUser,
};