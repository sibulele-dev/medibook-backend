const { eq, and, inArray } = require('drizzle-orm');
const db = require('../db');
const { admins, permissions, adminPermissions, departments, users } = require('../schema');
const { v4: uuidv4 } = require('uuid');

class PermissionService {
  constructor() {
    this.ROLE_HIERARCHY = {
      'super_admin': ['admin', 'doctor'],
      'admin': ['doctor'],
      'doctor': []
    };

    this.DEPARTMENT_PERMISSIONS = {
      'super_admin': ['full_access'],
      'onboarding': [
        'add_practices',
        'add_doctors',
        'verify_doctor_details',
        'approve_numbers',
        'invite_users'
      ],
      'sales': [
        'manage_demo_bookings',
        'view_adoption_funnel',
        'communicate_potential_users',
        'access_analytics'
      ],
      'support': [
        'help_technical_issues',
        'reset_doctor_access',
        'monitor_sessions'
      ],
      'billing_accounts': [
        'manage_subscriptions',
        'view_update_billing',
        'send_invoices'
      ],
      'compliance': [
        'verify_credentials',
        'approve_hpcsa_bhf',
        'manage_document_verification'
      ]
    };
  }

  // Get user permissions based on role and department
  async getUserPermissions(userId) {
    try {
      // Get user role
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return [];
      }

      // If user is doctor, return basic permissions
      if (user.role === 'doctor') {
        return ['view_own_profile', 'update_own_profile', 'manage_own_appointments'];
      }

      // Get admin record with department
      const [adminRecord] = await db
        .select({
          departmentId: admins.departmentId,
          departmentName: departments.name
        })
        .from(admins)
        .leftJoin(departments, eq(admins.departmentId, departments.id))
        .where(eq(admins.id, userId))
        .limit(1);

      if (!adminRecord) {
        return [];
      }

      // Get department privileges
      const [departmentRecord] = await db
        .select({ privileges: departments.privileges })
        .from(departments)
        .where(eq(departments.id, adminRecord.departmentId))
        .limit(1);

      let permissions = [];

      if (departmentRecord) {
        permissions = departmentRecord.privileges;
      }

      // Add role-based permissions
      if (user.role === 'admin') {
        permissions.push('admin_access', 'view_users', 'manage_users');
      }

      if (user.role === 'super_admin') {
        permissions.push('super_admin_access', 'manage_admins', 'system_settings');
      }

      // Get individual permissions from admin_permissions table
      const individualPermissions = await db
        .select({ name: permissions.name })
        .from(adminPermissions)
        .leftJoin(permissions, eq(adminPermissions.permissionId, permissions.id))
        .where(eq(adminPermissions.adminId, userId));

      const individualPermissionNames = individualPermissions.map(p => p.name);
      permissions = [...new Set([...permissions, ...individualPermissionNames])];

      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  // Check if user has specific permission
  async hasPermission(userId, permission) {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permission) || userPermissions.includes('full_access');
  }

  // Check if user has any of the specified permissions
  async hasAnyPermission(userId, requiredPermissions) {
    const userPermissions = await this.getUserPermissions(userId);
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission) || userPermissions.includes('full_access')
    );
  }

  // Check if user has all specified permissions
  async hasAllPermissions(userId, requiredPermissions) {
    const userPermissions = await this.getUserPermissions(userId);
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('full_access')
    );
  }

  // Get user's department
  async getUserDepartment(userId) {
    try {
      const [adminRecord] = await db
        .select({
          departmentId: admins.departmentId,
          departmentName: departments.name
        })
        .from(admins)
        .leftJoin(departments, eq(admins.departmentId, departments.id))
        .where(eq(admins.id, userId))
        .limit(1);

      return adminRecord || null;
    } catch (error) {
      console.error('Error getting user department:', error);
      return null;
    }
  }

  // Check if user belongs to specific department
  async isInDepartment(userId, departmentName) {
    const userDepartment = await this.getUserDepartment(userId);
    return userDepartment && userDepartment.departmentName === departmentName;
  }

  // Check role hierarchy
  hasRoleHierarchy(userRole, requiredRole) {
    if (userRole === requiredRole) return true;
    
    const userHierarchy = this.ROLE_HIERARCHY[userRole] || [];
    return userHierarchy.includes(requiredRole);
  }

  // Grant permission to admin
  async grantPermission(adminId, permissionName) {
    try {
      // Get or create permission
      let [permission] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.name, permissionName))
        .limit(1);

      if (!permission) {
        const permissionId = uuidv4();
        await db.insert(permissions).values({
          id: permissionId,
          name: permissionName,
          description: `Permission: ${permissionName}`
        });
        permission = { id: permissionId, name: permissionName };
      }

      // Check if permission already exists for admin
      const [existingPermission] = await db
        .select()
        .from(adminPermissions)
        .where(and(
          eq(adminPermissions.adminId, adminId),
          eq(adminPermissions.permissionId, permission.id)
        ))
        .limit(1);

      if (!existingPermission) {
        await db.insert(adminPermissions).values({
          adminId,
          permissionId: permission.id
        });
      }

      return true;
    } catch (error) {
      console.error('Error granting permission:', error);
      return false;
    }
  }

  // Revoke permission from admin
  async revokePermission(adminId, permissionName) {
    try {
      const [permission] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.name, permissionName))
        .limit(1);

      if (permission) {
        await db
          .delete(adminPermissions)
          .where(and(
            eq(adminPermissions.adminId, adminId),
            eq(adminPermissions.permissionId, permission.id)
          ));
      }

      return true;
    } catch (error) {
      console.error('Error revoking permission:', error);
      return false;
    }
  }

  // Get all permissions
  async getAllPermissions() {
    try {
      return await db.select().from(permissions);
    } catch (error) {
      console.error('Error getting all permissions:', error);
      return [];
    }
  }

  // Get admin's individual permissions
  async getAdminIndividualPermissions(adminId) {
    try {
      const adminPermissions = await db
        .select({ 
          id: permissions.id,
          name: permissions.name,
          description: permissions.description
        })
        .from(adminPermissions)
        .leftJoin(permissions, eq(adminPermissions.permissionId, permissions.id))
        .where(eq(adminPermissions.adminId, adminId));

      return adminPermissions;
    } catch (error) {
      console.error('Error getting admin individual permissions:', error);
      return [];
    }
  }

  // Create department with privileges
  async createDepartment(departmentName, privileges) {
    try {
      const departmentId = uuidv4();
      await db.insert(departments).values({
        id: departmentId,
        name: departmentName,
        privileges
      });
      return departmentId;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  }

  // Update department privileges
  async updateDepartmentPrivileges(departmentId, privileges) {
    try {
      await db
        .update(departments)
        .set({ privileges })
        .where(eq(departments.id, departmentId));
      return true;
    } catch (error) {
      console.error('Error updating department privileges:', error);
      return false;
    }
  }

  // Get all departments with their privileges
  async getAllDepartments() {
    try {
      return await db.select().from(departments);
    } catch (error) {
      console.error('Error getting all departments:', error);
      return [];
    }
  }

  // Seed default permissions
  async seedDefaultPermissions() {
    try {
      const defaultPermissions = [
        { name: 'view_users', description: 'View user information' },
        { name: 'create_users', description: 'Create new users' },
        { name: 'update_users', description: 'Update user information' },
        { name: 'delete_users', description: 'Delete users' },
        { name: 'manage_practices', description: 'Manage practice information' },
        { name: 'manage_doctors', description: 'Manage doctor profiles' },
        { name: 'view_analytics', description: 'View system analytics' },
        { name: 'manage_sessions', description: 'Manage user sessions' },
        { name: 'access_audit_logs', description: 'Access audit logs' },
        { name: 'system_settings', description: 'Modify system settings' },
        { name: 'manage_billing', description: 'Manage billing and payments' },
        { name: 'verify_credentials', description: 'Verify user credentials' }
      ];

      for (const permission of defaultPermissions) {
        const [existing] = await db
          .select()
          .from(permissions)
          .where(eq(permissions.name, permission.name))
          .limit(1);

        if (!existing) {
          await db.insert(permissions).values({
            id: uuidv4(),
            name: permission.name,
            description: permission.description
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error seeding default permissions:', error);
      return false;
    }
  }

  // Grant multiple permissions to an admin
  async grantPermissions(adminId, permissionNames) {
    try {
      for (const permissionName of permissionNames) {
        await this.grantPermission(adminId, permissionName);
      }
      return true;
    } catch (error) {
      console.error('Error granting multiple permissions:', error);
      return false;
    }
  }

  // Revoke all permissions from an admin
  async revokeAllPermissions(adminId) {
    try {
      await db.delete(adminPermissions).where(eq(adminPermissions.adminId, adminId));
      return true;
    } catch (error) {
      console.error('Error revoking all permissions:', error);
      return false;
    }
  }

  // Seed default departments
  async seedDefaultDepartments() {
    try {
      const defaultDepartments = [
        {
          name: 'super_admin',
          privileges: ['full_access']
        },
        {
          name: 'onboarding',
          privileges: [
            'add_practices',
            'add_doctors',
            'verify_doctor_details',
            'approve_numbers',
            'invite_users'
          ]
        },
        {
          name: 'sales',
          privileges: [
            'manage_demo_bookings',
            'view_adoption_funnel',
            'communicate_potential_users',
            'access_analytics'
          ]
        },
        {
          name: 'support',
          privileges: [
            'help_technical_issues',
            'reset_doctor_access',
            'monitor_sessions'
          ]
        },
        {
          name: 'billing_accounts',
          privileges: [
            'manage_subscriptions',
            'view_update_billing',
            'send_invoices'
          ]
        },
        {
          name: 'compliance',
          privileges: [
            'verify_credentials',
            'approve_hpcsa_bhf',
            'manage_document_verification'
          ]
        }
      ];

      for (const dept of defaultDepartments) {
        const [existing] = await db
          .select()
          .from(departments)
          .where(eq(departments.name, dept.name))
          .limit(1);

        if (!existing) {
          await db.insert(departments).values({
            id: uuidv4(),
            name: dept.name,
            privileges: dept.privileges
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error seeding default departments:', error);
      return false;
    }
  }
}

module.exports = new PermissionService();
