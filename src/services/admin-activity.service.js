const { eq, desc, and, gte, lte } = require('drizzle-orm');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// Admin activity log table schema (we'll need to add this to the database)
const adminActivityLogs = {
  id: 'text',
  adminId: 'text',
  action: 'text',
  resource: 'text',
  resourceId: 'text',
  details: 'json',
  ipAddress: 'text',
  userAgent: 'text',
  timestamp: 'timestamp',
  success: 'boolean'
};

class AdminActivityService {
  constructor() {
    this.ACTIVITY_TYPES = {
      // User Management
      USER_CREATED: 'user_created',
      USER_UPDATED: 'user_updated',
      USER_DELETED: 'user_deleted',
      USER_STATUS_CHANGED: 'user_status_changed',
      
      // Admin Management
      ADMIN_CREATED: 'admin_created',
      ADMIN_UPDATED: 'admin_updated',
      ADMIN_DELETED: 'admin_deleted',
      ADMIN_PERMISSION_GRANTED: 'admin_permission_granted',
      ADMIN_PERMISSION_REVOKED: 'admin_permission_revoked',
      
      // Practice Management
      PRACTICE_CREATED: 'practice_created',
      PRACTICE_UPDATED: 'practice_updated',
      PRACTICE_DELETED: 'practice_deleted',
      
      // Doctor Management
      DOCTOR_CREATED: 'doctor_created',
      DOCTOR_UPDATED: 'doctor_updated',
      DOCTOR_DELETED: 'doctor_deleted',
      DOCTOR_VERIFIED: 'doctor_verified',
      
      // Session Management
      SESSION_REVOKED: 'session_revoked',
      SESSION_VIEWED: 'session_viewed',
      
      // System Management
      SYSTEM_SETTINGS_CHANGED: 'system_settings_changed',
      PERMISSIONS_CHANGED: 'permissions_changed',
      DEPARTMENT_CREATED: 'department_created',
      DEPARTMENT_UPDATED: 'department_updated',
      
      // Security Events
      LOGIN_ATTEMPT: 'login_attempt',
      LOGIN_SUCCESS: 'login_success',
      LOGIN_FAILED: 'login_failed',
      LOGOUT: 'logout',
      PASSWORD_CHANGED: 'password_changed',
      
      // Data Access
      DATA_EXPORTED: 'data_exported',
      DATA_IMPORTED: 'data_imported',
      AUDIT_LOG_ACCESSED: 'audit_log_accessed'
    };
  }

  // Log admin activity
  async logActivity(adminId, action, resource = null, resourceId = null, details = {}, req = null) {
    try {
      const activityId = uuidv4();
      const timestamp = new Date();
      
      const activityData = {
        id: activityId,
        adminId,
        action,
        resource,
        resourceId,
        details: JSON.stringify(details),
        ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
        userAgent: req?.get('User-Agent') || 'unknown',
        timestamp,
        success: true
      };

      // For now, we'll use console logging since we don't have the table created yet
      // In production, you would insert into the database
      console.log('Admin Activity:', {
        ...activityData,
        details: JSON.parse(activityData.details)
      });

      // TODO: Uncomment when admin_activity_logs table is created
      // await db.insert(adminActivityLogs).values(activityData);

      return activityId;
    } catch (error) {
      console.error('Error logging admin activity:', error);
      return null;
    }
  }

  // Log failed activity
  async logFailedActivity(adminId, action, resource = null, resourceId = null, error = null, req = null) {
    try {
      const activityId = uuidv4();
      const timestamp = new Date();
      
      const activityData = {
        id: activityId,
        adminId,
        action,
        resource,
        resourceId,
        details: JSON.stringify({
          error: error?.message || 'Unknown error',
          stack: error?.stack
        }),
        ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
        userAgent: req?.get('User-Agent') || 'unknown',
        timestamp,
        success: false
      };

      console.log('Admin Activity (Failed):', {
        ...activityData,
        details: JSON.parse(activityData.details)
      });

      // TODO: Uncomment when admin_activity_logs table is created
      // await db.insert(adminActivityLogs).values(activityData);

      return activityId;
    } catch (logError) {
      console.error('Error logging failed admin activity:', logError);
      return null;
    }
  }

  // Get admin activity logs
  async getAdminActivityLogs(adminId = null, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        action = null,
        resource = null,
        success = null,
        limit = 100,
        offset = 0
      } = options;

      // For now, return mock data since we don't have the table
      // In production, you would query the database
      const mockLogs = [
        {
          id: uuidv4(),
          adminId: adminId || 'admin-123',
          action: 'user_created',
          resource: 'user',
          resourceId: 'user-456',
          details: { email: 'test@example.com', role: 'doctor' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date(),
          success: true
        }
      ];

      return {
        logs: mockLogs,
        total: mockLogs.length,
        limit,
        offset
      };

      // TODO: Uncomment when admin_activity_logs table is created
      /*
      let query = db.select().from(adminActivityLogs);

      if (adminId) {
        query = query.where(eq(adminActivityLogs.adminId, adminId));
      }

      if (startDate) {
        query = query.where(gte(adminActivityLogs.timestamp, startDate));
      }

      if (endDate) {
        query = query.where(lte(adminActivityLogs.timestamp, endDate));
      }

      if (action) {
        query = query.where(eq(adminActivityLogs.action, action));
      }

      if (resource) {
        query = query.where(eq(adminActivityLogs.resource, resource));
      }

      if (success !== null) {
        query = query.where(eq(adminActivityLogs.success, success));
      }

      const logs = await query
        .orderBy(desc(adminActivityLogs.timestamp))
        .limit(limit)
        .offset(offset);

      const total = await db
        .select({ count: sql`count(*)` })
        .from(adminActivityLogs)
        .where(adminId ? eq(adminActivityLogs.adminId, adminId) : undefined);

      return {
        logs,
        total: total[0]?.count || 0,
        limit,
        offset
      };
      */
    } catch (error) {
      console.error('Error getting admin activity logs:', error);
      return {
        logs: [],
        total: 0,
        limit,
        offset
      };
    }
  }

  // Get activity statistics
  async getActivityStatistics(adminId = null, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // For now, return mock statistics
      // In production, you would query the database
      const mockStats = {
        totalActivities: 150,
        successfulActivities: 145,
        failedActivities: 5,
        activitiesByType: {
          'user_created': 25,
          'user_updated': 30,
          'user_deleted': 5,
          'doctor_verified': 20,
          'session_revoked': 15,
          'system_settings_changed': 3
        },
        activitiesByDay: Array.from({ length: days }, (_, i) => ({
          date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 10) + 1
        }))
      };

      return mockStats;

      // TODO: Implement real statistics when table is created
    } catch (error) {
      console.error('Error getting activity statistics:', error);
      return {
        totalActivities: 0,
        successfulActivities: 0,
        failedActivities: 0,
        activitiesByType: {},
        activitiesByDay: []
      };
    }
  }

  // Get admin dashboard data
  async getAdminDashboard(adminId) {
    try {
      const [recentActivities, statistics] = await Promise.all([
        this.getAdminActivityLogs(adminId, { limit: 10 }),
        this.getActivityStatistics(adminId, 7)
      ]);

      return {
        recentActivities: recentActivities.logs,
        statistics,
        lastLogin: new Date(), // TODO: Get from actual data
        permissions: [], // TODO: Get from permission service
        department: null // TODO: Get from permission service
      };
    } catch (error) {
      console.error('Error getting admin dashboard:', error);
      return {
        recentActivities: [],
        statistics: {
          totalActivities: 0,
          successfulActivities: 0,
          failedActivities: 0,
          activitiesByType: {},
          activitiesByDay: []
        },
        lastLogin: null,
        permissions: [],
        department: null
      };
    }
  }

  // Create activity log table (for database migration)
  getCreateTableSQL() {
    return `
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT,
        resource_id TEXT,
        details JSONB,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        success BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);
      CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_timestamp ON admin_activity_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_resource ON admin_activity_logs(resource);
    `;
  }
}

module.exports = new AdminActivityService();
