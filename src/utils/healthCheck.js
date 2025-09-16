const { pool } = require('../db');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');

class HealthCheck {
  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.initRedis();
  }

  async initRedis() {
    try {
      if (!this.redisClient.isReady) {
        await this.redisClient.connect();
        console.log('Redis connected successfully');
      }
    } catch (error) {
      console.error('Redis connection failed:', error);
      // Try to reconnect in 5 seconds
      setTimeout(() => this.initRedis(), 5000);
    }
  }

  async ensureRedisConnection() {
    if (!this.redisClient.isReady) {
      await this.initRedis();
    }
    return this.redisClient.isReady;
  }

  async getStatus() {
    const start = Date.now();
    const dbStart = Date.now();
    const dbStatus = await this.checkDatabase();
    const dbResponseTime = Date.now() - dbStart;

    const redisStart = Date.now();
    const redisStatus = await this.checkRedis();
    const redisResponseTime = Date.now() - redisStart;

    const status = {
      backendStatus: await this.checkBackend(),
      authentication: await this.checkAuthentication(),
      sessionManagement: await this.checkSessionManagement(),
      database: {
        status: dbStatus.status,
        connections: dbStatus.connections,
        responseTime: dbStatus.latency?.ping || null,
        latency: dbStatus.latency || null,
        error: dbStatus.error || null,
      },
      cache: {
        status: redisStatus.status,
        responseTime: redisStatus.latency?.ping || null,
        latency: redisStatus.latency || null,
        error: redisStatus.error || null,
      },
      rateLimiter: {
        status: await this.checkRateLimiter(),
        error: null,
      },
      loggedInUsers: await this.getLoggedInUsersCount(),
      system: {
        uptime: process.uptime(),
        memory: {
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
      },
      lastUpdated: new Date().toISOString(),
      responseTime: Date.now() - start,
    };

    return status;
  }

  async checkBackend() {
    return 'operational';
  }

  async checkAuthentication() {
    try {
      return process.env.JWT_SECRET ? 'enabled' : 'disabled';
    } catch (error) {
      return 'disabled';
    }
  }

  async checkSessionManagement() {
    try {
      return this.redisClient.isReady ? 'enabled' : 'disabled';
    } catch (error) {
      return 'disabled';
    }
  }

  async checkDatabase() {
    try {
      const pingStart = Date.now();
      await pool.query('SELECT NOW()');
      const pingLatency = Date.now() - pingStart;

      // Check active connections
      const connectionsStart = Date.now();
      const { rows: connections } = await pool.query(
        'SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()',
      );
      const connectionsLatency = Date.now() - connectionsStart;

      return {
        status: 'connected',
        connections: parseInt(connections[0].count),
        latency: {
          ping: pingLatency,
          connections: connectionsLatency,
        },
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error.message,
      };
    }
  }

  async checkRedis() {
    try {
      if (!this.redisClient.isReady) {
        console.log('Redis: Attempting to connect...');
        await this.redisClient.connect();
        console.log('Redis: Connection established');
      }

      console.log('Redis: Testing connection...');
      const pingStart = Date.now();
      await this.redisClient.ping();
      const pingLatency = Date.now() - pingStart;
      console.log(`Redis: Ping successful (${pingLatency}ms)`);

      // Test write and read
      const testKey = 'health:test:' + Date.now();
      console.log('Redis: Testing write operation...');
      const writeStart = Date.now();
      await this.redisClient.set(testKey, 'test');
      const writeLatency = Date.now() - writeStart;
      console.log(`Redis: Write successful (${writeLatency}ms)`);

      console.log('Redis: Testing read operation...');
      const readStart = Date.now();
      await this.redisClient.get(testKey);
      const readLatency = Date.now() - readStart;
      console.log(`Redis: Read successful (${readLatency}ms)`);

      // Cleanup
      await this.redisClient.del(testKey);
      console.log('Redis: Test key cleaned up');

      const status = {
        status: 'connected',
        latency: {
          ping: pingLatency,
          write: writeLatency,
          read: readLatency,
        },
      };

      console.log('Redis Status:', JSON.stringify(status, null, 2));
      return status;
    } catch (error) {
      console.error('Redis Error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      return {
        status: 'disconnected',
        error: error.message,
      };
    }
  }

  async checkRateLimiter() {
    try {
      return this.redisClient.isReady ? 'enabled' : 'disabled';
    } catch (error) {
      return 'disabled';
    }
  }

  async getLoggedInUsersCount() {
    try {
      if (this.redisClient.isReady) {
        // Pattern matches user:userId:refreshToken:tokenValue
        const activeTokens = await this.redisClient.keys('user:*:refreshToken:*');
        // Count unique users by getting unique user IDs from the keys
        const uniqueUsers = new Set(activeTokens.map((key) => key.split(':')[1]));
        return uniqueUsers.size;
      }
      return 0;
    } catch (error) {
      console.error('Error getting logged in users count:', error);
      return 0;
    }
  }
}

module.exports = HealthCheck;
