const express = require("express");

const app = express();

// subscription_id -> { status }
const subscriptions = {};

app.post("/webhook", express.json(), (req, res) => {
  const event = req.body || {};
  const sid = (event.data && event.data.subscription_id) || "";

  switch (event.event_type) {
    case "subscription.created":
      subscriptions[sid] = { status: "trialing" };
      break;
    case "subscription.activated":
      subscriptions[sid] = { status: "active" };
      break;
    case "subscription.canceled":
      subscriptions[sid] = { status: "canceled" };
      break;
  }

  res.json({ received: true });
});

app.get("/access/:id", (req, res) => {
  const sub = subscriptions[req.params.id];
  const hasAccess = !!sub && sub.status === "active";
  res.json({ access: hasAccess, status: sub ? sub.status : "none" });
});

app.listen(3000, () => console.log("orbit-access listening on :3000"));
