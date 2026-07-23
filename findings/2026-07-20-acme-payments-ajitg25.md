# acme-payments — 2026-07-20

**Prompt:** `./fetchsandbox i am working on this project called acme-payments and its not working as expected, i feel there is a bug in the code. can you look into the code and fix it use fetchsandbox mcp as required`

**Agent / IDE:** Claude Code (Sonnet 4.6 1M), MCP via `.mcp.json` in `stress-test/01-acme-payments/`.

**Receipt URLs:**
- Bug 1 (signature bypass): https://fetchsandbox.com/runs/cd73424650?flow=run_96bdd176-45ae-470b-a853-52b459599c58
- Bug 2 (double-charge): https://fetchsandbox.com/runs/cd73424650?flow=run_25eefde9-aa20-4582-9b65-dd605f56317e

**What happened:**

Read `server.js` and spotted two issues before running any sandbox. Used `guide` with the full symptom description — it routed to `accept_payment` workflow and surfaced the `webhook_signature_unverified` bug pattern (90% confidence, 3 prior occurrences flagged). Ran `quickrun` with `webhook_retries` scenario to reproduce the double-charge, then `verify_behavior` with `webhook_duplicate_side_effect` — before-receipt showed the same `event.id` delivered twice caused two charges; after-receipt showed clean single charge.

For the signature bug, needed a second `guide` call with `signed_event_with_mutated_body` hint to surface the pattern ID. `verify_behavior` with `webhook_signature_unverified` confirmed: buggy handler returned 200 on a forged webhook (no `stripe-signature`), fixed handler returned 401.

Both fixes in one edit — replaced `JSON.parse` with `stripe.webhooks.constructEvent()` and swapped the dedupe key from `stripe-delivery-id` to `event.id`.

Brain was useful — the `check_for` items on `webhook_signature_unverified` explicitly called out that signature errors should return 400 not 200, which confirmed the right HTTP status for the error branch. The `webhook_duplicate_side_effect` pattern's simulation was the clearest proof: the charge-count probe returning 409 on buggy vs 200 on fixed made it immediately obvious what was broken. Score: 9/10 (one point off because the guide needed two calls to surface both pattern IDs — would be cleaner if it returned multiple matched patterns in one shot).
