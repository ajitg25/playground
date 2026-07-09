# FetchSandbox Playground

> **Open-source test project for [FetchSandbox](https://fetchsandbox.com).**
> 5 brownfield apps with planted bugs in real API integrations. Run them
> against your agent, write up what you found, open a PR. Merged PRs
> appear on your GitHub contribution graph and in the
> [contributors](https://github.com/fetchsandbox/playground/graphs/contributors)
> list.

Clone, run, point your agent at it, see whether FetchSandbox catches the bug.

## What's in here

| App | Stack | What's broken |
|---|---|---|
| [apps/stripe](apps/stripe) | FastAPI + Stripe SDK | Webhook dedup uses the wrong header — same event gets processed 2–3x on retry. |
| [apps/resend](apps/resend) | FastAPI + Resend webhooks | Handler only listens for `email.delivered`. Bounces + complaints silently dropped; users stay "active" after bouncing. |
| [apps/clerk](apps/clerk) | FastAPI + Clerk auth | Session token validation skipped on one endpoint. |
| [apps/agentmail](apps/agentmail) | FastAPI + AgentMail | Inbox webhook handler ignores `message.received` events when the body has attachments. |
| [apps/surge](apps/surge) | FastAPI + Surge messaging | Outbound SMS retry on rate-limit hits an off-by-one and re-sends to the wrong number. |
| [apps/descope](apps/descope) | FastAPI + Descope agentic auth | Access-key exchange trusts client-requested scopes — a read-only agent key can escalate to `users:write`. |

Each app is ~50–150 lines of Python, runs locally in seconds.

## How to run

Pick an app, e.g. stripe:

```bash
git clone https://github.com/fetchsandbox/playground.git
cd playground/apps/stripe
pip install -r requirements.txt
uvicorn main:app --reload
```

Open the project in [Cursor](https://cursor.com), [Claude Code](https://docs.anthropic.com/claude/docs/claude-code),
or any MCP-capable editor. The `.mcp.json` in each app folder is already
wired to FetchSandbox.

Then ask your agent:

```
./fetchsandbox we have a stripe webhook bug — payments getting marked paid 2-3 times. fix it with proof.
```

The agent will call FetchSandbox's brain, pick a workflow, run it, and
hand back a receipt URL. That's the proof artifact.

Each app's README has the suggested prompt + expected outcome.

## Send us back what you saw

1. **Fork the repo:** [github.com/fetchsandbox/playground/fork](https://github.com/fetchsandbox/playground/fork) (one click).
2. After running the demo, paste this to your agent:

   ```
   save my session as a findings markdown file at findings/<today's date>-<app>-<my-github-username>.md, commit on a new branch named for me, push to my fork.
   ```

   The agent writes the file from the session it just ran and pushes the branch to your fork.
3. **Open a PR** from your fork against `main` on this repo.

Prefer to do it by hand? Copy [FINDINGS_TEMPLATE.md](FINDINGS_TEMPLATE.md)
into `findings/` in your fork, fill it in, commit, push, PR.

Honest "it didn't work" is more useful than a green-checkmark write-up.

Merged PRs appear on your GitHub contribution graph and on the
[contributors](https://github.com/fetchsandbox/playground/graphs/contributors)
page.

## License

MIT — fork it, modify it, plant your own bugs.
