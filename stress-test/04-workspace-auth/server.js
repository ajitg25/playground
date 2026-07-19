'use strict';

/**
 * Workspace API — backend auth on Descope.
 *
 * Sessions are issued by Descope on login: a short-lived sessionJwt plus a
 * longer-lived refreshJwt. Every protected request carries the sessionJwt
 * (Authorization: Bearer <token>) and we validate it before serving data.
 */

const express = require('express');
const DescopeClient = require('@descope/node-sdk').default;

const descope = DescopeClient({
  projectId: process.env.DESCOPE_PROJECT_ID,
  managementKey: process.env.DESCOPE_MANAGEMENT_KEY,
});

const app = express();
app.use(express.json());

/**
 * Pull the session token off the request.
 *
 * Prefer the Authorization bearer header (how the SPA sends it); fall back to
 * the `DS` session cookie that Descope sets for server-rendered pages.
 */
function readSessionToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)DS=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Auth gate for every protected route.
 *
 * Validate the current session token and reject expired sessions with a 401 so
 * the client can react. On success we stash the Descope claims for handlers.
 */
async function requireSession(req, res, next) {
  const sessionToken = readSessionToken(req);
  if (!sessionToken) {
    return res.status(401).json({ error: 'unauthenticated', message: 'no session token' });
  }

  try {
    const authInfo = await descope.validateSession(sessionToken);
    req.session = authInfo;
    req.user = authInfo.token;
    return next();
  } catch (err) {
    // Session token is no longer valid (expired or tampered) — reject it.
    return res.status(401).json({ error: 'session_expired', message: 'session expired, please sign in' });
  }
}

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

/**
 * Returns the authenticated user's profile from the validated session claims.
 */
app.get('/me', requireSession, (req, res) => {
  const claims = req.user || {};
  res.json({
    userId: claims.sub,
    tenants: claims.tenants || {},
    issuedAt: claims.iat,
    expiresAt: claims.exp,
  });
});

app.post('/logout', requireSession, async (req, res) => {
  try {
    await descope.logout(readSessionToken(req));
  } catch (err) {
    // best-effort revoke
  }
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`workspace-auth listening on :${PORT}`);
  });
}

module.exports = { app };
