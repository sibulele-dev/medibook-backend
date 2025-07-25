const db = require("../db");
const { doctors } = require("../schema/doctor");
const { users } = require("../schema/user");
const { createUser, hashPassword } = require("../services/user.service");
const { eq } = require("drizzle-orm");
const { nanoid } = require("nanoid");

function createDoctorData(data) {
  return {
    id: data.userId, // id must match the user's id
    practiceId: data.practiceId,
    specialty: data.specialty,
    bio: data.bio || null,
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
  if (!data.phoneNumber || typeof data.phoneNumber !== 'string') errors.push('Phone number is required');
  if (!data.practiceId || typeof data.practiceId !== 'string') errors.push('Practice ID is required');
  return errors;
}

class DoctorService {
  async getAllDoctors() {
    try {
      // Join doctors with users and filter by user role 'doctor'
      const allDoctors = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          phoneNumber: users.phoneNumber,
          doctorId: doctors.id,
          practiceId: doctors.practiceId,
          specialty: doctors.specialty,
          bio: doctors.bio,
          profilePicUrl: doctors.profilePicUrl,
          isActive: doctors.isActive,
          status: doctors.status,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.id, users.id))
        .where(eq(users.role, "doctor"));
      return allDoctors;
    } catch (error) {
      console.error("Get all doctors error:", error);
      throw new Error("Failed to fetch doctors");
    }
  }

  async registerDoctor(doctorData) {
    try {
      // 1. Validate input
      const validationErrors = validateDoctorData(doctorData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(", "));
      }

      // 2. Create user
      const passwordHash = await hashPassword("defaultPassword123");
      const newUser = createUser({
        email: doctorData.email,
        firstName: doctorData.firstName,
        lastName: doctorData.lastName,
        role: "doctor",
        isActive: true,
        emailVerified: true,
        passwordHash,
      });
      const [insertedUser] = await db.insert(users).values(newUser).returning();

      // 3. Prepare doctor data
      const newDoctor = createDoctorData({
        userId: insertedUser.id,
        specialty: doctorData.specialty,
        phoneNumber: doctorData.phoneNumber,
        practiceId: doctorData.practiceId,
        licenseNumber: doctorData.licenseNumber,
        experience: doctorData.experience,
        bio: doctorData.bio,
        isActive: true,
      });

      // 4. Insert doctor
      const [insertedDoctor] = await db.insert(doctors).values(newDoctor).returning();

      return {
        ...insertedUser,
        ...insertedDoctor,
      };
    } catch (error) {
      console.error("Register doctor error:", error);
      throw error;
    }
  }

  async getDoctorById(userId) {
    try {
      const doctor = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          phoneNumber: users.phoneNumber,
          doctorId: doctors.id,
          practiceId: doctors.practiceId,
          specialty: doctors.specialty,
          bio: doctors.bio,
          profilePicUrl: doctors.profilePicUrl,
          isActive: doctors.isActive,
          status: doctors.status,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.id, users.id))
        .where(eq(users.id, userId));
      if (!doctor || doctor.length === 0) {
        return null;
      }
      return doctor[0];
    } catch (error) {
      console.error("Get doctor by ID error:", error);
      throw new Error("Failed to fetch doctor");
    }
  }

  async updateDoctor(userId, updateData) {
    try {
      // Update users table
      await db.update(users)
        .set({
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          email: updateData.email,
          // Add other user fields as needed
        })
        .where(eq(users.id, userId));

      // Update doctors table
      await db.update(doctors)
        .set({
          specialty: updateData.specialty,
          practiceId: updateData.practiceId,
          bio: updateData.bio,
          profilePicUrl: updateData.profilePicUrl,
          isActive: updateData.isActive,
          // Add other doctor fields as needed
        })
        .where(eq(doctors.id, userId));

      // Return the updated doctor
      return this.getDoctorById(userId);
    } catch (error) {
      console.error("Update doctor error:", error);
      throw new Error("Failed to update doctor");
    }
  }

  async deleteDoctor(userId) {
    try {
      // Delete from doctors table first (FK constraint)
      await db.delete(doctors).where(eq(doctors.id, userId));
      // Then delete from users table
      await db.delete(users).where(eq(users.id, userId));
      return { success: true };
    } catch (error) {
      console.error("Delete doctor error:", error);
      throw new Error("Failed to delete doctor");
    }
  }
}

module.exports = new DoctorService();
