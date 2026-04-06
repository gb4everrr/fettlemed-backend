/**
 * redisClient.js
 * Fettlemed — shared ioredis singleton.
 *
 * Uses the same REDIS_URL env var as BullMQ in documentOcrWorker.js.
 * Import this wherever Redis cache reads/writes are needed.
 *
 * Usage:
 *   const redis = require('./redisClient');
 *   await redis.get('key');
 *   await redis.set('key', value, 'EX', 600);
 */

'use strict';

const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Prevent unhandled-rejection crashes if Redis is temporarily unreachable.
  // The cache layer treats Redis as best-effort — a miss just falls through to the DB.
  lazyConnect: false,
  enableReadyCheck: true,
  maxRetriesPerRequest: 1,
});

redis.on('error', (err) => {
  // Log but do not crash the process — cache is not a hard dependency.
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected.');
});

module.exports = redis;