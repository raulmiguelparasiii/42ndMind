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
const EmpiricalRelations = require('./empirical-relation-occurrences.js');
const SurfaceRelationGrounding = require('./surface-relation-grounding.js');
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

function relationOccurrenceIn(update) {
  return !!(update?.relations?.facts || []).find(fact =>
    Array.isArray(fact) && fact[1] === 'ρ:kind' && fact[2] === 'relation_occurrence');
}

// This is explicitly acceleration metadata, not cognitive state. The authoritative
// occurrence history remains the ordinary M facts. If this cache is absent (for
// example when continuing an older serialized M), rebuild it exactly from M once.
function relationEventCountFromM(state) {
  const facts = state.knowledge?.facts || [];
  const occurrences = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'relation_occurrence')
    .map(f => String(f.subject)));
  const orders = new Set();
  for (const fact of facts) if (fact.relation === 'ρ:order' && occurrences.has(String(fact.subject)) && Number.isFinite(fact.object))
    orders.add(fact.object);
  return orders.size;
}
function ensureTemporalSearchCache(state, checkpoint) {
  if (!state.structure) return null;
  if (!Number.isInteger(state.structure.relation_sequence_event_count) ||
      !Number.isInteger(state.structure.next_relation_sequence_search_at)) {
    const count = relationEventCountFromM(state);
    state.structure.relation_sequence_event_count = count;
    state.structure.next_relation_sequence_search_at = (Math.floor(count / checkpoint) + 1) * checkpoint;
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
    let newRelationEvent = false;

    // The canonical embodied learner already updated inside Relational.C above.
    // This adapter does not learn a second model; it only exposes any new/support-
    // advanced empirical relation through the same generic M term/occurrence form
    // used by the other relation learners.
    const empirical = EmpiricalRelations.relationalUpdate(state);
    if (empirical) {
      newRelationEvent = relationOccurrenceIn(empirical) || newRelationEvent;
      Relational.C(state, empirical);
    }

    for (const proposer of [Continuous, MultiSourceContinuous]) {
      const update = proposer.relationalUpdate(state);
      if (!update) continue;
      newRelationEvent = relationOccurrenceIn(update) || newRelationEvent;
      Relational.C(state, update);
    }

    // Surface meaning is learned from the same lived contact only after learned
    // relations have exposed first-class occurrences in M. Grounding is agnostic
    // to which learner produced the generic occurrence.
    const grounding = SurfaceRelationGrounding.relationalUpdate(state, realityContact);
    if (grounding) Relational.C(state, grounding);

    // Ordered recompression is proposal search, not epistemic authority. Count
    // only distinct lived orders that actually gained a relation occurrence.
    // The count is a disposable cache; exact occurrences remain in M. Search only
    // after another full checkpoint of new event orders has accumulated.
    if (newRelationEvent && temporalCache) {
      temporalCache.relation_sequence_event_count++;
      if (temporalCache.relation_sequence_event_count >= temporalCache.next_relation_sequence_search_at) {
        const temporal = RelationSequence.relationalUpdate(state, { checkpoint: temporalCheckpoint });
        if (temporal) Relational.C(state, temporal);
        while (temporalCache.next_relation_sequence_search_at <= temporalCache.relation_sequence_event_count)
          temporalCache.next_relation_sequence_search_at += temporalCheckpoint;
      }
    }

    settleQuantitativeCompletion(state);
  }

  // A grounded expression in the current lived utterance becomes ordinary M
  // occurrence content before any renderer acts. This is reference, not world
  // assertion: the occurrence points to an already-grounded relation term and
  // is provenance-linked to the exact surface episode. Generic closure can then
  // reason from what was said through the same relational substrate.
  const mention = SurfaceRelationGrounding.mentionUpdate(state, realityContact);
  if (mention) Relational.C(state, mention);

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
