'use strict';

// In-memory contact store. In production this is backed by Postgres, but the
// shape and semantics are identical: a contact has a status, and only "active"
// contacts are eligible to receive mail.

const STATUS = {
  ACTIVE: 'active',
  BOUNCED: 'bounced',
  SUPPRESSED: 'suppressed',
};

// Seed list — some real subscribers plus Resend's sandbox test addresses.
const contacts = new Map([
  ['delivered@resend.dev', { email: 'delivered@resend.dev', status: STATUS.ACTIVE }],
  ['bounced@resend.dev', { email: 'bounced@resend.dev', status: STATUS.ACTIVE }],
  ['complained@resend.dev', { email: 'complained@resend.dev', status: STATUS.ACTIVE }],
  ['casey@example.com', { email: 'casey@example.com', status: STATUS.ACTIVE }],
]);

function upsert(email) {
  let c = contacts.get(email);
  if (!c) {
    c = { email, status: STATUS.ACTIVE };
    contacts.set(email, c);
  }
  return c;
}

function markDelivered(email, meta = {}) {
  const c = upsert(email);
  c.lastDeliveredAt = meta.at || new Date().toISOString();
  return c;
}

// Suppress a contact after a hard bounce or complaint. Once bounced, the
// contact is no longer active and must be excluded from future sends.
function markBounced(email, meta = {}) {
  const c = upsert(email);
  c.status = STATUS.BOUNCED;
  c.bounceReason = meta.reason || null;
  c.bouncedAt = meta.at || new Date().toISOString();
  return c;
}

function isActive(email) {
  const c = contacts.get(email);
  return !!c && c.status === STATUS.ACTIVE;
}

function listActive() {
  return [...contacts.values()].filter((c) => c.status === STATUS.ACTIVE);
}

function get(email) {
  return contacts.get(email) || null;
}

module.exports = {
  STATUS,
  markDelivered,
  markBounced,
  isActive,
  listActive,
  get,
};
