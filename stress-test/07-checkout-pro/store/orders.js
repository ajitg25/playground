'use strict';

// In-memory order book. Keyed by the checkout session's client_reference_id
// (our internal order id). Swap for a real table in production.
const orders = new Map();

function getOrCreate(id, amount) {
  if (!orders.has(id)) {
    orders.set(id, {
      id,
      amount,
      charges: 0,
      amountCharged: 0,
    });
  }
  return orders.get(id);
}

function get(id) {
  return orders.get(id);
}

function all() {
  return Array.from(orders.values());
}

function reset() {
  orders.clear();
}

module.exports = { getOrCreate, get, all, reset };
