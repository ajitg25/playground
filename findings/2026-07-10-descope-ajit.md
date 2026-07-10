# descope-onboarding — 2026-07-10

**Prompt:** `./fetchsandbox I'm adding Descope OTP sign-up to this app — prove the Descope OTP + session flow in the sandbox before writing any code, then propose the diff. I'll decide whether to apply.`

**Agent / IDE:** Claude Code (Sonnet 4.6 1M), MCP via `.mcp.json` in `apps/descope-onboarding/`.

**Receipt URLs:** none

**What happened:**

`list_specs` confirmed Descope is in the catalog (slug: `descope`, 505 endpoints, id `a891909bdf46`). `guide` matched correctly: recognized OTP intent, routed to `spec=descope`, named the right workflow (`otp_signup_email`), and asked a sensible follow-up about session model (`jwt_jwks` vs SDK-managed). Dispatch prefix telemetry recorded `dotslash`. That part felt solid.

From there, two things blocked a run:

1. **No curated workflows.** The guide's debug returned `"no curated workflow available; consider Tier-1 promotion"`. `otp_signup_email` is named in the brain's routing table but hasn't been promoted to a runnable workflow. `run_workflow` needs a `sandbox_id` from `import_spec`, and `import_spec` needs a URL.

2. **No stable public OpenAPI URL for Descope.** Tried `api.descope.com/openapi.json`, `api.descope.com/v1/openapi.json`, GitHub raw links across several Descope repos, and the `www.descope.com` redirect — all 404. The spec is in the FetchSandbox catalog but the ingestion path isn't public.

3. **`coach` stuck in intake loop.** Sent `otp_signup_email`, `otp`, and `__list__` as `user_response` — same response every time. The server-side state machine never advances past intake when `workflow=null`. Canvas URL: `https://fetchsandbox.com/guide/94d29eaf-7ac5-4500-b6f8-f71282154858`.

No receipt URL was produced, so per project rules (`CLAUDE.md`: "The ONLY acceptable proof artifact is a FetchSandbox receipt URL") no diff was written.

**What worked well:** Brain's domain knowledge is correct — it knows the right workflow name, the right session model options, and the right questions to ask. The intent routing part of the pipeline is well-designed; the missing piece is a runnable workflow and a public spec URL to bootstrap `import_spec`.

**Score: 4/10** — spec recognized, intent routed correctly, but coach loop + no runnable workflow + no importable URL meant zero proof artifacts. Would be a 9/10 if `otp_signup_email` were promoted to Tier-1.

---

# descope agentic auth — scope escalation audit — 2026-07-10

**Prompt:** `./fetchsandbox our agent access-key exchange might be handing out more scope than the key was granted — audit the descope agentic auth`

**Agent / IDE:** Claude Code (Sonnet 4.6 1M), MCP via `.mcp.json` in `apps/descope`.

**Receipt URLs:** none

**What happened:**

`guide` connected cleanly and performed better than the OTP session. It routed to `spec=descope` and matched `intent_class=debug` → `matched_bug_pattern=scope_escalation_on_exchange` at **confidence 0.85** via `memory_graph`. The bug pattern is precise and correct:

```
POST /v1/auth/accesskey/exchange
{
  "accessKey": "ak_readonly",
  "loginOptions": { "customClaims": { "scopes": ["users:write"] } }
}
```
- Buggy image (`fetchsandbox/sim-descope-accesskey-buggy:1`) → `200` (scope granted, escalation succeeds)
- Fixed image (`fetchsandbox/sim-descope-accesskey-fixed:1`) → `403` (scope exceeds key grant — refused)

The brain's `likely_cause`: exchange copies `loginOptions.customClaims.scopes` into the minted session without clamping to the key's granted set, letting any caller self-escalate at exchange time.

Three blockers prevented a receipt URL:

1. **Coach ↔ guide router split.** `guide` found the bug pattern at 0.85 via memory_graph. `coach` uses a separate router — returns confidence 0.6 and `matched_bug_pattern: null`. Coach stuck in same intake loop as OTP session; `user_response` with full bug context ignored. Canvas: `https://fetchsandbox.com/guide/ba85849e-d80b-41b7-9c0b-834de0c236ee`.

2. **No public spec URL.** Same as OTP session — `import_spec` requires `url` or `content`; the catalog ID (`a891909bdf46`) is not a valid argument and no public Descope OpenAPI endpoint exists.

3. **Simulation images not invokable via MCP.** `run_workflow` requires `sandbox_id` from `import_spec`. There is no tool that accepts a simulation image (`fetchsandbox/sim-descope-accesskey-buggy:1`) directly to produce a receipt URL.

**What worked well:** Intent routing via `guide` is now surfacing real bug patterns from the memory graph with high confidence. The domain knowledge (exact endpoint, payload, buggy/fixed assertions, fix pattern) is correct and matches the planted bug in `apps/descope/`. The gap is coach/guide parity and a path from simulation image → receipt URL that bypasses `import_spec`.

**Proposed fix (per brain, no receipt URL):** Clamp the exchanged session's scopes to the intersection of the key's granted scopes and the caller-requested scopes. Treat `loginOptions` as a request, not an authority — reject with 403 if any requested scope exceeds the key's grant.

**Score: 6/10** — significantly better than OTP session. Brain found the exact bug, named the Docker simulation images, and provided the probe and assertion. Blocked only by coach/guide split and the import_spec wall. Would be a 10/10 with a direct simulation-image → receipt URL path.
