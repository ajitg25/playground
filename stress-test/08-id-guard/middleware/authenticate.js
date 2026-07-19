'use strict';

const { verifySession } = require('../lib/verify');

/**
 * Express middleware: authenticate a request from its Bearer token.
 *
 * Extracts the token from the Authorization header, resolves the session via
 * the verifier, and attaches the resulting identity to req.user for downstream
 * handlers. Any failure results in a 401.
 */
function extractBearer(req) {
  const header = req.headers['authorization'] || '';
  const [scheme, value] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !value) {
    return null;
  }
  return value.trim();
}

async function authenticate(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  try {
    const claims = await verifySession(token);
    req.user = {
      id: claims.sub,
      role: claims.role || claims.metadata?.role || 'user',
      claims,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid session' });
  }
}

module.exports = authenticate;
