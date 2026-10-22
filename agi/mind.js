'use strict';

// Public one-M / one-C AGI entrypoint.
//
// Durable cognition remains in canonical M. Relational/surface completion,
// continuous-contact discovery, generic relation-sequence recompression, and
// discourse arbitration are zero-state views or transformations over that same
// M; none owns a second truth or memory state.

const Relational = require('./mind-relational.js');
const Continuous = require('./continuous-relational-contact.js');
const MultiSourceContinuous = require('./multisource-continuous-relations.js');
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

function cloneCurrent(current) {
  const source = current || {};
  return {
    ...source,
    observed: { ...(source.observed || {}) },
    completed: { ...(source.completed || {}) },
    inferred: [...(source.inferred || [])],
    unresolved: [...(source.unresolved || [])],
  };
}
function completionSignature(current) {
  const completed = Object.entries(current.completed || {}).sort(([a], [b]) => a.localeCompare(b));
  const inferred = [...(current.inferred || [])].sort();
  const unresolved = [...(current.unresolved || [])].sort();
  return JSON.stringify([completed, inferred, unresolved]);
}
function completionProjection(state, order) {
  const projected = { ...state, current: cloneCurrent(state.current) };
  for (let pass = 0; pass < 16; pass++) {
    const before = completionSignature(projected.current);
    for (const helper of order) helper.completeCurrent(projected);
    if (completionSignature(projected.current) === before) break;
  }
  return projected.current;
}
function numericallySame(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-9 * scale;
}

// Quantitative realization is a disposable confluence check over the same
// active M-owned relations. Helper execution order is not semantic authority:
// a completion is accepted only when both orderings reach the same value. If
// independent warranted routes disagree, the target remains explicitly open.
function settleQuantitativeCompletion(state) {
  if (!state.current?.completed) return;
  const base = cloneCurrent(state.current);
  const unaryFirst = completionProjection(state, [Continuous, MultiSourceContinuous]);
  const jointFirst = completionProjection(state, [MultiSourceContinuous, Continuous]);

  const completed = { ...base.completed };
  const inferred = new Set(base.inferred || []);
  const unresolved = new Set([...(base.unresolved || []), ...(unaryFirst.unresolved || []), ...(jointFirst.unresolved || [])]);
  const keys = new Set([
    ...Object.keys(unaryFirst.completed || {}),
    ...Object.keys(jointFirst.completed || {}),
  ]);

  for (const feature of keys) {
    if (Object.prototype.hasOwnProperty.call(base.completed, feature)) continue;
    const hasA = Object.prototype.hasOwnProperty.call(unaryFirst.completed || {}, feature);
    const hasB = Object.prototype.hasOwnProperty.call(jointFirst.completed || {}, feature);
    const a = unaryFirst.completed?.[feature];
    const b = jointFirst.completed?.[feature];
    if (hasA && hasB && numericallySame(a, b)) {
      completed[feature] = (a + b) / 2;
      inferred.add(feature);
      unresolved.delete(feature);
    } else {
      inferred.delete(feature);
      unresolved.add(feature);
    }
  }

  state.current.completed = completed;
  state.current.inferred = [...inferred].sort();
  state.current.unresolved = [...unresolved]
    .filter(feature => !Object.prototype.hasOwnProperty.call(completed, feature)).sort();
}

function C(state, realityContact) {
  budgetWholeRecompression(state, realityContact);
  Relational.C(state, realityContact);

  const hasFrame = !!frameFrom(realityContact);
  if (hasFrame) {
    let discovered = false;
    for (const proposer of [Continuous, MultiSourceContinuous]) {
      const update = proposer.relationalUpdate(state);
      if (!update) continue;
      Relational.C(state, update);
      discovered = true;
    }

    if (discovered) {
      // Continuous discovery has now produced ordinary first-class relation
      // occurrences in M. Reuse the repository's existing generic ordered
      // recompression over those occurrences; any new higher relation returns
      // through the same Relational.C entrypoint and becomes ordinary M content.
      const temporal = RelationSequence.relationalUpdate(state);
      if (temporal) Relational.C(state, temporal);
    }

    settleQuantitativeCompletion(state);
  }

  // Expression choice is derived only after canonical M has settled. A learned
  // multi-relation discourse structure may replace a narrower surface completion
  // only when it is the stronger structural match to the whole current input.
  if (unansweredSurface(realityContact)) Discourse.arbitrate(state);
  return state;
}

module.exports = { one, C };
