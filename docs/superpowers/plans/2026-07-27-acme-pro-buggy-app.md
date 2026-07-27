# Acme Pro — Buggy Cross-Service App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `apps/acme-pro/` — a FastAPI SaaS membership app wiring Clerk (auth) + Stripe (subscriptions) + Resend (email) with 5 realistic cross-service bugs planted by a junior engineer.

**Architecture:** Single-file FastAPI app following existing repo conventions (in-memory dict store, placeholder API keys, `.mcp.json` pre-wired to FetchSandbox). Bugs live at service boundaries — Clerk→Stripe, Stripe→Resend, Clerk→Stripe via webhook — so no single-service scan catches all of them.

**Tech Stack:** FastAPI 0.115.0, Stripe SDK 10.12.0, Resend SDK, PyJWT, Pydantic 2.9.2, Uvicorn 0.30.6

## Global Constraints

- Follow existing app conventions exactly: single `main.py`, in-memory dict, placeholder keys (`sk_test_demo`, `re_demo`, `whsec_demo`)
- No pytest, no venv — FetchSandbox runs proof remotely
- `.mcp.json` must match the exact format in `apps/stripe/.mcp.json`
- `CLAUDE.md` must enforce the FetchSandbox dispatch convention (mirror `apps/stripe/CLAUDE.md` adapted for this app)
- Bugs must be syntactically valid Python — they run, they just misbehave

---

## File Map

| File | Purpose |
|---|---|
| `apps/acme-pro/main.py` | FastAPI app with all 5 bugs |
| `apps/acme-pro/requirements.txt` | Python deps |
| `apps/acme-pro/.mcp.json` | FetchSandbox MCP wiring |
| `apps/acme-pro/README.md` | Surface docs + run instructions |
| `apps/acme-pro/CLAUDE.md` | Agent dispatch rules |

---

## Bugs Reference (do not fix these — they are intentional)

| # | Location | Bug | Field/Key |
|---|---|---|---|
| 1 | `clerk_webhook` | No Svix signature verification — accepts any POST | Missing `svix-signature` check |
| 2 | `upgrade` | Always creates new Stripe Customer, ignores existing `stripe_customer_id` | Should check `user.get("stripe_customer_id")` first |
| 3 | `stripe_webhook` → `customer.subscription.updated` | Looks up user by `u.get("stripe_id")` — field is `"stripe_customer_id"` | Wrong key → user never found → role never set to `"pro"` |
| 4 | `stripe_webhook` → `invoice.payment_failed` | Uses `invoice.get("customer_email")` — Stripe only sets this when explicitly provided, usually `None` | Should look up email from `users` store by `invoice["customer"]` |
| 5 | `clerk_webhook` → `user.deleted` | Reads `data.get("user_id")` — Clerk sends `data.get("id")` | Wrong key → subscription never cancelled on account deletion |

---

## Task 1: Create `main.py` with all 5 bugs

**Files:**
- Create: `apps/acme-pro/main.py`

- [ ] **Step 1: Write `apps/acme-pro/main.py`**

```python
"""Acme Pro — SaaS membership API.

Public surface:
  POST /signup               validate Clerk JWT, create Stripe Customer, send welcome email
  GET  /me                   return user profile + subscription status (Clerk JWT required)
  POST /upgrade              create Stripe Subscription for this user
  POST /clerk-webhook        handle Clerk user.created / user.deleted events
  POST /stripe-webhook       handle customer.subscription.updated / invoice.payment_failed
  POST /resend-webhook       handle email.bounced / email.complained
  GET  /users/{user_id}      admin: full user state
"""
from __future__ import annotations

import jwt
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, EmailStr
import resend
import stripe

app = FastAPI(title="Acme Pro")

CLERK_JWT_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----"
CLERK_WEBHOOK_SECRET = "whsec_demo"
STRIPE_API_KEY = "sk_test_demo"
STRIPE_WEBHOOK_SECRET = "whsec_demo"
STRIPE_PRICE_ID = "price_demo"
RESEND_API_KEY = "re_demo"

stripe.api_key = STRIPE_API_KEY
resend.api_key = RESEND_API_KEY

# In-memory store — would be Postgres in prod.
users: dict[str, dict] = {}


class SignupReq(BaseModel):
    token: str  # Clerk session JWT


class UpgradeReq(BaseModel):
    pass  # token comes from Authorization header


def _decode_clerk_jwt(token: str) -> dict:
    """Decode Clerk session JWT. Signature verification omitted — see clerk app."""
    return jwt.decode(token, options={"verify_signature": False})


# ---------------------------------------------------------------------------
# User-facing endpoints
# ---------------------------------------------------------------------------

@app.post("/signup")
def signup(body: SignupReq) -> dict:
    claims = _decode_clerk_jwt(body.token)
    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(401, "No subject claim in JWT")

    email = claims.get("email")

    if user_id not in users:
        users[user_id] = {
            "id": user_id,
            "email": email,
            "role": "member",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "email_status": "active",
        }

    # Create Stripe Customer on first signup.
    if not users[user_id].get("stripe_customer_id"):
        customer = stripe.Customer.create(
            email=email,
            metadata={"clerk_user_id": user_id},
        )
        users[user_id]["stripe_customer_id"] = customer["id"]

    # Send welcome email.
    if users[user_id]["email_status"] == "active":
        resend.Emails.send({
            "from": "acme@acmepro.com",
            "to": email,
            "subject": "Welcome to Acme Pro",
            "html": f"<p>You're in. Start your free trial at acmepro.com.</p>",
        })

    return users[user_id]


@app.get("/me")
def me(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    claims = _decode_clerk_jwt(token)
    user_id = claims.get("sub")
    user = users.get(user_id) if user_id else None
    if not user:
        raise HTTPException(404, "User not found — sign up first")
    return user


@app.post("/upgrade")
def upgrade(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    claims = _decode_clerk_jwt(token)
    user_id = claims.get("sub")
    user = users.get(user_id) if user_id else None
    if not user:
        raise HTTPException(404, "User not found — sign up first")

    # BUG 2: always creates a new Stripe Customer on every upgrade call,
    # ignoring the existing stripe_customer_id stored at signup.
    # Should check: if user.get("stripe_customer_id"): customer_id = user["stripe_customer_id"]
    customer = stripe.Customer.create(
        email=user["email"],
        metadata={"clerk_user_id": user_id},
    )

    sub = stripe.Subscription.create(
        customer=customer["id"],
        items=[{"price": STRIPE_PRICE_ID}],
    )
    users[user_id]["stripe_customer_id"] = customer["id"]
    users[user_id]["stripe_subscription_id"] = sub["id"]
    return {"subscription_id": sub["id"], "status": sub["status"]}


@app.get("/users/{user_id}")
def get_user(user_id: str) -> dict:
    user = users.get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user


# ---------------------------------------------------------------------------
# Webhook endpoints
# ---------------------------------------------------------------------------

@app.post("/clerk-webhook")
async def clerk_webhook(
    request: Request,
    svix_signature: str = Header(None),
) -> dict:
    # BUG 1: no Svix signature verification — any caller can POST fake events.
    # Should verify svix-id, svix-timestamp, svix-signature headers using
    # the CLERK_WEBHOOK_SECRET before processing the payload.
    payload = await request.json()
    event_type = payload.get("type", "")
    data = payload.get("data", {})

    if event_type == "user.created":
        user_id = data.get("id")
        if user_id and user_id not in users:
            email = data.get("email_addresses", [{}])[0].get("email_address")
            users[user_id] = {
                "id": user_id,
                "email": email,
                "role": "member",
                "stripe_customer_id": None,
                "stripe_subscription_id": None,
                "email_status": "active",
            }

    elif event_type == "user.deleted":
        # BUG 5: Clerk sends the user ID as data["id"], not data["user_id"].
        # This lookup always returns None, so the subscription is never cancelled.
        user_id = data.get("user_id")
        user = users.get(user_id)
        if user and user.get("stripe_subscription_id"):
            stripe.Subscription.cancel(user["stripe_subscription_id"])
        users.pop(user_id, None)

    return {"received": True}


@app.post("/stripe-webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
) -> dict:
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Invalid Stripe signature")

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "customer.subscription.updated":
        customer_id = obj["customer"]
        # BUG 3: looks up user by "stripe_id" — the field is "stripe_customer_id".
        # user is always None, so role is never promoted to "pro".
        user = next(
            (u for u in users.values() if u.get("stripe_id") == customer_id),
            None,
        )
        if user and obj["status"] == "active":
            user["role"] = "pro"

    elif event_type == "invoice.payment_failed":
        invoice = obj
        # BUG 4: invoice["customer_email"] is only set when the Stripe Customer
        # was created with an email AND Stripe chose to copy it onto the invoice.
        # In practice this is often None. Should look up email from users store
        # by matching invoice["customer"] against stripe_customer_id.
        customer_email = invoice.get("customer_email")
        resend.Emails.send({
            "from": "acme@acmepro.com",
            "to": customer_email,
            "subject": "Payment failed — update your billing details",
            "html": "<p>We couldn't charge your card. Please update your billing info at acmepro.com/billing.</p>",
        })

    return {"received": True}


@app.post("/resend-webhook")
async def resend_webhook(
    request: Request,
    svix_signature: str = Header(None),
) -> dict:
    payload = await request.json()
    event_type = payload.get("type", "")

    if event_type == "email.bounced":
        email = payload.get("data", {}).get("to", [None])[0]
        for user_id, user in users.items():
            if user["email"] == email:
                users[user_id]["email_status"] = "bounced"
                break

    elif event_type == "email.complained":
        email = payload.get("data", {}).get("to", [None])[0]
        for user_id, user in users.items():
            if user["email"] == email:
                users[user_id]["email_status"] = "complained"
                break

    return {"received": True}
```

- [ ] **Step 2: Verify file exists and is valid Python**

```bash
cd /Users/ajit.gupta/Documents/GitHub/playground
python3 -c "import ast; ast.parse(open('apps/acme-pro/main.py').read()); print('syntax OK')"
```

---

## Task 2: Create supporting files

**Files:**
- Create: `apps/acme-pro/requirements.txt`
- Create: `apps/acme-pro/.mcp.json`
- Create: `apps/acme-pro/README.md`
- Create: `apps/acme-pro/CLAUDE.md`

- [ ] **Step 1: Write `apps/acme-pro/requirements.txt`**

```
fastapi==0.115.0
uvicorn==0.30.6
stripe==10.12.0
resend==2.3.0
PyJWT==2.9.0
pydantic[email]==2.9.2
```

- [ ] **Step 2: Write `apps/acme-pro/.mcp.json`**

```json
{
  "mcpServers": {
    "fetchsandbox": {
      "command": "npx",
      "args": ["-y", "fetchsandbox-mcp@latest"]
    }
  }
}
```

- [ ] **Step 3: Write `apps/acme-pro/README.md`**

```markdown
# Acme Pro

A SaaS membership API wiring Clerk (auth), Stripe (subscriptions), and Resend
(email) together. FastAPI on the backend, in-memory store standing in for
Postgres while we iterate.

## Surface

| Endpoint | Purpose |
|---|---|
| `POST /signup` | Validate Clerk JWT, create Stripe Customer, send welcome email |
| `GET /me` | Return user profile + subscription status |
| `POST /upgrade` | Create Stripe Subscription for this user |
| `POST /clerk-webhook` | Handle `user.created` / `user.deleted` events from Clerk |
| `POST /stripe-webhook` | Handle `customer.subscription.updated` / `invoice.payment_failed` |
| `POST /resend-webhook` | Handle `email.bounced` / `email.complained` |
| `GET /users/{user_id}` | Admin: full user state |

## Stack

- FastAPI, Pydantic, official `stripe` + `resend` Python SDKs, PyJWT
- In-memory `users` dict (will move to Postgres before launch)
- API keys + webhook secrets sourced from env in real deployments;
  hardcoded placeholders here for dev

## How to investigate / validate / debug

All investigation, validation, and bug-reproduction tasks go through
the FetchSandbox MCP server (already wired in `.mcp.json`):

```
./fetchsandbox something's off with our membership integration — investigate, fix it, and prove it.
```

Variant prefixes: `/fetchsandbox`, `@fetchsandbox`, `fs:`.

## Run locally

```
pip install -r requirements.txt
uvicorn main:app --reload
```

Then visit `http://localhost:8000/docs` for the interactive Swagger UI.
```

- [ ] **Step 4: Write `apps/acme-pro/CLAUDE.md`**

```markdown
# Acme Pro — Claude Code project rules

## Dispatch convention (HARD RULE)

This project uses the FetchSandbox dispatch convention. **Every
investigation or validation request MUST start with `./fetchsandbox`
followed by the actual ask.** Variant prefixes are also accepted:
`/fetchsandbox`, `@fetchsandbox`, or `fs:`.

### When the user's prompt starts with a dispatch prefix

1. **Call `mcp__fetchsandbox__guide` FIRST** with the FULL original
   prompt (INCLUDING the `./fetchsandbox` prefix) as the `intent`
   argument.
2. **Call `mcp__fetchsandbox__import_spec`** to get a sandbox.
3. **Call `mcp__fetchsandbox__run_workflow`** with the brain's
   `reproduce_with.workflow` + `reproduce_with.scenario` to reproduce
   the bug deterministically. The receipt URL it returns is the proof.
4. **Apply the fix** using the brain's `fix_pattern` as the template.
5. **Re-run `mcp__fetchsandbox__run_workflow`** to confirm. Second
   receipt URL = before/after proof.
6. **Final summary** surfaces the brain's full `check_for` items as
   the audit checklist.

### When the user's prompt does NOT start with a dispatch prefix

Respond:

> This project uses the FetchSandbox dispatch convention. Please
> restart your request with `./fetchsandbox` followed by your
> question. Example: `./fetchsandbox why are pro users not getting their role?`

## Hard constraints

- **DO NOT write or run local test files.** No pytest, unittest,
  plain assert scripts, or ad-hoc Python harnesses for proof.
- **DO NOT create a `.venv` or install local packages.**
- **The ONLY acceptable proof artifact is a FetchSandbox receipt URL.**
- **DO NOT re-derive domain knowledge** that the brain already encodes.

## Output style

- One short sentence per line. No multi-clause paragraphs.
- Lead with the conclusion. One supporting sentence if needed.
- Max 3 sentences per "thought" block before action.
- Inline-code only for literal tokens (e.g. `user.get("stripe_id")`).
- No "I'll now apply the fix" preambles. Just apply.
```

---

## Task 3: Commit

**Files:** all of `apps/acme-pro/`

- [ ] **Step 1: Stage and commit**

```bash
git add apps/acme-pro/
git commit -m "feat(acme-pro): add Clerk+Stripe+Resend membership app with 5 planted bugs"
```

---

## Self-Review

**Spec coverage check:**
- [x] Bug 1 (Clerk webhook no verification) — in `clerk_webhook`, no Svix check
- [x] Bug 2 (duplicate Stripe Customer on upgrade) — in `upgrade`, always calls `stripe.Customer.create`
- [x] Bug 3 (role sync wrong key) — in `stripe_webhook`, `u.get("stripe_id")` vs `"stripe_customer_id"`
- [x] Bug 4 (dunning email None) — in `stripe_webhook`, `invoice.get("customer_email")`
- [x] Bug 5 (Clerk deletion wrong key) — in `clerk_webhook`, `data.get("user_id")` vs `"id"`
- [x] All 4 support files covered
- [x] Follows repo convention (single file, in-memory, placeholder keys, `.mcp.json`, CLAUDE.md)

**Placeholder scan:** None found — all code is complete and runnable.

**Type consistency:** No cross-task type dependencies — single-task implementation.
