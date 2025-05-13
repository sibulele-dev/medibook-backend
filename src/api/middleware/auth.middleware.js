const jwt = require("jsonwebtoken");
const { prisma } = require("../../config/database");
const { errorResponse } = require("../../utils/response");

/**
 * Middleware to authenticate JWT tokens
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Unauthorized - No token provided", 401);
    }

    const token = authHeader.split(" ")[1];

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: true,
        patient: true,
        doctor: true,
        staffMember: {
          include: {
            practice: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse(res, "Unauthorized - User not found", 401);
    }

    // Check if token is blacklisted (e.g., after logout)
    const blacklistedToken = await prisma.blacklistedToken.findUnique({
      where: { token },
    });

    if (blacklistedToken) {
      return errorResponse(res, "Unauthorized - Token revoked", 401);
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Unauthorized - Token expired", 401);
    }
    return errorResponse(res, "Unauthorized - Invalid token", 401);
  }
};

/**
 * Middleware to check if user is a system admin
 */
exports.adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.roles.some((role) => role.name === "ADMIN")) {
    return errorResponse(res, "Forbidden - Admin access required", 403);
  }
  next();
};

/**
 * Middleware to check if user is a practice admin
 */
exports.practiceAdminMiddleware = (req, res, next) => {
  if (
    !req.user ||
    (!req.user.roles.some((role) => role.name === "ADMIN") &&
      !req.user.roles.some((role) => role.name === "PRACTICE_ADMIN"))
  ) {
    return errorResponse(
      res,
      "Forbidden - Practice admin access required",
      403
    );
  }
  next();
};

/**
 * Middleware to check if user is a practice staff member
 */
exports.practiceStaffMiddleware = (req, res, next) => {
  if (
    !req.user ||
    !req.user.roles.some((role) =>
      ["ADMIN", "PRACTICE_ADMIN", "DOCTOR", "RECEPTIONIST", "STAFF"].includes(
        role.name
      )
    )
  ) {
    return errorResponse(res, "Forbidden - Staff access required", 403);
  }
  next();
};

/**
 * Middleware to check if user is a doctor
 */
exports.doctorMiddleware = (req, res, next) => {
  if (!req.user || !req.user.doctor) {
    return errorResponse(res, "Forbidden - Doctor access required", 403);
  }
  next();
};

/**
 * Middleware to check if user is a patient
 */
exports.patientMiddleware = (req, res, next) => {
  if (!req.user || !req.user.patient) {
    return errorResponse(res, "Forbidden - Patient access required", 403);
  }
  next();
};
