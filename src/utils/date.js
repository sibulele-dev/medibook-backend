/**
 * Date utility functions for the medical booking app
 */
const {
  format,
  parseISO,
  differenceInMinutes,
  addMinutes,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addDays,
  isAfter,
  isBefore,
} = require("date-fns");

/**
 * Format a date using the specified format
 * @param {Date|String} date - Date to format
 * @param {String} formatStr - Format string (default: 'yyyy-MM-dd')
 * @returns {String} Formatted date string
 */
const formatDate = (date, formatStr = "yyyy-MM-dd") => {
  if (!date) return null;
  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  return format(parsedDate, formatStr);
};

/**
 * Format a time using the specified format
 * @param {Date|String} date - Date to extract time from
 * @param {String} formatStr - Format string (default: 'HH:mm')
 * @returns {String} Formatted time string
 */
const formatTime = (date, formatStr = "HH:mm") => {
  if (!date) return null;
  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  return format(parsedDate, formatStr);
};

/**
 * Format a date and time using a specified format
 * @param {Date|String} date - Date to format
 * @param {String} formatStr - Format string (default: 'yyyy-MM-dd HH:mm')
 * @returns {String} Formatted date and time string
 */
const formatDateTime = (date, formatStr = "yyyy-MM-dd HH:mm") => {
  if (!date) return null;
  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  return format(parsedDate, formatStr);
};

/**
 * Generate time slots between start and end times with a specific duration
 * @param {String} startTime - Start time (HH:mm)
 * @param {String} endTime - End time (HH:mm)
 * @param {Number} durationMinutes - Duration of each slot in minutes
 * @param {Date} date - The date for which to generate slots
 * @returns {Array} Array of time slot objects
 */
const generateTimeSlots = (startTime, endTime, durationMinutes, date) => {
  const baseDate = date || new Date();

  // Create date objects with the given times
  const startDate = parseISO(`${formatDate(baseDate)}T${startTime}`);
  const endDate = parseISO(`${formatDate(baseDate)}T${endTime}`);

  const slots = [];
  let currentSlot = startDate;

  while (
    isBefore(currentSlot, endDate) ||
    differenceInMinutes(currentSlot, endDate) === 0
  ) {
    const endSlot = addMinutes(currentSlot, durationMinutes);

    // Don't add partial slots that would exceed the end time
    if (isAfter(endSlot, endDate)) {
      break;
    }

    slots.push({
      start: formatTime(currentSlot),
      end: formatTime(endSlot),
      startFull: currentSlot,
      endFull: endSlot,
    });

    currentSlot = endSlot;
  }

  return slots;
};

/**
 * Get the days of the week between two dates
 * @param {Date|String} startDate - Start date
 * @param {Date|String} endDate - End date
 * @returns {Array} Array of days (0-6, 0 being Sunday)
 */
const getDaysOfWeek = (startDate, endDate) => {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

  const dates = eachDayOfInterval({ start, end });
  return dates.map((date) => getDay(date));
};

/**
 * Check if the given date is today
 * @param {Date|String} date - Date to check
 * @returns {Boolean} True if date is today
 */
const isToday = (date) => {
  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  return isSameDay(parsedDate, new Date());
};

/**
 * Calculate age from date of birth
 * @param {Date|String} dateOfBirth - Date of birth
 * @returns {Number} Age in years
 */
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate =
    typeof dateOfBirth === "string" ? parseISO(dateOfBirth) : dateOfBirth;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Get the start and end of the day for a given date
 * @param {Date|String} date - Date to process
 * @returns {Object} Object with start and end of day
 */
const getDayBoundaries = (date) => {
  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  return {
    start: startOfDay(parsedDate),
    end: endOfDay(parsedDate),
  };
};

/**
 * Get dates for the next n days starting from a specific date
 * @param {Number} days - Number of days to get
 * @param {Date|String} startDate - Starting date (default: today)
 * @returns {Array} Array of date objects
 */
const getNextDays = (days, startDate = new Date()) => {
  const start = typeof startDate === "string" ? parseISO(startDate) : startDate;
  const dates = [];

  for (let i = 0; i < days; i++) {
    dates.push(addDays(start, i));
  }

  return dates;
};

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param {Date|String} date - Date to check
 * @returns {Boolean} True if date is a weekend
 */
const isWeekend = (date) => {
  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  const day = getDay(parsedDate);
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

/**
 * Parse a time string into hours and minutes
 * @param {String} timeStr - Time string in format HH:MM
 * @returns {Object} Object with hours and minutes
 */
const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
};

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  generateTimeSlots,
  getDaysOfWeek,
  isToday,
  calculateAge,
  getDayBoundaries,
  getNextDays,
  isWeekend,
  parseTime,
};
