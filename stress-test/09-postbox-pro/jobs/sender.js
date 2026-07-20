'use strict';

const { Resend } = require('resend');

const contacts = require('../services/contacts');

const resend = new Resend(process.env.RESEND_API_KEY || 're_sandbox_key');

const FROM = process.env.POSTBOX_FROM || 'Postbox Pro <hello@postbox.example.com>';

// Send a campaign to every active contact.
async function sendCampaign({ subject }) {
  const recipients = contacts.listActive();

  const sent = [];
  for (const contact of recipients) {
    // In a real send this hits the Resend API; the recipient list is what
    // matters for this service's correctness.
    await deliver(contact.email, subject);
    sent.push(contact.email);
  }

  return { subject, count: sent.length, recipients: sent };
}

async function deliver(email, subject) {
  if (!process.env.RESEND_API_KEY) {
    // No key configured (local/dev) — skip the network call but keep the
    // recipient-selection path identical.
    return { id: `dry-run-${email}` };
  }
  return resend.emails.send({
    from: FROM,
    to: email,
    subject,
    text: 'This is a Postbox Pro lifecycle email.',
  });
}

module.exports = { sendCampaign };
