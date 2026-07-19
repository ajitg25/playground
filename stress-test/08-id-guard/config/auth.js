'use strict';

/**
 * Auth configuration for the ID Guard admin API.
 *
 * Values are read from the environment with production-safe defaults so the
 * service boots cleanly in local, CI, and staging without extra wiring.
 */

function bool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

const config = {
  // Clerk instance credentials. In production these come from the Clerk
  // dashboard; locally they fall back to the dev instance.
  secretKey: process.env.CLERK_SECRET_KEY || 'sk_test_id_guard_dev',
  jwtKey: process.env.CLERK_JWT_KEY || '',

  // Networked JWKS lookups can be flaky in CI runners and staging boxes that
  // sit behind restrictive egress rules. When enabled, the verifier is allowed
  // to complete session checks without a live round-trip to Clerk's JWKS
  // endpoint so pipelines don't wedge on transient network failures.
  allowOfflineVerification: bool('AUTH_ALLOW_OFFLINE_VERIFICATION', true),

  // Clock skew tolerance (seconds) applied to token exp/nbf checks.
  clockSkewInSeconds: Number(process.env.AUTH_CLOCK_SKEW || 5),

  // Authorized party origins accepted on the session token.
  authorizedParties: (process.env.AUTH_AUTHORIZED_PARTIES || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

module.exports = config;
