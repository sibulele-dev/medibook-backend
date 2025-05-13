/**
 * Appointment Controller
 * Handles API requests for appointment management
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const notificationService = require("../services/notification.service");
const appointmentService = require("../services/appointment.service");
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../utils/errors");
const dateUtils = require("../utils/date");

/**
 * Get all appointments for a practice with filtering options
 */
exports.getAppointments = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const {
      doctorId,
      patientId,
      status,
      date,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter object
    const filter = { practiceId };

    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;

    // Handle date filters
    if (date) {
      const startOfDay = dateUtils.startOfDay(new Date(date));
      const endOfDay = dateUtils.endOfDay(new Date(date));
      filter.startTime = { gte: startOfDay, lte: endOfDay };
    } else if (startDate && endDate) {
      filter.startTime = {
        gte: dateUtils.startOfDay(new Date(startDate)),
        lte: dateUtils.endOfDay(new Date(endDate)),
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get appointments with related data
    const appointments = await prisma.appointment.findMany({
      where: filter,
      include: {
        doctor: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            specialties: true,
            imageUrl: true,
          },
        },
        patient: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        service: true,
      },
      orderBy: { startTime: "asc" },
      skip,
      take: Number(limit),
    });

    // Get total count for pagination
    const totalCount = await prisma.appointment.count({ where: filter });

    res.json({
      data: appointments,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single appointment by ID
 */
exports.getAppointmentById = async (req, res, next) => {
  try {
    const { practiceId, appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
        practiceId,
      },
      include: {
        doctor: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            specialties: true,
            imageUrl: true,
          },
        },
        patient: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        service: true,
        practice: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    res.json({ data: appointment });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new appointment
 */
exports.createAppointment = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const {
      doctorId,
      patientId,
      serviceId,
      startTime,
      endTime,
      notes,
      status = "scheduled",
    } = req.body;

    // Validate required fields
    if (!doctorId || !patientId || !serviceId || !startTime) {
      throw new BadRequestError("Missing required fields");
    }

    // Check if doctor is available
    const isAvailable = await appointmentService.checkDoctorAvailability(
      doctorId,
      new Date(startTime),
      new Date(endTime || startTime)
    );

    if (!isAvailable) {
      throw new BadRequestError(
        "The selected time slot is no longer available"
      );
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        practiceId,
        doctorId,
        patientId,
        serviceId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        notes,
        status,
      },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        service: true,
        practice: {
          select: {
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    // Send notifications
    await notificationService.sendAppointmentConfirmation(appointment);

    res.status(201).json({ data: appointment });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing appointment
 */
exports.updateAppointment = async (req, res, next) => {
  try {
    const { practiceId, appointmentId } = req.params;
    const { doctorId, serviceId, startTime, endTime, notes, status } = req.body;

    // Get the existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
        practiceId,
      },
    });

    if (!existingAppointment) {
      throw new NotFoundError("Appointment not found");
    }

    // If changing time or doctor, check availability
    if (
      (startTime &&
        new Date(startTime).getTime() !==
          new Date(existingAppointment.startTime).getTime()) ||
      (doctorId && doctorId !== existingAppointment.doctorId)
    ) {
      const checkDoctorId = doctorId || existingAppointment.doctorId;
      const checkStartTime = startTime
        ? new Date(startTime)
        : existingAppointment.startTime;
      const checkEndTime = endTime
        ? new Date(endTime)
        : existingAppointment.endTime;

      const isAvailable = await appointmentService.checkDoctorAvailability(
        checkDoctorId,
        checkStartTime,
        checkEndTime,
        appointmentId // Exclude current appointment from availability check
      );

      if (!isAvailable) {
        throw new BadRequestError(
          "The selected time slot is no longer available"
        );
      }
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        doctorId: doctorId !== undefined ? doctorId : undefined,
        serviceId: serviceId !== undefined ? serviceId : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        notes: notes !== undefined ? notes : undefined,
        status: status !== undefined ? status : undefined,
      },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        service: true,
      },
    });

    // Send notifications if status changed
    if (status && status !== existingAppointment.status) {
      if (status === "cancelled") {
        await notificationService.sendAppointmentCancellation(
          updatedAppointment
        );
      } else if (
        status === "rescheduled" ||
        (startTime && startTime !== existingAppointment.startTime.toISOString())
      ) {
        await notificationService.sendAppointmentUpdate(updatedAppointment);
      }
    }

    res.json({ data: updatedAppointment });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an appointment
 */
exports.cancelAppointment = async (req, res, next) => {
  try {
    const { practiceId, appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
        practiceId,
      },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        service: true,
      },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        status: "cancelled",
        cancellationReason: reason || "No reason provided",
        cancelledAt: new Date(),
      },
      include: {
        doctor: true,
        patient: true,
        service: true,
        practice: true,
      },
    });

    // Send cancellation notification
    await notificationService.sendAppointmentCancellation(updatedAppointment);

    res.json({ data: updatedAppointment });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointments for a specific patient
 */
exports.getPatientAppointments = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { patientId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {
      practiceId,
      patientId,
    };

    if (status) filter.status = status;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get appointments
    const appointments = await prisma.appointment.findMany({
      where: filter,
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialties: true,
            imageUrl: true,
          },
        },
        service: true,
      },
      orderBy: { startTime: "desc" },
      skip,
      take: Number(limit),
    });

    // Get total count for pagination
    const totalCount = await prisma.appointment.count({ where: filter });

    res.json({
      data: appointments,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointments for a specific doctor
 */
exports.getDoctorAppointments = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { doctorId } = req.params;
    const {
      status,
      date,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      practiceId,
      doctorId,
    };

    if (status) filter.status = status;

    // Handle date filters
    if (date) {
      const startOfDay = dateUtils.startOfDay(new Date(date));
      const endOfDay = dateUtils.endOfDay(new Date(date));
      filter.startTime = { gte: startOfDay, lte: endOfDay };
    } else if (startDate && endDate) {
      filter.startTime = {
        gte: dateUtils.startOfDay(new Date(startDate)),
        lte: dateUtils.endOfDay(new Date(endDate)),
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get appointments
    const appointments = await prisma.appointment.findMany({
      where: filter,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        service: true,
      },
      orderBy: { startTime: "asc" },
      skip,
      take: Number(limit),
    });

    // Get total count for pagination
    const totalCount = await prisma.appointment.count({ where: filter });

    res.json({
      data: appointments,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check doctor availability for a given time slot
 */
exports.checkAvailability = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { doctorId, date, timeSlot, serviceId } = req.query;

    if (!doctorId || !date || !timeSlot) {
      throw new BadRequestError("Missing required parameters");
    }

    const selectedDate = new Date(date);
    const [startHour, startMinute] = timeSlot.split(":").map(Number);

    // Create the date objects for the start time
    const startTime = new Date(selectedDate);
    startTime.setHours(startHour, startMinute, 0, 0);

    // Get service duration if provided
    let endTime = new Date(startTime);

    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: {
          id: serviceId,
          practiceId,
        },
      });

      if (service) {
        // Add service duration in minutes
        endTime.setMinutes(endTime.getMinutes() + service.durationMinutes);
      } else {
        // Default to 30-minute slots if service not found
        endTime.setMinutes(endTime.getMinutes() + 30);
      }
    } else {
      // Default to 30-minute slots
      endTime.setMinutes(endTime.getMinutes() + 30);
    }

    // Check availability
    const isAvailable = await appointmentService.checkDoctorAvailability(
      doctorId,
      startTime,
      endTime
    );

    res.json({
      data: {
        available: isAvailable,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointment statistics
 */
exports.getAppointmentStats = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { startDate, endDate } = req.query;

    // Default to current month if dates not provided
    const start = startDate
      ? new Date(startDate)
      : dateUtils.startOfMonth(new Date());
    const end = endDate ? new Date(endDate) : dateUtils.endOfMonth(new Date());

    // Get total appointments
    const totalAppointments = await prisma.appointment.count({
      where: {
        practiceId,
        startTime: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get appointments by status
    const statusCounts = await prisma.appointment.groupBy({
      by: ["status"],
      where: {
        practiceId,
        startTime: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        status: true,
      },
    });

    // Format status counts
    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    // Get appointments by doctor
    const byDoctor = await prisma.appointment.groupBy({
      by: ["doctorId"],
      where: {
        practiceId,
        startTime: {
          gte: start,
          lte: end,
        },
      },
      _count: true,
    });

    // Get doctor details for the appointments
    const doctorDetails = await Promise.all(
      byDoctor.map(async (item) => {
        const doctor = await prisma.doctor.findUnique({
          where: { id: item.doctorId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        });

        return {
          doctorId: item.doctorId,
          name: doctor ? `${doctor.firstName} ${doctor.lastName}` : "Unknown",
          count: item._count,
        };
      })
    );

    // Get appointments by service
    const byService = await prisma.appointment.groupBy({
      by: ["serviceId"],
      where: {
        practiceId,
        startTime: {
          gte: start,
          lte: end,
        },
      },
      _count: true,
    });

    // Get service details for the appointments
    const serviceDetails = await Promise.all(
      byService.map(async (item) => {
        const service = await prisma.service.findUnique({
          where: { id: item.serviceId },
          select: {
            id: true,
            name: true,
          },
        });

        return {
          serviceId: item.serviceId,
          name: service ? service.name : "Unknown",
          count: item._count,
        };
      })
    );

    res.json({
      data: {
        totalAppointments,
        byStatus,
        byDoctor: doctorDetails,
        byService: serviceDetails,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
