'use strict';

// Public one-M / one-C AGI entrypoint.
//
// Durable cognition remains in canonical M. Relational/surface completion,
// continuous-contact discovery, generic lived-occurrence recompression, and
// discourse arbitration are zero-state views or transformations over that same
// M; none owns a second truth or memory state.

const Relational = require('./mind-relational.js');
const RawConceptDefinition = require('./raw-concept-definition.js');
const RawProposalExpressions = require('./raw-proposal-expression-grounding.js');
const SourcedClaims = require('./sourced-surface-claims.js');
const Continuous = require('./continuous-relational-contact.js');
const MultiSourceContinuous = require('./multisource-continuous-relations.js');
const EmpiricalRelations = require('./empirical-relation-occurrences.js');
const SurfaceRelationGrounding = require('./surface-relation-grounding.js');
const GenericOccurrences = require('./generic-lived-occurrences.js');
const SituatedContact = require('./situated-reality-contact.js');
const StructuralAbstraction = require('./structural-relational-abstraction.js');
const StructuralOpen = require('./structural-open-relations.js');
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
  if (state.current?.continuation?.grounded === true && Number.isInteger(state.motor) && state.motor !== actuator) return;
  state.motor = actuator;
}

const CURRENT_EVENT_STRUCTURAL_RELATIONS = new Set([
  'ρ:situated_occurrence',
  'ρ:source',
  'ρ:target',
  'ρ:about',
  'ρ:contact_channel',
  'ρ:experienced_by',
  'ρ:previous_lived_contact',
]);
const PRIOR_EVENT_RELATIONS = new Set([
  'ρ:source',
  'ρ:target',
  'ρ:about',
  'ρ:contact_channel',
  'ρ:experienced_by',
  'ρ:previous_lived_contact',
  'ρ:followed_within_contact_by',
]);
const PRIOR_ACTION_RELATIONS = new Set([
  'ρ:surface_content',
  'ρ:exact_expression',
  'ρ:after_within_contact',
  'ρ:within_lived_contact',
  'ρ:produced_from',
]);

// The present event already contains an explicit pointer to exactly one immediate
// predecessor. Expose only that predecessor's situated anatomy to structural
// discovery. This is not retrieval or an attention window: no search chooses an
// old memory, and no earlier history enters. It lets recurrence discover objective
// continuity/change such as same source/target with a changing referent, and lets
// a self-caused action from the preceding event remain structurally consequential.
function immediatePredecessorFacts(state, situatedFacts) {
  const previous = situatedFacts.find(f => Array.isArray(f) && f[1] === 'ρ:previous_lived_contact' && f[2]?.ref !== undefined);
  if (!previous) return [];
  const previousContact = String(previous[2].ref);
  const currentFacts = state.knowledge?.current?.facts || [];
  const occurrence = currentFacts.find(f => String(f.subject) === previousContact &&
    f.relation === 'ρ:situated_occurrence' && f.object?.ref !== undefined)?.object?.ref;
  if (!occurrence) return [];
  const previousOccurrence = String(occurrence);
  const out = [[previousContact, 'ρ:situated_occurrence', { ref: previousOccurrence }]];

  for (const fact of currentFacts) {
    if (String(fact.subject) === previousOccurrence && PRIOR_EVENT_RELATIONS.has(fact.relation))
      out.push([fact.subject, fact.relation, fact.object]);
  }

  const contained = new Set(currentFacts
    .filter(f => String(f.subject) === previousOccurrence && f.relation === 'ρ:contains_occurrence' && f.object?.ref !== undefined)
    .map(f => String(f.object.ref)));
  const selfActions = new Set(currentFacts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'self_surface_action_occurrence' && contained.has(String(f.subject)))
    .map(f => String(f.subject)));

  for (const action of selfActions) {
    // Containment itself is not passed to structural abstraction. The action is
    // connected to the event by followed/after relations, which are actual event
    // structure rather than representational bookkeeping. The factual production
    // dependency is event structure too: exposing it here lets recurrence learn
    // from what the individual actually relied on without interpreting that edge
    // as a reason, truth score, or dialogue intent.
    for (const fact of currentFacts) if (String(fact.subject) === action && PRIOR_ACTION_RELATIONS.has(fact.relation))
      out.push([fact.subject, fact.relation, fact.object]);
    for (const fact of currentFacts) if (String(fact.subject) === 'self' && fact.relation === 'ρ:caused' && fact.object?.ref === action)
      out.push([fact.subject, fact.relation, fact.object]);
  }
  return out;
}

function structuralContact(state, realityContact, situated) {
  const rawFacts = !Array.isArray(realityContact) && realityContact && typeof realityContact === 'object' &&
    Array.isArray(realityContact.relations?.facts) ? realityContact.relations.facts : [];
  const situatedFacts = Array.isArray(situated?.relations?.facts) ? situated.relations.facts : [];
  const eventFacts = situatedFacts.filter(f => Array.isArray(f) && CURRENT_EVENT_STRUCTURAL_RELATIONS.has(f[1]));
  const predecessorFacts = immediatePredecessorFacts(state, situatedFacts);
  if (!rawFacts.length && !eventFacts.length && !predecessorFacts.length) return realityContact;
  return { relations: { facts: [...rawFacts, ...eventFacts, ...predecessorFacts] } };
}

function C(state, realityContact) {
  // One externally supplied reality contact is one lived event. Internal surface
  // boundaries such as punctuation may later become sub-occurrence structure, but
  // they cannot recursively invoke C and manufacture additional encounters.
  const temporalCheckpoint = 8;
  const temporalCache = ensureTemporalSearchCache(state, temporalCheckpoint);

  budgetWholeRecompression(state, realityContact);
  Relational.C(state, realityContact);

  const boundary = GenericOccurrences.beginContact(state, realityContact);
  if (boundary?.update) Relational.C(state, boundary.update);

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

  const lived = GenericOccurrences.relationalUpdate(state, realityContact, boundary);
  if (lived?.update) Relational.C(state, lived.update);

  const situated = SituatedContact.relationalUpdate(state, realityContact);
  if (situated) Relational.C(state, situated);

  const structuralView = structuralContact(state, realityContact, situated);
  // Structural discovery sees event-level situation, exact external relations,
  // and only the immediate predecessor already named by present reality. Token
  // span containment remains retained evidence in M but cannot dominate schemas.
  const structural = StructuralAbstraction.relationalUpdate(state, structuralView);
  if (structural) Relational.C(state, structural);

  // A recurrent schema can also be materially present while one of its endpoint
  // roles is not yet supplied by reality. Keep that exact absence as an ordinary
  // future-bearable relation term in M. This is structural incompleteness, not a
  // question policy: no word such as who/what/why is generated here.
  const openStructure = StructuralOpen.relationalUpdate(state, structuralView);
  if (openStructure) Relational.C(state, openStructure);

  if (lived?.occurrence_count > 0) {
    const lifecycle = RelationSequence.lifecycleUpdate(state);
    if (lifecycle) Relational.C(state, lifecycle);
    if (temporalCache) {
      temporalCache.lived_sequence_event_count++;
      if (temporalCache.lived_sequence_event_count >= temporalCache.next_lived_sequence_search_at) {
        const temporal = RelationSequence.relationalUpdate(state, { checkpoint: temporalCheckpoint });
        if (temporal) Relational.C(state, temporal);
        while (temporalCache.next_lived_sequence_search_at <= temporalCache.lived_sequence_event_count)
          temporalCache.next_lived_sequence_search_at += temporalCheckpoint;
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
