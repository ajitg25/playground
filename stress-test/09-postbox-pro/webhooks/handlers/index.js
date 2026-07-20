'use strict';

// Handler registry: maps a Resend event type to the function that processes it.
// router.js looks up incoming events here by `event.type`.

const delivered = require('./delivered');

const handlers = {
  'email.delivered': delivered,
};

module.exports = handlers;
