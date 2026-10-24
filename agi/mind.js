'use strict';

// Public one-M / one-C AGI entrypoint.
//
// Durable cognition remains in canonical M. Relational/surface completion,
// continuous-contact discovery, generic lived-occurrence recompression, and
// discourse arbitration are zero-state views or transformations over that same
// M; none owns a second truth or memory state.

const Relational = require('./mind-relational.js');
const OrderedSurface = require('./ordered-surface-contact.js');
const RawProposalExpressions = require('./raw-proposal-expression-grounding.js');
const SourcedClaims = require('./sourced-surface-claims.js');
const Continuous = require('./continuous-relational-contact.js');
const MultiSourceContinuous = require('./multisource-continuous-relations.js');
const EmpiricalRelations = require('./empirical-relation-occurrences.js');
const SurfaceRelationGrounding = require('./surface-relation-grounding.js');
const GenericOccurrences = require('./generic-lived-occurrences.js');
const StructuralAbstraction = require('./structural-relational-abstraction.js');
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

function budgetWholeRecompression(state, contact) {
  const frame = frameFrom(contact);
  if (!frame || !state?.structure) return;
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
function settleQuantitativeCompletion(state) {
  if (!state.current?.completed) return;
  const base = cloneCurrent(state.current);
  const unaryFirst = completionProjection(state, [Continuous, MultiSourceContinuous]);
  const jointFirst = completionProjection(state, [MultiSourceContinuous, Continuous]);
  const completed = { ...base.completed };
  const inferred = new Set(base.inferred || []);
  const unresolved = new Set([...(base.unresolved || []), ...(unaryFirst.unresolved || []), ...(jointFirst.unresolved || [])]);
  const keys = new Set([...Object.keys(unaryFirst.completed || {}), ...Object.keys(jointFirst.completed || {})]);
  for (const feature of keys) {
    if (Object.prototype.hasOwnProperty.call(base.completed, feature)) continue;
    const hasA = Object.prototype.hasOwnProperty.call(unaryFirst.completed || {}, feature);
    const hasB = Object.prototype.hasOwnProperty.call(jointFirst.completed || {}, feature);
    const a = unaryFirst.completed?.[feature], b = jointFirst.completed?.[feature];
    if (hasA && hasB && numericallySame(a, b)) {
      completed[feature] = (a + b) / 2;
      inferred.add(feature); unresolved.delete(feature);
    } else {
      inferred.delete(feature); unresolved.add(feature);
    }
  }
  state.current.completed = completed;
  state.current.inferred = [...inferred].sort();
  state.current.unresolved = [...unresolved].filter(feature => !Object.prototype.hasOwnProperty.call(completed, feature)).sort();
}

function livedEventCountFromM(state) {
  const facts = state.knowledge?.facts || [];
  const lived = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'lived_occurrence').map(f => String(f.subject)));
  const orders = new Set();
  for (const fact of facts) if (fact.relation === 'ρ:lived_order' && lived.has(String(fact.subject)) && Number.isFinite(fact.object)) orders.add(fact.object);
  if (orders.size) return orders.size;
  const legacy = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'relation_occurrence').map(f => String(f.subject)));
  for (const fact of facts) if (fact.relation === 'ρ:order' && legacy.has(String(fact.subject)) && Number.isFinite(fact.object)) orders.add(fact.object);
  return orders.size;
}
function ensureTemporalSearchCache(state, checkpoint) {
  if (!state.structure) return null;
  if (!Number.isInteger(state.structure.lived_sequence_event_count) || !Number.isInteger(state.structure.next_lived_sequence_search_at)) {
    const count = livedEventCountFromM(state);
    state.structure.lived_sequence_event_count = count;
    state.structure.next_lived_sequence_search_at = (Math.floor(count / checkpoint) + 1) * checkpoint;
  }
  return state.structure;
}

function currentExpectedActuator(state) {
  const order = state.structure?.lived_contact_order;
  if (!Number.isFinite(order)) return null;
  const facts = state.knowledge?.facts || [];
  const expectationIds = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation').map(f => String(f.subject)));
  const currentExpectations = new Set([...expectationIds].filter(id => facts.some(f => String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === order)));
  if (!currentExpectations.size) return null;
  const actionTerms = new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === 'action_term').map(f => String(f.subject)));
  const expectedTerms = new Set(facts.filter(f => currentExpectations.has(String(f.subject)) && f.relation === 'ρ:expects_term' && f.object?.ref !== undefined)
    .map(f => String(f.object.ref)).filter(term => actionTerms.has(term)));
  if (!expectedTerms.size) return null;
  const indexes = new Set();
  for (const term of expectedTerms) {
    const grounded = new Set(facts.filter(f => String(f.subject) === term && f.relation === 'ρ:actuator_index' && Number.isInteger(f.object))
      .map(f => f.object).filter(index => index >= 0 && index < state.action_count));
    if (grounded.size !== 1) return null;
    indexes.add([...grounded][0]);
  }
  return indexes.size === 1 ? [...indexes][0] : null;
}
function realizeCurrentExpectedAction(state) {
  const actuator = currentExpectedActuator(state);
  if (!Number.isInteger(actuator)) return;
  if (state.current?.continuation?.grounded === true && Number.isInteger(state.motor) && state.motor !== actuator) return;
  state.motor = actuator;
}

function C(state, realityContact) {
  const expanded = OrderedSurface.expand(state, realityContact);
  if (expanded) {
    Relational.C(state, expanded.container);
    for (const contact of expanded.contacts) C(state, contact);
    return state;
  }

  const temporalCheckpoint = 8;
  const temporalCache = ensureTemporalSearchCache(state, temporalCheckpoint);
  budgetWholeRecompression(state, realityContact);
  Relational.C(state, realityContact);

  if (realityContact && typeof realityContact === 'object' && realityContact.surface) {
    const expressionUpdate = RawProposalExpressions.relationalUpdate(state);
    if (expressionUpdate) Relational.C(state, expressionUpdate);

    // Source identity changes epistemic provenance, never the content parser.
    // The same raw proposal remains available as a claim occurrence in M, while
    // a world-fact route born from this sourced episode is reopened.
    const sourcedUpdate = SourcedClaims.relationalUpdate(state, realityContact);
    if (sourcedUpdate) Relational.C(state, sourcedUpdate);
  }

  const hasFrame = !!frameFrom(realityContact);
  if (hasFrame) {
    const empirical = EmpiricalRelations.relationalUpdate(state);
    if (empirical) Relational.C(state, empirical);
    for (const proposer of [Continuous, MultiSourceContinuous]) {
      const update = proposer.relationalUpdate(state);
      if (update) Relational.C(state, update);
    }
    const grounding = SurfaceRelationGrounding.relationalUpdate(state, realityContact);
    if (grounding) Relational.C(state, grounding);
    settleQuantitativeCompletion(state);
  }

  const mention = SurfaceRelationGrounding.mentionUpdate(state, realityContact);
  if (mention) Relational.C(state, mention);
  const lived = GenericOccurrences.relationalUpdate(state, realityContact);
  if (lived?.update) Relational.C(state, lived.update);
  const structural = StructuralAbstraction.relationalUpdate(state, realityContact);
  if (structural) Relational.C(state, structural);

  if (lived?.occurrence_count > 0) {
    const lifecycle = RelationSequence.lifecycleUpdate(state);
    if (lifecycle) Relational.C(state, lifecycle);
    if (temporalCache) {
      temporalCache.lived_sequence_event_count++;
      if (temporalCache.lived_sequence_event_count >= temporalCache.next_lived_sequence_search_at) {
        const temporal = RelationSequence.relationalUpdate(state, { checkpoint: temporalCheckpoint });
        if (temporal) Relational.C(state, temporal);
        while (temporalCache.next_lived_sequence_search_at <= temporalCache.lived_sequence_event_count) temporalCache.next_lived_sequence_search_at += temporalCheckpoint;
      }
    }
    const temporalCompletion = RelationSequence.completionUpdate(state);
    if (temporalCompletion) {
      Relational.C(state, temporalCompletion);
      realizeCurrentExpectedAction(state);
    }
  }

  if (unansweredSurface(realityContact)) Discourse.arbitrate(state);
  SurfaceRelationGrounding.groundCurrent(state, realityContact);
  return state;
}

module.exports = { one, C };
