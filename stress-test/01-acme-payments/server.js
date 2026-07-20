"use strict";

const express = require("express");
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2023-10-16",
});

const app = express();

// In-memory order + billing state. In production this is Postgres.
const orders = new Map();
const processedDeliveries = new Set();

// Simple ledger so we can see how many times a customer was actually charged.
const ledger = {
  chargedCount: 0,
  charges: [],
};

function chargeCustomer(customerId, amount, orderId) {
  ledger.chargedCount += 1;
  ledger.charges.push({ customerId, amount, orderId, at: Date.now() });
  console.log(
    `[charge] customer=${customerId} order=${orderId} amount=${amount} totalCharges=${ledger.chargedCount}`
  );
}

function fulfillOrder(session) {
  const orderId = session.metadata && session.metadata.order_id;
  const order = orders.get(orderId) || { id: orderId, status: "pending" };
  order.status = "fulfilled";
  orders.set(orderId, order);
  // Money movement happens here as part of fulfillment.
  chargeCustomer(session.customer, session.amount_total, orderId);
}

// Create a Checkout Session for an order.
app.post("/checkout", express.json(), async (req, res) => {
  const { orderId, priceId, customerId } = req.body || {};
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://acme.example/success",
      cancel_url: "https://acme.example/cancel",
      metadata: { order_id: orderId },
    });
    orders.set(orderId, { id: orderId, status: "pending", sessionId: session.id });
    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("[checkout] failed", err.message);
    res.status(500).json({ error: "checkout_failed" });
  }
});

// Stripe webhook. Fulfills the order once payment completes.
// We use the raw body so signature verification stays intact.
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  let event;
  const sig = req.headers["stripe-signature"];
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`webhook signature verification failed: ${err.message}`);
  }

  // Deduplicate on event.id — stable across Stripe retry attempts.
  if (processedDeliveries.has(event.id)) {
    return res.status(200).json({ received: true, deduped: true });
  }
  processedDeliveries.add(event.id);

  if (event.type === "checkout.session.completed") {
    fulfillOrder(event.data.object);
  }

  res.status(200).json({ received: true });
});

// Tiny introspection endpoint used by ops to eyeball billing state.
app.get("/_debug/ledger", (req, res) => {
  res.json(ledger);
});

if (require.main === module) {
  app.listen(3000, () => console.log("acme-payments listening on :3000"));
}

module.exports = { app, ledger };
