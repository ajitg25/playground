'use strict';

const contacts = require('../../services/contacts');

// email.delivered — Resend confirms the message reached the recipient's inbox.
// We record the delivery timestamp so reporting stays accurate.
module.exports = async function onDelivered(event) {
  const email = event && event.data && event.data.to;
  if (!email) return;

  contacts.markDelivered(email, {
    at: (event.data && event.data.created_at) || new Date().toISOString(),
  });
};
