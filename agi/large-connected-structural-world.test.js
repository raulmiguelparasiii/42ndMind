'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification: adding connected reality beyond the local structural
// search budget must not make all learnable local structure disappear. Passing
// requires bounded connected substructure; merely raising a whole-component cap
// to swallow this fixture still fails because the test requires <=8-edge schemas.
const EDGE_COUNT = 12;
const REL = Array.from({ length: EDGE_COUNT }, (_, i) => `ρ:large_${String(i).padStart(2, '0')}_q7m`);
for (const file of ['mind.js', 'structural-relational-abstraction.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes('large_00_q7m'), `${file} contains large-world fixture knowledge`);
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function graph(prefix) {
  const nodes = Array.from({ length: EDGE_COUNT + 1 }, (_, i) => `${prefix}:n${i}`);
  return REL.map((relation, i) => [nodes[i], relation, nodes[i + 1]]);
}
function facts(M) { return M.knowledge?.facts || []; }
function values(M, subject, relation) {
  return facts(M).filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function schemas(M) {
  const ids = [...new Set(facts(M).filter(f => f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate').map(f => String(f.subject)))];
  return ids.map(id => ({
    id,
    edges: values(M, id, 'ρ:schema_edges').find(Array.isArray) || [],
    support: values(M, id, 'ρ:supported_by').filter(x => x?.ref !== undefined).map(x => String(x.ref)),
  }));
}
function connectedCanonical(edges) {
  if (!Array.isArray(edges) || edges.length < 2) return false;
  const byRole = new Map();
  edges.forEach((edge, i) => {
    for (const role of [edge[1], edge[2]]) {
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role).push(i);
    }
  });
  const seen = new Set([0]), queue = [0];
  while (queue.length) {
    const i = queue.pop();
    for (const role of [edges[i][1], edges[i][2]]) for (const j of byRole.get(role) || []) {
      if (!seen.has(j)) { seen.add(j); queue.push(j); }
    }
  }
  return seen.size === edges.length;
}

const M = Mind.one(1, 1);
for (const prefix of ['world:a9', 'world:k3', 'world:t6'])
  Mind.C(M, { relations: { facts: graph(prefix) } });

// Exact large contacted worlds remain in M regardless of search views.
for (const triple of graph('world:a9'))
  assert(facts(M).some(f => stable([f.subject, f.relation, f.object]) === stable(triple)), 'exact large-world contact was lost');

const learned = schemas(M);
const bounded = learned.filter(x => x.edges.length >= 2 && x.edges.length <= 8 && connectedCanonical(x.edges));
assert(bounded.length >= 2,
  'large connected worlds produced no reusable bounded connected structural schemas');
assert(bounded.some(x => new Set(x.support).size >= 2),
  'bounded structural schema lacks independent support across renamed large worlds');
assert(bounded.every(x => x.edges.length < EDGE_COUNT),
  'large-world gate was satisfied only by swallowing the entire component');

const occurrences = facts(M).filter(f => f.relation === 'ρ:kind' && f.object === 'structural_pattern_occurrence').length;
assert(occurrences > 0 && occurrences < 256,
  `large-world local search is absent or explosively broad: ${occurrences} derived occurrences`);

for (const forbidden of ['large_graph_model', 'subgraph_truth_store', 'structural_world_state', 'graph_planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel large-world structural authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  contacted_component_edges: EDGE_COUNT,
  bounded_connected_schemas: bounded.length,
  independent_support_present: true,
  exact_large_world_contact_retained: true,
  whole_component_constant_bump_insufficient: true,
  derived_search_bounded: occurrences < 256,
  parallel_structural_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('LARGE CONNECTED STRUCTURAL WORLD FALSIFICATION: PASS');
