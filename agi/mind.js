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

function frameFrom(contact) {
  if (Array.isArray(contact)) return contact;
  return contact && typeof contact === 'object' && Array.isArray(contact.frame) ? contact.frame : null;
}

// Whole-history categorical recompression is an expensive proposal search, not
// epistemic authority. Its cadence therefore scales with receptor dimensionality.
// Exact contact is still retained on every update and existing learned structure
// is still incrementally refreshed. This prevents a dense raw stream from causing
// repeated combinatorial rescans merely because its exact numeric values are new.
function budgetWholeRecompression(state, contact) {
  const frame = frameFrom(contact);
  if (!frame || !state?.structure) return;
  const dimensions = frame.length - (state.concern_count || 0);
  if (dimensions < 8) return; // preserve the existing small-world cadence exactly.
  const interval = Math.max(16, dimensions * dimensions);
  const nextExperience = (state.experiences?.length || 0) + 1;
  const boundary = Math.ceil(nextExperience / interval) * interval;
  if (state.structure.next_recompression_at < boundary) state.structure.next_recompression_at = boundary;
}

function C(state, realityContact) {
  budgetWholeRecompression(state, realityContact);
  Relational.C(state, realityContact);

  const hasFrame = !!frameFrom(realityContact);
  if (hasFrame) {
    const update = Continuous.relationalUpdate(state);
    if (update) Relational.C(state, update);
  }
  return state;
}

module.exports = { one, C };
