'use strict';

const express = require('express');
const webhookRouter = require('./routes/webhook');

const app = express();

// Stripe sends JSON webhook payloads. We keep the raw body around on req.rawBody
// in case signature verification needs it downstream.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use('/', webhookRouter);

app.get('/healthz', (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`checkout-pro listening on :${port}`);
  });
}

module.exports = app;
