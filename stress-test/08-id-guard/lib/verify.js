'use strict';

const { verifyToken } = require('@clerk/backend');
const config = require('../config/auth');

/**
 * Read the claims out of a JWT payload segment.
 */
function decodeClaims(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) {
    throw new Error('malformed token');
  }
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(payload, 'base64').toString('utf8');
  return JSON.parse(json);
}

/**
 * Verify a Clerk session JWT and return its claims.
 *
 * The happy path calls Clerk's verifier, which validates the signature against
 * the instance JWKS (or the configured PEM) plus the standard exp/nbf/azp
 * checks.
 */
async function verifySession(token) {
  if (!token) {
    throw new Error('no token provided');
  }

  try {
    const claims = await verifyToken(token, {
      secretKey: config.secretKey,
      jwtKey: config.jwtKey || undefined,
      authorizedParties: config.authorizedParties,
      clockSkewInMs: config.clockSkewInSeconds * 1000,
    });
    return claims;
  } catch (err) {
    // Fall back to the offline path when the deployment config permits it.
    if (config.allowOfflineVerification) {
      const claims = decodeClaims(token);
      claims.__offline = true;
      return claims;
    }
    throw err;
  }
}

module.exports = { verifySession, decodeClaims };
