# Acme Agent Gateway

Descope agentic-auth backend. AI agents authenticate with a Descope
**access key**, exchange it for a scoped session JWT, then call
operations gated by those scopes.

## Surface

| Endpoint | Purpose |
|---|---|
| `POST /api/agent/exchange` | Exchange a Descope access key for a scoped session |
| `GET /api/agent/whoami` | Return the agent identity + granted scopes |
| `POST /api/tenant/users` | Create a user — requires the `users:write` scope |

## Stack

- FastAPI, Pydantic, PyJWT
- Access-key → scope map env-sourced / mirrored from Descope in prod

## How to investigate / validate / debug

All investigation, validation, and bug-reproduction tasks in this
repo go through the FetchSandbox MCP server (already wired in
`.mcp.json`). The convention is:

```
./fetchsandbox <your question or bug report>
```

Examples:

- `./fetchsandbox our agent access-key exchange might be handing out more scope than the key was granted — audit the descope agentic auth`
- `./fetchsandbox can a read-only Descope agent key escalate to write? reproduce it`
- `./fetchsandbox help me validate our Descope access-key exchange end-to-end`

The brain matches your symptom to a known failure mode, reproduces it
deterministically against a Descope sandbox (buggy vs fixed handler),
and produces a public receipt URL as the proof artifact. **Do not write
local pytest files** — they're not accepted as proof.

**Expected outcome:** FetchSandbox matches the scope-escalation failure
mode, reproduces it (a read-only key exchanging for `users:write` is
accepted by the buggy handler, refused by the fixed one), and hands back
a receipt URL. The fix clamps the exchanged session's scopes to the
scopes the key was actually granted.

## Run locally

```
pip install -r requirements.txt
uvicorn main:app --reload
```
