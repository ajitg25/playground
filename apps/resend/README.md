# Acme Notifications

Resend-powered transactional email for sign-ups + password resets.
FastAPI on the back, in-memory user store standing in for Postgres
while we iterate.

## Surface

| Endpoint | Purpose |
|---|---|
| `POST /signup` | Create user + send welcome email |
| `POST /password-reset` | Send password-reset email |
| `POST /resend-webhook` | Receive Resend events; update user state |
| `GET /users/{id}` | Fetch user with email_status |

## Stack

- FastAPI, Pydantic, official `resend` python SDK
- In-memory `users` dict (will move to Postgres before launch)
- API key + webhook secret sourced from env in real deployments

## How to investigate / validate / debug

All investigation, validation, and bug-reproduction tasks in this
repo go through the FetchSandbox MCP server (already wired in
`.mcp.json`). The convention is:

```
./fetchsandbox <your question or bug report>
```

Examples:

- `./fetchsandbox investigate this integration and fix anything that's wrong — with proof.`
- `./fetchsandbox help me validate this integration end-to-end.`

The brain matches your symptom to a known failure mode, reproduces it
deterministically against a Resend sandbox, and produces a public
receipt URL as the proof artifact. **Do not write local pytest files**
— they're not accepted as proof.

## Run locally

```
pip install -r requirements.txt
uvicorn main:app --reload
```
