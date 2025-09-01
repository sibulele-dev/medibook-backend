const Joi = require('joi');

// Custom validation messages
const customMessages = {
  'string.email': 'Please provide a valid email address',
  'string.min': '{#label} must be at least {#limit} characters long',
  'string.max': '{#label} must not exceed {#limit} characters',
  'string.pattern.base': '{#label} format is invalid',
  'any.required': '{#label} is required',
  'string.empty': '{#label} cannot be empty',
  'boolean.base': '{#label} must be a boolean value'
};

// Password validation schema with comprehensive rules
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .messages({
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character (@$!%*?&)',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters'
  })
  .required();

// Email validation schema
const emailSchema = Joi.string()
  .email({ 
    minDomainSegments: 2, 
    tlds: { allow: true } 
  })
  .lowercase()
  .trim()
  .max(255)
  .required()
  .messages(customMessages);

// Name validation schema
const nameSchema = Joi.string()
  .trim()
  .min(2)
  .max(50)
  .pattern(/^[a-zA-Z\s'-]+$/)
  .messages({
    'string.pattern.base': '{#label} can only contain letters, spaces, hyphens, and apostrophes'
  })
  .required();

// Phone number validation schema
const phoneSchema = Joi.string()
  .pattern(/^[\+]?[1-9][\d]{0,15}$/)
  .messages({
    'string.pattern.base': 'Phone number must be a valid international format'
  })
  .optional();

// Pagination validation schema
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
};

// Search and filter validation schema
const searchFilterSchema = {
  search: Joi.string().trim().min(1).max(100).optional(),
  role: Joi.string().valid('admin', 'doctor').optional(),
  isActive: Joi.boolean().optional()
};

// User registration validation schemas
const userRegistrationSchema = Joi.object({
  email: emailSchema,
  firstName: nameSchema.label('First name'),
  lastName: nameSchema.label('Last name'),
  password: passwordSchema,
  phoneNumber: phoneSchema.label('Phone number'),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .messages({
      'any.only': 'Confirm password must match password'
    })
    .optional()
}).messages(customMessages);

// Admin registration validation schema
const adminRegistrationSchema = Joi.object({
  email: emailSchema,
  firstName: nameSchema.label('First name'),
  lastName: nameSchema.label('Last name'),
  password: passwordSchema,
  phoneNumber: phoneSchema.label('Phone number'),
  department: Joi.string()
    .valid('super_admin', 'onboarding', 'sales', 'support', 'billing_accounts', 'compliance')
    .optional(),
  permissions: Joi.array()
    .items(Joi.string())
    .optional(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .messages({
      'any.only': 'Confirm password must match password'
    })
    .optional()
}).messages(customMessages);

// Admin member registration schema (without password)
const adminMemberRegistrationSchema = Joi.object({
  email: emailSchema,
  firstName: nameSchema.label('First name'),
  lastName: nameSchema.label('Last name'),
  phoneNumber: phoneSchema.label('Phone number'),
  department: Joi.string()
    .valid('super_admin', 'onboarding', 'sales', 'support', 'billing_accounts', 'compliance')
    .optional(),
  permissions: Joi.array()
    .items(Joi.string())
    .optional(),
  role: Joi.string()
    .valid('admin')
    .default('admin')
}).messages(customMessages);

// Doctor registration validation schema
const doctorRegistrationSchema = Joi.object({
  email: emailSchema,
  firstName: nameSchema.label('First name'),
  lastName: nameSchema.label('Last name'),
  password: passwordSchema.optional(), // Optional for admin-created doctors
  phoneNumber: phoneSchema.label('Phone number'),
  specialization: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .default('General Practice')
    .optional(),
  practiceId: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow(null),
  licenseNumber: Joi.string()
    .trim()
    .min(5)
    .max(50)
    .optional(),
  experience: Joi.number()
    .integer()
    .min(0)
    .max(60)
    .optional()
    .allow(null),
  bio: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow(null),
  confirmPassword: Joi.when('password', {
    is: Joi.exist(),
    then: Joi.string()
      .valid(Joi.ref('password'))
      .messages({
        'any.only': 'Confirm password must match password'
      }),
    otherwise: Joi.optional()
  })
}).messages(customMessages);

// Login validation schema
const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
}).messages(customMessages);

// Profile update validation schema
const profileUpdateSchema = Joi.object({
  firstName: nameSchema.label('First name').optional(),
  lastName: nameSchema.label('Last name').optional(),
  phoneNumber: phoneSchema.label('Phone number'),
  address: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow(null, ''),
  city: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(null, ''),
  state: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(null, ''),
  zip: Joi.string()
    .trim()
    .max(20)
    .optional()
    .allow(null, ''),
  country: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(null, ''),
  profilePicture: Joi.string()
    .uri()
    .optional()
    .allow(null, ''),
  emailVerified: Joi.boolean()
    .optional()
}).messages(customMessages);

// Password change validation schema
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: passwordSchema.label('New password'),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Confirm new password must match new password',
      'any.required': 'Confirm new password is required'
    })
}).messages(customMessages);

// Initial password set validation schema
const initialPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required'
    }),
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Confirm password must match password',
      'any.required': 'Confirm password is required'
    })
}).messages(customMessages);

// Email verification schema
const emailVerificationSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required'
    })
}).messages(customMessages);

// Resend verification email schema
const resendVerificationSchema = Joi.object({
  email: emailSchema
}).messages(customMessages);

// Refresh token schema
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
}).messages(customMessages);

// Get all users query validation schema
const getAllUsersQuerySchema = Joi.object({
  ...paginationSchema,
  ...searchFilterSchema
}).messages(customMessages);

// User ID parameter validation schema
const userIdParamSchema = Joi.object({
  id: Joi.string()
    .trim()
    .min(20) // Assuming nanoid(25) generates 25 character IDs
    .max(30)
    .required()
    .messages({
      'any.required': 'User ID is required'
    })
}).messages(customMessages);

// Delete user schema
const deleteUserSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .max(500)
    .optional()
}).messages(customMessages);

// Check email registration schema
const checkEmailRegistrationSchema = Joi.object({
  email: emailSchema
}).messages(customMessages);

// Password requirements schema
const passwordRequirementsSchema = Joi.object({}).messages(customMessages);

// Logout schema
const logoutSchema = Joi.object({}).messages(customMessages);

// Validation helper functions
class UserValidation {
  /**
   * Validate user registration data
   */
  static validateUserRegistration(data) {
    return userRegistrationSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate admin registration data
   */
  static validateAdminRegistration(data) {
    return adminRegistrationSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate admin member registration data (without password)
   */
  static validateAdminMemberRegistration(data) {
    return adminMemberRegistrationSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate doctor registration data
   */
  static validateDoctorRegistration(data) {
    return doctorRegistrationSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate login data
   */
  static validateLogin(data) {
    return loginSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate profile update data
   */
  static validateProfileUpdate(data) {
    return profileUpdateSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate password change data
   */
  static validatePasswordChange(data) {
    return passwordChangeSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate initial password set data
   */
  static validateInitialPassword(data) {
    return initialPasswordSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate email verification data
   */
  static validateEmailVerification(data) {
    return emailVerificationSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate resend verification email data
   */
  static validateResendVerification(data) {
    return resendVerificationSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate refresh token data
   */
  static validateRefreshToken(data) {
    return refreshTokenSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate get all users query parameters
   */
  static validateGetAllUsersQuery(data) {
    return getAllUsersQuerySchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate user ID parameter
   */
  static validateUserIdParam(data) {
    return userIdParamSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate delete user data
   */
  static validateDeleteUser(data) {
    return deleteUserSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate check email registration query
   */
  static validateCheckEmailRegistration(data) {
    return checkEmailRegistrationSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  /**
   * Validate password requirements
   */
  static validatePasswordRequirements(data) {
    return passwordRequirementsSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
  }

  /**
   * Validate logout
   */
  static validateLogout(data) {
    return logoutSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
  }

  /**
   * Format validation errors for API response
   */
  static formatValidationErrors(error) {
    if (!error.details) return 'Validation failed';
    
    return error.details.map(detail => detail.message).join(', ');
  }

  /**
   * Check if validation error exists
   */
  static hasValidationError(validationResult) {
    return validationResult.error !== undefined;
  }

  /**
   * Get validated data from validation result
   */
  static getValidatedData(validationResult) {
    return validationResult.value;
  }
}

// Export validation schemas and helper class
module.exports = {
  // Schemas
  userRegistrationSchema,
  adminRegistrationSchema,
  adminMemberRegistrationSchema,
  doctorRegistrationSchema,
  loginSchema,
  profileUpdateSchema,
  passwordChangeSchema,
  initialPasswordSchema,
  emailVerificationSchema,
  resendVerificationSchema,
  refreshTokenSchema,
  getAllUsersQuerySchema,
  userIdParamSchema,
  deleteUserSchema,
  checkEmailRegistrationSchema,
  passwordRequirementsSchema,
  logoutSchema,
  
  // Individual field schemas for reuse
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  
  // Helper class
  UserValidation,
  
  // Custom messages
  customMessages
};