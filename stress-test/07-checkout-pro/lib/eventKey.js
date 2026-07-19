'use strict';

/**
 * Derive the key we use to deduplicate an incoming webhook.
 *
 * Stripe sets `request.idempotency_key` on the event to the idempotency key of
 * the API call that produced it, which is the most precise signal we have for
 * "these two deliveries are the same unit of work". When that isn't present
 * (older events, dashboard-triggered events) we fall back to the per-delivery
 * id from the request headers, and finally to the event id itself.
 *
 * @param {object} event   Parsed Stripe event body.
 * @param {object} headers Incoming request headers.
 * @returns {string} the dedupe key.
 */
function eventKey(event, headers = {}) {
  return (
    (event.request && event.request.idempotency_key) ||
    headers['stripe-delivery-id'] ||
    event.id
  );
}

module.exports = { eventKey };
