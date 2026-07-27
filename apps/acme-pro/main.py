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
            "html": "<p>You're in. Start your free trial at acmepro.com.</p>",
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
    # Fix: check user.get("stripe_customer_id") and reuse if present.
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
    # An attacker can send a fake user.deleted event to cancel a real user's
    # Stripe subscription. Fix: verify svix-id, svix-timestamp, svix-signature
    # headers against CLERK_WEBHOOK_SECRET before processing.
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
        # BUG 5: Clerk sends the user ID under data["id"], not data["user_id"].
        # This lookup always returns None — the subscription is never cancelled.
        # Fix: user_id = data.get("id")
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
        # BUG 3: looks up user by "stripe_id" — the actual field is "stripe_customer_id".
        # user is always None, so role is never promoted to "pro" after payment.
        # Fix: u.get("stripe_customer_id") == customer_id
        user = next(
            (u for u in users.values() if u.get("stripe_id") == customer_id),
            None,
        )
        if user and obj["status"] == "active":
            user["role"] = "pro"

    elif event_type == "invoice.payment_failed":
        invoice = obj
        # BUG 4: invoice["customer_email"] is only populated when the Stripe
        # Customer was created with an explicit email AND Stripe copies it onto
        # the invoice — which is not guaranteed. In practice this is often None,
        # so the Resend call fails or sends to a null address.
        # Fix: look up email from users store by matching invoice["customer"]
        # against each user's stripe_customer_id.
        customer_email = invoice.get("customer_email")
        resend.Emails.send({
            "from": "acme@acmepro.com",
            "to": customer_email,
            "subject": "Payment failed — update your billing details",
            "html": "<p>We couldn't charge your card. Please update your billing info at acmepro.com/billing.</p>",
        })

    return {"received": True}


@app.post("/resend-webhook")
async def resend_webhook(request: Request) -> dict:
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
