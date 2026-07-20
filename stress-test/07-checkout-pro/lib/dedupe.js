'use strict';

/**
 * A tiny claim-once store. Swap the backing Set for Redis/Postgres in
 * production; the contract is the same.
 */
const seen = new Set();

/**
 * Has this key been recorded before?
 */
function has(key) {
  return seen.has(key);
}

/**
 * Record a key as processed.
 */
function add(key) {
  seen.add(key);
}

/**
 * Atomically claim a key. Returns true only for the first caller of a given
 * key; every later caller gets false.
 */
function claim(key) {
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

function reset() {
  seen.clear();
}

module.exports = { has, add, claim, reset };
