const express = require("express");

const app = express();

// subscription_id -> { status }
const subscriptions = {};

app.post("/webhook", express.json(), (req, res) => {
  const event = req.body || {};
  const sid = (event.data && event.data.subscription_id) || "";

  if (event.event_type === "subscription.created") {
    subscriptions[sid] = { status: "incomplete" };
    console.log(`created ${sid}`);
  } else if (event.event_type === "subscription.activated") {
    if (subscriptions[sid]) {
      subscriptions[sid].status = "active";
      console.log(`activated ${sid}`);
    }
  }

  res.json({ received: true });
});

app.get("/entitlement/:id", (req, res) => {
  const sub = subscriptions[req.params.id];
  if (!sub || sub.status !== "active") {
    return res.status(402).json({ entitled: false, reason: "subscription not active" });
  }
  res.json({ entitled: true });
});

app.listen(3000, () => console.log("nimbus-subscriptions listening on :3000"));
