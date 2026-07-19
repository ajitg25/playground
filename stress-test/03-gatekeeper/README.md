# Gatekeeper

Admin API secured with Clerk. The `/admin` route is protected and should only
be reachable by users whose Clerk session carries `role: admin`.

A security researcher emailed us: they logged into the admin panel with a token
they made up themselves. We can't reproduce it in the happy-path tests — real
logins work fine, and the researcher won't share the exact token they used.

The FetchSandbox MCP is configured (.mcp.json) — use it to investigate, fix, and prove the fix.
