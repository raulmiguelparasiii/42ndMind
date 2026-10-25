'use strict';

// Live mathematical view of one continuing being.
//
// Identity is not a reward and is not a score: the same canonical M is the
// whole 1. Deviations do not make it a different or fractional being. They stay
// inside that same whole as unresolved residuals until reality or further
// relation settlement resolves them. This module is a zero-state derivation;
// it stores no workspace, drive, priority, or second cognitive authority.

function clone(v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }
function directRefs(value) {
  if (value && typeof value === 'object' && !Array.isArray(value) && value.ref !== undefined) return [String(value.ref)];
  if (Array.isArray(value)) return value
    .filter(x => x && typeof x === 'object' && !Array.isArray(x) && x.ref !== undefined)
    .map(x => String(x.ref));
  return [];
}

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
// representation exposed them. Do not enumerate subsystem-specific paths here.
// Current M is small and ephemeral; recursively reading it adds no persistent
// workspace and prevents a local helper from hiding an unresolved subset merely
// by nesting it under its own structure.
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
      if (/^unresolved(?:_|$)/.test(key) && nonempty(child)) {
        if (Array.isArray(child)) {
          for (const item of child) out.push({
            kind: 'unresolved_current_subset',
            path: next,
            value: clone(item),
            source: `M.current.${next}`,
          });
        } else {
          out.push({
            kind: 'unresolved_current_subset',
            path: next,
            value: clone(child),
            source: `M.current.${next}`,
          });
        }
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
    settled: residuals.length === 0,
    residual_count: residuals.length,
    residuals,
  };
}

module.exports = { derive, futureBearingFacts, currentResiduals };
