const { UserValidation } = require('../validation/user.validation');
const { ContactValidation } = require('../validation/contact.validation');
const { DoctorValidation } = require('../validation/doctor.validation');
const { PracticeValidation } = require('../validation/practice.validation');
const { PaymentValidation } = require('../validation/payment.validation');

/**
 * Generic validation middleware factory
 * @param {Function} validationFunction - Joi validation function
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const createValidationMiddleware = (validationFunction, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const validationResult = validationFunction(dataToValidate);
      
      if (UserValidation.hasValidationError(validationResult)) {
        const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
        return res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessage}`,
          errors: validationResult.error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        });
      }

      // Replace original data with validated/sanitized data
      req[source] = UserValidation.getValidatedData(validationResult);
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};

// Specific validation middleware functions
const validateUserRegistration = createValidationMiddleware(
  UserValidation.validateUserRegistration,
  'body'
);

const validateAdminRegistration = createValidationMiddleware(
  UserValidation.validateAdminRegistration,
  'body'
);

const validateAdminMemberRegistration = createValidationMiddleware(
  UserValidation.validateAdminMemberRegistration,
  'body'
);

const validateDoctorRegistration = createValidationMiddleware(
  UserValidation.validateDoctorRegistration,
  'body'
);

const validateLogin = createValidationMiddleware(
  UserValidation.validateLogin,
  'body'
);

const validateProfileUpdate = createValidationMiddleware(
  UserValidation.validateProfileUpdate,
  'body'
);

const validatePasswordChange = createValidationMiddleware(
  UserValidation.validatePasswordChange,
  'body'
);

const validateInitialPassword = createValidationMiddleware(
  UserValidation.validateInitialPassword,
  'body'
);

const validateEmailVerification = createValidationMiddleware(
  UserValidation.validateEmailVerification,
  'body'
);

const validateResendVerification = createValidationMiddleware(
  UserValidation.validateResendVerification,
  'body'
);

const validateRefreshToken = createValidationMiddleware(
  UserValidation.validateRefreshToken,
  'body'
);

const validateGetAllUsersQuery = createValidationMiddleware(
  UserValidation.validateGetAllUsersQuery,
  'query'
);

const validateUserIdParam = createValidationMiddleware(
  UserValidation.validateUserIdParam,
  'params'
);

const validateDeleteUser = createValidationMiddleware(
  UserValidation.validateDeleteUser,
  'body'
);

const validateCheckEmailRegistration = createValidationMiddleware(
  UserValidation.validateCheckEmailRegistration,
  'query'
);

const validatePasswordRequirements = createValidationMiddleware(
  UserValidation.validatePasswordRequirements,
  'query'
);

const validateLogout = createValidationMiddleware(
  UserValidation.validateLogout,
  'body'
);

const validateContactForm = createValidationMiddleware(
  ContactValidation.validateContactForm,
  'body'
);

const validateRegisterDoctor = createValidationMiddleware(
  DoctorValidation.validateRegisterDoctor,
  'body'
);

const validateUpdateDoctor = createValidationMiddleware(
  DoctorValidation.validateUpdateDoctor,
  'body'
);

const validateDoctorId = createValidationMiddleware(
  DoctorValidation.validateDoctorId,
  'params'
);

const validateGetAllDoctors = createValidationMiddleware(
  DoctorValidation.validateGetAllDoctors,
  'query'
);

const validateCreatePractice = createValidationMiddleware(
  PracticeValidation.validateCreatePractice,
  'body'
);

const validateUpdatePractice = createValidationMiddleware(
  PracticeValidation.validateUpdatePractice,
  'body'
);

const validatePracticeId = createValidationMiddleware(
  PracticeValidation.validatePracticeId,
  'params'
);

const validateGetAllPractices = createValidationMiddleware(
  PracticeValidation.validateGetAllPractices,
  'query'
);

const validateInitiatePayment = createValidationMiddleware(
  PaymentValidation.validateInitiatePayment,
  'body'
);

// Combined validation middleware for routes that need multiple validations
const validateUserIdAndBody = (bodyValidator) => {
  return [
    validateUserIdParam,
    createValidationMiddleware(bodyValidator, 'body')
  ];
};

// Validation middleware with conditional password requirement
const validateDoctorRegistrationConditional = (req, res, next) => {
  try {
    // For admin-created doctors, password is optional
    // For self-registration, password is required
    const isAdminCreated = req.user && req.user.role === 'admin';
    
    let validationResult;
    if (isAdminCreated) {
      // Use doctor registration schema without password requirement
      const { password, confirmPassword, ...dataWithoutPassword } = req.body;
      validationResult = UserValidation.validateDoctorRegistration(dataWithoutPassword);
    } else {
      // Use full doctor registration schema with password requirement
      validationResult = UserValidation.validateDoctorRegistration({
        ...req.body,
        password: req.body.password || undefined // Ensure password validation is triggered
      });
    }
    
    if (UserValidation.hasValidationError(validationResult)) {
      const errorMessage = UserValidation.formatValidationErrors(validationResult.error);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errorMessage}`,
        errors: validationResult.error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    req.body = UserValidation.getValidatedData(validationResult);
    next();
  } catch (error) {
    console.error('Conditional validation middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal validation error'
    });
  }
};

// Error handling middleware for validation errors
const handleValidationError = (error, req, res, next) => {
  if (error.isJoi) {
    const errorMessage = UserValidation.formatValidationErrors(error);
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${errorMessage}`,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
    });
  }
  next(error);
};

module.exports = {
  // Generic middleware factory
  createValidationMiddleware,
  
  // Specific validation middleware
  validateUserRegistration,
  validateAdminRegistration,
  validateAdminMemberRegistration,
  validateDoctorRegistration,
  validateDoctorRegistrationConditional,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateInitialPassword,
  validateEmailVerification,
  validateResendVerification,
  validateRefreshToken,
  validateGetAllUsersQuery,
  validateUserIdParam,
  validateDeleteUser,
  validateCheckEmailRegistration,
  validatePasswordRequirements,
  validateLogout,
  validateContactForm,
  validateRegisterDoctor,
  validateUpdateDoctor,
  validateDoctorId,
  validateGetAllDoctors,
  validateCreatePractice,
  validateUpdatePractice,
  validatePracticeId,
  validateGetAllPractices,
  validateInitiatePayment,
  
  // Combined validation middleware
  validateUserIdAndBody,
  
  // Error handling
  handleValidationError,
  
  // Helper functions for manual validation in controllers
  UserValidation
};