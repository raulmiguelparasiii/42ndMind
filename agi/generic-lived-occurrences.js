'use strict';

// Zero-state occurrence normalization over the one canonical M.
//
// Foundational invariant: every top-level reality contact becomes lived M material
// before any helper is allowed to interpret it. Meaning, modality, language,
// action, structure, and later abstractions may attach to that already-lived
// contact, but none of them decides whether the contact counts as experience.
// This bridge owns no memory, meaning, policy, or truth. It only gives reality
// contact and later M-owned occurrences one common temporal-relational anatomy.

const crypto = require('crypto');

function stable(v) {
  if (v === undefined) return '"[undefined]"';
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function digest(v) { return crypto.createHash('sha256').update(stable(v)).digest('hex').slice(0, 24); }
function ref(id) { return { ref: String(id) }; }
function finiteInteger(v) { return Number.isInteger(v) && v >= 0; }

function latestLivedOrderFromM(state) {
  const lived = new Set((state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:kind' && f.object === 'lived_contact')
    .map(f => String(f.subject)));
  let max = 0;
  for (const f of state.knowledge?.facts || []) {
    if (f.relation !== 'ρ:lived_order' || !lived.has(String(f.subject)) || !finiteInteger(f.object)) continue;
    max = Math.max(max, f.object);
  }
  return max;
}

function nextLivedOrder(state) {
  if (!state.structure) state.structure = {};
  if (!finiteInteger(state.structure.lived_contact_order))
    state.structure.lived_contact_order = latestLivedOrderFromM(state);
  return state.structure.lived_contact_order + 1;
}

function latestSurfaceEpisode(state) {
  let best = null, number = -Infinity;
  for (const f of state.knowledge?.facts || []) {
    if (f.relation !== 'ρ:input_tokens' || !Array.isArray(f.object) ||
        typeof f.subject !== 'string' || !f.subject.startsWith('sequence-contact:')) continue;
    const n = Number(f.subject.split(':').at(-1));
    if (Number.isFinite(n) && n > number) { number = n; best = f.subject; }
  }
  return best;
}

function factsBySubject(state) {
  const out = new Map();
  for (const f of state.knowledge?.facts || []) {
    const key = String(f.subject);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(f);
  }
  return out;
}
function factValue(facts, relation, predicate = () => true) {
  return (facts || []).find(f => f.relation === relation && predicate(f.object))?.object;
}
function hasFact(state, subject, relation, objectPredicate = () => true) {
  return (state.knowledge?.facts || []).some(f => String(f.subject) === String(subject) &&
    f.relation === relation && objectPredicate(f.object));
}
function occurrenceKinds(subjectFacts) {
  return [...new Set((subjectFacts || [])
    .filter(f => f.relation === 'ρ:kind' && typeof f.object === 'string' && f.object !== 'lived_occurrence')
    .map(f => f.object))].sort();
}

const OCCURRENCE_ANATOMY = new Set(['ρ:kind', 'ρ:instantiates', 'ρ:order', 'ρ:lived_order']);
function contactedTriples(contact) {
  if (!contact || Array.isArray(contact) || typeof contact !== 'object' || !Array.isArray(contact.relations?.facts)) return [];
  const triples = contact.relations.facts.filter(x => Array.isArray(x) && x.length === 3 && x.every(v => v !== undefined));
  const preNormalized = new Set(triples
    .filter(x => x[1] === 'ρ:kind' && x[2] === 'lived_occurrence')
    .map(x => stable(x[0])));
  return triples.filter(x => !(preNormalized.has(stable(x[0])) && OCCURRENCE_ANATOMY.has(x[1])));
}

// Phase 1: establish reality contact as lived material immediately after the
// canonical contact has entered M. This is intentionally pre-semantic. The exact
// contact is retained as opaque content on a content-addressed term. Identical
// contacts share the term, while every lived instance remains a distinct event.
function beginContact(state, originalContact) {
  if (!state || state.whole !== 1) return null;

  const order = nextLivedOrder(state);
  const contactId = `lived-contact:${order}`;
  const key = digest(originalContact);
  const contactTerm = `reality-contact-term:${key}`;
  const contactOccurrence = `reality-contact-occurrence:${order}:${key}`;
  const hasFrame = Array.isArray(originalContact) || !!(originalContact && typeof originalContact === 'object' && Array.isArray(originalContact.frame));
  const frameIndex = hasFrame ? (state.contacts?.length || 0) : null;

  const facts = [
    [contactId, 'ρ:kind', 'lived_contact'],
    [contactId, 'ρ:lived_order', order],
    ['self', 'ρ:experienced', ref(contactId)],
    [contactTerm, 'ρ:kind', 'reality_contact_term'],
    [contactTerm, 'ρ:contact_content', originalContact],
    [contactTerm, 'ρ:instantiation_kind', 'reality_contact_occurrence'],
    [contactOccurrence, 'ρ:kind', 'reality_contact_occurrence'],
    [contactOccurrence, 'ρ:kind', 'lived_occurrence'],
    [contactOccurrence, 'ρ:instantiates', ref(contactTerm)],
    [contactOccurrence, 'ρ:order', order],
    [contactOccurrence, 'ρ:lived_order', order],
    [contactOccurrence, 'ρ:grounded_by', ref(contactId)],
    [contactId, 'ρ:contains_occurrence', ref(contactOccurrence)],
  ];

  if (frameIndex !== null) facts.push([contactId, 'ρ:frame_contact_index', frameIndex]);

  const hasSurface = !!(originalContact && typeof originalContact === 'object' && originalContact.surface);
  if (hasSurface) {
    const episode = latestSurfaceEpisode(state);
    if (episode) facts.push(
      [contactId, 'ρ:surface_episode', episode],
      [contactOccurrence, 'ρ:surface_episode', episode],
    );
  }

  state.structure.lived_contact_order = order; // rebuildable zero-authority cache
  return {
    update: { relations: { facts } },
    order,
    contactId,
    contactTerm,
    contactOccurrence,
    frameIndex,
    occurrence_count: 1,
  };
}

// Phase 2: after ordinary C helpers have had a chance to derive meaning or other
// structure, normalize those M-owned results onto the SAME lived order. No second
// contact is created. Direct callers without a supplied boundary retain backwards
// compatibility by establishing the boundary themselves.
function relationalUpdate(state, originalContact, suppliedBoundary = null) {
  if (!state || state.whole !== 1) return null;
  const boundary = suppliedBoundary || beginContact(state, originalContact);
  if (!boundary) return null;

  const order = boundary.order;
  const contactId = boundary.contactId;
  const frameIndex = boundary.frameIndex;
  const facts = suppliedBoundary ? [] : [...(boundary.update?.relations?.facts || [])];
  const occurrenceIds = new Set([boundary.contactOccurrence]);
  const bySubject = factsBySubject(state);

  // Structured relation contact is an occurrence too. This adds relational
  // anatomy without becoming the authority for whether the contact happened.
  for (const triple of contactedTriples(originalContact)) {
    const descriptor = { subject: triple[0], predicate: triple[1], object: triple[2] };
    const key = digest(descriptor);
    const term = `contact-relation-term:${key}`;
    const occurrence = `contact-relation-occurrence:${order}:${key}`;
    facts.push(
      [term, 'ρ:kind', 'relation_term'],
      [term, 'ρ:relation_subject', descriptor.subject],
      [term, 'ρ:relation_predicate', descriptor.predicate],
      [term, 'ρ:relation_object', descriptor.object],
      [term, 'ρ:instantiation_kind', 'structured_relation_occurrence'],
      [occurrence, 'ρ:kind', 'structured_relation_occurrence'],
      [occurrence, 'ρ:kind', 'lived_occurrence'],
      [occurrence, 'ρ:instantiates', ref(term)],
      [occurrence, 'ρ:order', order],
      [occurrence, 'ρ:lived_order', order],
      [occurrence, 'ρ:grounded_by', ref(contactId)],
      [contactId, 'ρ:contains_occurrence', ref(occurrence)],
    );
    occurrenceIds.add(occurrence);
  }

  // Already-normalized generic occurrences supplied by another zero-state bridge
  // remain valid current-life events. The raw contact occurrence itself is skipped
  // because beginContact already established its anatomy.
  for (const [subject, subjectFacts] of bySubject) {
    if (subject === boundary.contactOccurrence) continue;
    const isLived = subjectFacts.some(f => f.relation === 'ρ:kind' && f.object === 'lived_occurrence');
    const livedOrder = factValue(subjectFacts, 'ρ:lived_order', Number.isFinite);
    const term = factValue(subjectFacts, 'ρ:instantiates', x => x && x.ref !== undefined);
    if (!isLived || livedOrder !== order || !term) continue;
    facts.push([contactId, 'ρ:contains_occurrence', ref(subject)]);
    for (const kind of occurrenceKinds(subjectFacts)) facts.push([String(term.ref), 'ρ:instantiation_kind', kind]);
    occurrenceIds.add(subject);
  }

  // Existing learned relation occurrences keep learner-local order. Normalize only
  // those made at this current frame boundary.
  if (frameIndex !== null) for (const [subject, subjectFacts] of bySubject) {
    const isRelationOccurrence = subjectFacts.some(f => f.relation === 'ρ:kind' && f.object === 'relation_occurrence');
    if (!isRelationOccurrence) continue;
    const localOrder = factValue(subjectFacts, 'ρ:order', Number.isFinite);
    const term = factValue(subjectFacts, 'ρ:instantiates', x => x && x.ref !== undefined);
    if (localOrder !== frameIndex || !term) continue;
    if (!hasFact(state, subject, 'ρ:lived_order')) facts.push([subject, 'ρ:lived_order', order]);
    if (!hasFact(state, subject, 'ρ:kind', x => x === 'lived_occurrence')) facts.push([subject, 'ρ:kind', 'lived_occurrence']);
    facts.push([contactId, 'ρ:contains_occurrence', ref(subject)]);
    for (const kind of occurrenceKinds(subjectFacts)) facts.push([String(term.ref), 'ρ:instantiation_kind', kind]);
    occurrenceIds.add(subject);
  }

  // Canonical embodiment already retains what the individual caused. Attach that
  // action to the same lived order without inventing policy or action meaning.
  if (frameIndex !== null) {
    const caused = (state.knowledge?.facts || []).find(f => f.subject === 'self' && f.relation === 'ρ:caused' &&
      f.object && f.object.transition_to_frame === frameIndex && Number.isInteger(f.object.motor_index));
    if (caused) {
      const motor = caused.object.motor_index;
      const term = `action:motor:${motor}`;
      const occurrence = `action-occurrence:${order}:${motor}`;
      facts.push(
        [term, 'ρ:kind', 'action_term'],
        [term, 'ρ:actuator_index', motor],
        [term, 'ρ:instantiation_kind', 'action_occurrence'],
        [occurrence, 'ρ:kind', 'action_occurrence'],
        [occurrence, 'ρ:kind', 'lived_occurrence'],
        [occurrence, 'ρ:instantiates', ref(term)],
        [occurrence, 'ρ:order', order],
        [occurrence, 'ρ:lived_order', order],
        [occurrence, 'ρ:transition_to_frame', frameIndex],
        ['self', 'ρ:caused', ref(occurrence)],
        [contactId, 'ρ:contains_occurrence', ref(occurrence)],
      );
      occurrenceIds.add(occurrence);
    }
  }

  // Surface meaning may have been learned after beginContact. Any resulting
  // expression occurrences are enrichments of the same already-lived contact.
  const hasSurface = !!(originalContact && typeof originalContact === 'object' && originalContact.surface);
  if (hasSurface) {
    const episode = latestSurfaceEpisode(state);
    if (episode) for (const [subject, subjectFacts] of bySubject) {
      const isExpressionOccurrence = subjectFacts.some(f =>
        f.relation === 'ρ:kind' && f.object === 'surface_expression_occurrence');
      if (!isExpressionOccurrence) continue;
      const within = factValue(subjectFacts, 'ρ:within_surface_episode');
      const surface = factValue(subjectFacts, 'ρ:surface', x => typeof x === 'string');
      if (within !== episode || !surface) continue;
      facts.push(
        [surface, 'ρ:kind', 'expression_term'],
        [subject, 'ρ:kind', 'lived_occurrence'],
        [subject, 'ρ:instantiates', ref(surface)],
        [subject, 'ρ:order', order],
        [subject, 'ρ:lived_order', order],
        [contactId, 'ρ:contains_occurrence', ref(subject)],
      );
      for (const kind of occurrenceKinds(subjectFacts)) facts.push([surface, 'ρ:instantiation_kind', kind]);
      occurrenceIds.add(subject);
    }
  }

  return {
    update: { relations: { facts } },
    order,
    occurrence_count: occurrenceIds.size,
  };
}

module.exports = { beginContact, relationalUpdate };
