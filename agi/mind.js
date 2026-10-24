'use strict';

// Public one-M / one-C AGI entrypoint.
//
// Durable cognition remains in canonical M. Relational/surface completion,
// continuous-contact discovery, generic lived-occurrence recompression, and
// discourse arbitration are zero-state views or transformations over that same
// M; none owns a second truth or memory state.

const Relational = require('./mind-relational.js');
const OrderedSurface = require('./ordered-surface-contact.js');
const RawConceptDefinition = require('./raw-concept-definition.js');
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

// Action realization is physical transduction, not a planner. The expectation,
// action-term identity, and actuator grounding are all already ordinary M facts.
// This function only resolves the *current lived order* to one actuator when M
// itself leaves exactly one action index available. Historical expectations are
// ignored, and independently grounded embodied continuation is not overwritten.
function currentExpectedActuator(state) {
  const order = state.structure?.lived_contact_order;
  if (!Number.isFinite(order)) return null;
  const facts = state.knowledge?.facts || [];

  const expectationIds = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'temporal_expectation')
    .map(f => String(f.subject)));
  const currentExpectations = new Set([...expectationIds].filter(id => facts.some(f =>
    String(f.subject) === id && f.relation === 'ρ:after_lived_order' && f.object === order)));
  if (!currentExpectations.size) return null;

  const actionTerms = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'action_term')
    .map(f => String(f.subject)));
  const expectedTerms = new Set(facts
    .filter(f => currentExpectations.has(String(f.subject)) && f.relation === 'ρ:expects_term' && f.object?.ref !== undefined)
    .map(f => String(f.object.ref))
    .filter(term => actionTerms.has(term)));
  if (!expectedTerms.size) return null;

  const indexes = new Set();
  for (const term of expectedTerms) {
    const grounded = new Set(facts
      .filter(f => String(f.subject) === term && f.relation === 'ρ:actuator_index' && Number.isInteger(f.object))
      .map(f => f.object)
      .filter(index => index >= 0 && index < state.action_count));
    if (grounded.size !== 1) return null;
    indexes.add([...grounded][0]);
  }
  return indexes.size === 1 ? [...indexes][0] : null;
}
function realizeCurrentExpectedAction(state) {
  const actuator = currentExpectedActuator(state);
  if (!Number.isInteger(actuator)) return;

  // A grounded canonical continuation is independent live support. Temporal
  // completion may replace only ungrounded physical variation, not erase a
  // contradictory action already grounded by the same canonical M/C.
  if (state.current?.continuation?.grounded === true && Number.isInteger(state.motor) && state.motor !== actuator) return;
  state.motor = actuator;
}

function C(state, realityContact) {
  // Long raw text is an ordered receptor stream. Segmenting punctuation/newline
  // boundaries is S-boundary transport only: exact unsplit contact is retained
  // in M first, and every segment re-enters this same C.
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

  // Raw proposal formation already happened inside Relational.C. Preserve exact
  // observed endpoint expressions for later rendering, learn explicit relational
  // definitions from already-grounded rule/surface structure, and preserve sourced
  // prose as claims-with-provenance rather than direct actuality.
  if (realityContact && typeof realityContact === 'object' && realityContact.surface) {
    const definitionUpdate = RawConceptDefinition.relationalUpdate(state, realityContact);
    if (definitionUpdate) Relational.C(state, definitionUpdate);
    const expressionUpdate = RawProposalExpressions.relationalUpdate(state);
    if (expressionUpdate) Relational.C(state, expressionUpdate);
    const sourcedUpdate = SourcedClaims.relationalUpdate(state, realityContact);
    if (sourcedUpdate) Relational.C(state, sourcedUpdate);
  }

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

  // Recurrent symbolic relation graphs can propose endpoint-independent schema
  // candidates. The zero-state helper reads only M/contact structure; its result
  // is ordinary proposal content and never inserts an unobserved world relation.
  const structural = StructuralAbstraction.relationalUpdate(state, realityContact);
  if (structural) Relational.C(state, structural);

  if (lived?.occurrence_count > 0) {
    // Resolve older open expectations from the exact first later lived event.
    // The evaluation itself is ordinary M evidence; no predictor/status state is
    // retained outside the one relational history.
    const lifecycle = RelationSequence.lifecycleUpdate(state);
    if (lifecycle) Relational.C(state, lifecycle);

    // Ordered recompression is proposal search, not epistemic authority. Count one
    // event for one lived order regardless of how many modalities occurred there.
    // Exact occurrences are already M content; the cache only decides when another
    // zero-authority whole-history search is worth running.
    if (temporalCache) {
      temporalCache.lived_sequence_event_count++;
      if (temporalCache.lived_sequence_event_count >= temporalCache.next_lived_sequence_search_at) {
        const temporal = RelationSequence.relationalUpdate(state, { checkpoint: temporalCheckpoint });
        if (temporal) Relational.C(state, temporal);
        while (temporalCache.next_lived_sequence_search_at <= temporalCache.lived_sequence_event_count)
          temporalCache.next_lived_sequence_search_at += temporalCheckpoint;
      }
    }

    // Learned order constrains the present through the same zero-state view. The
    // result is ordinary M expectation content linked to exact prefix occurrences;
    // it never creates a lived occurrence for an unseen next event.
    const temporalCompletion = RelationSequence.completionUpdate(state);
    if (temporalCompletion) {
      Relational.C(state, temporalCompletion);
      realizeCurrentExpectedAction(state);
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
