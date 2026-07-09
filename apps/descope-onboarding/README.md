# Acme Notes — greenfield Descope onboarding

A tiny notes backend with a **placeholder login** — no real auth yet. This app
is the *fresh-integration* test: your agent adds **Descope OTP sign-up + a
validated session from scratch**, but **proves the Descope flow in FetchSandbox
before writing any code**.

(The sibling app [`apps/descope`](../descope) is the *bug* test — an existing
Descope integration with a planted flaw. This one is the greenfield case.)

## Surface (today — insecure placeholder)

| Endpoint | Purpose |
|---|---|
| `POST /signup` | Placeholder: trusts the email, returns a fake token |
| `GET /notes` | List notes for the (insecurely) identified user |
| `POST /notes` | Add a note |

## Stack

- FastAPI, Pydantic
- Descope OTP + session: **not wired yet** — that's the task

## How to investigate / validate / debug

All tasks in this repo go through the FetchSandbox MCP server (already
wired in `.mcp.json`). The convention is:

```
./fetchsandbox <your ask>
```

**Suggested prompt (prove-before-you-build):**

```
./fetchsandbox I'm adding Descope OTP sign-up to this app — prove the Descope OTP + session flow in the sandbox before writing any code, then propose the diff to signup + session validation. I'll decide whether to apply.
```

**Expected outcome:** FetchSandbox runs the Descope `otp_signup_email` workflow,
hands back a receipt URL showing the send → verify → session trace, surfaces the
compliance notes (verify the session JWT against JWKS, handle refresh, treat the
OTP as one-time), and *only then* proposes the diff to `signup` + the session
check. Proof first, code second — **no local pytest**; the receipt URL is the
proof.

## Run locally

```
pip install -r requirements.txt
uvicorn main:app --reload
```
