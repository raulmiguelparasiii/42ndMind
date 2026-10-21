'use strict';

// Public one-M / one-C AGI entrypoint.
//
// Durable cognition remains in canonical M. Relational/surface completion,
// continuous-contact discovery, generic relation-sequence recompression, and
// discourse arbitration are zero-state views or transformations over that same
// M; none owns a second truth or memory state.

const Relational = require('./mind-relational.js');
const Continuous = require('./continuous-relational-contact.js');
const RelationSequence = require('./relation-sequence-recompression.js');
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
// epistemic authority. Exact contact enters M every update; existing learned
// patterns refresh incrementally; continuous numerical relation discovery has its
// own evidence cadence. Therefore rescanning almost the same entire life every
// sqrt(n) steps adds cost without adding authority.
function budgetWholeRecompression(state, contact) {
  const frame = frameFrom(contact);
  if (!frame || !state?.structure) return;

  // Preserve one early developmental global search once four experiences exist.
  // After that, use deterministic checkpoints whose spacing scales with raw
  // receptor dimensionality. This changes search scheduling, never retained M.
  const experiences = state.experiences?.length || 0;
  if (experiences < 4) return;

  const dimensions = Math.max(1, frame.length - (state.concern_count || 0));
  const interval = Math.max(16, dimensions * dimensions);
  const nextExperience = experiences + 1;
  const boundary = Math.ceil(nextExperience / interval) * interval;
  if (state.structure.next_recompression_at < boundary) state.structure.next_recompression_at = boundary;
}

function C(state, realityContact) {
  budgetWholeRecompression(state, realityContact);
  Relational.C(state, realityContact);

  const hasFrame = !!frameFrom(realityContact);
  if (hasFrame) {
    const update = Continuous.relationalUpdate(state);
    if (update) {
      Relational.C(state, update);

      // Continuous discovery has now produced ordinary first-class relation
      // occurrences in M. Reuse the repository's existing generic ordered
      // recompression over those occurrences; any new higher relation returns
      // through the same Relational.C entrypoint and becomes ordinary M content.
      const temporal = RelationSequence.relationalUpdate(state);
      if (temporal) Relational.C(state, temporal);
    }
  }

  // Expression choice is derived only after canonical M has settled. A learned
  // multi-relation discourse structure may replace a narrower surface completion
  // only when it is the stronger structural match to the whole current input.
  if (unansweredSurface(realityContact)) Discourse.arbitrate(state);
  return state;
}

module.exports = { one, C };
