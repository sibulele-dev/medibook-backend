const Joi = require('joi');

// Custom validation messages
const customMessages = {
  'string.email': 'Please provide a valid email address',
  'string.min': '{#label} must be at least {#limit} characters long',
  'string.max': '{#label} must not exceed {#limit} characters',
  'any.required': '{#label} is required',
  'string.empty': '{#label} cannot be empty',
  'number.base': '{#label} must be a number',
  'number.integer': '{#label} must be an integer',
  'number.min': '{#label} must be at least {#limit}',
  'number.max': '{#label} must not exceed {#limit}',
  'array.base': '{#label} must be an array',
  'boolean.base': '{#label} must be a boolean',
};

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

// Phone number validation schema
const phoneSchema = Joi.string()
  .pattern(/^[\+]?[1-9][\d]{0,15}$/)
  .messages({
    'string.pattern.base': 'Phone number must be a valid international format'
  })
  .required();

const doctorSchema = {
    email: emailSchema,
    firstName: nameSchema.label('First name'),
    lastName: nameSchema.label('Last name'),
    specialty: Joi.string().trim().min(2).max(100).required().label('Specialty'),
    phoneNumber: phoneSchema.label('Phone number'),
    practiceId: Joi.string().trim().max(50).optional().allow(null, '').label('Practice ID'),
    bio: Joi.string().trim().max(1000).optional().allow(null, '').label('Bio'),
    qualifications: Joi.array().items(Joi.string().trim().max(100)).optional().label('Qualifications'),
    hpcsa: Joi.string().trim().max(50).optional().allow(null, '').label('HPCSA Number'),
    experience: Joi.number().integer().min(0).max(60).optional().allow(null).label('Experience'),
    languages: Joi.array().items(Joi.string().trim().max(50)).optional().label('Languages'),
    telehealth: Joi.boolean().optional().label('Telehealth'),
};

// Doctor registration validation schema
const registerDoctorSchema = Joi.object(doctorSchema).messages(customMessages);

// Doctor update validation schema
const updateDoctorSchema = Joi.object({
    ...Object.keys(doctorSchema).reduce((acc, key) => {
        acc[key] = doctorSchema[key].optional();
        return acc;
    }, {}),
}).messages(customMessages);

// Doctor ID parameter validation schema
const doctorIdSchema = Joi.object({
  id: Joi.string()
    .trim()
    .min(20)
    .max(30)
    .required()
    .label('Doctor ID')
    .messages(customMessages),
}).messages(customMessages);

// Get all doctors query validation schema
const getAllDoctorsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().min(1).max(100).optional(),
  specialty: Joi.string().trim().min(2).max(100).optional(),
  telehealth: Joi.boolean().optional(),
}).messages(customMessages);

// Validation helper class
class DoctorValidation {
  static validateRegisterDoctor(data) {
    return registerDoctorSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  static validateUpdateDoctor(data) {
    return updateDoctorSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  static validateDoctorId(data) {
    return doctorIdSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  static validateGetAllDoctors(data) {
    return getAllDoctorsSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  static formatValidationErrors(error) {
    if (!error.details) return 'Validation failed';
    return error.details.map(detail => detail.message).join(', ');
  }

  static hasValidationError(validationResult) {
    return validationResult.error !== undefined;
  }

  static getValidatedData(validationResult) {
    return validationResult.value;
  }
}

module.exports = {
  registerDoctorSchema,
  updateDoctorSchema,
  doctorIdSchema,
  getAllDoctorsSchema,
  DoctorValidation,
  customMessages
};
