/**
 * Schedule Controller
 * Handles API requests for doctor schedules management
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const scheduleService = require("../services/schedule.service");
const { BadRequestError, NotFoundError } = require("../utils/errors");
const dateUtils = require("../utils/date");

/**
 * Get schedules for a doctor
 */
exports.getDoctorSchedules = async (req, res, next) => {
  try {
    const { practiceId, doctorId } = req.params;
    const { startDate, endDate } = req.query;

    // Default to current week if dates not provided
    const start = startDate
      ? new Date(startDate)
      : dateUtils.startOfWeek(new Date());
    const end = endDate ? new Date(endDate) : dateUtils.endOfWeek(new Date());

    // Get all schedule entries for the doctor
    const schedules = await prisma.schedule.findMany({
      where: {
        practiceId,
        doctorId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Format the schedules by date
    const formattedSchedules = schedules.reduce((acc, schedule) => {
      const dateKey = schedule.date.toISOString().split("T")[0];

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          slots: [],
        };
      }

      acc[dateKey].slots.push({
        id: schedule.id,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isAvailable: schedule.isAvailable,
        breakTime: schedule.breakTime,
      });

      return acc;
    }, {});

    res.json({
      data: Object.values(formattedSchedules),
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get schedules for all doctors in a practice
 */
exports.getPracticeSchedules = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { date, startDate, endDate } = req.query;

    // Handle date filters
    let start, end;

    if (date) {
      start = dateUtils.startOfDay(new Date(date));
      end = dateUtils.endOfDay(new Date(date));
    } else {
      // Default to current week if dates not provided
      start = startDate
        ? new Date(startDate)
        : dateUtils.startOfWeek(new Date());
      end = endDate ? new Date(endDate) : dateUtils.endOfWeek(new Date());
    }

    // Get all doctors in the practice
    const doctors = await prisma.doctor.findMany({
      where: {
        practiceId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialties: true,
        imageUrl: true,
      },
    });

    // Get all schedules for all doctors
    const schedules = await prisma.schedule.findMany({
      where: {
        practiceId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // Get all appointments during this period
    const appointments = await prisma.appointment.findMany({
      where: {
        practiceId,
        startTime: {
          gte: start,
          lte: end,
        },
        status: {
          in: ["scheduled", "confirmed"],
        },
      },
      select: {
        id: true,
        doctorId: true,
        patientId: true,
        serviceId: true,
        startTime: true,
        endTime: true,
        status: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    // Format the schedules by doctor and date
    const formattedData = doctors.map((doctor) => {
      // Filter schedules for this doctor
      const doctorSchedules = schedules.filter((s) => s.doctorId === doctor.id);

      // Format the schedules by date
      const schedulesByDate = doctorSchedules.reduce((acc, schedule) => {
        const dateKey = schedule.date.toISOString().split("T")[0];

        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            slots: [],
          };
        }

        acc[dateKey].slots.push({
          id: schedule.id,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isAvailable: schedule.isAvailable,
          breakTime: schedule.breakTime,
        });

        return acc;
      }, {});

      // Filter appointments for this doctor
      const doctorAppointments = appointments.filter(
        (a) => a.doctorId === doctor.id
      );

      // Format the appointments by date
      const appointmentsByDate = doctorAppointments.reduce(
        (acc, appointment) => {
          const dateKey = appointment.startTime.toISOString().split("T")[0];

          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }

          acc[dateKey].push({
            id: appointment.id,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
            serviceName: appointment.service.name,
            status: appointment.status,
          });

          return acc;
        },
        {}
      );

      return {
        doctor: {
          id: doctor.id,
          name: `${doctor.firstName} ${doctor.lastName}`,
          specialties: doctor.specialties,
          imageUrl: doctor.imageUrl,
        },
        schedules: Object.values(schedulesByDate),
        appointments: appointmentsByDate,
      };
    });

    res.json({
      data: formattedData,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update a doctor's schedule
 */
exports.createOrUpdateSchedule = async (req, res, next) => {
  try {
    const { practiceId, doctorId } = req.params;
    const { date, schedules } = req.body;

    if (!date || !schedules || !Array.isArray(schedules)) {
      throw new BadRequestError("Invalid schedule data");
    }

    const scheduleDate = new Date(date);

    // Validate doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: {
        id: doctorId,
        practiceId,
      },
    });

    if (!doctor) {
      throw new NotFoundError("Doctor not found");
    }

    // Delete existing schedules for this date
    await prisma.schedule.deleteMany({
      where: {
        practiceId,
        doctorId,
        date: {
          gte: dateUtils.startOfDay(scheduleDate),
          lte: dateUtils.endOfDay(scheduleDate),
        },
      },
    });

    // Create new schedules
    const createdSchedules = await Promise.all(
      schedules.map((slot) => {
        return prisma.schedule.create({
          data: {
            practiceId,
            doctorId,
            date: scheduleDate,
            startTime: new Date(slot.startTime),
            endTime: new Date(slot.endTime),
            isAvailable: slot.isAvailable !== false, // Default to true if not specified
            breakTime: slot.breakTime || false,
          },
        });
      })
    );

    // Check for conflicts with existing appointments
    const conflicts = await scheduleService.checkAppointmentConflicts(
      doctorId,
      scheduleDate,
      createdSchedules
    );

    res.json({
      data: createdSchedules,
      conflicts: conflicts.length > 0 ? conflicts : null,
      message:
        conflicts.length > 0
          ? "Schedule updated but there are conflicts with existing appointments"
          : "Schedule updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a recurring schedule for a doctor
 */
exports.createRecurringSchedule = async (req, res, next) => {
  try {
    const { practiceId, doctorId } = req.params;
    const {
      startDate,
      endDate,
      daysOfWeek,
      scheduleTemplate,
      overwriteExisting = false,
    } = req.body;

    if (!startDate || !endDate || !daysOfWeek || !scheduleTemplate) {
      throw new BadRequestError("Missing required schedule data");
    }

    // Validate doctor exists
    const doctor = await prisma.doctor.findUnique({
      where: {
        id: doctorId,
        practiceId,
      },
    });

    if (!doctor) {
      throw new NotFoundError("Doctor not found");
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Create recurring schedules
    const results = await scheduleService.createRecurringSchedules(
      practiceId,
      doctorId,
      start,
      end,
      daysOfWeek,
      scheduleTemplate,
      overwriteExisting
    );

    res.json({
      data: {
        datesProcessed: results.datesProcessed,
        schedulesCreated: results.schedulesCreated,
        conflicts: results.conflicts,
      },
      message: "Recurring schedule created successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a schedule
 */
exports.deleteSchedule = async (req, res, next) => {
  try {
    const { practiceId, scheduleId } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: {
        id: scheduleId,
        practiceId,
      },
    });

    if (!schedule) {
      throw new NotFoundError("Schedule not found");
    }

    // Check if there are appointments during this schedule
    const conflicts = await prisma.appointment.findMany({
      where: {
        doctorId: schedule.doctorId,
        practiceId,
        startTime: {
          gte: schedule.startTime,
        },
        endTime: {
          lte: schedule.endTime,
        },
        status: {
          in: ["scheduled", "confirmed"],
        },
      },
    });

    if (conflicts.length > 0) {
      throw new BadRequestError(
        "Cannot delete schedule with existing appointments"
      );
    }

    // Delete the schedule
    await prisma.schedule.delete({
      where: {
        id: scheduleId,
      },
    });

    res.json({
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all schedules for a doctor on a specific date
 */
exports.deleteSchedulesByDate = async (req, res, next) => {
  try {
    const { practiceId, doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      throw new BadRequestError("Date is required");
    }

    const scheduleDate = new Date(date);

    // Check if there are appointments on this date
    const conflicts = await prisma.appointment.findMany({
      where: {
        doctorId,
        practiceId,
        startTime: {
          gte: dateUtils.startOfDay(scheduleDate),
          lte: dateUtils.endOfDay(scheduleDate),
        },
        status: {
          in: ["scheduled", "confirmed"],
        },
      },
    });

    if (conflicts.length > 0) {
      throw new BadRequestError(
        "Cannot delete schedules with existing appointments"
      );
    }

    // Delete all schedules for this date
    const result = await prisma.schedule.deleteMany({
      where: {
        practiceId,
        doctorId,
        date: {
          gte: dateUtils.startOfDay(scheduleDate),
          lte: dateUtils.endOfDay(scheduleDate),
        },
      },
    });

    res.json({
      data: {
        deletedCount: result.count,
      },
      message: `${result.count} schedules deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available time slots for booking
 */
exports.getAvailableTimeSlots = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { doctorId, date, serviceId } = req.query;

    if (!doctorId || !date) {
      throw new BadRequestError("Doctor ID and date are required");
    }

    const selectedDate = new Date(date);

    // Get service duration if provided
    let serviceDuration = 30; // Default duration in minutes

    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: {
          id: serviceId,
          practiceId,
        },
      });

      if (service) {
        serviceDuration = service.durationMinutes;
      }
    }

    // Get available time slots
    const availableSlots = await scheduleService.getAvailableTimeSlots(
      practiceId,
      doctorId,
      selectedDate,
      serviceDuration
    );

    res.json({
      data: {
        date: selectedDate.toISOString().split("T")[0],
        serviceDuration,
        availableSlots,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get working hours summary for doctors
 */
exports.getDoctorsWorkingSummary = async (req, res, next) => {
  try {
    const { practiceId } = req.params;
    const { startDate, endDate } = req.query;

    // Default to current month if dates not provided
    const start = startDate
      ? new Date(startDate)
      : dateUtils.startOfMonth(new Date());
    const end = endDate ? new Date(endDate) : dateUtils.endOfMonth(new Date());

    // Get all doctors in the practice
    const doctors = await prisma.doctor.findMany({
      where: {
        practiceId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialties: true,
      },
    });

    // Get working hours summary for each doctor
    const summary = await Promise.all(
      doctors.map(async (doctor) => {
        // Get all scheduled hours (excluding breaks)
        const schedules = await prisma.schedule.findMany({
          where: {
            doctorId: doctor.id,
            practiceId,
            date: {
              gte: start,
              lte: end,
            },
            breakTime: false,
          },
        });

        // Calculate total scheduled hours
        let totalScheduledMinutes = 0;
        schedules.forEach((schedule) => {
          const startTime = new Date(schedule.startTime);
          const endTime = new Date(schedule.endTime);
          const minutesDiff = (endTime - startTime) / (1000 * 60);
          totalScheduledMinutes += minutesDiff;
        });

        // Get all appointments
        const appointments = await prisma.appointment.findMany({
          where: {
            doctorId: doctor.id,
            practiceId,
            startTime: {
              gte: start,
              lte: end,
            },
            status: {
              in: ["scheduled", "confirmed", "completed"],
            },
          },
          include: {
            service: true,
          },
        });

        // Calculate total appointment hours
        let totalAppointmentMinutes = 0;
        appointments.forEach((appointment) => {
          if (appointment.service) {
            totalAppointmentMinutes += appointment.service.durationMinutes;
          } else if (appointment.endTime) {
            const startTime = new Date(appointment.startTime);
            const endTime = new Date(appointment.endTime);
            const minutesDiff = (endTime - startTime) / (1000 * 60);
            totalAppointmentMinutes += minutesDiff;
          } else {
            // Default to 30 minutes if no end time or service duration
            totalAppointmentMinutes += 30;
          }
        });

        return {
          doctor: {
            id: doctor.id,
            name: `${doctor.firstName} ${doctor.lastName}`,
            specialties: doctor.specialties,
          },
          scheduledHours: Math.round((totalScheduledMinutes / 60) * 10) / 10, // Round to 1 decimal
          appointmentHours:
            Math.round((totalAppointmentMinutes / 60) * 10) / 10,
          appointmentCount: appointments.length,
          utilization:
            totalScheduledMinutes > 0
              ? Math.round(
                  (totalAppointmentMinutes / totalScheduledMinutes) * 100
                )
              : 0,
        };
      })
    );

    res.json({
      data: summary,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
