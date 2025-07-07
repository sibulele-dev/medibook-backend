const db = require("../db");
const {
  practices,
  users,
  validatePracticeData,
  createPracticeData,
  updatePracticeData,
} = require("../schema");
const { eq, like, desc, asc, and, or, count, sql } = require("drizzle-orm");

class PracticeService {
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

      // Get practices with pagination
      const practicesList = await db
        .select()
        .from(practices)
        .where(whereClause)
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
      // Validate practice data
      const validationErrors = validatePracticeData(practiceData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(", "));
      }

      // Create practice data
      const newPracticeData = createPracticeData(practiceData);

      // Insert practice
      const result = await db
        .insert(practices)
        .values(newPracticeData)
        .returning();

      return result[0];
    } catch (error) {
      console.error("Create practice error:", error);
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
