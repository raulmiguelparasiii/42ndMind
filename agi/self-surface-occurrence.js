'use strict';

// Zero-state normalization of an expression actually produced by the one M.
//
// This helper chooses no words and supplies no dialogue policy. It runs only after
// the existing live path has already produced an expression. The expression then
// becomes ordinary canonical lived material: something self caused during the
// present situated reality contact. This lets the same recurrence, structural,
// temporal, consequence, and resolution machinery learn from what the individual
// itself did instead of leaving speech outside its life history.

const crypto = require('crypto');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function digest(v) { return crypto.createHash('sha256').update(stable(v)).digest('hex').slice(0, 24); }
function ref(id) { return { ref: String(id) }; }
function factKey(subject, relation, object) { return stable([subject, relation, object]); }

function currentSituatedOccurrence(state, contactId, order) {
  const facts = state.knowledge?.current?.facts || [];
  const direct = facts.find(f => String(f.subject) === contactId &&
    f.relation === 'ρ:situated_occurrence' && f.object?.ref !== undefined);
  if (direct) return String(direct.object.ref);

  const grounded = new Set(facts
    .filter(f => f.relation === 'ρ:grounded_by' && f.object?.ref === contactId)
    .map(f => String(f.subject)));
  return facts.find(f => grounded.has(String(f.subject)) &&
    f.relation === 'ρ:lived_order' && f.object === order &&
    String(f.subject).startsWith('reality-contact-occurrence:'))?.subject || null;
}

function relationalUpdate(state) {
  if (!state || state.whole !== 1) return null;
  const sequence = state.current?.sequence;
  if (!sequence || typeof sequence.expression !== 'string' || !sequence.expression.length) return null;

  const order = state.structure?.lived_contact_order;
  if (!Number.isFinite(order)) return null;
  const contactId = `lived-contact:${order}`;
  const contactedOccurrence = currentSituatedOccurrence(state, contactId, order);
  if (!contactedOccurrence) return null;

  const tokens = Array.isArray(sequence.output_tokens) ? sequence.output_tokens.slice() : [sequence.expression];
  const surfaceTerm = `surface:${sequence.expression}`;
  const identity = [order, sequence.expression, tokens];
  const suffix = digest(identity);
  const actionTerm = `self-surface-action-term:${suffix}`;
  const occurrence = `self-surface-action-occurrence:${order}:${suffix}`;

  const canonical = new Set((state.knowledge?.facts || []).map(f => factKey(f.subject, f.relation, f.object)));
  const pending = new Set();
  const facts = [];
  function add(subject, relation, object) {
    const key = factKey(subject, relation, object);
    if (canonical.has(key) || pending.has(key)) return;
    pending.add(key);
    facts.push([subject, relation, object]);
  }

  // Surface identity is shared with heard expressions, while the action term is
  // distinct so hearing a phrase and causing that phrase are not conflated.
  add(surfaceTerm, 'ρ:kind', 'expression_term');
  add(actionTerm, 'ρ:kind', 'surface_action_term');
  add(actionTerm, 'ρ:surface_content', ref(surfaceTerm));
  add(actionTerm, 'ρ:exact_expression', sequence.expression);
  add(actionTerm, 'ρ:exact_tokens', tokens);
  add(actionTerm, 'ρ:instantiation_kind', 'self_surface_action_occurrence');

  add(occurrence, 'ρ:kind', 'self_surface_action_occurrence');
  add(occurrence, 'ρ:kind', 'lived_occurrence');
  add(occurrence, 'ρ:instantiates', ref(actionTerm));
  add(occurrence, 'ρ:lived_order', order);
  add(occurrence, 'ρ:within_lived_contact', ref(contactId));
  add(occurrence, 'ρ:after_within_contact', ref(contactedOccurrence));
  add(occurrence, 'ρ:surface_content', ref(surfaceTerm));
  add(occurrence, 'ρ:exact_expression', sequence.expression);
  add(occurrence, 'ρ:exact_tokens', tokens);

  add('self', 'ρ:caused', ref(occurrence));
  add(contactId, 'ρ:contains_occurrence', ref(occurrence));
  add(contactedOccurrence, 'ρ:contains_occurrence', ref(occurrence));
  add(contactedOccurrence, 'ρ:followed_within_contact_by', ref(occurrence));

  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
