const permissionService = require('../services/permission.service');
const { authLogger, errorLogger } = require('../utils/logger');
const { authMetrics } = require('../utils/metrics');

// Require specific permission
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasPermission = await permissionService.hasPermission(req.user.id, permission);
      
      if (!hasPermission) {
        // Log unauthorized access attempt
        authLogger.securityEvent('unauthorized_permission_access', {
          userId: req.user.id,
          permission,
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });
        authMetrics.suspiciousActivity();

        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required: ${permission}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Log successful permission check
      authLogger.securityEvent('permission_granted', {
        userId: req.user.id,
        permission,
        endpoint: req.path
      });

      next();
    } catch (error) {
      errorLogger.authorization(error, {
        userId: req.user?.id,
        permission,
        endpoint: req.path
      });
      
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

// Require any of the specified permissions
function requireAnyPermission(...permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasAnyPermission = await permissionService.hasAnyPermission(req.user.id, permissions);
      
      if (!hasAnyPermission) {
        // Log unauthorized access attempt
        authLogger.securityEvent('unauthorized_permission_access', {
          userId: req.user.id,
          requiredPermissions: permissions,
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });
        authMetrics.suspiciousActivity();

        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required one of: ${permissions.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Log successful permission check
      authLogger.securityEvent('permission_granted', {
        userId: req.user.id,
        grantedPermissions: permissions,
        endpoint: req.path
      });

      next();
    } catch (error) {
      errorLogger.authorization(error, {
        userId: req.user?.id,
        permissions,
        endpoint: req.path
      });
      
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

// Require all specified permissions
function requireAllPermissions(...permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasAllPermissions = await permissionService.hasAllPermissions(req.user.id, permissions);
      
      if (!hasAllPermissions) {
        // Log unauthorized access attempt
        authLogger.securityEvent('unauthorized_permission_access', {
          userId: req.user.id,
          requiredPermissions: permissions,
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });
        authMetrics.suspiciousActivity();

        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required all of: ${permissions.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Log successful permission check
      authLogger.securityEvent('permission_granted', {
        userId: req.user.id,
        grantedPermissions: permissions,
        endpoint: req.path
      });

      next();
    } catch (error) {
      errorLogger.authorization(error, {
        userId: req.user?.id,
        permissions,
        endpoint: req.path
      });
      
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

// Require specific department
function requireDepartment(departmentName) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        });
      }

      const isInDepartment = await permissionService.isInDepartment(req.user.id, departmentName);
      
      if (!isInDepartment) {
        // Log unauthorized department access attempt
        authLogger.securityEvent('unauthorized_department_access', {
          userId: req.user.id,
          requiredDepartment: departmentName,
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });
        authMetrics.suspiciousActivity();

        return res.status(403).json({
          success: false,
          message: `Access denied. Required department: ${departmentName}`,
          code: 'INSUFFICIENT_DEPARTMENT_ACCESS'
        });
      }

      // Log successful department check
      authLogger.securityEvent('department_access_granted', {
        userId: req.user.id,
        department: departmentName,
        endpoint: req.path
      });

      next();
    } catch (error) {
      errorLogger.authorization(error, {
        userId: req.user?.id,
        department: departmentName,
        endpoint: req.path
      });
      
      return res.status(500).json({
        success: false,
        message: 'Department check failed',
        code: 'DEPARTMENT_CHECK_ERROR'
      });
    }
  };
}

// Enhanced role middleware with hierarchy
function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userRole = req.user.role;
      const hasRequiredRole = roles.some(role => 
        permissionService.hasRoleHierarchy(userRole, role)
      );
      
      if (!hasRequiredRole) {
        // Log unauthorized role access attempt
        authLogger.securityEvent('unauthorized_role_access', {
          userId: req.user.id,
          userRole,
          requiredRoles: roles,
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });
        authMetrics.suspiciousActivity();

        return res.status(403).json({
          success: false,
          message: `Insufficient role. Required one of: ${roles.join(', ')}`,
          code: 'INSUFFICIENT_ROLE'
        });
      }

      // Log successful role check
      authLogger.securityEvent('role_access_granted', {
        userId: req.user.id,
        userRole,
        requiredRoles: roles,
        endpoint: req.path
      });

      next();
    } catch (error) {
      errorLogger.authorization(error, {
        userId: req.user?.id,
        roles,
        endpoint: req.path
      });
      
      return res.status(500).json({
        success: false,
        message: 'Role check failed',
        code: 'ROLE_CHECK_ERROR'
      });
    }
  };
}

// Super admin only access
function requireSuperAdmin() {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const isSuperAdmin = await permissionService.isInDepartment(req.user.id, 'super_admin');
      
      if (!isSuperAdmin) {
        // Log unauthorized super admin access attempt
        authLogger.securityEvent('unauthorized_super_admin_access', {
          userId: req.user.id,
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });
        authMetrics.suspiciousActivity();

        return res.status(403).json({
          success: false,
          message: 'Super admin access required',
          code: 'SUPER_ADMIN_REQUIRED'
        });
      }

      // Log successful super admin access
      authLogger.securityEvent('super_admin_access_granted', {
        userId: req.user.id,
        endpoint: req.path
      });

      next();
    } catch (error) {
      errorLogger.authorization(error, {
        userId: req.user?.id,
        endpoint: req.path
      });
      
      return res.status(500).json({
        success: false,
        message: 'Super admin check failed',
        code: 'SUPER_ADMIN_CHECK_ERROR'
      });
    }
  };
}

// Middleware to add user permissions to request object
function addUserPermissions() {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.id) {
        const permissions = await permissionService.getUserPermissions(req.user.id);
        const department = await permissionService.getUserDepartment(req.user.id);
        
        req.userPermissions = permissions;
        req.userDepartment = department;
      }
      next();
    } catch (error) {
      console.error('Error adding user permissions:', error);
      next(); // Continue even if permission loading fails
    }
  };
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireDepartment,
  requireRole,
  requireSuperAdmin,
  addUserPermissions
};
