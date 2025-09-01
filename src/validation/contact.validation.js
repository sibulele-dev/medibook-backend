const Joi = require('joi');

// Custom validation messages
const customMessages = {
  'string.email': 'Please provide a valid email address',
  'string.min': '{#label} must be at least {#limit} characters long',
  'string.max': '{#label} must not exceed {#limit} characters',
  'any.required': '{#label} is required',
  'string.empty': '{#label} cannot be empty',
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

// Contact form validation schema
const contactFormSchema = Joi.object({
  firstName: nameSchema.label('First name'),
  lastName: nameSchema.label('Last name'),
  email: emailSchema,
  message: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .label('Message')
    .messages(customMessages),
}).messages(customMessages);

// Validation helper class
class ContactValidation {
  /**
   * Validate contact form data
   */
  static validateContactForm(data) {
    return contactFormSchema.validate(data, { 
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
  contactFormSchema,
  ContactValidation,
  customMessages
};
