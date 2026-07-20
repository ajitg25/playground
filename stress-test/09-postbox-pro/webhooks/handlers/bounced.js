'use strict';

const contacts = require('../../services/contacts');

// email.bounced — Resend reports the message hard-bounced (invalid mailbox,
// domain rejected, etc). email.complained (spam report) is handled the same way.
module.exports = async function onBounced(event) {
  const email = event && event.data && event.data.to;
  if (!email) return;

  const reason = (event.data && event.data.bounce && event.data.bounce.type) || event.type;

  contacts.markBounced(email, {
    reason,
    at: (event.data && event.data.created_at) || new Date().toISOString(),
  });
};
