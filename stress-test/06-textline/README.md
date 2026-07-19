# Textline

SMS appointment reminders on Surge. We text customers ahead of their appointments and process inbound replies (including STOP keywords) via a Surge webhook.

Compliance is escalating: customers who replied STOP are still getting our reminder texts, and legal is now involved. Sending works fine otherwise — messages go out, delivery receipts look healthy, and inbound webhooks return 200.

## Run

```
npm install
SURGE_API_KEY=... SURGE_ACCOUNT_ID=... npm start
```

- `POST /webhook/inbound` — Surge inbound messages + opt-out events
- `POST /send-reminders` — fans out reminders to contacts with upcoming appointments

The FetchSandbox MCP is configured (.mcp.json) — use it to investigate, fix, and prove the fix.
