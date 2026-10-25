'use strict';

// Live mathematical view of one continuing being.
//
// Identity is not a reward and is not a score: the same canonical M is the
// whole 1. Deviations do not make it a different or fractional being. They stay
// inside that same whole as unresolved residuals until reality or further
// relation settlement resolves them. This module is a zero-state derivation;
// it stores no workspace, drive, priority, or second cognitive authority.

function clone(v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function hash32(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}
function directRefs(value) {
  if (value && typeof value === 'object' && !Array.isArray(value) && value.ref !== undefined) return [String(value.ref)];
  if (Array.isArray(value)) return value
    .filter(x => x && typeof x === 'object' && !Array.isArray(x) && x.ref !== undefined)
    .map(x => String(x.ref));
  return [];
}
function factKey(f) { return stable([f.subject, f.relation, f.object]); }

// An unfinished relation is a real residual only while it still points toward
// something later reality can instantiate. "Open" by itself is insufficient:
// stale summaries and already-resolved conflicts must not become permanent need.
function futureBearingFacts(facts) {
  const open = new Set(), resolved = new Set(), instantiable = new Set();
  for (const fact of facts || []) {
    const subject = String(fact.subject);
    if (fact.relation === 'ρ:formation_status' && fact.object === 'open') open.add(subject);
    else if (fact.relation === 'ρ:resolved_by' && fact.object?.ref !== undefined) resolved.add(subject);
    else if (fact.relation === 'ρ:instantiation_kind') instantiable.add(subject);
  }
  const live = new Set([...open].filter(subject => !resolved.has(subject)));
  return (facts || []).filter(fact => live.has(String(fact.subject)) &&
    directRefs(fact.object).some(ref => instantiable.has(ref)));
}

// Existing embodied concern is already genuine purpose math in the core: a
// positive concern is an unsatisfied coordinate whose admissible continuation
// is toward LESS. Here it is exposed as one kind of residual of the same whole.
function physicalResiduals(state) {
  const frame = state?.previous_contact;
  const count = Number(state?.concern_count) || 0;
  if (!Array.isArray(frame) || count < 1 || frame.length < count) return [];
  const start = frame.length - count;
  const out = [];
  for (let i = 0; i < count; i++) {
    const magnitude = frame[start + i];
    if (!Number.isFinite(magnitude) || magnitude <= 0) continue;
    out.push({
      kind: 'concern_residual',
      coordinate: `c${i}`,
      magnitude,
      constraint: 'less',
      source: 'M.previous_contact',
    });
  }
  return out;
}

function nonempty(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== null && value !== undefined && value !== false && value !== '';
}

// Unknown/unresolved coordinates belong to the same 1 regardless of which live
// representation exposed them. The current state is read recursively so no
// helper can hide an unsolved subset merely by nesting it under its own object.
function currentResiduals(state) {
  const out = [];
  const seen = new Set();
  function visit(value, path) {
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}[${i}]`));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      if (/^(?:unresolved|unknown)(?:_|$)/.test(key) && nonempty(child)) {
        const values = Array.isArray(child) ? child : [child];
        for (const item of values) out.push({
          kind: 'unresolved_current_subset',
          path: next,
          value: clone(item),
          source: `M.current.${next}`,
        });
        continue;
      }
      visit(child, next);
    }
  }
  visit(state?.current, '');
  return out;
}

function relationalResiduals(state, field) {
  const currentFacts = state?.knowledge?.current?.facts || [];
  const liveFacts = Array.isArray(field?.continuing_facts)
    ? field.continuing_facts : futureBearingFacts(currentFacts);
  const bySubject = new Map();
  for (const fact of liveFacts) {
    const subject = String(fact.subject);
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject).push(fact);
  }
  const participants = Array.isArray(field?.participating_facts) ? field.participating_facts : [];
  return [...bySubject.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([subject, sourceFacts]) => {
    const dependents = participants.filter(fact =>
      String(fact.subject) === subject || directRefs(fact.object).includes(subject));
    return {
      kind: 'unfinished_relational_consequence',
      subject,
      source_facts: sourceFacts.map(clone),
      dependent_participation: dependents.length,
    };
  });
}

function contextSignature(field) {
  const roots = [
    ...(field?.referential_cues || []),
    ...(field?.query_matches || []),
  ].map(factKey).sort();
  return roots.length ? hash32(stable(roots)) : null;
}

function derive(state, field = null) {
  if (!state || state.whole !== 1) throw new Error('whole-being constraint requires one canonical M');
  const residuals = [
    ...physicalResiduals(state),
    ...currentResiduals(state),
    ...relationalResiduals(state, field),
  ];
  return {
    whole: 1,
    identity: 'one_continuing_M',
    authority: 'derived_zero_state',
    persistent: false,
    equation: 'B(M)=1; deviations remain inside B as Δ(M) until resolved',
    context_signature: contextSignature(field),
    settled: residuals.length === 0,
    residual_count: residuals.length,
    residuals,
  };
}

// Reify only current unknown/unresolved subsets that have an actual relational
// context. They become ordinary M formations, not a second drive state. Their
// future-bearing pointer carries the residual content itself, so continued
// pressure has content without turning all metadata into forward roots.
//
// Resolution is conservative: unrelated contact cannot close a residual. Only a
// recurrence of the same relational context without the exact same unresolved
// constraint can resolve it. A changed value therefore closes the old residual
// and opens the new one instead of leaving stale pressure behind.
function relationalUpdate(state, being) {
  const context = being?.context_signature;
  if (!context) return null;
  const order = state?.structure?.lived_contact_order;
  if (!Number.isFinite(order)) return null;
  const currentFacts = state?.knowledge?.current?.facts || [];
  const canonicalKeys = new Set((state?.knowledge?.facts || []).map(factKey));
  const current = (being.residuals || []).filter(r => r.kind === 'unresolved_current_subset');
  const currentKeys = new Set(current.map(r => stable([r.path, r.value])));
  const facts = [];
  const add = triple => {
    const fact = { subject: triple[0], relation: triple[1], object: triple[2] };
    const key = factKey(fact);
    if (canonicalKeys.has(key) || facts.some(x => factKey({ subject: x[0], relation: x[1], object: x[2] }) === key)) return;
    facts.push(triple);
  };

  for (const residual of current) {
    const signature = stable([context, residual.path, residual.value]);
    const token = hash32(signature);
    const id = `whole-residual:${token}`;
    const term = `whole-residual-term:${token}`;
    const occurrence = `whole-residual-occurrence:${order}:${token}`;
    const livedContact = `lived-contact:${order}`;
    add([term, 'ρ:kind', 'whole_residual_term']);
    add([term, 'ρ:instantiation_kind', 'whole_residual_occurrence']);
    add([id, 'ρ:kind', 'whole_residual']);
    add([id, 'ρ:formation_status', 'open']);
    add([id, 'ρ:context_signature', context]);
    add([id, 'ρ:residual_path', residual.path]);
    add([id, 'ρ:residual_value', clone(residual.value)]);
    add([id, 'ρ:residual_term', { ref: term, path: residual.path, value: clone(residual.value), context_signature: context }]);
    add([occurrence, 'ρ:kind', 'whole_residual_occurrence']);
    add([occurrence, 'ρ:kind', 'lived_occurrence']);
    add([occurrence, 'ρ:instantiates', { ref: term }]);
    add([occurrence, 'ρ:order', order]);
    add([occurrence, 'ρ:lived_order', order]);
    add([occurrence, 'ρ:grounded_by', { ref: livedContact }]);
    add([livedContact, 'ρ:contains_occurrence', { ref: occurrence }]);
    add([id, 'ρ:observed_as', { ref: occurrence }]);
  }

  const wholeResiduals = new Set(currentFacts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'whole_residual')
    .map(f => String(f.subject)));
  const resolved = new Set(currentFacts
    .filter(f => f.relation === 'ρ:resolved_by' && f.object?.ref !== undefined)
    .map(f => String(f.subject)));
  for (const id of wholeResiduals) {
    if (resolved.has(id)) continue;
    const sameContext = currentFacts.some(f => String(f.subject) === id && f.relation === 'ρ:context_signature' && f.object === context);
    if (!sameContext) continue;
    const pathFact = currentFacts.find(f => String(f.subject) === id && f.relation === 'ρ:residual_path');
    const valueFact = currentFacts.find(f => String(f.subject) === id && f.relation === 'ρ:residual_value');
    if (!pathFact || !valueFact) continue;
    if (currentKeys.has(stable([pathFact.object, valueFact.object]))) continue;
    add([id, 'ρ:resolved_by', { ref: `lived-contact:${order}` }]);
  }

  return facts.length ? { facts } : null;
}

module.exports = { derive, relationalUpdate, futureBearingFacts, currentResiduals, contextSignature };
