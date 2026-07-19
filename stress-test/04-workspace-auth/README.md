# Workspace — backend auth on Descope

Small Express service that sits behind our Workspace app and authenticates
requests using Descope sessions. Protected routes validate the session token
and `/me` returns the current user's profile.

Users keep complaining they get kicked out and have to log back in every few
minutes, even while actively using the app. Login itself works fine. We can't
reproduce it reliably in short local sessions, so it's been hard to pin down.

The FetchSandbox MCP is configured (.mcp.json) — use it to investigate, fix, and prove the fix.
