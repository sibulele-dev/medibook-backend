const db = require("../db");
const { doctors, createDoctorData } = require("../schema/doctor");
const { users, createUser } = require("../schema/user");
const { eq } = require("drizzle-orm");

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
          doctorId: doctors.id,
          specialization: doctors.specialization,
          phoneNumber: doctors.phoneNumber,
          practiceId: doctors.practiceId,
          licenseNumber: doctors.licenseNumber,
          experience: doctors.experience,
          bio: doctors.bio,
          isActive: doctors.isActive,
          createdAt: doctors.createdAt,
          updatedAt: doctors.updatedAt,
        })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(users.role, "doctor"));
      return allDoctors;
    } catch (error) {
      throw new Error("Failed to fetch doctors");
    }
  }

  async registerDoctor(doctorData) {
    // doctorData: { email, firstName, lastName, specialization, phoneNumber, practiceId, ... }
    const {
      email,
      firstName,
      lastName,
      specialization,
      phoneNumber,
      practiceId,
      licenseNumber,
      experience,
      bio,
    } = doctorData;
    if (
      !email ||
      !firstName ||
      !lastName ||
      !specialization ||
      !phoneNumber ||
      !practiceId
    ) {
      throw new Error("Missing required fields");
    }

    return await db.transaction(async (tx) => {
      // Create user (password will be handled by Supabase)
      const newUser = createUser({
        email,
        firstName,
        lastName,
        role: "doctor",
        isActive: true,
        emailVerified: true, // Supabase handles email verification
      });
      const [insertedUser] = await tx.insert(users).values(newUser).returning();

      // Create doctor
      const newDoctor = createDoctorData({
        userId: insertedUser.id,
        specialization,
        phoneNumber,
        practiceId,
        licenseNumber,
        experience,
        bio,
        isActive: true,
      });
      const [insertedDoctor] = await tx
        .insert(doctors)
        .values(newDoctor)
        .returning();
      return {
        ...insertedUser,
        ...insertedDoctor,
      };
    });
  }
}

module.exports = new DoctorService();
