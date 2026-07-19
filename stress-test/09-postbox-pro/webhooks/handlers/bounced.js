'use strict';

const contacts = require('../../services/contacts');

// email.bounced — Resend reports the message hard-bounced (invalid mailbox,
// domain rejected, etc). We suppress the contact so we stop sending to an
// address that can never receive mail; continuing to send hurts deliverability.
//
// email.complained (spam report) is treated the same way — a complaint is an
// even stronger signal that we must stop emailing this address.
module.exports = async function onBounced(event) {
  const email = event && event.data && event.data.to;
  if (!email) return;

  const reason = (event.data && event.data.bounce && event.data.bounce.type) || event.type;

  contacts.markBounced(email, {
    reason,
    at: (event.data && event.data.created_at) || new Date().toISOString(),
  });
};
