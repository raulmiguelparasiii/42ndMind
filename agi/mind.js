'use strict';

// Public one-M / one-C AGI entrypoint.
//
// The previous relational/surface implementation is retained byte-for-byte in
// mind-relational.js. This wrapper adds no cognitive state. After exact numeric
// contact has entered the same M, a pure content-neutral variation calculation
// may return ordinary relational contact, which is settled through the same C.

const Relational = require('./mind-relational.js');
const Continuous = require('./continuous-relational-contact.js');

function one(actionCount, concernCount = 1) {
  return Relational.one(actionCount, concernCount);
}

function C(state, realityContact) {
  Relational.C(state, realityContact);

  const hasFrame = Array.isArray(realityContact) ||
    !!(realityContact && typeof realityContact === 'object' && Array.isArray(realityContact.frame));
  if (hasFrame) {
    const update = Continuous.relationalUpdate(state);
    if (update) Relational.C(state, update);
  }
  return state;
}

module.exports = { one, C };
