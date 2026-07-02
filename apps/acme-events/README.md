# Acme Events — Stripe + Surge demo

A ticket-purchase demo app with two planted bugs, built to showcase the FetchSandbox MCP integration.

- **Next.js** storefront with Stripe Elements
- **FastAPI** backend: Stripe payments + Surge SMS confirmations

## Bugs (planted)

| # | Location | Bug | Impact |
|---|----------|-----|--------|
| 1 | `server/main.py` `create_payment_intent` | No `idempotency_key` on `stripe.PaymentIntent.create` | Network retries double-charge customers |
| 2 | `server/main.py` `surge_webhook` | No signature verification on Surge webhook | Anyone can fake SMS delivery events |

## Demo prompt

```
./fetchsandbox customers getting double-charged on retry and someone is faking our SMS delivery events
```

## Setup

### 1. Install deps

```bash
cd web && npm install   # or pnpm install
cd ../server && pip install -r requirements.txt
```

### 2. Configure env

```bash
cp server/.env.example server/.env
cp web/.env.local.example web/.env.local
```

Fill in the values (Stripe test keys are free at dashboard.stripe.com; Surge keys at surge.app).

### 3. Run

Terminal 1 — backend:
```bash
cd server
uvicorn main:app --reload
```

Terminal 2 — frontend:
```bash
cd web
npm run dev
```

Terminal 3 — Stripe webhook forwarding:
```bash
stripe listen --forward-to localhost:8000/webhook
```

Open http://localhost:3000, buy a ticket with card `4242 4242 4242 4242`.
