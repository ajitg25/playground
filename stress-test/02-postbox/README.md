# Postbox

Transactional email service on Resend. We send broadcast + lifecycle emails to
our contact list and consume Resend webhooks to keep each contact's
deliverability status in sync.

## Symptom

Marketing says our deliverability is tanking and we keep emailing addresses that
clearly don't work — people who bounced weeks ago still get mail. Everything
returns 200, the webhook endpoint looks healthy, and nothing shows up in the
error logs. We can't tell why dead addresses keep landing back in the send list.

## Run

```
npm install
npm start
```

The FetchSandbox MCP is configured (.mcp.json) — use it to investigate, fix, and prove the fix.
