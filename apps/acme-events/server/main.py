"""Acme Events — Ticket purchase with Stripe payments + Surge SMS confirmations.

Surface:
  POST /create-payment-intent  create Stripe PaymentIntent for ticket purchase
  POST /webhook                Stripe webhook: payment success → send SMS via Surge
  POST /surge-webhook          Surge webhook: delivery confirmation
  GET  /tickets/{ticket_id}    fetch ticket + delivery status
"""
from __future__ import annotations

import os
import uuid

from dotenv import load_dotenv
load_dotenv()

import httpx
import stripe
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]
SURGE_API_KEY = os.environ["SURGE_API_KEY"]
SURGE_ACCOUNT_ID = os.environ["SURGE_ACCOUNT_ID"]
SURGE_WEBHOOK_SECRET_KEY = os.environ["SURGE_WEBHOOK_SECRET"]
SURGE_BASE = "https://api.surge.app"

app = FastAPI(title="Acme Events")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tickets: dict[str, dict] = {}


class CheckoutRequest(BaseModel):
    event_name: str
    ticket_holder_name: str
    email: str
    phone: str
    amount_cents: int = 4999
    currency: str = "usd"


@app.post("/create-payment-intent")
def create_payment_intent(req: CheckoutRequest) -> dict:
    ticket_id = f"tkt_{uuid.uuid4().hex[:8]}"
    tickets[ticket_id] = {
        "id": ticket_id,
        "event": req.event_name,
        "name": req.ticket_holder_name,
        "email": req.email,
        "phone": req.phone,
        "status": "pending",
        "sms_delivered": False,
    }

    # BUG: no idempotency_key — network retries create duplicate PaymentIntents
    intent = stripe.PaymentIntent.create(
        amount=req.amount_cents,
        currency=req.currency,
        automatic_payment_methods={"enabled": True},
        metadata={"ticket_id": ticket_id},
        receipt_email=req.email,
    )
    tickets[ticket_id]["payment_intent_id"] = intent.id
    return {"client_secret": intent.client_secret, "ticket_id": ticket_id}


@app.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(...),
) -> dict:
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(400, "Invalid signature")

    if event.type == "payment_intent.succeeded":
        pi = event.data.object
        ticket_id = (pi.metadata or {}).get("ticket_id")
        if ticket_id and ticket_id in tickets:
            tickets[ticket_id]["status"] = "confirmed"
            _send_surge_sms(ticket_id)

    elif event.type == "payment_intent.payment_failed":
        pi = event.data.object
        ticket_id = (pi.metadata or {}).get("ticket_id")
        if ticket_id and ticket_id in tickets:
            tickets[ticket_id]["status"] = "payment_failed"

    return {"received": True}


@app.post("/surge-webhook")
async def surge_webhook(
    request: Request,
    surge_signature: str = Header(None),
) -> dict:
    # BUG: no signature verification — anyone can POST fake delivery events
    payload = await request.json()
    event_type = payload.get("type", "")

    if event_type == "message.delivered":
        phone = payload.get("data", {}).get("to")
        for ticket in tickets.values():
            if ticket["phone"] == phone:
                ticket["sms_delivered"] = True
                break

    return {"received": True}


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str) -> dict:
    ticket = tickets.get(ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    return ticket


def _send_surge_sms(ticket_id: str) -> None:
    ticket = tickets[ticket_id]
    with httpx.Client() as client:
        client.post(
            f"{SURGE_BASE}/accounts/{SURGE_ACCOUNT_ID}/messages",
            headers={"Authorization": f"Bearer {SURGE_API_KEY}"},
            json={
                "to": ticket["phone"],
                "body": (
                    f"Your ticket for {ticket['event']} is confirmed! "
                    f"Ticket ID: {ticket_id}. See you there!"
                ),
            },
        )
