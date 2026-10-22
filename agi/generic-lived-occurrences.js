'use strict';

// Zero-state occurrence normalization over the one canonical M.
//
// Sensors/learners/surface/action boundaries are allowed to retain their own
// exact local provenance, but anything that happened in the individual's life
// must also be able to participate in one common temporal-relational substrate.
// This bridge owns no memory, meaning, policy, or truth. It reads facts already
// present in M for the current top-level reality contact and returns ordinary M
// facts giving those events the same minimal anatomy:
//
//   occurrence --instantiates--> first-class term
//   occurrence --lived_order-->  one whole-life order coordinate
//
// Local `ρ:order` facts remain untouched. `ρ:lived_order` is the cross-modal axis.

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

function relationalUpdate(state, originalContact) {
  if (!state || state.whole !== 1) return null;
  const order = nextLivedOrder(state);
  const contactId = `lived-contact:${order}`;
  const facts = [
    [contactId, 'ρ:kind', 'lived_contact'],
    [contactId, 'ρ:lived_order', order],
    ['self', 'ρ:experienced', ref(contactId)],
  ];
  const occurrenceIds = new Set();

  const bySubject = factsBySubject(state);
  const hasFrame = Array.isArray(originalContact) || !!(originalContact && typeof originalContact === 'object' && Array.isArray(originalContact.frame));
  const frameIndex = hasFrame ? (state.contacts?.length || 0) : null;
  if (frameIndex !== null) facts.push([contactId, 'ρ:frame_contact_index', frameIndex]);

  // Already-normalized generic occurrences supplied by another zero-state bridge
  // remain valid current-life events. Count/link them without reinterpreting them.
  for (const [subject, subjectFacts] of bySubject) {
    const isLived = subjectFacts.some(f => f.relation === 'ρ:kind' && f.object === 'lived_occurrence');
    const livedOrder = factValue(subjectFacts, 'ρ:lived_order', Number.isFinite);
    const term = factValue(subjectFacts, 'ρ:instantiates', x => x && x.ref !== undefined);
    if (!isLived || livedOrder !== order || !term) continue;
    facts.push([contactId, 'ρ:contains_occurrence', ref(subject)]);
    for (const kind of occurrenceKinds(subjectFacts)) facts.push([String(term.ref), 'ρ:instantiation_kind', kind]);
    occurrenceIds.add(subject);
  }

  // Existing learned relation occurrences keep their learner-local `ρ:order`.
  // Normalize only occurrences made at the current frame boundary.
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

  // Canonical embodiment already retains `self ρ:caused {motor_index,
  // transition_to_frame}`. Give that same lived action a first-class term and
  // occurrence without inventing action meaning or policy.
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

  // Surface mentionUpdate already owns the exact span/reference facts. Normalize
  // only expression occurrences from the surface episode in this top-level call.
  const hasSurface = !!(originalContact && typeof originalContact === 'object' && originalContact.surface);
  if (hasSurface) {
    const episode = latestSurfaceEpisode(state);
    if (episode) {
      facts.push([contactId, 'ρ:surface_episode', episode]);
      for (const [subject, subjectFacts] of bySubject) {
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
  }

  state.structure.lived_contact_order = order; // rebuildable zero-authority cache
  return {
    update: { relations: { facts } },
    order,
    occurrence_count: occurrenceIds.size,
  };
}

module.exports = { relationalUpdate };
