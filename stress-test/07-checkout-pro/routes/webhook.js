'use strict';

const express = require('express');
const { eventKey } = require('../lib/eventKey');
const dedupe = require('../lib/dedupe');
const { fulfillOrder } = require('../services/fulfillment');
const orders = require('../store/orders');

const router = express.Router();

// Stripe webhook receiver. We only act on completed checkouts; everything else
// is acknowledged and ignored.
router.post('/webhook', async (req, res) => {
  const event = req.body || {};
  const key = eventKey(event, req.headers);

  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true, ignored: event.type });
  }

  // claim() checks-and-sets atomically before any await, preventing a
  // concurrent retry from slipping past the guard and double-charging.
  if (!dedupe.claim(key)) {
    return res.json({ received: true, duplicate: true });
  }

  await fulfillOrder(event);

  return res.json({ received: true });
});

// Internal endpoint used by support to inspect an order's charge history.
router.get('/orders/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  return res.json(order);
});

module.exports = router;
