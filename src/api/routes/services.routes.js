const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/service.controller");
const {
  authMiddleware,
  practiceAdminMiddleware,
} = require("../middleware/auth.middleware");
const {
  practiceAccessMiddleware,
} = require("../middleware/practiceAccess.middleware");
const {
  validateServiceCreate,
  validateServiceUpdate,
} = require("../middleware/validation.middleware");

/**
 * @route GET /api/services
 * @desc Get services (filtered by practice)
 * @access Public
 */
router.get("/", serviceController.getServices);

/**
 * @route GET /api/services/:serviceId
 * @desc Get service details
 * @access Public
 */
router.get("/:serviceId", serviceController.getServiceById);

/**
 * @route POST /api/services
 * @desc Create a new service
 * @access Private (practice admin)
 */
router.post(
  "/",
  [
    authMiddleware,
    practiceAccessMiddleware,
    practiceAdminMiddleware,
    validateServiceCreate,
  ],
  serviceController.createService
);

/**
 * @route PUT /api/services/:serviceId
 * @desc Update service details
 * @access Private (practice admin)
 */
router.put(
  "/:serviceId",
  [
    authMiddleware,
    practiceAccessMiddleware,
    practiceAdminMiddleware,
    validateServiceUpdate,
  ],
  serviceController.updateService
);

/**
 * @route DELETE /api/services/:serviceId
 * @desc Delete a service
 * @access Private (practice admin)
 */
router.delete(
  "/:serviceId",
  [authMiddleware, practiceAccessMiddleware, practiceAdminMiddleware],
  serviceController.deleteService
);

/**
 * @route GET /api/services/categories
 * @desc Get service categories
 * @access Public
 */
router.get("/categories", serviceController.getServiceCategories);

/**
 * @route GET /api/services/popular
 * @desc Get popular services
 * @access Public
 */
router.get("/popular", serviceController.getPopularServices);

/**
 * @route PUT /api/services/:serviceId/doctor/:doctorId
 * @desc Assign service to doctor
 * @access Private (practice admin)
 */
router.put(
  "/:serviceId/doctor/:doctorId",
  [authMiddleware, practiceAccessMiddleware, practiceAdminMiddleware],
  serviceController.assignServiceToDoctor
);

/**
 * @route DELETE /api/services/:serviceId/doctor/:doctorId
 * @desc Remove service from doctor
 * @access Private (practice admin)
 */
router.delete(
  "/:serviceId/doctor/:doctorId",
  [authMiddleware, practiceAccessMiddleware, practiceAdminMiddleware],
  serviceController.removeServiceFromDoctor
);

module.exports = router;
