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
