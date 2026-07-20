'use strict';

/**
 * Derive the webhook key.
 */
function eventKey(event, headers = {}) {
  return (
    (event.request && event.request.idempotency_key) ||
    headers['stripe-delivery-id'] ||
    event.id
  );
}

module.exports = { eventKey };
