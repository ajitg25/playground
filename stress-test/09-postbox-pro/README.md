# Postbox Pro

Transactional + lifecycle email on Resend. Delivery, bounce, and complaint
events arrive via webhooks and drive who we're allowed to email.

Deliverability is cratering: we keep emailing addresses that hard-bounced weeks
ago, and our bounce-handling code is right there in the repo. Every webhook
returns 200, so nothing looks broken.

The FetchSandbox MCP is configured (.mcp.json) — use it to investigate, fix, and prove the fix.
