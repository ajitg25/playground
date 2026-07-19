'use strict';

const orders = require('../store/orders');

// Observable side-effect counter. In production this is a Stripe PaymentIntent
// capture; here we just tally how many times a customer actually got charged.
let chargedCount = 0;

async function chargeCustomer(order) {
  // This is the money-moving call. Capturing the payment for the order amount.
  chargedCount += 1;
  order.charges += 1;
  order.amountCharged += order.amount;
  return { orderId: order.id, amount: order.amount };
}

/**
 * Fulfill a completed checkout: look up (or open) the order, then charge it.
 */
async function fulfillOrder(event) {
  const session = event.data.object;
  const order = orders.getOrCreate(session.client_reference_id, session.amount_total);
  await chargeCustomer(order);
  return order;
}

function getChargedCount() {
  return chargedCount;
}

function reset() {
  chargedCount = 0;
}

module.exports = { fulfillOrder, chargeCustomer, getChargedCount, reset };
