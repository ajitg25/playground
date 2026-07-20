# Stress test — blind bug hunt

A set of brownfield apps, each with a planted bug (some span multiple files).

**These are fully BLIND.** You get the code and nothing else — no symptom, no
support ticket, no bug name, no prompt to paste. That's the whole point: we want
to see how *you* investigate an unfamiliar app from a cold start, what you
naturally type, and whether FetchSandbox catches the problem.

## The protocol

1. Pick an app in this folder (e.g. `01-acme-payments/`).
2. Open the app folder in Claude Code / Cursor (any MCP editor). The `.mcp.json`
   is already wired to FetchSandbox.
3. Reload the FetchSandbox MCP so it's on the latest (`npx fetchsandbox-mcp@latest`
   — the banner should read `0.3.14` or higher).
4. Look around / run it if you like, then use FetchSandbox **however you would**
   — in your own words. Don't overthink the wording; type what you'd actually
   type to investigate a service you just inherited.
5. Let it investigate, fix, and prove.

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

You get the folder, nothing else. What each app integrates with is obvious from
the code the moment you open it.

| # | App | Scope |
|---|---|---|
| 01 | `acme-payments` | single-file |
| 02 | `postbox` | single-file |
| 03 | `gatekeeper` | single-file |
| 04 | `workspace-auth` | single-file |
| 05 | `agent-inbox` | single-file |
| 06 | `textline` | single-file |
| 07 | `checkout-pro` | multi-file |
| 08 | `id-guard` | multi-file |
| 09 | `postbox-pro` | multi-file |

Thanks for hunting. 🐛
