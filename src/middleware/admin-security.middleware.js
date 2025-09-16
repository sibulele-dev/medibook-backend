const { authLogger, errorLogger } = require('../utils/logger');
const { authMetrics } = require('../utils/metrics');
const permissionService = require('../services/permission.service');

// Admin IP whitelist middleware
function requireAdminIPWhitelist(allowedIPs = []) {
  return (req, res, next) => {
    try {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // If no IPs specified, allow all (for development)
      if (allowedIPs.length === 0) {
        return next();
      }

      // Check if IP is in whitelist
      const isAllowed = allowedIPs.some(allowedIP => {
        if (allowedIP.includes('/')) {
          // CIDR notation support
          return isIPInCIDR(clientIP, allowedIP);
        }
        return clientIP === allowedIP;
      });

      if (!isAllowed) {
        // Log unauthorized IP access attempt
        authLogger.securityEvent('unauthorized_ip_access', {
          ip: clientIP,
          allowedIPs,
          endpoint: req.path,
          userId: req.user?.id
        });
        authMetrics.suspiciousActivity();

        return res.status(403).json({
          success: false,
          message: 'Access denied: IP not whitelisted',
          code: 'IP_NOT_WHITELISTED'
        });
      }

      next();
    } catch (error) {
      errorLogger.system(error, {
        middleware: 'requireAdminIPWhitelist',
        ip: req.ip
      });
      
      return res.status(500).json({
        success: false,
        message: 'IP validation failed',
        code: 'IP_VALIDATION_ERROR'
      });
    }
  };
}

// Admin session timeout middleware
function requireAdminSessionTimeout(timeoutMinutes = 30) {
  return (req, res, next) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return next();
      }

      const sessionTimeout = timeoutMinutes * 60 * 1000; // Convert to milliseconds
      const lastActivity = req.user.lastActivity || req.user.iat * 1000;
      const now = Date.now();

      if (now - lastActivity > sessionTimeout) {
        // Log session timeout
        authLogger.securityEvent('admin_session_timeout', {
          userId: req.user.id,
          lastActivity: new Date(lastActivity).toISOString(),
          timeoutMinutes,
          endpoint: req.path
        });

        return res.status(401).json({
          success: false,
          message: 'Admin session has expired. Please log in again.',
          code: 'ADMIN_SESSION_EXPIRED'
        });
      }

      // Update last activity
      req.user.lastActivity = now;
      next();
    } catch (error) {
      errorLogger.system(error, {
        middleware: 'requireAdminSessionTimeout',
        userId: req.user?.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'Session validation failed',
        code: 'SESSION_VALIDATION_ERROR'
      });
    }
  };
}

// Admin two-factor authentication middleware
function requireAdmin2FA() {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return next();
      }

      // Check if 2FA is enabled for this admin
      const has2FA = await checkAdmin2FAStatus(req.user.id);
      
      if (has2FA) {
        // Check if 2FA is verified in this session
        const is2FAVerified = req.session?.admin2FAVerified;
        
        if (!is2FAVerified) {
          return res.status(403).json({
            success: false,
            message: 'Two-factor authentication required',
            code: 'ADMIN_2FA_REQUIRED',
            requires2FA: true
          });
        }
      }

      next();
    } catch (error) {
      errorLogger.system(error, {
        middleware: 'requireAdmin2FA',
        userId: req.user?.id
      });
      
      return res.status(500).json({
        success: false,
        message: '2FA validation failed',
        code: '2FA_VALIDATION_ERROR'
      });
    }
  };
}

// Admin action rate limiting
function requireAdminActionRateLimit(maxActions = 100, windowMinutes = 15) {
  const actionCounts = new Map();

  return (req, res, next) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return next();
      }

      const adminId = req.user.id;
      const now = Date.now();
      const windowMs = windowMinutes * 60 * 1000;

      // Clean up old entries
      for (const [key, data] of actionCounts.entries()) {
        if (now - data.timestamp > windowMs) {
          actionCounts.delete(key);
        }
      }

      // Get current count for this admin
      const currentData = actionCounts.get(adminId);
      
      if (!currentData) {
        actionCounts.set(adminId, { count: 1, timestamp: now });
        return next();
      }

      if (now - currentData.timestamp > windowMs) {
        // Reset window
        actionCounts.set(adminId, { count: 1, timestamp: now });
        return next();
      }

      if (currentData.count >= maxActions) {
        // Log rate limit exceeded
        authLogger.securityEvent('admin_rate_limit_exceeded', {
          adminId,
          maxActions,
          windowMinutes,
          endpoint: req.path
        });
        authMetrics.rateLimitHit();

        return res.status(429).json({
          success: false,
          message: `Admin action rate limit exceeded. Maximum ${maxActions} actions per ${windowMinutes} minutes.`,
          code: 'ADMIN_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((currentData.timestamp + windowMs - now) / 1000)
        });
      }

      // Increment count
      currentData.count++;
      next();
    } catch (error) {
      errorLogger.system(error, {
        middleware: 'requireAdminActionRateLimit',
        userId: req.user?.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'Rate limit validation failed',
        code: 'RATE_LIMIT_VALIDATION_ERROR'
      });
    }
  };
}

// Admin privilege escalation detection
function detectPrivilegeEscalation() {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return next();
      }

      const adminId = req.user.id;
      const requestedPermissions = req.userPermissions || [];
      
      // Check for suspicious permission requests
      const suspiciousPermissions = [
        'full_access',
        'system_settings',
        'manage_admins',
        'super_admin_access'
      ];

      const hasSuspiciousPermissions = suspiciousPermissions.some(permission =>
        requestedPermissions.includes(permission)
      );

      if (hasSuspiciousPermissions) {
        // Log potential privilege escalation
        authLogger.securityEvent('potential_privilege_escalation', {
          adminId,
          suspiciousPermissions: requestedPermissions.filter(p => 
            suspiciousPermissions.includes(p)
          ),
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        });
        authMetrics.suspiciousActivity();
      }

      next();
    } catch (error) {
      errorLogger.system(error, {
        middleware: 'detectPrivilegeEscalation',
        userId: req.user?.id
      });
      
      next(); // Don't block request on error
    }
  };
}

// Helper function to check if IP is in CIDR range
function isIPInCIDR(ip, cidr) {
  try {
    const [network, prefixLength] = cidr.split('/');
    const ipNum = ipToNumber(ip);
    const networkNum = ipToNumber(network);
    const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
    
    return (ipNum & mask) === (networkNum & mask);
  } catch (error) {
    return false;
  }
}

// Helper function to convert IP to number
function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

// Helper function to check 2FA status (placeholder)
async function checkAdmin2FAStatus(adminId) {
  // TODO: Implement actual 2FA status check
  // This would typically check a database field or external service
  return false; // For now, assume 2FA is not enabled
}

module.exports = {
  requireAdminIPWhitelist,
  requireAdminSessionTimeout,
  requireAdmin2FA,
  requireAdminActionRateLimit,
  detectPrivilegeEscalation
};
