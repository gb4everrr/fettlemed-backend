// routes/profileAggregatedRoutes.js
// GET /api/profile/medical-summary
//
// Thin wrapper around buildMedicalContextObject.
// Redis cache sits here (not in the aggregator) so the aggregator stays
// a pure DB-query function and cache logic is co-located with the HTTP layer.
//
// Cache key:   profile:layer1:<id>  TTL: invalidated on write
//              profile:layer2:<id>  TTL: 10 min + invalidated on write
//
// For now a single combined key is used (layer1 + layer2 together).
// Split into two keys if you need independent invalidation per layer in future.

'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { buildMedicalContextObject } = require('../services/profileAggregator');
const redis = require('../services/redisClient');
const models = require('../models');

const CACHE_TTL_SECONDS = 600; // 10 minutes (Layer 2 TTL — the shorter of the two)

/**
 * GET /api/profile/medical-summary
 * Returns the Medical Context Object for the authenticated patient.
 * Served to the Flutter Profile Screen and reused as the chat system prompt payload.
 */
router.get('/medical-summary', authenticate, async (req, res) => {
  const patientProfileId = req.user.id; // users.id from JWT = phr_*.patient_profile_id = clinic_patient.global_patient_id
  const cacheKey = `profile:${patientProfileId}`;

  try {
    // ── Cache read ────────────────────────────────────────────────────────────
    let cached = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (redisErr) {
      // Redis miss due to connection error — fall through to DB, do not 500.
      console.warn('[profileRoutes] Redis get failed, falling through to DB:', redisErr.message);
    }

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // ── Cache miss — build from DB ────────────────────────────────────────────
    const context = await buildMedicalContextObject(models, patientProfileId);

    // ── Cache write (best-effort) ─────────────────────────────────────────────
    try {
      await redis.set(cacheKey, JSON.stringify(context), 'EX', CACHE_TTL_SECONDS);
    } catch (redisErr) {
      console.warn('[profileRoutes] Redis set failed:', redisErr.message);
    }

    return res.json(context);

  } catch (err) {
    console.error('[profileRoutes] Failed to build medical summary:', err);
    return res.status(500).json({
      error: {
        code: 'PROFILE_BUILD_FAILED',
        message: 'Failed to build medical summary. Please try again.',
      },
    });
  }
});

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// CACHE INVALIDATION
// ─────────────────────────────────────────────────────────────────────────────
//
// Export the invalidation helper so PHR write workers and clinic record hooks
// can call it after any insert that affects this patient's profile.
//
// Usage (e.g. in documentOcrWorker.js after a successful PHR write):
//   const { invalidateProfileCache } = require('../routes/profileRoutes');
//   await invalidateProfileCache(patientProfileId);
//
// Or move this helper to redisClient.js if you prefer no circular imports.

async function invalidateProfileCache(patientProfileId) {
  const cacheKey = `profile:${patientProfileId}`;
  try {
    await redis.del(cacheKey);
    console.log(`[profileRoutes] Cache invalidated for patient ${patientProfileId}`);
  } catch (err) {
    console.warn('[profileRoutes] Cache invalidation failed (non-fatal):', err.message);
  }
}

module.exports.invalidateProfileCache = invalidateProfileCache;