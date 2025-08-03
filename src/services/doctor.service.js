const db = require("../db");
const { doctors, users } = require("../schema");
const { eq } = require("drizzle-orm");
const { nanoid } = require("nanoid");
const emailService = require("./email.service");

// Helper function to create a new user object
const createUser = (userData) => {
  return {
    ...userData,
    id: nanoid(25),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Helper function to create doctor data
const createDoctorData = (doctorData) => {
  return {
    ...doctorData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

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
          phoneNumber: users.phone, // Get phone from users table as 'phone'
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
        .where(eq(users.role, "doctor"));
      return allDoctors;
    } catch (error) {
      throw new Error("Failed to fetch doctors");
    }
  }

  async getDoctorById(doctorId) {
    try {
      const [doctor] = await db
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
        .where(eq(doctors.id, doctorId));

      return doctor;
    } catch (error) {
      throw new Error("Failed to fetch doctor");
    }
  }

  async registerDoctor(doctorData) {
    // doctorData: { email, firstName, lastName, specialty, phoneNumber, practiceId, bio, qualifications, hpcsa, experience, languages, telehealth }
    const {
      email,
      firstName,
      lastName,
      specialty,
      phoneNumber,
      practiceId,
      bio,
      qualifications,
      hpcsa,
      experience,
      languages,
      telehealth,
    } = doctorData;

    if (!email || !firstName || !lastName || !specialty || !phoneNumber) {
      throw new Error(
        "Missing required fields: email, firstName, lastName, specialty, phoneNumber"
      );
    }

    return await db.transaction(async (tx) => {
      // Create user without password (will be set later)
      const newUser = createUser({
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        phone: phoneNumber,
        role: "doctor",
        isActive: true,
        emailVerified: false, // Will be verified when they set password
        passwordHash: null, // No password initially
      });

      const [insertedUser] = await tx.insert(users).values(newUser).returning();

      // Create doctor record
      const newDoctor = createDoctorData({
        id: insertedUser.id, // Use the same ID as the user
        specialty,
        practiceId: practiceId || null,
        bio: bio || null,
        qualifications: qualifications || null,
        hpcsa: hpcsa || null,
        experience: experience ? parseInt(experience) : null,
        languages: languages || null,
        telehealth: telehealth || null,
        status: "pending",
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
      } = updateData;

      return await db.transaction(async (tx) => {
        // Update user information
        if (firstName || lastName || phoneNumber) {
          const userUpdateData = {};
          if (firstName) userUpdateData.firstName = firstName;
          if (lastName) userUpdateData.lastName = lastName;
          if (phoneNumber) userUpdateData.phone = phoneNumber;
          userUpdateData.updatedAt = new Date().toISOString();

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
        doctorUpdateData.updatedAt = new Date().toISOString();

        await tx
          .update(doctors)
          .set(doctorUpdateData)
          .where(eq(doctors.id, doctorId));

        return await this.getDoctorById(doctorId);
      });
    } catch (error) {
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
