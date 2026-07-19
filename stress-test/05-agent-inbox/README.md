# Agent Inbox

Our support agent's email inbox on AgentMail. Inbound customer emails hit the
`/webhook/inbound` endpoint and get appended to the matching customer thread,
which the agent reads back through `/threads/:id`.

We noticed messages appearing in customer threads that the customer says they
never sent. It looks like someone can inject messages into a thread. Normal
inbound mail works fine.

The FetchSandbox MCP is configured (.mcp.json) — use it to investigate, fix, and prove the fix.
