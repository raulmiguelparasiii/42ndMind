'use strict';

// Zero-state situating of one already-lived reality contact inside canonical M.
//
// The reality-contact occurrence is the event. The lived-contact subject is only
// its temporal/container boundary. Surface expressions, embodied relations,
// actions, and later abstractions are occurrences contained by that event; they
// do not replace it. This helper owns no attention, salience, dialogue state,
// memory, or policy. It only exposes relations already true of the present event
// so the same one-M closure can make them participate.

function ref(id) { return { ref: String(id) }; }
function clone(v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function factKey(subject, relation, object) { return stable([subject, relation, object]); }

function presentContactOrder(state) {
  const order = state?.structure?.lived_contact_order;
  return Number.isFinite(order) ? order : null;
}

function livedContactAt(state, order) {
  if (!Number.isFinite(order)) return null;
  const facts = state.knowledge?.current?.facts || [];
  const ids = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'lived_contact')
    .map(f => String(f.subject)));
  for (const f of facts) if (f.relation === 'ρ:lived_order' && f.object === order && ids.has(String(f.subject)))
    return String(f.subject);
  return null;
}

function previousLivedContact(state, order) {
  const facts = state.knowledge?.current?.facts || [];
  const ids = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'lived_contact')
    .map(f => String(f.subject)));
  let best = null, bestOrder = -Infinity;
  for (const f of facts) {
    if (f.relation !== 'ρ:lived_order' || !Number.isFinite(f.object) || f.object >= order || !ids.has(String(f.subject))) continue;
    if (f.object > bestOrder) { bestOrder = f.object; best = String(f.subject); }
  }
  return best;
}

function contactOccurrenceAt(state, contactId, order) {
  const facts = state.knowledge?.current?.facts || [];
  const grounded = new Set(facts
    .filter(f => f.relation === 'ρ:grounded_by' && f.object?.ref === contactId)
    .map(f => String(f.subject)));
  for (const f of facts) if (f.relation === 'ρ:lived_order' && f.object === order && grounded.has(String(f.subject)) &&
      String(f.subject).startsWith('reality-contact-occurrence:')) return String(f.subject);
  return [...grounded].find(id => id.startsWith('reality-contact-occurrence:')) || null;
}

function metadata(contact, key) {
  if (!contact || Array.isArray(contact) || typeof contact !== 'object') return undefined;
  if (contact.surface && typeof contact.surface === 'object' && contact.surface[key] !== undefined) return clone(contact.surface[key]);
  if (contact[key] !== undefined) return clone(contact[key]);
  return undefined;
}

function channels(contact) {
  if (Array.isArray(contact)) return ['frame'];
  if (!contact || typeof contact !== 'object') return [];
  const out = [];
  if (Array.isArray(contact.frame)) out.push('frame');
  if (contact.surface) out.push('surface');
  if (contact.relations) out.push('relations');
  if (Array.isArray(contact.actuators) && contact.actuators.length) out.push('actuators');
  return out;
}

function currentOccurrenceSubjects(state, order) {
  const facts = state.knowledge?.current?.facts || [];
  return new Set(facts
    .filter(f => f.relation === 'ρ:lived_order' && f.object === order)
    .map(f => String(f.subject)));
}

function groundedAbout(state, occurrenceSubjects) {
  const out = new Set();
  for (const f of state.knowledge?.current?.facts || []) {
    if (!occurrenceSubjects.has(String(f.subject))) continue;
    if (f.relation === 'ρ:refers_to' && f.object?.ref !== undefined) out.add(String(f.object.ref));
  }
  return [...out].sort();
}

function relationalUpdate(state, contact) {
  if (!state || state.whole !== 1) return null;
  const order = presentContactOrder(state);
  if (!Number.isFinite(order)) return null;
  const contactId = livedContactAt(state, order) || `lived-contact:${order}`;
  const occurrence = contactOccurrenceAt(state, contactId, order);
  if (!occurrence) return null;

  const previous = previousLivedContact(state, order);
  const source = metadata(contact, 'source');
  const target = metadata(contact, 'target');
  const occurrenceSubjects = currentOccurrenceSubjects(state, order);
  const about = groundedAbout(state, occurrenceSubjects);
  const canonical = new Set((state.knowledge?.facts || []).map(f => factKey(f.subject, f.relation, f.object)));
  const pending = new Set();
  const facts = [];
  function add(subject, relation, object) {
    const key = factKey(subject, relation, object);
    if (canonical.has(key) || pending.has(key)) return;
    pending.add(key);
    facts.push([subject, relation, object]);
  }

  // There is one semantic event. The boundary only points to it and groups all
  // occurrences at this lived order; situation belongs to the event occurrence.
  add(occurrence, 'ρ:kind', 'lived_occurrence');
  add(occurrence, 'ρ:kind', 'situated_reality_contact_occurrence');
  add(contactId, 'ρ:situated_occurrence', ref(occurrence));
  add(occurrence, 'ρ:experienced_by', ref('self'));

  for (const channel of channels(contact)) add(occurrence, 'ρ:contact_channel', channel);
  if (previous) add(occurrence, 'ρ:previous_lived_contact', ref(previous));
  if (source !== undefined) add(occurrence, 'ρ:source', source);
  if (target !== undefined) add(occurrence, 'ρ:target', target);
  for (const referent of about) add(occurrence, 'ρ:about', ref(referent));

  // More specific occurrences are parts of this event. The contact boundary is
  // not a sub-occurrence and the event never contains itself.
  for (const subject of occurrenceSubjects) {
    if (subject === occurrence || subject === contactId) continue;
    add(occurrence, 'ρ:contains_occurrence', ref(subject));
  }

  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
