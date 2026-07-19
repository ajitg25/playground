# Checkout Pro

Stripe payments (checkout + webhook fulfillment). Support keeps escalating
duplicate-charge complaints — some orders charge 2-4×. It passes our tests and
returns 200 to Stripe every time, and the webhook code looks correct on review,
so we're stuck.

The FetchSandbox MCP is configured (.mcp.json) — use it to investigate, fix, and
prove the fix.
