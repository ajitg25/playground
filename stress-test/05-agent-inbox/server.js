'use strict';

const express = require('express');
const { AgentMailClient } = require('agentmail');

const app = express();
app.use(express.json());

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY || '';
const AGENTMAIL_WEBHOOK_SECRET = process.env.AGENTMAIL_WEBHOOK_SECRET || '';

const agentmail = new AgentMailClient({ apiKey: AGENTMAIL_API_KEY });

// In-memory conversation store, keyed by customer thread id.
// { [threadId]: { id, customer, messages: [{ from, subject, text, direction, receivedAt }] } }
const threads = {};

function getOrCreateThread(threadId, customer) {
  if (!threads[threadId]) {
    threads[threadId] = { id: threadId, customer: customer || null, messages: [] };
  }
  return threads[threadId];
}

// Inbound webhook: AgentMail POSTs here whenever the support inbox receives mail.
// Each event carries the thread it belongs to plus the parsed message.
app.post('/webhook/inbound', (req, res) => {
  const event = req.body || {};

  if (event.type !== 'message.received') {
    return res.status(200).json({ ignored: true });
  }

  const message = event.data || {};
  const threadId = message.thread_id || message.threadId;

  if (!threadId) {
    return res.status(400).json({ error: 'missing thread_id' });
  }

  // Handle inbound message: append it to the customer's thread so the
  // support agent picks it up on the next poll.
  const thread = getOrCreateThread(threadId, message.from);
  thread.messages.push({
    from: message.from,
    subject: message.subject || '',
    text: message.text || '',
    direction: 'inbound',
    receivedAt: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true, threadId, count: thread.messages.length });
});

// Read a single customer thread (used by the support agent UI).
app.get('/threads/:id', (req, res) => {
  const thread = threads[req.params.id];
  if (!thread) {
    return res.status(404).json({ error: 'thread not found' });
  }
  return res.status(200).json(thread);
});

app.listen(3000, () => {
  console.log('agent-inbox listening on :3000');
});

module.exports = { app, threads };
