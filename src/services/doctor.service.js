const { PrismaClient } = require("@prisma/client");
const { NotFoundError, BadRequestError } = require("../utils/errors");
const fileService = require("./file.service");

const prisma = new PrismaClient();

/**
 * Service for managing doctors
 */
class DoctorService {
  /**
   * Create a doctor
   * @param {Object} doctorData - Doctor data
   * @param {string} doctorData.userId - Associated user ID
   * @param {string} doctorData.practiceId - Practice ID
   * @param {string} doctorData.title - Doctor title (Dr., Prof., etc.)
   * @param {string} doctorData.specialtyId - Medical specialty ID
   * @param {string} doctorData.bio - Doctor biography
   * @param {number} doctorData.yearsExperience - Years of experience
   * @param {Array<string>} doctorData.education - Education history
   * @param {Array<string>} doctorData.certifications - Professional certifications
   * @param {boolean} doctorData.acceptingNewPatients - Whether accepting new patients
   * @param {Object} [profileImage] - Doctor profile image file
   * @returns {Promise<Object>} Created doctor
   */
  async createDoctor(doctorData, profileImage) {
    const {
      userId,
      practiceId,
      title,
      specialtyId,
      bio,
      yearsExperience,
      education,
      certifications,
      acceptingNewPatients,
    } = doctorData;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Check if practice exists
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
    });

    if (!practice) {
      throw new NotFoundError(`Practice with ID ${practiceId} not found`);
    }

    // Check if specialty exists
    if (specialtyId) {
      const specialty = await prisma.specialty.findUnique({
        where: { id: specialtyId },
      });

      if (!specialty) {
        throw new NotFoundError(`Specialty with ID ${specialtyId} not found`);
      }
    }

    // Check if doctor already exists for this user
    const existingDoctor = await prisma.doctor.findUnique({
      where: { userId },
    });

    if (existingDoctor) {
      throw new BadRequestError(
        `Doctor profile already exists for user ${userId}`
      );
    }

    // Upload profile image if provided
    let profileImageUrl = null;
    if (profileImage) {
      profileImageUrl = await fileService.uploadDoctorImage(
        profileImage,
        userId
      );
    }

    // Create doctor
    const doctor = await prisma.doctor.create({
      data: {
        user: { connect: { id: userId } },
        practice: { connect: { id: practiceId } },
        title,
        bio,
        yearsExperience,
        education: education || [],
        certifications: certifications || [],
        acceptingNewPatients: acceptingNewPatients ?? true,
        profileImageUrl,
        ...(specialtyId && { specialty: { connect: { id: specialtyId } } }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        specialty: true,
      },
    });

    // Add the user to the practice if not already added
    await prisma.practice.update({
      where: { id: practiceId },
      data: {
        users: {
          connect: { id: userId },
        },
      },
    });

    return doctor;
  }

  /**
   * Get all doctors for a practice
   * @param {string} practiceId - Practice ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search term for name
   * @param {string} options.specialtyId - Filter by specialty
   * @returns {Promise<Object>} Doctors and pagination metadata
   */
  async getDoctorsByPractice(practiceId, options = {}) {
    const { page = 1, limit = 10, search = "", specialtyId } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      practiceId,
      ...(specialtyId && { specialtyId }),
      ...(search && {
        user: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
      }),
    };

    // Get doctors with pagination
    const [doctors, totalCount] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { user: { lastName: "asc" } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          specialty: true,
          _count: {
            select: {
              appointments: true,
            },
          },
        },
      }),
      prisma.doctor.count({ where }),
    ]);

    return {
      doctors,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get doctor by ID
   * @param {string} id - Doctor ID
   * @returns {Promise<Object>} Doctor
   */
  async getDoctorById(id) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        specialty: true,
        practice: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundError(`Doctor with ID ${id} not found`);
    }

    return doctor;
  }

  /**
   * Update doctor
   * @param {string} id - Doctor ID
   * @param {Object} doctorData - Updated doctor data
   * @param {Object} [profileImage] - Updated profile image
   * @returns {Promise<Object>} Updated doctor
   */
  async updateDoctor(id, doctorData, profileImage) {
    // Check if doctor exists
    const doctor = await this.getDoctorById(id);

    // Handle specialty update
    let specialtyConnect = {};
    if (doctorData.specialtyId) {
      // Check if specialty exists
      const specialty = await prisma.specialty.findUnique({
        where: { id: doctorData.specialtyId },
      });

      if (!specialty) {
        throw new NotFoundError(
          `Specialty with ID ${doctorData.specialtyId} not found`
        );
      }

      specialtyConnect = {
        specialty: { connect: { id: doctorData.specialtyId } },
      };
    }

    // Upload new profile image if provided
    let profileImageUrl = doctor.profileImageUrl;
    if (profileImage) {
      profileImageUrl = await fileService.uploadDoctorImage(
        profileImage,
        doctor.userId
      );

      // Delete old image if it exists
      if (doctor.profileImageUrl) {
        await fileService.deleteFile(doctor.profileImageUrl);
      }
    }

    // Prepare data for update
    const updateData = {};

    // Only include fields that are provided
    if (doctorData.title !== undefined) updateData.title = doctorData.title;
    if (doctorData.bio !== undefined) updateData.bio = doctorData.bio;
    if (doctorData.yearsExperience !== undefined)
      updateData.yearsExperience = doctorData.yearsExperience;
    if (doctorData.education !== undefined)
      updateData.education = doctorData.education;
    if (doctorData.certifications !== undefined)
      updateData.certifications = doctorData.certifications;
    if (doctorData.acceptingNewPatients !== undefined)
      updateData.acceptingNewPatients = doctorData.acceptingNewPatients;
    if (profileImageUrl !== doctor.profileImageUrl)
      updateData.profileImageUrl = profileImageUrl;

    // Update doctor
    const updatedDoctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...updateData,
        ...specialtyConnect,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        specialty: true,
        practice: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return updatedDoctor;
  }

  /**
   * Delete doctor
   * @param {string} id - Doctor ID
   * @returns {Promise<void>}
   */
  async deleteDoctor(id) {
    // Check if doctor exists
    const doctor = await this.getDoctorById(id);

    // Delete profile image if it exists
    if (doctor.profileImageUrl) {
      await fileService.deleteFile(doctor.profileImageUrl);
    }

    // Delete doctor
    await prisma.doctor.delete({
      where: { id },
    });
  }

  /**
   * Get doctor's available time slots
   * @param {string} doctorId - Doctor ID
   * @param {Date} date - Date to check availability
   * @returns {Promise<Array>} Available time slots
   */
  async getDoctorAvailability(doctorId, date) {
    // Format date to YYYY-MM-DD
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // Get doctor's schedule for the day
    const schedule = await prisma.schedule.findFirst({
      where: {
        doctorId,
        date: formattedDate,
      },
    });

    // If no schedule is found, doctor is not working that day
    if (!schedule) {
      return [];
    }

    // Get all appointments for the doctor on that date
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        startTime: {
          gte: new Date(`${formattedDate}T00:00:00Z`),
          lt: new Date(`${formattedDate}T23:59:59Z`),
        },
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Generate available slots based on schedule and existing appointments
    const startTime = new Date(`${formattedDate}T${schedule.startTime}`);
    const endTime = new Date(`${formattedDate}T${schedule.endTime}`);
    const slotDuration = schedule.slotDuration || 30; // Default 30 minutes

    const slots = [];
    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEndTime = new Date(
        currentTime.getTime() + slotDuration * 60000
      );

      // Check if slot overlaps with any appointment
      const isBooked = appointments.some((appointment) => {
        const appointmentStart = new Date(appointment.startTime);
        const appointmentEnd = new Date(appointment.endTime);
        return (
          (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
          (slotEndTime > appointmentStart && slotEndTime <= appointmentEnd) ||
          (currentTime <= appointmentStart && slotEndTime >= appointmentEnd)
        );
      });

      // Add slot if not booked
      if (!isBooked) {
        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(slotEndTime),
        });
      }

      // Move to next slot
      currentTime = new Date(slotEndTime);
    }

    return slots;
  }
}

module.exports = new DoctorService();
