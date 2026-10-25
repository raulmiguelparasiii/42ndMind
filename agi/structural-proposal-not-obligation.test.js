'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Opaque predicates: this guard is about epistemic authority, not language or a
// fixture-specific notion of what the relations mean.
const T = 'ρ:opaque_link_a91';
const D = 'ρ:opaque_link_b47';
for (const file of ['mind.js', 'structural-relational-abstraction.js', 'structural-open-relations.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes('opaque_link_a91') && !source.includes('opaque_link_b47'),
    `${file} contains proposal/obligation fixture knowledge`);
}

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function full(a, b, c) { return [[a, T, b], [b, T, c], [a, D, c]]; }
function cue(a, b, c) { return [[a, T, b], [b, T, c]]; }
function proposed(M, triple) {
  return (M.knowledge?.facts || []).some(f => f.relation === 'ρ:proposes_relation' && f.object &&
    same(f.object.subject, triple[0]) && same(f.object.relation, triple[1]) && same(f.object.object, triple[2]));
}
function openFormations(M) {
  const facts = M.knowledge?.facts || [];
  const kinds = new Set(facts
    .filter(f => f.relation === 'ρ:kind' && f.object === 'structural_open_relation')
    .map(f => String(f.subject)));
  return [...kinds].filter(id => !facts.some(f => String(f.subject) === id && f.relation === 'ρ:resolved_by'));
}

const M = Mind.one(1, 1);

// Independent recurrence is enough to discover an endpoint-independent structural
// candidate. That candidate deliberately remains proposal-level knowledge.
for (const xs of [
  ['a7', 'b2', 'c9'],
  ['d4', 'e8', 'f1'],
  ['g3', 'h6', 'i5'],
]) Mind.C(M, { relations: { facts: full(...xs) } });

const schemas = new Set((M.knowledge?.facts || [])
  .filter(f => f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate')
  .map(f => String(f.subject)));
assert(schemas.size > 0, 'recurrent structure produced no schema candidate');
for (const id of schemas) {
  assert((M.knowledge?.facts || []).some(f => String(f.subject) === id &&
    f.relation === 'ρ:formation_status' && f.object === 'proposal'),
  'structural schema ceased to be explicitly provisional');
}

// A held-out partial instance may receive the ordinary structural proposal. But a
// proposal is not evidence that reality owes M the missing edge, so no unfinished
// structural-open formation may be manufactured from it.
const held = ['u2', 'v7', 'w4'];
const target = [held[0], D, held[2]];
Mind.C(M, { relations: { facts: cue(...held) } });
assert(proposed(M, target), 'structural proposal itself was lost');
assert.strictEqual(openFormations(M).length, 0,
  'provisional structural completion was promoted into an unresolved cognitive obligation');

// The missing relation is still absent from current truth. Proposal, truth, and
// unfinished need therefore remain three different epistemic states.
assert(!(M.knowledge?.current?.facts || []).some(f => same(f.subject, target[0]) &&
  same(f.relation, target[1]) && same(f.object, target[2])),
'missing structural relation was promoted to current truth');

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  recurrent_structure_learned: true,
  missing_relation_proposed: true,
  missing_relation_current_truth: false,
  proposal_became_open_need: false,
  parser_or_task_fixture: false,
}, null, 2));
console.log('STRUCTURAL PROPOSAL != OBLIGATION: PASS');
