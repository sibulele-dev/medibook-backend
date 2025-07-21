const jwt = require("jsonwebtoken");
const redisClient = require("./redis");

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function generateRefreshToken(user) {
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );

  // Store the refresh token in Redis for validation and revocation
  redisClient.set(refreshToken, user.id.toString(), {
    EX: 30 * 24 * 60 * 60, // 30-day expiry in seconds
  });

  return refreshToken;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
