const db = require("../db");
const { subscriptions } = require("../schema/subscription");
const { doctors } = require("../schema/doctor");
const { users } = require("../schema/user");
const { appointments } = require("../schema/appointment");
const { practices } = require("../schema/practice");
const { eq, and, or, like, desc, asc, count, gte, lte } = require("drizzle-orm");

class SubscriptionService {
  async getAllSubscriptions(filters = {}) {
    try {
      const { page = 1, limit = 20, search, status, planName } = filters;
      const offset = (page - 1) * limit;

      const whereConditions = [];

      if (search) {
        whereConditions.push(
          or(
            like(users.firstName, `${search}%`),
            like(users.lastName, `${search}%`)
          )
        );
      }

      if (status) {
        whereConditions.push(eq(subscriptions.status, status));
      }

      if (planName) {
        whereConditions.push(eq(subscriptions.planName, planName));
      }

      const subscriptionsList = await db
        .select({
          id: subscriptions.id,
          planName: subscriptions.planName,
          status: subscriptions.status,
          startDate: subscriptions.startDate,
          endDate: subscriptions.endDate,
          doctorName: users.firstName,
          doctorLastName: users.lastName,
        })
        .from(subscriptions)
        .innerJoin(doctors, eq(subscriptions.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.id, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(subscriptions.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db.select({ count: count() }).from(subscriptions).where(and(...whereConditions));
      const total = Number(totalResult[0]?.count) || 0;

      return {
        subscriptions: subscriptionsList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get all subscriptions error:", error);
      throw new Error("Failed to fetch subscriptions");
    }
  }

  async createSubscription(subscriptionDetails) {
    const [newSubscription] = await db
      .insert(subscriptions)
      .values(subscriptionDetails)
      .returning();
    return newSubscription;
  }

  async getSubscriptionByDoctorId(doctorId) {
    try {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.doctorId, doctorId),
        orderBy: [desc(subscriptions.createdAt)],
      });
      return subscription;
    } catch (error) {
      console.error("Get subscription by doctor ID error:", error);
      throw new Error("Failed to fetch subscription");
    }
  }

  async updateSubscriptionStatus(subscriptionId, status) {
    try {
      await db
        .update(subscriptions)
        .set({ status, updatedAt: new Date() })
        .where(eq(subscriptions.id, subscriptionId));
    } catch (error) {
      console.error("Update subscription status error:", error);
      throw new Error("Failed to update subscription status");
    }
  }

  // Get appointment count for a specific period
  async getAppointmentCountForPeriod(doctorId, startDate, endDate) {
    try {
      const result = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            gte(appointments.createdAt, startDate),
            lte(appointments.createdAt, endDate)
          )
        );
      
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Get appointment count error:", error);
      throw new Error("Failed to get appointment count");
    }
  }

  // Get practitioner count for a practice
  async getPractitionerCount(doctorId) {
    try {
      // For now, we'll assume each doctor is a practitioner
      // In a real system, you might have a separate practitioners table
      const result = await db
        .select({ count: count() })
        .from(doctors)
        .where(eq(doctors.id, doctorId));
      
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Get practitioner count error:", error);
      throw new Error("Failed to get practitioner count");
    }
  }

  // Get clinic count for a doctor
  async getClinicCount(doctorId) {
    try {
      const result = await db
        .select({ count: count() })
        .from(practices)
        .where(eq(practices.doctorId, doctorId));
      
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Get clinic count error:", error);
      throw new Error("Failed to get clinic count");
    }
  }

  // Get reminder count for a specific period
  async getReminderCountForPeriod(doctorId, startDate, endDate) {
    try {
      // This would need to be implemented based on your reminder system
      // For now, we'll return 0 as a placeholder
      // You might have a separate reminders table or track this in appointments
      return 0;
    } catch (error) {
      console.error("Get reminder count error:", error);
      throw new Error("Failed to get reminder count");
    }
  }
}

module.exports = new SubscriptionService();
