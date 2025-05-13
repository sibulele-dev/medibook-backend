const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const dateUtils = require("../utils/date");
const logger = require("../utils/logger");

/**
 * Schedule service - handles doctor availability and scheduling
 */
class ScheduleService {
  /**
   * Create or update a doctor's schedule
   * @param {string} doctorId Doctor ID
   * @param {Object} scheduleData Schedule data
   * @returns {Promise<Object>} Created schedule slots
   */
  async setDoctorSchedule(doctorId, scheduleData) {
    try {
      const { scheduleItems, practiceId } = scheduleData;
      const createdSlots = [];

      // Start transaction to ensure all operations succeed or fail together
      await prisma.$transaction(async (tx) => {
        // First, check if the doctor exists and belongs to the practice
        const doctor = await tx.doctor.findFirst({
          where: {
            id: doctorId,
            practiceId,
          },
        });

        if (!doctor) {
          throw new Error(
            "Doctor not found or does not belong to this practice"
          );
        }

        // Process each schedule item
        for (const item of scheduleItems) {
          const {
            dayOfWeek,
            startTime,
            endTime,
            isAvailable,
            effectiveDate,
            expiryDate,
          } = item;

          // Validate time slots
          if (startTime >= endTime) {
            throw new Error("Start time must be before end time");
          }

          // Create the schedule
          const schedule = await tx.doctorSchedule.create({
            data: {
              doctorId,
              dayOfWeek,
              startTime,
              endTime,
              isAvailable,
              effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
            },
          });

          createdSlots.push(schedule);
        }
      });

      logger.info(`Set schedule for doctor: ${doctorId}`);
      return createdSlots;
    } catch (error) {
      logger.error(`Error setting doctor schedule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get doctor's schedule
   * @param {string} doctorId Doctor ID
   * @param {Date} startDate Start date for schedule range
   * @param {Date} endDate End date for schedule range
   * @returns {Promise<Array>} Array of schedule entries
   */
  async getDoctorSchedule(doctorId, startDate, endDate) {
    try {
      // Convert string dates to Date objects if needed
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);

      // Get the regular weekly schedule (applicable to the requested date range)
      const weeklySchedule = await prisma.doctorSchedule.findMany({
        where: {
          doctorId,
          OR: [{ effectiveDate: null }, { effectiveDate: { lte: end } }],
          AND: [{ OR: [{ expiryDate: null }, { expiryDate: { gte: start } }] }],
          isAvailable: true,
        },
      });

      // Get specific date overrides like time off, holidays, etc.
      const exceptions = await prisma.scheduleException.findMany({
        where: {
          doctorId,
          date: {
            gte: start,
            lte: end,
          },
        },
      });

      // Get all booked appointments within the time range
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          startTime: { gte: start },
          endTime: { lte: end },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          patientId: true,
          serviceId: true,
          service: {
            select: {
              name: true,
              duration: true,
            },
          },
        },
      });

      // Generate availability slots based on weekly schedule and exceptions
      const availabilitySlots = this._generateAvailabilitySlots(
        weeklySchedule,
        exceptions,
        appointments,
        start,
        end
      );

      return availabilitySlots;
    } catch (error) {
      logger.error(`Error getting doctor schedule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a schedule item
   * @param {string} scheduleId Schedule ID
   * @param {string} practiceId Practice ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async deleteScheduleItem(scheduleId, practiceId) {
    try {
      // Verify the schedule item belongs to a doctor in this practice
      const scheduleItem = await prisma.doctorSchedule.findFirst({
        where: {
          id: scheduleId,
          doctor: {
            practiceId,
          },
        },
      });

      if (!scheduleItem) {
        throw new Error("Schedule item not found or unauthorized");
      }

      await prisma.doctorSchedule.delete({
        where: { id: scheduleId },
      });

      logger.info(`Deleted schedule item: ${scheduleId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting schedule item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a schedule exception (day off, holiday, etc.)
   * @param {string} doctorId Doctor ID
   * @param {Object} exceptionData Exception data
   * @returns {Promise<Object>} Created exception
   */
  async addScheduleException(doctorId, exceptionData) {
    try {
      const { date, reason, isFullDay, startTime, endTime, practiceId } =
        exceptionData;

      // Validate the doctor exists and belongs to the practice
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          practiceId,
        },
      });

      if (!doctor) {
        throw new Error(
          "Doctor not found or not associated with this practice"
        );
      }

      // Create the exception
      const exception = await prisma.scheduleException.create({
        data: {
          doctorId,
          date: new Date(date),
          reason,
          isFullDay,
          startTime: isFullDay ? null : startTime,
          endTime: isFullDay ? null : endTime,
        },
      });

      logger.info(
        `Added schedule exception for doctor: ${doctorId} on ${date}`
      );
      return exception;
    } catch (error) {
      logger.error(`Error adding schedule exception: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a schedule exception
   * @param {string} exceptionId Exception ID
   * @param {string} practiceId Practice ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async removeScheduleException(exceptionId, practiceId) {
    try {
      // Verify the exception belongs to a doctor in this practice
      const exception = await prisma.scheduleException.findFirst({
        where: {
          id: exceptionId,
          doctor: {
            practiceId,
          },
        },
      });

      if (!exception) {
        throw new Error("Exception not found or unauthorized");
      }

      await prisma.scheduleException.delete({
        where: { id: exceptionId },
      });

      logger.info(`Removed schedule exception: ${exceptionId}`);
      return true;
    } catch (error) {
      logger.error(`Error removing schedule exception: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available time slots for a doctor on a specific date
   * @param {string} doctorId Doctor ID
   * @param {Date} date Date to check
   * @param {number} duration Appointment duration in minutes
   * @returns {Promise<Array>} Array of available time slots
   */
  async getAvailableTimeSlots(doctorId, date, duration) {
    try {
      const requestedDate = new Date(date);
      // Set time to beginning of day
      requestedDate.setHours(0, 0, 0, 0);

      // Set end date to end of the same day
      const endDate = new Date(requestedDate);
      endDate.setHours(23, 59, 59, 999);

      // Get the day of week (0-6, where 0 is Sunday)
      const dayOfWeek = requestedDate.getDay();

      // Get the doctor's schedule for this day of week
      const scheduleItems = await prisma.doctorSchedule.findMany({
        where: {
          doctorId,
          dayOfWeek,
          OR: [
            { effectiveDate: null },
            { effectiveDate: { lte: requestedDate } },
          ],
          AND: [
            {
              OR: [
                { expiryDate: null },
                { expiryDate: { gte: requestedDate } },
              ],
            },
          ],
          isAvailable: true,
        },
      });

      // Check for schedule exceptions on this date
      const exceptions = await prisma.scheduleException.findMany({
        where: {
          doctorId,
          date: {
            gte: requestedDate,
            lte: endDate,
          },
        },
      });

      // If there's a full-day exception, no slots are available
      const fullDayException = exceptions.find((e) => e.isFullDay);
      if (fullDayException) {
        return [];
      }

      // Get existing appointments for this day
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          startTime: { gte: requestedDate },
          endTime: { lte: endDate },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      // Generate available time slots
      const availableSlots = [];

      // Process each schedule item for this day
      for (const schedule of scheduleItems) {
        const { startTime, endTime } = schedule;

        // Parse schedule times (stored as strings like "09:00") into Date objects
        const slotStart = new Date(requestedDate);
        const [startHour, startMinute] = startTime.split(":").map(Number);
        slotStart.setHours(startHour, startMinute, 0, 0);

        const slotEnd = new Date(requestedDate);
        const [endHour, endMinute] = endTime.split(":").map(Number);
        slotEnd.setHours(endHour, endMinute, 0, 0);

        // Apply partial-day exceptions
        const partialExceptions = exceptions.filter((e) => !e.isFullDay);
        let availableRanges = [{ start: slotStart, end: slotEnd }];

        for (const exception of partialExceptions) {
          const exceptionStart = new Date(requestedDate);
          const [exStartHour, exStartMinute] = exception.startTime
            .split(":")
            .map(Number);
          exceptionStart.setHours(exStartHour, exStartMinute, 0, 0);

          const exceptionEnd = new Date(requestedDate);
          const [exEndHour, exEndMinute] = exception.endTime
            .split(":")
            .map(Number);
          exceptionEnd.setHours(exEndHour, exEndMinute, 0, 0);

          // Remove exception time from available ranges
          availableRanges = this._removeTimeRange(
            availableRanges,
            exceptionStart,
            exceptionEnd
          );
        }

        // Remove booked appointments from available ranges
        for (const appt of appointments) {
          availableRanges = this._removeTimeRange(
            availableRanges,
            new Date(appt.startTime),
            new Date(appt.endTime)
          );
        }

        // Generate time slots from the available ranges
        for (const range of availableRanges) {
          const slots = this._generateTimeSlots(
            range.start,
            range.end,
            duration
          );
          availableSlots.push(...slots);
        }
      }

      return availableSlots;
    } catch (error) {
      logger.error(`Error getting available time slots: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a specific time slot is available
   * @param {string} doctorId Doctor ID
   * @param {Date} startTime Start time
   * @param {Date} endTime End time
   * @returns {Promise<boolean>} Availability status
   */
  async isTimeSlotAvailable(doctorId, startTime, endTime) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);

      // Check day of week and time against regular schedule
      const dayOfWeek = start.getDay();
      const timeStr = start.toTimeString().substring(0, 5); // Format: HH:MM
      const endTimeStr = end.toTimeString().substring(0, 5); // Format: HH:MM

      // Get the date for schedule exceptions (reset hours/minutes/seconds)
      const dateForExceptions = new Date(start);
      dateForExceptions.setHours(0, 0, 0, 0);

      // Check if the doctor is scheduled to work at this time
      const schedule = await prisma.doctorSchedule.findFirst({
        where: {
          doctorId,
          dayOfWeek,
          startTime: { lte: timeStr },
          endTime: { gte: endTimeStr },
          OR: [{ effectiveDate: null }, { effectiveDate: { lte: start } }],
          AND: [{ OR: [{ expiryDate: null }, { expiryDate: { gte: end } }] }],
          isAvailable: true,
        },
      });

      if (!schedule) {
        return false; // Not scheduled to work at this time
      }

      // Check for schedule exceptions
      const exceptions = await prisma.scheduleException.findMany({
        where: {
          doctorId,
          date: dateForExceptions,
        },
      });

      // Check for full-day exceptions
      const fullDayException = exceptions.find((e) => e.isFullDay);
      if (fullDayException) {
        return false; // Full day off
      }

      // Check for partial-day exceptions
      for (const exception of exceptions) {
        if (!exception.isFullDay) {
          const exStart = new Date(start);
          const [exStartHour, exStartMinute] = exception.startTime
            .split(":")
            .map(Number);
          exStart.setHours(exStartHour, exStartMinute, 0, 0);

          const exEnd = new Date(start);
          const [exEndHour, exEndMinute] = exception.endTime
            .split(":")
            .map(Number);
          exEnd.setHours(exEndHour, exEndMinute, 0, 0);

          // Check if the time slot overlaps with the exception
          if (!(end <= exStart || start >= exEnd)) {
            return false; // Overlaps with exception time
          }
        }
      }

      // Check for overlapping appointments
      const overlappingAppointment = await prisma.appointment.findFirst({
        where: {
          doctorId,
          NOT: {
            status: { in: ["CANCELLED", "NO_SHOW"] },
          },
          OR: [
            {
              startTime: { lt: end },
              endTime: { gt: start },
            },
          ],
        },
      });

      if (overlappingAppointment) {
        return false; // Overlaps with existing appointment
      }

      return true; // Time slot is available
    } catch (error) {
      logger.error(`Error checking time slot availability: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get doctor's calendar view for a specific month
   * @param {string} doctorId Doctor ID
   * @param {number} year Year
   * @param {number} month Month (1-12)
   * @returns {Promise<Object>} Calendar data
   */
  async getDoctorCalendar(doctorId, year, month) {
    try {
      // Calculate start and end dates for the month
      const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in JS Date
      const endDate = new Date(year, month, 0); // Last day of the month
      endDate.setHours(23, 59, 59, 999);

      // Get doctor's schedules
      const schedules = await prisma.doctorSchedule.findMany({
        where: {
          doctorId,
          OR: [{ effectiveDate: null }, { effectiveDate: { lte: endDate } }],
          AND: [
            { OR: [{ expiryDate: null }, { expiryDate: { gte: startDate } }] },
          ],
        },
      });

      // Get schedule exceptions
      const exceptions = await prisma.scheduleException.findMany({
        where: {
          doctorId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Get appointments
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          startTime: { gte: startDate },
          endTime: { lte: endDate },
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              id: true,
            },
          },
          service: {
            select: {
              name: true,
              duration: true,
              color: true,
            },
          },
        },
      });

      // Process the data into calendar format
      const calendar = {
        month,
        year,
        days: [],
      };

      // Build calendar days
      const daysInMonth = endDate.getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        // Find schedule for this day of week
        const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);

        // Find exceptions for this date
        const dateStr = date.toISOString().split("T")[0];
        const dayExceptions = exceptions.filter(
          (e) => new Date(e.date).toISOString().split("T")[0] === dateStr
        );

        // Find appointments for this date
        const dayAppointments = appointments.filter(
          (a) => new Date(a.startTime).toISOString().split("T")[0] === dateStr
        );

        // Calculate if this is a working day
        const isWorkingDay =
          daySchedules.some((s) => s.isAvailable) &&
          !dayExceptions.some((e) => e.isFullDay);

        calendar.days.push({
          date: day,
          dayOfWeek,
          isWorkingDay,
          schedules: daySchedules,
          exceptions: dayExceptions,
          appointments: dayAppointments.map((appt) => ({
            id: appt.id,
            startTime: appt.startTime,
            endTime: appt.endTime,
            status: appt.status,
            patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
            patientId: appt.patient.id,
            serviceName: appt.service.name,
            serviceColor: appt.service.color,
          })),
        });
      }

      return calendar;
    } catch (error) {
      logger.error(`Error getting doctor calendar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper method to generate availability slots from schedule data
   * @private
   */
  _generateAvailabilitySlots(
    weeklySchedule,
    exceptions,
    appointments,
    startDate,
    endDate
  ) {
    const slots = [];
    const currentDate = new Date(startDate);

    // Iterate through each day in the date range
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split("T")[0];

      // Check if there's a full-day exception for this date
      const fullDayException = exceptions.find(
        (e) =>
          new Date(e.date).toISOString().split("T")[0] === dateStr &&
          e.isFullDay
      );

      if (!fullDayException) {
        // Get schedule for this day of week
        const daySchedules = weeklySchedule.filter(
          (s) => s.dayOfWeek === dayOfWeek
        );

        // Get partial exceptions for this date
        const partialExceptions = exceptions.filter(
          (e) =>
            new Date(e.date).toISOString().split("T")[0] === dateStr &&
            !e.isFullDay
        );

        // Get appointments for this date
        const dayAppointments = appointments.filter(
          (a) => new Date(a.startTime).toISOString().split("T")[0] === dateStr
        );

        // Process each schedule period for this day
        for (const schedule of daySchedules) {
          // Create a date object with the schedule start time
          const scheduleStart = new Date(currentDate);
          const [startHour, startMinute] = schedule.startTime
            .split(":")
            .map(Number);
          scheduleStart.setHours(startHour, startMinute, 0, 0);

          // Create a date object with the schedule end time
          const scheduleEnd = new Date(currentDate);
          const [endHour, endMinute] = schedule.endTime.split(":").map(Number);
          scheduleEnd.setHours(endHour, endMinute, 0, 0);

          // Start with the full schedule period as available
          let availableRanges = [{ start: scheduleStart, end: scheduleEnd }];

          // Remove exception times
          for (const exception of partialExceptions) {
            const exceptionStart = new Date(currentDate);
            const [exStartHour, exStartMinute] = exception.startTime
              .split(":")
              .map(Number);
            exceptionStart.setHours(exStartHour, exStartMinute, 0, 0);

            const exceptionEnd = new Date(currentDate);
            const [exEndHour, exEndMinute] = exception.endTime
              .split(":")
              .map(Number);
            exceptionEnd.setHours(exEndHour, exEndMinute, 0, 0);

            availableRanges = this._removeTimeRange(
              availableRanges,
              exceptionStart,
              exceptionEnd
            );
          }

          // Remove appointment times
          for (const appt of dayAppointments) {
            availableRanges = this._removeTimeRange(
              availableRanges,
              new Date(appt.startTime),
              new Date(appt.endTime)
            );
          }

          // Add the available ranges to the slots
          for (const range of availableRanges) {
            slots.push({
              date: dateStr,
              startTime: range.start,
              endTime: range.end,
              duration: (range.end - range.start) / (60 * 1000), // in minutes
            });
          }
        }
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Helper method to remove a time range from a list of available ranges
   * @private
   */
  _removeTimeRange(availableRanges, removeStart, removeEnd) {
    const result = [];

    for (const range of availableRanges) {
      // If range is completely before or after the remove range, keep it unchanged
      if (range.end <= removeStart || range.start >= removeEnd) {
        result.push(range);
        continue;
      }

      // If remove range completely contains this range, skip it
      if (removeStart <= range.start && removeEnd >= range.end) {
        continue;
      }

      // If remove range is in the middle of this range, split into two
      if (removeStart > range.start && removeEnd < range.end) {
        result.push({ start: range.start, end: removeStart });
        result.push({ start: removeEnd, end: range.end });
        continue;
      }

      // If remove range overlaps the start
      if (removeStart <= range.start && removeEnd > range.start) {
        result.push({ start: removeEnd, end: range.end });
        continue;
      }

      // If remove range overlaps the end
      if (removeStart < range.end && removeEnd >= range.end) {
        result.push({ start: range.start, end: removeStart });
        continue;
      }
    }

    return result;
  }

  /**
   * Helper method to generate time slots of a specific duration
   * @private
   */
  _generateTimeSlots(startTime, endTime, duration) {
    const slots = [];
    const current = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = duration * 60 * 1000;

    // Subtract duration from end time to ensure slots don't exceed end time
    end.setTime(end.getTime() - durationMs);

    while (current <= end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + durationMs);

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
      });

      // Move to next potential slot (using standard increments, e.g., 15 or 30 minutes)
      current.setMinutes(current.getMinutes() + 15); // Can be adjusted to practice-specific increments
    }

    return slots;
  }
}

module.exports = new ScheduleService();
