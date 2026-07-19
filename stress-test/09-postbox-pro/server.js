'use strict';

const express = require('express');

const webhookRouter = require('./webhooks/router');
const sender = require('./jobs/sender');

const app = express();
app.use(express.json());

// Resend delivery webhooks (email.delivered, email.bounced, email.complained, ...)
app.use('/webhook', webhookRouter);

// Trigger a lifecycle/transactional send to all active contacts.
app.post('/send', async (req, res) => {
  const subject = (req.body && req.body.subject) || 'Hello from Postbox Pro';
  const result = await sender.sendCampaign({ subject });
  res.json(result);
});

// Simple health / inspection endpoint.
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'postbox-pro' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`postbox-pro listening on :${PORT}`);
  });
}

module.exports = app;
