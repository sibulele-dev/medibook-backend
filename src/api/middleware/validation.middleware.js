const { body, validationResult, param, query } = require("express-validator");
const { errorResponse } = require("../../utils/response");

/**
 * Middleware to validate request data
 * @param {Array} validations - Array of validation rules
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation error", 400, errors.array());
    }

    next();
  };
};

/**
 * Login validation rules
 */
exports.validateLogin = validate([
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
]);

/**
 * Registration validation rules
 */
exports.validateRegister = validate([
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("role")
    .optional()
    .isIn(["PATIENT", "DOCTOR", "STAFF", "PRACTICE_ADMIN", "ADMIN"])
    .withMessage("Invalid role"),
]);

/**
 * Password reset validation rules
 */
exports.validatePasswordReset = validate([
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
]);

/**
 * User update validation rules
 */
exports.validateUserUpdate = validate([
  body("firstName")
    .optional()
    .notEmpty()
    .withMessage("First name cannot be empty"),
  body("lastName")
    .optional()
    .notEmpty()
    .withMessage("Last name cannot be empty"),
  body("email").optional().isEmail().withMessage("Please enter a valid email"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please enter a valid phone number"),
]);

/**
 * Practice create validation rules
 */
exports.validatePracticeCreate = validate([
  body("name").notEmpty().withMessage("Practice name is required"),
  body("address").notEmpty().withMessage("Address is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("state").notEmpty().withMessage("State is required"),
  body("zip").notEmpty().withMessage("ZIP code is required"),
  body("phone")
    .isMobilePhone()
    .withMessage("Please enter a valid phone number"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("specialties")
    .optional()
    .isArray()
    .withMessage("Specialties must be an array"),
  body("adminEmail").isEmail().withMessage("Admin email is required"),
]);

/**
 * Practice update validation rules
 */
exports.validatePracticeUpdate = validate([
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Practice name cannot be empty"),
  body("address").optional().notEmpty().withMessage("Address cannot be empty"),
  body("city").optional().notEmpty().withMessage("City cannot be empty"),
  body("state").optional().notEmpty().withMessage("State cannot be empty"),
  body("zip").optional().notEmpty().withMessage("ZIP code cannot be empty"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please enter a valid phone number"),
  body("email").optional().isEmail().withMessage("Please enter a valid email"),
]);

/**
 * Doctor create validation rules
 */
exports.validateDoctorCreate = validate([
  body("userId").optional(),
  body("practiceId").notEmpty().withMessage("Practice ID is required"),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("phone")
    .isMobilePhone()
    .withMessage("Please enter a valid phone number"),
  body("specialties").isArray().withMessage("Specialties must be an array"),
  body("bio").optional().isString().withMessage("Bio must be a string"),
  body("languages")
    .optional()
    .isArray()
    .withMessage("Languages must be an array"),
  body("education")
    .optional()
    .isArray()
    .withMessage("Education must be an array"),
  body("services")
    .optional()
    .isArray()
    .withMessage("Services must be an array"),
]);

/**
 * Doctor update validation rules
 */
exports.validateDoctorUpdate = validate([
  body("firstName")
    .optional()
    .notEmpty()
    .withMessage("First name cannot be empty"),
  body("lastName")
    .optional()
    .notEmpty()
    .withMessage("Last name cannot be empty"),
  body("email").optional().isEmail().withMessage("Please enter a valid email"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please enter a valid phone number"),
  body("specialties")
    .optional()
    .isArray()
    .withMessage("Specialties must be an array"),
  body("bio").optional().isString().withMessage("Bio must be a string"),
  body("languages")
    .optional()
    .isArray()
    .withMessage("Languages must be an array"),
  body("education")
    .optional()
    .isArray()
    .withMessage("Education must be an array"),
]);

/**
 * Patient create validation rules
 */
exports.validatePatientCreate = validate([
  body("userId").optional(),
  body("firstName").notEmpty().withMessage("First name is required"),
  body("lastName").notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("phone")
    .isMobilePhone()
    .withMessage("Please enter a valid phone number"),
  body("dateOfBirth")
    .isDate()
    .withMessage("Please provide a valid date of birth"),
  body("gender")
    .optional()
    .isIn(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
    .withMessage("Invalid gender"),
  body("address").optional().isString().withMessage("Address must be a string"),
  body("city").optional().isString().withMessage("City must be a string"),
  body("state").optional().isString().withMessage("State must be a string"),
  body("zip").optional().isString().withMessage("ZIP code must be a string"),
  body("emergencyContact")
    .optional()
    .isObject()
    .withMessage("Emergency contact must be an object"),
  body("emergencyContact.name")
    .optional()
    .isString()
    .withMessage("Emergency contact name must be a string"),
  body("emergencyContact.phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please enter a valid emergency contact phone"),
  body("emergencyContact.relationship")
    .optional()
    .isString()
    .withMessage("Emergency contact relationship must be a string"),
]);

/**
 * Patient update validation rules
 */
exports.validatePatientUpdate = validate([
  body("firstName")
    .optional()
    .notEmpty()
    .withMessage("First name cannot be empty"),
  body("lastName")
    .optional()
    .notEmpty()
    .withMessage("Last name cannot be empty"),
  body("email").optional().isEmail().withMessage("Please enter a valid email"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please enter a valid phone number"),
  body("dateOfBirth")
    .optional()
    .isDate()
    .withMessage("Please provide a valid date of birth"),
  body("gender")
    .optional()
    .isIn(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
    .withMessage("Invalid gender"),
]);

/**
 * Appointment create validation rules
 */
exports.validateAppointmentCreate = validate([
  body("patientId").notEmpty().withMessage("Patient ID is required"),
  body("doctorId").notEmpty().withMessage("Doctor ID is required"),
  body("practiceId").notEmpty().withMessage("Practice ID is required"),
  body("serviceId").notEmpty().withMessage("Service ID is required"),
  body("startTime")
    .notEmpty()
    .isISO8601()
    .withMessage("Valid start time is required"),
  body("endTime")
    .notEmpty()
    .isISO8601()
    .withMessage("Valid end time is required"),
  body("status")
    .optional()
    .isIn(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .withMessage("Invalid appointment status"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
]);

/**
 * Appointment update validation rules
 */
exports.validateAppointmentUpdate = validate([
  body("startTime")
    .optional()
    .isISO8601()
    .withMessage("Valid start time is required"),
  body("endTime")
    .optional()
    .isISO8601()
    .withMessage("Valid end time is required"),
  body("status")
    .optional()
    .isIn(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .withMessage("Invalid appointment status"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
]);

/**
 * Schedule create validation rules
 */
exports.validateScheduleCreate = validate([
  body("doctorId").notEmpty().withMessage("Doctor ID is required"),
  body("practiceId").notEmpty().withMessage("Practice ID is required"),
  body("dayOfWeek")
    .isInt({ min: 0, max: 6 })
    .withMessage("Day of week must be between 0 (Sunday) and 6 (Saturday)"),
  body("startTime")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Start time should be in HH:MM format"),
  body("endTime")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("End time should be in HH:MM format"),
  body("isAvailable").isBoolean().withMessage("isAvailable must be a boolean"),
]);

/**
 * Schedule update validation rules
 */
exports.validateScheduleUpdate = validate([
  body("startTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("Start time should be in HH:MM format"),
  body("endTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("End time should be in HH:MM format"),
  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be a boolean"),
]);

/**
 * Service create validation rules
 */
exports.validateServiceCreate = validate([
  body("practiceId").notEmpty().withMessage("Practice ID is required"),
  body("name").notEmpty().withMessage("Service name is required"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("duration")
    .isInt({ min: 5 })
    .withMessage("Duration must be at least 5 minutes"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  body("color")
    .optional()
    .isHexColor()
    .withMessage("Color must be a valid hex color"),
]);

/**
 * Service update validation rules
 */
exports.validateServiceUpdate = validate([
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Service name cannot be empty"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("duration")
    .optional()
    .isInt({ min: 5 })
    .withMessage("Duration must be at least 5 minutes"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  body("color")
    .optional()
    .isHexColor()
    .withMessage("Color must be a valid hex color"),
]);
