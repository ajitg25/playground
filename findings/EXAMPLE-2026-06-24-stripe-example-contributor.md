# stripe — 2026-06-24

> **EXAMPLE finding** — shows the shape. Not a real session. Replace with
> your own at `findings/<date>-<app>-<your-github-username>.md` and open a PR.

**Prompt:** `./fetchsandbox we have a stripe webhook bug — payments getting marked paid 2-3 times. fix it with proof.`

**Agent / IDE:** Claude Code (Opus 4.7), MCP via `.mcp.json` in `apps/stripe/`.

**Receipt URLs:**
- before: https://fetchsandbox.com/runs/<id>?flow=run_<uuid>
- after: https://fetchsandbox.com/runs/<id>?flow=run_<uuid>

**What happened:**

Brain matched `webhook_duplicate_side_effect` at 0.95 confidence. Picked
`accept_payment` workflow + `webhook_retries` scenario. Ran it, got the
before-receipt showing Stripe redelivered the same `event.id` 3x. Agent
read `main.py`, found dedup was on the `stripe-webhook-id` delivery header
(rotates per retry) instead of `event.id`. Fixed dedup to use `event.id`,
re-ran the workflow, got the after-receipt.

Brain felt useful — without it I'd have fixed the surface symptom but
probably missed the "in-memory dedup doesn't survive restart and isn't
multi-worker safe" callout the `check_for` items surfaced. Receipt URLs
appeared in the run output cleanly this time. Score: 8/10 (one point off
because the brain didn't flag the missing svix-style signature verification
that's also in this file).
