'use strict';

// Handler registry: maps a Resend event type to the function that processes it.
// router.js looks up incoming events here by `event.type`.
//
// Each handler owns one event type. Keep this map in sync with the files in
// this directory so every event Resend sends us has somewhere to land.

const delivered = require('./delivered');

const handlers = {
  'email.delivered': delivered,
};

module.exports = handlers;
