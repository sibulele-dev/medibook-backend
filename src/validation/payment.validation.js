const Joi = require('joi');

// Custom validation messages
const customMessages = {
  'number.base': '{#label} must be a number',
  'number.positive': '{#label} must be a positive number',
  'any.required': '{#label} is required',
  'string.empty': '{#label} cannot be empty',
  'string.min': '{#label} must be at least {#limit} characters long',
  'string.max': '{#label} must not exceed {#limit} characters',
};

// Schema for initiating a payment
const initiatePaymentSchema = Joi.object({
  amount: Joi.number().positive().required().label('Amount'),
  itemName: Joi.string().trim().min(3).max(100).required().label('Item Name'),
  itemDescription: Joi.string().trim().min(3).max(255).optional().label('Item Description'),
}).messages(customMessages);

// Schema for the PayFast ITN callback
const notifyPaymentSchema = Joi.object({
    m_payment_id: Joi.string().optional(),
    pf_payment_id: Joi.string().required(),
    payment_status: Joi.string().required(),
    item_name: Joi.string().required(),
    item_description: Joi.string().optional().allow(''),
    amount_gross: Joi.string().required(),
    amount_fee: Joi.string().required(),
    amount_net: Joi.string().required(),
    custom_str1: Joi.string().optional().allow(''),
    custom_str2: Joi.string().optional().allow(''),
    custom_str3: Joi.string().optional().allow(''),
    custom_str4: Joi.string().optional().allow(''),
    custom_str5: Joi.string().optional().allow(''),
    name_first: Joi.string().optional().allow(''),
    name_last: Joi.string().optional().allow(''),
    email_address: Joi.string().email().optional().allow(''),
    merchant_id: Joi.string().required(),
    signature: Joi.string().required(),
}).unknown(true); // Allow unknown fields from PayFast

// Validation helper class
class PaymentValidation {
  static validateInitiatePayment(data) {
    return initiatePaymentSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });
  }

  static validateNotifyPayment(data) {
    return notifyPaymentSchema.validate(data, { 
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
  initiatePaymentSchema,
  notifyPaymentSchema,
  PaymentValidation,
  customMessages
};
