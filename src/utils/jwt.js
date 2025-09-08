const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const redisClient = require("./redis");

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

async function generateRefreshToken(user) {
  const jti = uuidv4();
  const refreshToken = jwt.sign(
    { id: user.id, jti },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );

  // Store the refresh token's JTI in Redis, associating it with the user ID
  await redisClient.set(jti, user.id.toString(), {
    EX: 30 * 24 * 60 * 60, // 30-day expiry in seconds
  });

  // Add the JTI to a set for the user
  await redisClient.sAdd(`user:${user.id}:jtis`, jti);

  return refreshToken;
}

async function deleteAllRefreshTokensForUser(userId) {
  const userJtisKey = `user:${userId}:jtis`;
  const jtis = await redisClient.sMembers(userJtisKey);

  if (jtis && jtis.length > 0) {
    await redisClient.del(jtis);
    await redisClient.del(userJtisKey);
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  deleteAllRefreshTokensForUser,
};