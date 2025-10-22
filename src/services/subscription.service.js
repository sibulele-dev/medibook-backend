const db = require("../db");
const { subscriptions } = require("../schema/subscription");
const { doctors } = require("../schema/doctor");
const { users } = require("../schema/user");
const { eq, and, or, like, desc, asc, count } = require("drizzle-orm");

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
}

module.exports = new SubscriptionService();
