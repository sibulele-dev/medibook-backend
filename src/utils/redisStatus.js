async function getRedisStatus(client) {
  try {
    if (!client) return 'disconnected';

    // node-redis exposes ping()
    if (typeof client.ping === 'function') {
      await client.ping();
      return 'connected';
    }

    // Upstash client: probe with set/get using short TTL
    if (typeof client.set === 'function' && typeof client.get === 'function') {
      const key = 'healthcheck:' + Date.now();
      try {
        // Try both option styles for compatibility
        await client.set(key, '1', { EX: 5 });
      } catch (_) {
        try {
          await client.set(key, '1', { ex: 5 });
        } catch (_) {}
      }
      const val = await client.get(key);
      return val ? 'connected' : 'disconnected';
    }

    return 'unknown';
  } catch (_) {
    return 'disconnected';
  }
}

module.exports = { getRedisStatus };
