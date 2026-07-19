'use strict';

const express = require('express');
const authenticate = require('./middleware/authenticate');

const app = express();
app.use(express.json());

// Public health check — no auth.
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', service: 'id-guard' });
});

// Everything under /admin requires a valid Clerk session.
const admin = express.Router();
admin.use(authenticate);

admin.get('/', (req, res) => {
  res.json({ message: 'admin root', user: req.user.id, role: req.user.role });
});

// Sensitive admin action — must only be reachable by an admin identity.
admin.get('/users', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  res.json({
    users: [
      { id: 'user_1', email: 'alice@example.com' },
      { id: 'user_2', email: 'bob@example.com' },
    ],
  });
});

app.use('/admin', admin);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`id-guard listening on :${PORT}`);
  });
}

module.exports = app;
