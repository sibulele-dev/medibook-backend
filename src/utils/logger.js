const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which logs to print based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Authentication-specific logging functions
const authLogger = {
  loginAttempt: (email, ip, success = false, error = null) => {
    const logData = {
      event: 'login_attempt',
      email,
      ip,
      success,
      timestamp: new Date(),
      ...(error && { error: error.message })
    };
    
    if (success) {
      logger.info('Login successful', logData);
    } else {
      logger.warn('Login failed', logData);
    }
  },

  tokenRefresh: (userId, ip, success = false, error = null) => {
    const logData = {
      event: 'token_refresh',
      userId,
      ip,
      success,
      timestamp: new Date(),
      ...(error && { error: error.message })
    };
    
    if (success) {
      logger.info('Token refresh successful', logData);
    } else {
      logger.warn('Token refresh failed', logData);
    }
  },

  logout: (userId, ip) => {
    const logData = {
      event: 'logout',
      userId,
      ip,
      timestamp: new Date()
    };
    
    logger.info('User logout', logData);
  },

  sessionCreated: (userId, sessionId, ip) => {
    const logData = {
      event: 'session_created',
      userId,
      sessionId,
      ip,
      timestamp: new Date()
    };
    
    logger.info('Session created', logData);
  },

  sessionRevoked: (userId, sessionId, ip) => {
    const logData = {
      event: 'session_revoked',
      userId,
      sessionId,
      ip,
      timestamp: new Date()
    };
    
    logger.info('Session revoked', logData);
  },

  rateLimitExceeded: (ip, endpoint, attempts) => {
    const logData = {
      event: 'rate_limit_exceeded',
      ip,
      endpoint,
      attempts,
      timestamp: new Date()
    };
    
    logger.warn('Rate limit exceeded', logData);
  },

  securityEvent: (event, details) => {
    const logData = {
      event: 'security_event',
      securityEvent: event,
      ...details,
      timestamp: new Date()
    };
    
    logger.warn('Security event detected', logData);
  },

  securityEvent: (eventType, details = {}) => {
    const logData = {
      event: 'security_event',
      eventType,
      timestamp: new Date(),
      ...details
    };
    
    logger.warn(`Security event: ${eventType}`, logData);
  }
};

// Performance monitoring
const performanceLogger = {
  apiRequest: (method, url, duration, statusCode, userId = null) => {
    const logData = {
      event: 'api_request',
      method,
      url,
      duration: `${duration}ms`,
      statusCode,
      userId,
      timestamp: new Date()
    };
    
    if (duration > 1000) {
      logger.warn('Slow API request', logData);
    } else {
      logger.http('API request', logData);
    }
  },

  databaseQuery: (query, duration, success = true) => {
    const logData = {
      event: 'database_query',
      query: query.substring(0, 100) + '...', // Truncate long queries
      duration: `${duration}ms`,
      success,
      timestamp: new Date()
    };
    
    if (duration > 500) {
      logger.warn('Slow database query', logData);
    } else {
      logger.debug('Database query', logData);
    }
  }
};

// Error logging with context
const errorLogger = {
  authentication: (error, context = {}) => {
    const logData = {
      event: 'authentication_error',
      error: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date()
    };
    
    logger.error('Authentication error', logData);
  },

  authorization: (error, context = {}) => {
    const logData = {
      event: 'authorization_error',
      error: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date()
    };
    
    logger.error('Authorization error', logData);
  },

  validation: (error, context = {}) => {
    const logData = {
      event: 'validation_error',
      error: error.message,
      ...context,
      timestamp: new Date()
    };
    
    logger.warn('Validation error', logData);
  },

  system: (error, context = {}) => {
    const logData = {
      event: 'system_error',
      error: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date()
    };
    
    logger.error('System error', logData);
  }
};

module.exports = {
  logger,
  authLogger,
  performanceLogger,
  errorLogger
};