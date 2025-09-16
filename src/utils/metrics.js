const redisClient = require('./redis');

// Metrics collection and storage
class MetricsCollector {
  constructor() {
    this.metrics = {
      // Authentication metrics
      loginAttempts: 0,
      loginSuccesses: 0,
      loginFailures: 0,
      tokenRefreshes: 0,
      tokenRefreshSuccesses: 0,
      tokenRefreshFailures: 0,
      logouts: 0,
      
      // Security metrics
      rateLimitHits: 0,
      securityEvents: 0,
      suspiciousActivities: 0,
      
      // Performance metrics
      apiRequests: 0,
      slowRequests: 0,
      databaseQueries: 0,
      slowQueries: 0,
      
      // Session metrics
      activeSessions: 0,
      sessionCreations: 0,
      sessionRevocations: 0,
      
      // Error metrics
      errors: 0,
      validationErrors: 0,
      authenticationErrors: 0,
      authorizationErrors: 0,
      systemErrors: 0
    };
    
    this.startTime = Date.now();
    this.lastReset = Date.now();
  }

  // Increment a metric
  increment(metric, value = 1) {
    if (this.metrics.hasOwnProperty(metric)) {
      this.metrics[metric] += value;
    }
  }

  // Decrement a metric
  decrement(metric, value = 1) {
    if (this.metrics.hasOwnProperty(metric)) {
      this.metrics[metric] = Math.max(0, this.metrics[metric] - value);
    }
  }

  // Set a metric value
  set(metric, value) {
    if (this.metrics.hasOwnProperty(metric)) {
      this.metrics[metric] = value;
    }
  }

  // Get a metric value
  get(metric) {
    return this.metrics[metric] || 0;
  }

  // Get all metrics
  getAll() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      lastReset: this.lastReset
    };
  }

  // Reset all metrics
  reset() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0;
    });
    this.lastReset = Date.now();
  }

  // Store metrics in Redis for persistence
  async storeMetrics() {
    try {
      const metricsData = {
        ...this.metrics,
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime
      };
      
      await redisClient.setex('metrics:current', 3600, JSON.stringify(metricsData)); // Store for 1 hour
      
      // Also store historical data
      const historicalKey = `metrics:history:${new Date().toISOString().split('T')[0]}`;
      await redisClient.lpush(historicalKey, JSON.stringify(metricsData));
      await redisClient.expire(historicalKey, 7 * 24 * 60 * 60); // Keep for 7 days
      
    } catch (error) {
      console.error('Failed to store metrics:', error);
    }
  }

  // Get metrics from Redis
  async getStoredMetrics() {
    try {
      const metricsData = await redisClient.get('metrics:current');
      return metricsData ? JSON.parse(metricsData) : null;
    } catch (error) {
      console.error('Failed to get stored metrics:', error);
      return null;
    }
  }

  // Get historical metrics
  async getHistoricalMetrics(days = 7) {
    try {
      const historicalData = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const historicalKey = `metrics:history:${dateKey}`;
        
        const dayData = await redisClient.lrange(historicalKey, 0, -1);
        if (dayData && dayData.length > 0) {
          historicalData.push({
            date: dateKey,
            data: dayData.map(d => JSON.parse(d))
          });
        }
      }
      
      return historicalData;
    } catch (error) {
      console.error('Failed to get historical metrics:', error);
      return [];
    }
  }

  // Calculate rates and percentages
  calculateRates() {
    const rates = {
      loginSuccessRate: this.metrics.loginAttempts > 0 
        ? (this.metrics.loginSuccesses / this.metrics.loginAttempts * 100).toFixed(2) 
        : 0,
      
      tokenRefreshSuccessRate: this.metrics.tokenRefreshes > 0 
        ? (this.metrics.tokenRefreshSuccesses / this.metrics.tokenRefreshes * 100).toFixed(2) 
        : 0,
      
      errorRate: this.metrics.apiRequests > 0 
        ? (this.metrics.errors / this.metrics.apiRequests * 100).toFixed(2) 
        : 0,
      
      slowRequestRate: this.metrics.apiRequests > 0 
        ? (this.metrics.slowRequests / this.metrics.apiRequests * 100).toFixed(2) 
        : 0,
      
      requestsPerMinute: this.metrics.uptime > 0 
        ? (this.metrics.apiRequests / (this.metrics.uptime / 60000)).toFixed(2) 
        : 0
    };
    
    return rates;
  }

  // Get security insights
  getSecurityInsights() {
    const insights = {
      highRisk: this.metrics.suspiciousActivities > 10,
      rateLimitIssues: this.metrics.rateLimitHits > 50,
      authenticationIssues: this.metrics.loginFailures > this.metrics.loginSuccesses,
      tokenIssues: this.metrics.tokenRefreshFailures > this.metrics.tokenRefreshSuccesses
    };
    
    return insights;
  }

  // Get performance insights
  getPerformanceInsights() {
    const insights = {
      slowPerformance: this.metrics.slowRequests > 100,
      highErrorRate: this.metrics.errors > 50,
      databaseIssues: this.metrics.slowQueries > 20,
      highLoad: this.metrics.apiRequests > 1000
    };
    
    return insights;
  }
}

// Create global metrics instance
const metrics = new MetricsCollector();

// Store metrics every 5 minutes
setInterval(async () => {
  await metrics.storeMetrics();
}, 5 * 60 * 1000);

// Authentication metrics helpers
const authMetrics = {
  loginAttempt: (success = false) => {
    metrics.increment('loginAttempts');
    if (success) {
      metrics.increment('loginSuccesses');
    } else {
      metrics.increment('loginFailures');
    }
  },

  tokenRefresh: (success = false) => {
    metrics.increment('tokenRefreshes');
    if (success) {
      metrics.increment('tokenRefreshSuccesses');
    } else {
      metrics.increment('tokenRefreshFailures');
    }
  },

  logout: () => {
    metrics.increment('logouts');
  },

  rateLimitHit: () => {
    metrics.increment('rateLimitHits');
  },

  securityEvent: () => {
    metrics.increment('securityEvents');
  },

  suspiciousActivity: () => {
    metrics.increment('suspiciousActivities');
  }
};

// Performance metrics helpers
const performanceMetrics = {
  apiRequest: (duration = 0) => {
    metrics.increment('apiRequests');
    if (duration > 1000) {
      metrics.increment('slowRequests');
    }
  },

  databaseQuery: (duration = 0) => {
    metrics.increment('databaseQueries');
    if (duration > 500) {
      metrics.increment('slowQueries');
    }
  }
};

// Error metrics helpers
const errorMetrics = {
  error: (type = 'system') => {
    metrics.increment('errors');
    switch (type) {
      case 'validation':
        metrics.increment('validationErrors');
        break;
      case 'authentication':
        metrics.increment('authenticationErrors');
        break;
      case 'authorization':
        metrics.increment('authorizationErrors');
        break;
      case 'system':
        metrics.increment('systemErrors');
        break;
    }
  }
};

// Session metrics helpers
const sessionMetrics = {
  sessionCreated: () => {
    metrics.increment('sessionCreations');
    metrics.increment('activeSessions');
  },

  sessionRevoked: () => {
    metrics.increment('sessionRevocations');
    metrics.decrement('activeSessions');
  },

  setActiveSessions: (count) => {
    metrics.set('activeSessions', count);
  }
};

module.exports = {
  metrics,
  authMetrics,
  performanceMetrics,
  errorMetrics,
  sessionMetrics
};
