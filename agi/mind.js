'use strict';

// Public one-M / one-C AGI entrypoint.
//
// Durable cognition remains in canonical M. Relational/surface completion,
// continuous-contact discovery, generic lived-occurrence recompression, and
// discourse arbitration are zero-state views or transformations over that same
// M; none owns a second truth or memory state.

const Relational = require('./mind-relational.js');
const Continuous = require('./continuous-relational-contact.js');
const MultiSourceContinuous = require('./multisource-continuous-relations.js');
const EmpiricalRelations = require('./empirical-relation-occurrences.js');
const SurfaceRelationGrounding = require('./surface-relation-grounding.js');
const GenericOccurrences = require('./generic-lived-occurrences.js');
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

// Temporal-search scheduling metadata is rebuildable from M and therefore has
// zero semantic authority. New cognition uses generic lived_occurrence/lived_order.
// A legacy fallback keeps older serialized relation-only states readable.
function livedEventCountFromM(state) {
  const facts = state.knowledge?.facts || [];
  const lived = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'lived_occurrence')
    .map(f => String(f.subject)));
  const orders = new Set();
  for (const fact of facts) if (fact.relation === 'ρ:lived_order' && lived.has(String(fact.subject)) && Number.isFinite(fact.object))
    orders.add(fact.object);
  if (orders.size) return orders.size;

  const legacy = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'relation_occurrence')
    .map(f => String(f.subject)));
  for (const fact of facts) if (fact.relation === 'ρ:order' && legacy.has(String(fact.subject)) && Number.isFinite(fact.object))
    orders.add(fact.object);
  return orders.size;
}
function ensureTemporalSearchCache(state, checkpoint) {
  if (!state.structure) return null;
  if (!Number.isInteger(state.structure.lived_sequence_event_count) ||
      !Number.isInteger(state.structure.next_lived_sequence_search_at)) {
    const count = livedEventCountFromM(state);
    state.structure.lived_sequence_event_count = count;
    state.structure.next_lived_sequence_search_at = (Math.floor(count / checkpoint) + 1) * checkpoint;
  }
  return state.structure;
}

function C(state, realityContact) {
  const temporalCheckpoint = 8;
  const temporalCache = ensureTemporalSearchCache(state, temporalCheckpoint);

  budgetWholeRecompression(state, realityContact);
  Relational.C(state, realityContact);

  const hasFrame = !!frameFrom(realityContact);
  if (hasFrame) {
    // The canonical embodied learner already updated inside Relational.C above.
    // These adapters only expose learned structure through ordinary M relations.
    const empirical = EmpiricalRelations.relationalUpdate(state);
    if (empirical) Relational.C(state, empirical);

    for (const proposer of [Continuous, MultiSourceContinuous]) {
      const update = proposer.relationalUpdate(state);
      if (update) Relational.C(state, update);
    }

    // Surface meaning is learned from the same lived contact only after learned
    // relations have exposed first-class occurrences in M. Grounding is agnostic
    // to which learner produced the generic occurrence.
    const grounding = SurfaceRelationGrounding.relationalUpdate(state, realityContact);
    if (grounding) Relational.C(state, grounding);

    settleQuantitativeCompletion(state);
  }

  // A grounded expression in the current lived utterance becomes ordinary M
  // occurrence content before any renderer acts. This is reference, not world
  // assertion: the occurrence points to an already-grounded relation term.
  const mention = SurfaceRelationGrounding.mentionUpdate(state, realityContact);
  if (mention) Relational.C(state, mention);

  // Normalize every occurrence produced by this top-level reality contact onto
  // one whole-life coordinate. Relation, expression, and action provenance stays
  // intact; this only gives all of them the same generic temporal anatomy.
  const lived = GenericOccurrences.relationalUpdate(state, realityContact);
  if (lived?.update) Relational.C(state, lived.update);

  // Ordered recompression is proposal search, not epistemic authority. Count one
  // event for one lived order regardless of how many modalities occurred there.
  // Exact occurrences are already M content; the cache only decides when another
  // zero-authority whole-history search is worth running.
  if (lived?.occurrence_count > 0 && temporalCache) {
    temporalCache.lived_sequence_event_count++;
    if (temporalCache.lived_sequence_event_count >= temporalCache.next_lived_sequence_search_at) {
      const temporal = RelationSequence.relationalUpdate(state, { checkpoint: temporalCheckpoint });
      if (temporal) Relational.C(state, temporal);
      while (temporalCache.next_lived_sequence_search_at <= temporalCache.lived_sequence_event_count)
        temporalCache.next_lived_sequence_search_at += temporalCheckpoint;
    }
  }

  // Expression choice is derived only after canonical M has settled. A learned
  // multi-relation discourse structure may replace a narrower surface completion
  // only when it is the stronger structural match to the whole current input.
  if (unansweredSurface(realityContact)) Discourse.arbitrate(state);

  // Lexical meaning recall is likewise only a current view of canonical
  // ρ:expresses facts. It runs last so no surface renderer becomes semantic
  // authority over the M-owned relation.
  SurfaceRelationGrounding.groundCurrent(state, realityContact);
  return state;
}

module.exports = { one, C };
