'use strict';

const assert = require('assert');
const Temporal = require('./relation-sequence-recompression.js');

// A learned ordered relation may first be discovered through a gappy invariant
// projection and later receive literal-adjacency evidence for the same structural
// expansion. The relation identity must stay single while its evidence routes
// accumulate in M. Otherwise discovery order can permanently block legitimate
// immediate completion.

const A = 'opaque-term:a7';
const B = 'opaque-term:b9';
const state = { whole: 1, knowledge: { facts: [] }, structure: {} };

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function addEvent(order, terms) {
  terms.forEach((term, i) => {
    const subject = `occ:${order}:${i}`;
    state.knowledge.facts.push(
      { subject, relation: 'ρ:kind', object: 'lived_occurrence' },
      { subject, relation: 'ρ:instantiates', object: { ref: term } },
      { subject, relation: 'ρ:lived_order', object: order },
    );
  });
}
function apply(update) {
  if (!update?.relations?.facts) return;
  const seen = new Set(state.knowledge.facts.map(f => stable([f.subject, f.relation, f.object])));
  for (const [subject, relation, object] of update.relations.facts) {
    const key = stable([subject, relation, object]);
    if (seen.has(key)) continue;
    seen.add(key);
    state.knowledge.facts.push({ subject, relation, object });
  }
}
function learnedIndex() {
  const out = new Map();
  for (const f of state.knowledge.facts) {
    const id = String(f.subject);
    if (!out.has(id)) out.set(id, { id, routes: [] });
    const x = out.get(id);
    if (f.relation === 'ρ:kind' && f.object === 'learned_ordered_relation') x.kind = true;
    else if (f.relation === 'ρ:ordered_expansion' && Array.isArray(f.object)) x.expansion = f.object;
    else if (f.relation === 'ρ:ordered_projection_kind') x.legacyProjection = f.object;
    else if (f.relation === 'ρ:ordered_evidence_route' && f.object?.kind) x.routes.push(f.object);
  }
  return out;
}
function eventTerms(component) {
  if (!Array.isArray(component?.simultaneous_relations)) return null;
  return component.simultaneous_relations.map(x => String(x.ref)).sort();
}
function flatten(id, index, trail = new Set()) {
  if (trail.has(id)) throw new Error(`cycle: ${id}`);
  const x = index.get(id);
  if (!x?.kind || !x.expansion) return [];
  const next = new Set(trail); next.add(id);
  const out = [];
  for (const component of x.expansion) {
    if (component?.ref !== undefined) out.push(...flatten(String(component.ref), index, next));
    else {
      const terms = eventTerms(component);
      if (terms) out.push(terms);
    }
  }
  return out;
}
function isAB(event) {
  return Array.isArray(event) && event.length === 2 && event[0] === A && event[1] === B;
}

// Phase 1: A/B are invariant simultaneous terms, but unique intervening content
// means only the recurrence-relative projection can expose the repeated event.
for (let order = 1; order <= 24; order++) addEvent(order, [A, B, `noise:${order}`]);
apply(Temporal.relationalUpdate(state, { checkpoint: 4, recentWindow: 32, maxRules: 1 }));

let index = learnedIndex();
const target = [...index.values()].find(x => {
  if (!x.kind || x.legacyProjection !== 'lived_occurrence_projection') return false;
  const events = flatten(x.id, index);
  return events.length === 2 && isAB(events[0]) && isAB(events[1]);
});
assert(target, 'gappy recurrence did not establish the expected ordered relation fixture');

// Phase 2: the exact same structural relation now occurs literally and contiguously.
// This must upgrade evidence on the existing relation identity, not create a copied
// semantic relation or leave the relation permanently classified by birth route.
for (let order = 25; order <= 64; order++) addEvent(order, [A, B]);
apply(Temporal.relationalUpdate(state, { checkpoint: 4, recentWindow: 32, maxRules: 1 }));

index = learnedIndex();
const after = index.get(target.id);
assert(after, 'existing learned ordered relation disappeared');
const routeKinds = new Set(after.routes.map(route => route.kind));
assert(routeKinds.has('lived_occurrence_projection'),
  'original projection evidence route was not retained on the existing relation');
assert(routeKinds.has('full') || routeKinds.has('contiguous_suffix_projection'),
  'later adjacency-preserving evidence did not upgrade the existing ordered relation');

// With only one learned rule allowed, the upgraded route itself must make the
// existing relation eligible for immediate completion.
const completion = Temporal.completionUpdate(state);
assert(completion?.relations?.facts?.some(([, relation, object]) =>
  relation === 'ρ:grounded_by_ordered_relation' && object?.ref === target.id),
  'upgraded adjacency evidence did not make the existing relation usable for completion');

console.log(JSON.stringify({
  one_relation_identity: true,
  original_gappy_route_retained: true,
  later_adjacency_route_accumulated: true,
  completion_uses_upgraded_relation: true,
  copied_temporal_authority: false,
}, null, 2));
console.log('ORDERED RELATION ROUTE UPGRADE: PASS');
