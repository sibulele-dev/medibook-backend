const db = require("../db");
const { doctors, createDoctorData } = require("../schema/doctor");
const { users, createUser } = require("../schema/user");
const { eq } = require("drizzle-orm");
const bcrypt = require("bcryptjs");

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
    // doctorData: { email, password, firstName, lastName, specialization, phoneNumber, practiceId, ... }
    const {
      email,
      password,
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
      !password ||
      !firstName ||
      !lastName ||
      !specialization ||
      !phoneNumber ||
      !practiceId
    ) {
      throw new Error("Missing required fields");
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    return await db.transaction(async (tx) => {
      // Create user
      const newUser = createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "doctor",
        isActive: true,
        emailVerified: false,
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
