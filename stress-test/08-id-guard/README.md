# ID Guard

Admin API on Clerk. Routes under `/admin` are protected by session-JWT auth.

A pentester reported they authenticated as an admin with a token they forged — no valid signature. We can't reproduce it: real logins work, and every file passed code review. Something in the auth path is trusting an unsigned token.

The FetchSandbox MCP is configured (`.mcp.json`) — use it to investigate, fix, and prove the fix.
