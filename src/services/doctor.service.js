const db = require("../db");
const { doctors } = require("../schema/doctor");
const { users } = require("../schema/user");
const { practices } = require("../schema/practice");
const userService = require("../services/user.service");
const emailService = require("../services/email.service");
const { eq, and, or, like, asc, sql } = require("drizzle-orm");
const { nanoid } = require("nanoid");

function createDoctorData(data) {
  return {
    id: data.userId, // id must match the user's id
    practiceId: data.practiceId,
    specialty: data.specialty,
    bio: data.bio || null,
    qualifications: data.qualifications || null,
    hpcsa: data.hpcsa || null,
    experience: data.experience || null,
    languages: data.languages || null,
    telehealth: data.telehealth || null,
    status: data.status || 'pending',
    profilePicUrl: data.profilePicUrl || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
  };
}

// Validation function for doctor data
function validateDoctorData(data) {
  const errors = [];
  if (!data.email || typeof data.email !== 'string') errors.push('Email is required');
  if (!data.firstName || typeof data.firstName !== 'string') errors.push('First name is required');
  if (!data.lastName || typeof data.lastName !== 'string') errors.push('Last name is required');
  if (!data.specialty || typeof data.specialty !== 'string') errors.push('Specialty is required');
  if (!data.phone || typeof data.phone !== 'string') errors.push('Phone number is required');
  return errors;
}

class DoctorService {
  async getAllDoctors(filters = {}) {
    try {
      const { page = 1, limit = 20, search } = filters;
      const offset = (page - 1) * limit;

      const whereConditions = [eq(users.role, "doctor")];
      if (search) {
        whereConditions.push(
          or(
            like(users.firstName, `${search}%`),
            like(users.lastName, `${search}%`)
          )
        );
      }

      // Join doctors with users and filter by user role 'doctor'
      const allDoctors = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phone, // Get phone from users table as 'phone'
          role: users.role,
          phone: users.phone,
          doctorId: doctors.id,
          practiceId: doctors.practiceId,
          specialty: doctors.specialty,
          bio: doctors.bio,
          qualifications: doctors.qualifications,
          hpcsa: doctors.hpcsa,
          experience: doctors.experience,
          languages: doctors.languages,
          telehealth: doctors.telehealth,
          status: doctors.status,
          profilePicUrl: doctors.profilePicUrl,
          isActive: doctors.isActive,
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
          practiceName: practices.name, // Include practice name
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.id, users.id))
        .leftJoin(practices, eq(doctors.practiceId, practices.id))
        .where(and(...whereConditions))
        .orderBy(asc(users.firstName), asc(users.lastName))
        .limit(limit)
        .offset(offset);

      const totalResult = await db.select({ count: sql`count(*)` }).from(users).where(and(...whereConditions));
      const total = Number(totalResult[0]?.count) || 0;

      return {
        doctors: allDoctors,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("DoctorService: Error in getAllDoctors:", error);
      throw new Error("Failed to fetch doctors");
    }
  }

  async getDoctorById(doctorId) {
    try {
      const result = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phone,
          role: users.role,
          doctorId: doctors.id,
          specialty: doctors.specialty,
          practiceId: doctors.practiceId,
          hpcsa: doctors.hpcsa,
          experience: doctors.experience,
          bio: doctors.bio,
          qualifications: doctors.qualifications,
          languages: doctors.languages,
          telehealth: doctors.telehealth,
          status: doctors.status,
          isActive: doctors.isActive,
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.id, users.id))
        .where(eq(users.id, doctorId));
      if (result.length === 0) {
        return null;
      }
      return result[0];
    } catch (error) {
      console.error("Get doctor by ID error:", error);
      throw new Error("Failed to fetch doctor");
    }
  }

  async findDoctorByEmail(email) {
    try {
      const result = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phoneNumber: users.phone,
          role: users.role,
          doctorId: doctors.id,
          specialty: doctors.specialty,
          practiceId: doctors.practiceId,
          hpcsa: doctors.hpcsa,
          experience: doctors.experience,
          bio: doctors.bio,
          qualifications: doctors.qualifications,
          languages: doctors.languages,
          telehealth: doctors.telehealth,
          status: doctors.status,
          isActive: doctors.isActive,
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.id, users.id))
        .where(and(eq(users.email, email), eq(users.role, "doctor")));

      if (result.length === 0) {
        return null;
      }
      return result[0];
    } catch (error) {
      console.error("Find doctor by email error:", error);
      throw new Error("Failed to find doctor by email");
    }
  }

  async registerDoctor(doctorData) {
    try {
      // Validate required fields
      const validationErrors = validateDoctorData(doctorData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Use the user service to register doctor without password
      const userData = {
        email: doctorData.email,
        firstName: doctorData.firstName,
        lastName: doctorData.lastName,
        phone: doctorData.phone,
        password: doctorData.password, // Include password for user registration
        // Doctor-specific fields passed to userService for doctor record creation
        practiceId: doctorData.practiceId || null,
        specialty: doctorData.specialty,
        bio: doctorData.bio,
        qualifications: doctorData.qualifications,
        hpcsa: doctorData.hpcsa,
        experience: doctorData.experience,
        languages: doctorData.languages,
        telehealth: doctorData.telehealth,
        status: 'pending', // Explicitly set status to pending
        profilePicUrl: doctorData.profilePhoto || null,
      };

      const newDoctor = await userService.registerDoctorWithoutPassword(userData);

      // The newDoctor object returned from userService.registerDoctorWithoutPassword
      // should already contain all the necessary doctor fields including status.
      return {
        ...newDoctor,
        role: "doctor",
      };
    } catch (error) {
      console.error("Register doctor error:", error);
      throw error;
    }
  }

  async updateDoctor(doctorId, updateData) {
    try {
      const {
        firstName,
        lastName,
        phoneNumber,
        specialty,
        bio,
        qualifications,
        hpcsa,
        experience,
        languages,
        telehealth,
        practiceId,
        status,
      } = updateData;

      const currentDoctor = await this.getDoctorById(doctorId);
      if (!currentDoctor) {
        throw new Error("Doctor not found");
      }
      const oldStatus = currentDoctor.status;

      const updatedDoctor = await db.transaction(async (tx) => {
        // Update user information
        if (firstName || lastName || phoneNumber) {
          const userUpdateData = {};
          if (firstName) userUpdateData.firstName = firstName;
          if (lastName) userUpdateData.lastName = lastName;
          if (phoneNumber) userUpdateData.phone = phoneNumber;
          userUpdateData.updatedAt = new Date();

          await tx
            .update(users)
            .set(userUpdateData)
            .where(eq(users.id, doctorId));
        }

        // Update doctor information
        const doctorUpdateData = {};
        if (specialty) doctorUpdateData.specialty = specialty;
        if (bio !== undefined) doctorUpdateData.bio = bio;
        if (qualifications !== undefined)
          doctorUpdateData.qualifications = qualifications;
        if (hpcsa !== undefined) doctorUpdateData.hpcsa = hpcsa;
        if (experience !== undefined)
          doctorUpdateData.experience = experience
            ? parseInt(experience)
            : null;
        if (languages !== undefined) doctorUpdateData.languages = languages;
        if (telehealth !== undefined) doctorUpdateData.telehealth = telehealth;
        if (practiceId !== undefined) doctorUpdateData.practiceId = practiceId;
        if (status) doctorUpdateData.status = status;
        doctorUpdateData.updatedAt = new Date();

        await tx
          .update(doctors)
          .set(doctorUpdateData)
          .where(eq(doctors.id, doctorId));

        return await this.getDoctorById(doctorId);
      });

      if (oldStatus === 'pending' && status === 'active') {
        const passwordResetToken = await userService.generatePasswordResetToken(doctorId);
        await emailService.sendDoctorWelcomeEmail(
          updatedDoctor.email,
          updatedDoctor.firstName,
          passwordResetToken
        );
      }

      return updatedDoctor;
    } catch (error) {
      console.error("Failed to update doctor:", error);
      throw new Error("Failed to update doctor");
    }
  }

  async deleteDoctor(doctorId) {
    try {
      return await db.transaction(async (tx) => {
        // Delete doctor record
        await tx.delete(doctors).where(eq(doctors.id, doctorId));

        // Delete user record
        await tx.delete(users).where(eq(users.id, doctorId));

        return { success: true };
      });
    } catch (error) {
      throw new Error("Failed to delete doctor");
    }
  }
}

module.exports = new DoctorService();