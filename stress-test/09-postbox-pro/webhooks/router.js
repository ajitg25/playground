'use strict';

const express = require('express');

const registry = require('./handlers');

const router = express.Router();

// Resend posts every delivery event here. We look up the handler for the
// event type in the registry and dispatch to it. Events we don't have a
// handler for are acknowledged (200) so Resend doesn't retry them forever.
router.post('/resend', async (req, res) => {
  const event = req.body || {};
  const type = event.type;

  const handler = registry[type];

  if (typeof handler !== 'function') {
    // Nothing registered for this event type — ack and move on.
    return res.status(200).json({ received: true, handled: false, type });
  }

  try {
    await handler(event);
    return res.status(200).json({ received: true, handled: true, type });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`handler for ${type} failed:`, err.message);
    return res.status(500).json({ received: true, handled: false, error: err.message });
  }
});

module.exports = router;
