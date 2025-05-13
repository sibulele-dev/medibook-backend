const { prisma } = require("../../config/database");
const { errorResponse } = require("../../utils/response");

/**
 * Middleware to check if user has access to a specific practice
 * Verifies that the user is either:
 * 1. A system admin
 * 2. A staff member of the practice
 * 3. A doctor at the practice
 *
 * Practice ID can be provided in:
 * - req.params.practiceId
 * - req.body.practiceId
 * - req.query.practiceId
 */
exports.practiceAccessMiddleware = async (req, res, next) => {
  try {
    // Get practice ID from request
    const practiceId =
      req.params.practiceId || req.body.practiceId || req.query.practiceId;

    if (!practiceId) {
      return errorResponse(res, "Practice ID is required", 400);
    }

    // If user is admin, allow access
    if (req.user.roles.some((role) => role.name === "ADMIN")) {
      return next();
    }

    // Check if user is associated with the practice
    const hasAccess = await checkPracticeAccess(req.user.id, practiceId);

    if (!hasAccess) {
      return errorResponse(res, "Forbidden - No access to this practice", 403);
    }

    // Add practice ID to request for easy access
    req.practiceId = practiceId;
    next();
  } catch (error) {
    return errorResponse(res, "Error checking practice access", 500);
  }
};

/**
 * Check if a user has access to a specific practice
 * @param {string} userId - The user ID
 * @param {string} practiceId - The practice ID
 * @returns {boolean} - True if user has access, false otherwise
 */
async function checkPracticeAccess(userId, practiceId) {
  // Check if user is a staff member of the practice
  const staffMember = await prisma.staffMember.findFirst({
    where: {
      userId,
      practiceId,
    },
  });

  if (staffMember) {
    return true;
  }

  // Check if user is a doctor at the practice
  const doctor = await prisma.doctor.findFirst({
    where: {
      userId,
      practiceId,
    },
  });

  if (doctor) {
    return true;
  }

  return false;
}

/**
 * Middleware to check if a patient belongs to a practice
 */
exports.patientPracticeAccessMiddleware = async (req, res, next) => {
  try {
    const patientId = req.params.patientId || req.body.patientId;
    const practiceId =
      req.params.practiceId || req.body.practiceId || req.query.practiceId;

    if (!patientId || !practiceId) {
      return errorResponse(res, "Patient ID and Practice ID are required", 400);
    }

    // Check if patient belongs to practice
    const patientPractice = await prisma.patientPractice.findFirst({
      where: {
        patientId,
        practiceId,
      },
    });

    if (!patientPractice) {
      return errorResponse(
        res,
        "Forbidden - Patient does not belong to this practice",
        403
      );
    }

    next();
  } catch (error) {
    return errorResponse(res, "Error checking patient practice access", 500);
  }
};

/**
 * Middleware to check if a doctor belongs to a practice
 */
exports.doctorPracticeAccessMiddleware = async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId || req.body.doctorId;
    const practiceId =
      req.params.practiceId || req.body.practiceId || req.query.practiceId;

    if (!doctorId || !practiceId) {
      return errorResponse(res, "Doctor ID and Practice ID are required", 400);
    }

    // Check if doctor belongs to practice
    const doctor = await prisma.doctor.findFirst({
      where: {
        id: doctorId,
        practiceId,
      },
    });

    if (!doctor) {
      return errorResponse(
        res,
        "Forbidden - Doctor does not belong to this practice",
        403
      );
    }

    next();
  } catch (error) {
    return errorResponse(res, "Error checking doctor practice access", 500);
  }
};
