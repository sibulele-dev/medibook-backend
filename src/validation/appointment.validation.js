const Joi = require('joi');

const AppointmentValidation = {
  validateCreateAppointment(data) {
    const schema = Joi.object({
      patientName: Joi.string().min(2).max(100).required(),
      patientEmail: Joi.string().email().optional(),
      patientPhone: Joi.string().min(6).max(30).required(),
      doctorId: Joi.string().required(),
      practiceId: Joi.string().optional(),
      date: Joi.string().required(),
      time: Joi.string().required(),
      note: Joi.string().max(1000).allow('').optional(),
    });
    return schema.validate(data, { abortEarly: false, stripUnknown: true });
  },
  validateDoctorIdParam(data) {
    const schema = Joi.object({ doctorId: Joi.string().required() });
    return schema.validate(data, { abortEarly: false, stripUnknown: true });
  },
};

module.exports = { AppointmentValidation };


