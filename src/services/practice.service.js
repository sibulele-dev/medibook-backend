const db = require("../db");
const { practices } = require("../schema");
const { doctors } = require("../schema/doctor");
const { users } = require("../schema/user");
const { eq, like, desc, asc, and, or, count, sql } = require("drizzle-orm");
const { nanoid } = require("nanoid");

// Helper function to validate practice data
const validatePracticeData = (data) => {
  const errors = {};

  if (!data.name?.trim()) {
    errors.name = "Practice name is required";
  }

  if (!data.address?.trim()) {
    errors.address = "Practice address is required";
  }

  if (!data.phone?.trim()) {
    errors.phone = "Practice phone is required";
  }

  if (!data.practiceNumber?.trim()) {
    errors.practiceNumber = "Practice number is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Helper function to create practice data
const createPracticeData = (practiceData) => {
  return {
    id: nanoid(25),
    name: practiceData.name,
    address: practiceData.address,
    city: practiceData.city || null,
    province: practiceData.state || null, // Map state to province
    zip: practiceData.zip || null,
    country: practiceData.country || null,
    phone: practiceData.phone,
    practiceContact: practiceData.practiceContact || null,
    practiceNumber: practiceData.practiceNumber || `PRAC-${nanoid(8)}`, // Generate if not provided
    status: practiceData.status || "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Helper function to update practice data
const updatePracticeData = (practiceData) => {
  const updateData = {
    updatedAt: new Date().toISOString(),
  };

  if (practiceData.name !== undefined) updateData.name = practiceData.name;
  if (practiceData.address !== undefined)
    updateData.address = practiceData.address;
  if (practiceData.city !== undefined) updateData.city = practiceData.city;
  if (practiceData.state !== undefined)
    updateData.province = practiceData.state; // Map state to province
  if (practiceData.zip !== undefined) updateData.zip = practiceData.zip;
  if (practiceData.country !== undefined)
    updateData.country = practiceData.country;
  if (practiceData.phone !== undefined) updateData.phone = practiceData.phone;
  if (practiceData.practiceContact !== undefined)
    updateData.practiceContact = practiceData.practiceContact;
  if (practiceData.practiceNumber !== undefined)
    updateData.practiceNumber = practiceData.practiceNumber;
  if (practiceData.status !== undefined)
    updateData.status = practiceData.status;

  return updateData;
};

class PracticeService {
  // Check if practices table exists
  async checkTableExists() {
    try {
      const result = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'practices'
        );
      `);
      return result[0]?.exists || false;
    } catch (error) {
      console.error("Error checking if practices table exists:", error);
      return false;
    }
  }

  // Get all practices with pagination and filters
  async getAllPractices(filters = {}) {
    try {
      const { page = 1, limit = 10, search, status } = filters;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [];

      if (search) {
        whereConditions.push(
          or(
            like(practices.name, `%${search}%`),
            like(practices.address, `%${search}%`),
            like(practices.phone, `%${search}%`)
          )
        );
      }

      if (status) {
        whereConditions.push(eq(practices.status, status));
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get practices with doctor count (explicit fields)
      const practicesList = await db
        .select({
          id: practices.id,
          name: practices.name,
          address: practices.address,
          city: practices.city,
          province: practices.province,
          zip: practices.zip,
          country: practices.country,
          phone: practices.phone,
          practiceContact: practices.practiceContact,
          practiceNumber: practices.practiceNumber,
          status: practices.status,
          createdAt: practices.createdAt,
          updatedAt: practices.updatedAt,
          doctorCount: sql`COUNT(doctors.id)`,
        })
        .from(practices)
        .leftJoin(doctors, eq(practices.id, doctors.practiceId))
        .where(whereClause)
        .groupBy(
          practices.id,
          practices.name,
          practices.address,
          practices.city,
          practices.province,
          practices.zip,
          practices.country,
          practices.phone,
          practices.practiceContact,
          practices.practiceNumber,
          practices.status,
          practices.createdAt,
          practices.updatedAt
        )
        .orderBy(desc(practices.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count using sql template
      const totalResult = await db
        .select({ count: sql`count(*)` })
        .from(practices)
        .where(whereClause);

      const total = Number(totalResult[0]?.count) || 0;

      return {
        practices: practicesList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get all practices error:", error);
      throw new Error("Failed to fetch practices");
    }
  }

  // Get practice by ID
  async getPracticeById(id) {
    try {
      const practice = await db
        .select()
        .from(practices)
        .where(eq(practices.id, id))
        .limit(1);

      return practice[0] || null;
    } catch (error) {
      console.error("Get practice by ID error:", error);
      throw new Error("Failed to fetch practice");
    }
  }

  // Create new practice
  async createPractice(practiceData) {
    try {
      console.log("Creating practice with data:", practiceData);

      // Check if practices table exists
      const tableExists = await this.checkTableExists();
      if (!tableExists) {
        console.error("Practices table does not exist");
        throw new Error(
          "Database table 'practices' does not exist. Please run database migrations."
        );
      }

      // Validate practice data
      const validationErrors = validatePracticeData(practiceData);
      if (validationErrors.length > 0) {
        console.log("Validation errors:", validationErrors);
        throw new Error(validationErrors.join(", "));
      }

      // Create practice data
      const newPracticeData = createPracticeData(practiceData);
      console.log("Processed practice data:", newPracticeData);

      // Test database connection first
      try {
        await db.execute("SELECT 1 as test");
        console.log("Database connection test successful");
      } catch (dbError) {
        console.error("Database connection test failed:", dbError);
        throw new Error("Database connection failed");
      }

      // Insert practice
      const result = await db
        .insert(practices)
        .values(newPracticeData)
        .returning();

      console.log("Practice created successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Create practice error:", error);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }

  // Update practice
  async updatePractice(id, updateData) {
    try {
      // Check if practice exists
      const existingPractice = await db
        .select()
        .from(practices)
        .where(eq(practices.id, id))
        .limit(1);

      if (existingPractice.length === 0) {
        return null;
      }

      // Update practice data
      const updatedData = updatePracticeData(updateData);

      // Update practice
      const result = await db
        .update(practices)
        .set(updatedData)
        .where(eq(practices.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error("Update practice error:", error);
      throw error;
    }
  }

  // Delete practice
  async deletePractice(id) {
    try {
      // Check if practice exists
      const existingPractice = await db
        .select()
        .from(practices)
        .where(eq(practices.id, id))
        .limit(1);

      if (existingPractice.length === 0) {
        return null;
      }

      // For now, we'll allow deletion without checking for related data
      // In a real application, you might want to check for doctors and appointments
      // and either prevent deletion or cascade delete

      const result = await db
        .delete(practices)
        .where(eq(practices.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error("Delete practice error:", error);
      throw error;
    }
  }

  // Get practice statistics
  async getPracticeStats() {
    try {
      const [totalPractices, activePractices, totalDoctors] = await Promise.all(
        [
          // Total practices
          db.select({ count: sql`count(*)` }).from(practices),

          // Active practices
          db
            .select({ count: sql`count(*)` })
            .from(practices)
            .where(eq(practices.status, "active")),

          // Total doctors (from users table)
          db
            .select({ count: sql`count(*)` })
            .from(users)
            .where(eq(users.role, "doctor")),
        ]
      );

      return {
        totalPractices: Number(totalPractices[0]?.count) || 0,
        activePractices: Number(activePractices[0]?.count) || 0,
        totalDoctors: Number(totalDoctors[0]?.count) || 0,
        totalAppointments: 0, // Placeholder - would need appointments table
      };
    } catch (error) {
      console.error("Get practice stats error:", error);
      throw new Error("Failed to fetch practice statistics");
    }
  }

  // Search practices
  async searchPractices(searchTerm) {
    try {
      const practicesList = await db
        .select()
        .from(practices)
        .where(
          or(
            like(practices.name, `%${searchTerm}%`),
            like(practices.address, `%${searchTerm}%`)
          )
        )
        .orderBy(asc(practices.name));

      return practicesList;
    } catch (error) {
      console.error("Search practices error:", error);
      throw new Error("Failed to search practices");
    }
  }
}

module.exports = new PracticeService();
