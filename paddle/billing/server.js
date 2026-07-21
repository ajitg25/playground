const express = require("express");

const app = express();

// accountId -> { status, provisionCount }
const accounts = {};

app.post("/webhook", express.json(), (req, res) => {
  const event = req.body || {};

  if (event.event_type === "transaction.completed") {
    const accountId =
      (event.data && event.data.custom_data && event.data.custom_data.account_id) || "";
    const amount =
      (event.data && event.data.details && event.data.details.totals && event.data.details.totals.total) || "0";
    provisionAccount(accountId, amount);
  }

  res.json({ received: true });
});

function provisionAccount(accountId, amount) {
  const acc =
    accounts[accountId] || (accounts[accountId] = { status: "active", provisionCount: 0 });
  acc.status = "active";
  acc.provisionCount += 1;
  chargeAndProvision(accountId, amount);
}

function chargeAndProvision(accountId, amount) {
  console.log(`provisioned ${accountId} for ${amount} (grant #${accounts[accountId].provisionCount})`);
}

app.get("/accounts/:id", (req, res) => {
  res.json(accounts[req.params.id] || { status: "none" });
});

app.listen(3000, () => console.log("aterna-billing listening on :3000"));
