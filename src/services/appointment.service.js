const { PrismaClient } = require("@prisma/client");
const { NotFoundError, BadRequestError } = require("../utils/errors");
const notificationService = require("./notification.service");
const dateUtils = require("../utils/date");

const prisma = new PrismaClient();

/**
 * Service for managing appointments
 */
class AppointmentService {
  /**
   * Create a new appointment
   * @param {Object} appointmentData - Appointment data
   * @param {string} appointmentData.patientId - Patient ID
   * @param {string} appointmentData.doctorId - Doctor ID
   * @param {string} appointmentData.serviceId - Service ID
   * @param {Date} appointmentData.startTime - Start time
   * @param {Date} appointmentData.endTime - End time
   * @param {string} appointmentData.reason - Reason for visit
   * @param {string} appointmentData.notes - Additional notes
   * @param {string} appointmentData.status - Status (PENDING, CONFIRMED, CANCELLED, COMPLETED)
   * @param {string} [appointmentData.bookingSource] - Booking source (ONLINE, PHONE, IN_PERSON)
   * @returns {Promise<Object>} Created appointment
   */
  async createAppointment(appointmentData) {
    const {
      patientId,
      doctorId,
      serviceId,
      startTime,
      endTime,
      reason,
      notes,
      status = "PENDING",
      bookingSource = "ONLINE",
    } = appointmentData;

    // Validate required fields
    if (!patientId || !doctorId || !serviceId || !startTime) {
      throw new BadRequestError("Missing required fields");
    }

    // Validate appointment times
    if (new Date(startTime) >= new Date(endTime)) {
      throw new BadRequestError("End time must be after start time");
    }

    if (new Date(startTime) < new Date()) {
      throw new BadRequestError("Cannot book appointment in the past");
    }

    // Check if doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { practice: true },
    });

    if (!doctor) {
      throw new NotFoundError(`Doctor with ID ${doctorId} not found`);
    }

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${serviceId} not found`);
    }

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { user: true },
    });

    if (!patient) {
      throw new NotFoundError(`Patient with ID ${patientId} not found`);
    }

    // Check if doctor is available at this time
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { not: "CANCELLED" },
        OR: [
          {
            startTime: { lte: new Date(startTime) },
            endTime: { gt: new Date(startTime) },
          },
          {
            startTime: { lt: new Date(endTime) },
            endTime: { gte: new Date(endTime) },
          },
          {
            startTime: { gte: new Date(startTime) },
            endTime: { lte: new Date(endTime) },
          },
        ],
      },
    });

    if (conflictingAppointment) {
      throw new BadRequestError("Doctor is not available at this time");
    }

    // Check if doctor is scheduled to work at this time
    const appointmentDate = new Date(startTime).toISOString().split("T")[0];
    const schedule = await prisma.schedule.findFirst({
      where: {
        doctorId,
        date: appointmentDate,
      },
    });

    if (!schedule) {
      throw new BadRequestError("Doctor is not scheduled to work on this day");
    }

    const scheduleStart = new Date(`${appointmentDate}T${schedule.startTime}`);
    const scheduleEnd = new Date(`${appointmentDate}T${schedule.endTime}`);
    const appointmentStart = new Date(startTime);
    const appointmentEnd = new Date(endTime);

    if (appointmentStart < scheduleStart || appointmentEnd > scheduleEnd) {
      throw new BadRequestError(
        "Appointment time is outside of doctor's working hours"
      );
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patient: { connect: { id: patientId } },
        doctor: { connect: { id: doctorId } },
        service: { connect: { id: serviceId } },
        practice: { connect: { id: doctor.practiceId } },
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason,
        notes,
        status,
        bookingSource,
      },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        service: true,
        practice: true,
      },
    });

    // Send notifications
    try {
      // Notify patient
      await notificationService.sendAppointmentConfirmation(
        patient.user.email,
        appointment,
        patient.user.firstName
      );

      // Notify practice
      await notificationService.sendPracticeAppointmentNotification(
        doctor.practice.email,
        appointment
      );
    } catch (error) {
      console.error("Failed to send appointment notifications:", error);
      // Don't fail the appointment creation if notifications fail
    }

    return appointment;
  }

  /**
   * Get appointments for a practice
   * @param {string} practiceId - Practice ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.status - Filter by status
   * @param {Date} options.startDate - Filter by start date
   * @param {Date} options.endDate - Filter by end date
   * @param {string} options.doctorId - Filter by doctor
   * @param {string} options.patientId - Filter by patient
   * @returns {Promise<Object>} Appointments and pagination metadata
   */
  async getAppointmentsByPractice(practiceId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      doctorId,
      patientId,
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      practiceId,
      ...(status && { status }),
      ...(doctorId && { doctorId }),
      ...(patientId && { patientId }),
      ...(startDate && {
        startTime: { gte: new Date(startDate) },
      }),
      ...(endDate && {
        startTime: { lte: new Date(endDate) },
      }),
    };

    // Get appointments with pagination
    const [appointments, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: "desc" },
        include: {
          patient: {
            include: { user: true },
          },
          doctor: {
            include: { user: true },
          },
          service: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      appointments,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get appointment by ID
   * @param {string} id - Appointment ID
   * @returns {Promise<Object>} Appointment
   */
  async getAppointmentById(id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        service: true,
        practice: true,
      },
    });

    if (!appointment) {
      throw new NotFoundError(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  /**
   * Update an appointment
   * @param {string} id - Appointment ID
   * @param {Object} appointmentData - Updated appointment data
   * @returns {Promise<Object>} Updated appointment
   */
  async updateAppointment(id, appointmentData) {
    // Check if appointment exists
    const appointment = await this.getAppointmentById(id);

    // Validate appointment times if changing
    if (appointmentData.startTime && appointmentData.endTime) {
      if (
        new Date(appointmentData.startTime) >= new Date(appointmentData.endTime)
      ) {
        throw new BadRequestError("End time must be after start time");
      }
    }

    // If changing doctor or time, check availability
    if (
      (appointmentData.doctorId &&
        appointmentData.doctorId !== appointment.doctorId) ||
      (appointmentData.startTime &&
        appointmentData.startTime !== appointment.startTime.toISOString()) ||
      (appointmentData.endTime &&
        appointmentData.endTime !== appointment.endTime.toISOString())
    ) {
      const doctorId = appointmentData.doctorId || appointment.doctorId;
      const startTime =
        appointmentData.startTime || appointment.startTime.toISOString();
      const endTime =
        appointmentData.endTime || appointment.endTime.toISOString();

      // Check for conflicts
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          doctorId,
          id: { not: id },
          status: { not: "CANCELLED" },
          OR: [
            {
              startTime: { lte: new Date(startTime) },
              endTime: { gt: new Date(startTime) },
            },
            {
              startTime: { lt: new Date(endTime) },
              endTime: { gte: new Date(endTime) },
            },
            {
              startTime: { gte: new Date(startTime) },
              endTime: { lte: new Date(endTime) },
            },
          ],
        },
      });

      if (conflictingAppointment) {
        throw new BadRequestError("Doctor is not available at this time");
      }
    }

    // Prepare update data
    const updateData = {};

    // Only include fields that are provided
    if (appointmentData.patientId !== undefined)
      updateData.patient = { connect: { id: appointmentData.patientId } };
    if (appointmentData.doctorId !== undefined)
      updateData.doctor = { connect: { id: appointmentData.doctorId } };
    if (appointmentData.serviceId !== undefined)
      updateData.service = { connect: { id: appointmentData.serviceId } };
    if (appointmentData.startTime !== undefined)
      updateData.startTime = new Date(appointmentData.startTime);
    if (appointmentData.endTime !== undefined)
      updateData.endTime = new Date(appointmentData.endTime);
    if (appointmentData.reason !== undefined)
      updateData.reason = appointmentData.reason;
    if (appointmentData.notes !== undefined)
      updateData.notes = appointmentData.notes;
    if (appointmentData.status !== undefined)
      updateData.status = appointmentData.status;

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        service: true,
        practice: true,
      },
    });

    // Send notifications if status changed
    if (
      appointmentData.status &&
      appointmentData.status !== appointment.status
    ) {
      try {
        // Notify patient of status change
        await notificationService.sendAppointmentStatusUpdate(
          updatedAppointment.patient.user.email,
          updatedAppointment,
          updatedAppointment.patient.user.firstName
        );
      } catch (error) {
        console.error(
          "Failed to send appointment status update notification:",
          error
        );
      }
    }

    return updatedAppointment;
  }

  /**
   * Cancel an appointment
   * @param {string} id - Appointment ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled appointment
   */
  async cancelAppointment(id, reason) {
    const appointment = await this.getAppointmentById(id);

    // Check if appointment is already cancelled
    if (appointment.status === "CANCELLED") {
      throw new BadRequestError("Appointment is already cancelled");
    }

    // Check if appointment is in the past
    if (new Date(appointment.startTime) < new Date()) {
      throw new BadRequestError("Cannot cancel a past appointment");
    }

    // Update appointment status
    const cancelledAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancellationReason: reason || "No reason provided",
      },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        service: true,
        practice: true,
      },
    });

    // Send cancellation notifications
    try {
      // Notify patient
      await notificationService.sendAppointmentCancellation(
        cancelledAppointment.patient.user.email,
        cancelledAppointment,
        cancelledAppointment.patient.user.firstName
      );

      // Notify practice
      await notificationService.sendPracticeAppointmentCancellation(
        cancelledAppointment.practice.email,
        cancelledAppointment
      );
    } catch (error) {
      console.error("Failed to send cancellation notifications:", error);
    }

    return cancelledAppointment;
  }

  /**
   * Get appointments for a patient
   * @param {string} patientId - Patient ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.status - Filter by status
   * @param {boolean} options.upcoming - Filter by upcoming appointments
   * @param {boolean} options.past - Filter by past appointments
   * @returns {Promise<Object>} Appointments and pagination metadata
   */
  async getPatientAppointments(patientId, options = {}) {
    const { page = 1, limit = 10, status, upcoming, past } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      patientId,
      ...(status && { status }),
      ...(upcoming && { startTime: { gte: new Date() } }),
      ...(past && { startTime: { lt: new Date() } }),
    };

    // Get appointments with pagination
    const [appointments, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: "desc" },
        include: {
          doctor: {
            include: { user: true },
          },
          service: true,
          practice: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      appointments,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get appointments for a doctor
   * @param {string} doctorId - Doctor ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.status - Filter by status
   * @param {Date} options.date - Filter by specific date
   * @returns {Promise<Object>} Appointments and pagination metadata
   */
  async getDoctorAppointments(doctorId, options = {}) {
    const { page = 1, limit = 10, status, date } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      doctorId,
      ...(status && { status }),
    };

    // If date is provided, filter by that specific day
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Get appointments with pagination
    const [appointments, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: "asc" },
        include: {
          patient: {
            include: { user: true },
          },
          service: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      appointments,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get upcoming appointments for a practice
   * @param {string} practiceId - Practice ID
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} Upcoming appointments
   */
  async getUpcomingAppointments(practiceId, days = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return prisma.appointment.findMany({
      where: {
        practiceId,
        startTime: {
          gte: now,
          lte: futureDate,
        },
        status: {
          not: "CANCELLED",
        },
      },
      orderBy: { startTime: "asc" },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        service: true,
      },
    });
  }

  /**
   * Get appointments statistics for a practice
   * @param {string} practiceId - Practice ID
   * @param {string} period - Period (day, week, month)
   * @returns {Promise<Object>} Appointment statistics
   */
  async getAppointmentStats(practiceId, period = "week") {
    const now = new Date();
    let startDate;

    // Calculate start date based on period
    switch (period) {
      case "day":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get appointments for the period
    const appointments = await prisma.appointment.findMany({
      where: {
        practiceId,
        startTime: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        serviceId: true,
        doctorId: true,
      },
    });

    // Status statistics
    const statusCounts = {
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
      NO_SHOW: 0,
    };

    appointments.forEach((appointment) => {
      if (statusCounts[appointment.status] !== undefined) {
        statusCounts[appointment.status]++;
      }
    });

    // Calculate average appointments per day
    const dayCount = dateUtils.getDaysBetween(startDate, now);
    const averagePerDay = dayCount > 0 ? appointments.length / dayCount : 0;

    // Count appointments by doctor
    const doctorCounts = {};
    appointments.forEach((appointment) => {
      doctorCounts[appointment.doctorId] =
        (doctorCounts[appointment.doctorId] || 0) + 1;
    });

    // Count appointments by service
    const serviceCounts = {};
    appointments.forEach((appointment) => {
      serviceCounts[appointment.serviceId] =
        (serviceCounts[appointment.serviceId] || 0) + 1;
    });

    // Get top doctors by appointment count
    const topDoctors = Object.entries(doctorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([doctorId, count]) => ({ doctorId, count }));

    // Get top services by appointment count
    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([serviceId, count]) => ({ serviceId, count }));

    return {
      totalAppointments: appointments.length,
      statusCounts,
      averagePerDay,
      topDoctors,
      topServices,
      period,
    };
  }
}

module.exports = new AppointmentService();
