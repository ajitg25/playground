'use strict';

const express = require('express');
const { Surge } = require('@surge-sms/surge');

const app = express();
app.use(express.json());

const surge = new Surge({
  apiKey: process.env.SURGE_API_KEY,
  accountId: process.env.SURGE_ACCOUNT_ID,
});

const FROM_NUMBER = process.env.SURGE_FROM_NUMBER || '+15005550006';

// In-memory contact book. In production this is backed by Postgres.
// { phone -> { name, appointmentAt, optedOut } }
const contacts = new Map();

function seedContacts() {
  contacts.set('+15551230001', { name: 'Dana Reyes', appointmentAt: '2026-07-19T15:00:00Z', optedOut: false });
  contacts.set('+15551230002', { name: 'Marcus Bell', appointmentAt: '2026-07-19T16:30:00Z', optedOut: false });
  contacts.set('+15551230003', { name: 'Priya Nair', appointmentAt: '2026-07-20T09:15:00Z', optedOut: false });
}
seedContacts();

function normalize(num) {
  if (!num) return num;
  return num.trim();
}

// Inbound SMS + opt-out events land here (configured as the Surge webhook URL).
app.post('/webhook/inbound', (req, res) => {
  const event = req.body || {};
  const type = event.type || 'message.received';
  const data = event.data || {};
  const from = normalize(data.from || data.phone_number);
  const body = (data.body || '').trim();

  if (type === 'message.received') {
    const keyword = body.toUpperCase();

    if (keyword === 'STOP' || keyword === 'UNSUBSCRIBE' || keyword === 'CANCEL') {
      // Surge auto-suppresses further sends on its side, so we just
      // acknowledge the inbound keyword and log it for the audit trail.
      console.log(`[inbound] opt-out keyword "${keyword}" from ${from}`);
      return res.status(200).json({ ok: true, keyword });
    }

    if (keyword === 'START' || keyword === 'YES') {
      const contact = contacts.get(from);
      if (contact) contact.optedOut = false;
      console.log(`[inbound] opt-in from ${from}`);
      return res.status(200).json({ ok: true, keyword });
    }

    console.log(`[inbound] message from ${from}: ${body}`);
    return res.status(200).json({ ok: true });
  }

  if (type === 'message.opt_out' || type === 'contact.unsubscribed') {
    // Provider-side unsubscribe notification. Acknowledge inbound.
    console.log(`[inbound] opt-out event for ${from}`);
    return res.status(200).json({ ok: true });
  }

  console.log(`[inbound] unhandled event type: ${type}`);
  return res.status(200).json({ ok: true });
});

// Fan out appointment reminders to everyone with an upcoming appointment.
app.post('/send-reminders', async (req, res) => {
  const sent = [];
  const failed = [];

  for (const [phone, contact] of contacts.entries()) {
    if (!contact.appointmentAt) continue;

    const text = `Hi ${contact.name}, this is a reminder of your appointment on ${contact.appointmentAt}. Reply STOP to opt out.`;

    try {
      await surge.messages.create({
        accountId: process.env.SURGE_ACCOUNT_ID,
        from: FROM_NUMBER,
        to: phone,
        body: text,
      });
      sent.push(phone);
    } catch (err) {
      console.error(`[send] failed for ${phone}: ${err.message}`);
      failed.push(phone);
    }
  }

  return res.status(200).json({ sent, failed, count: sent.length });
});

app.get('/health', (req, res) => res.status(200).json({ ok: true }));

app.listen(3000, () => {
  console.log('textline reminder service listening on :3000');
});

module.exports = { app, contacts };
