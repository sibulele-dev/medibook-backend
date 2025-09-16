const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointment.controller");
const { validateCreateAppointment, validateAppointmentDoctorParam } = require("../middleware/validation.middleware");

router.get('/', appointmentController.getAll);
router.get('/doctor/:doctorId', validateAppointmentDoctorParam, appointmentController.getByDoctor);
router.post('/', validateCreateAppointment, appointmentController.create);
router.put('/:id', appointmentController.update);
router.delete('/:id', appointmentController.delete);

module.exports = router;