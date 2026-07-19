# Stress test — blind bug hunt

A set of brownfield apps, each with a planted bug (some span multiple files).

**Unlike the rest of the playground, these are BLIND.** We do *not* tell you
what's wrong, and we don't give you a prompt to paste. That's the whole point —
we want to see how *you* naturally describe the problem, and whether FetchSandbox
catches it from a cold start.

## The protocol

1. Pick an app in this folder (e.g. `01-acme-payments/`).
2. Read **only** its README — a short support ticket describing a *symptom*. No
   bug name, no fix, no suggested prompt.
3. Open the app folder in Claude Code / Cursor (any MCP editor). The `.mcp.json`
   is already wired to FetchSandbox.
4. Reload the FetchSandbox MCP so it's on the latest (`npx fetchsandbox-mcp@latest`
   — the banner should read `0.3.13` or higher).
5. Now use FetchSandbox **however you would** — in your own words. Don't overthink
   the wording; type what you'd actually type.
6. Let it investigate, fix, and prove.

## What to record — this is the data we want

- **Your exact prompts**, verbatim — including anything vague, wrong, or half-
  formed you tried first.
- What FetchSandbox asked *you* back, if anything.
- What it found, whether it actually fixed it, and whether the fix was *correct*.
- Anywhere it got stuck, guessed wrong, or gave up.

An honest **"it didn't work"** or **"it asked me X and I wasn't sure"** is more
useful to us than a clean success. Write it up in `../findings/` and open a PR
(see the repo [README](../README.md)), or send it straight to us.

## Setup (per app)

```bash
cd stress-test/01-acme-payments
npm install
npm start          # runs on :3000
```

Node 18+. Each app is a small Express service — the bug is in the *code*, not the
setup. You don't have to run it to use FetchSandbox, but you can.

## Difficulty

- **`01`–`06`** — single-file bugs. One focused mistake in `server.js`.
- **`07`–`09`** — multi-file bugs. The mistake is *distributed* across several
  files and only shows up when they interact — no single line looks wrong.

Please don't read the other apps' code for hints, and don't compare notes before
you run — a genuine cold start is exactly what we're measuring.

## The apps

| # | App | The reported symptom (that's all you get) |
|---|---|---|
| 01 | acme-payments | Customers charged 2–3× for one order. |
| 02 | postbox | Deliverability tanking; we keep emailing dead addresses. |
| 03 | gatekeeper | A researcher logged into admin with a token they made up. |
| 04 | workspace-auth | Users get logged out every few minutes mid-session. |
| 05 | agent-inbox | Messages appear in customer threads no one sent. |
| 06 | textline | People who replied STOP still get our texts. |
| 07 | checkout-pro | Duplicate charges; the webhook code "looks correct on review." |
| 08 | id-guard | Admin auth accepts a forged, unsigned token; every file passed review. |
| 09 | postbox-pro | Still emailing hard-bounced addresses; the bounce code is right there. |

Thanks for hunting. 🐛
