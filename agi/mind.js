'use strict';

// Public one-M / one-C AGI entrypoint.
//
// Durable cognition remains in canonical M. Relational/surface completion,
// continuous-contact discovery, and discourse arbitration are zero-state views
// or transformations over that same M; none owns a second truth or memory state.

const Relational = require('./mind-relational.js');
const Continuous = require('./continuous-relational-contact.js');
const Discourse = require('./discourse-arbiter.js');

function one(actionCount, concernCount = 1) {
  return Relational.one(actionCount, concernCount);
}

function frameFrom(contact) {
  if (Array.isArray(contact)) return contact;
  return contact && typeof contact === 'object' && Array.isArray(contact.frame) ? contact.frame : null;
}
function unansweredSurface(contact) {
  return !!(contact && typeof contact === 'object' && contact.surface &&
    (contact.surface.output === undefined || contact.surface.output === null));
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

  // Expression choice is derived only after canonical M has settled. A learned
  // multi-relation discourse structure may replace a narrower surface completion
  // only when it is the stronger structural match to the whole current input.
  if (unansweredSurface(realityContact)) Discourse.arbitrate(state);
  return state;
}

module.exports = { one, C };
