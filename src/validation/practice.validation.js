const Joi = require('joi');

// Custom validation messages
const customMessages = {
  'string.email': 'Please provide a valid email address',
  'string.min': '{#label} must be at least {#limit} characters long',
  'string.max': '{#label} must not exceed {#limit} characters',
  'any.required': '{#label} is required',
  'string.empty': '{#label} cannot be empty',
  'string.uri': '{#label} must be a valid URL',
};

const practiceSchema = {
  name: Joi.string().trim().min(2).max(100).required().label('Practice Name'),
  address: Joi.string().trim().min(5).max(255).required().label('Address'),
  city: Joi.string().trim().min(2).max(100).required().label('City'),
  state: Joi.string().trim().min(2).max(100).required().label('State'),
  zip: Joi.string().trim().min(2).max(20).required().label('Zip Code'),
  country: Joi.string().trim().min(2).max(100).required().label('Country'),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .required()
    .label('Phone Number'),
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .lowercase()
    .trim()
    .max(255)
    .required()
    .label('Email'),
  website: Joi.string().uri().optional().allow(null, '').label('Website'),
  specialization: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional()
    .label('Specialization'),
  status: Joi.string().valid('active', 'inactive', 'pending').default('pending').label('Status'),
};

// Create practice validation schema
const createPracticeSchema = Joi.object(practiceSchema).messages(customMessages);

// Update practice validation schema
const updatePracticeSchema = Joi.object({
  ...Object.keys(practiceSchema).reduce((acc, key) => {
    acc[key] = practiceSchema[key].optional();
    return acc;
  }, {}),
}).messages(customMessages);

// Practice ID parameter validation schema
const practiceIdSchema = Joi.object({
  id: Joi.string().trim().min(20).max(30).required().label('Practice ID').messages(customMessages),
}).messages(customMessages);

// Get all practices query validation schema
const getAllPracticesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(1000).default(10).optional(),
  search: Joi.string().trim().max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'pending').optional(),
  specialization: Joi.string().trim().min(2).max(100).optional(),
}).messages(customMessages);

// Validation helper class
class PracticeValidation {
  static validateCreatePractice(data) {
    return createPracticeSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });
  }

  static validateUpdatePractice(data) {
    return updatePracticeSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });
  }

  static validatePracticeId(data) {
    return practiceIdSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });
  }

  static validateGetAllPractices(data) {
    return getAllPracticesSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });
  }

  static formatValidationErrors(error) {
    if (!error.details) return 'Validation failed';
    return error.details.map((detail) => detail.message).join(', ');
  }

  static hasValidationError(validationResult) {
    return validationResult.error !== undefined;
  }

  static getValidatedData(validationResult) {
    return validationResult.value;
  }
}

module.exports = {
  createPracticeSchema,
  updatePracticeSchema,
  practiceIdSchema,
  getAllPracticesSchema,
  PracticeValidation,
  customMessages,
};
