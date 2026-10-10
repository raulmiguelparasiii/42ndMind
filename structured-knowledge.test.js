'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

function hasFact(mind, subject, relation, object) {
  return mind.knowledge.current.facts.some(fact =>
    JSON.stringify(fact.subject) === JSON.stringify(subject) &&
    JSON.stringify(fact.relation) === JSON.stringify(relation) &&
    JSON.stringify(fact.object) === JSON.stringify(object));
}
function rule(mind, id) { return mind.knowledge.rules.find(candidate => candidate.id === id); }

// The foundation must exist as structured, inspectable M-content rather than only
// prose. The public cognitive API remains one(...) and C(M,R).
assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');
for (const forbidden of ['applyOneLogic', 'applyStone', 'stoneEvaluator', 'oneLogicSolver']) {
  assert.ok(!source.includes(forbidden), `content-specific C authority appeared: ${forbidden}`);
}

const m = Mind.one(1, 1);
assert.ok(m.knowledge && Array.isArray(m.knowledge.facts) && Array.isArray(m.knowledge.rules));
assert.ok(hasFact(m, 'stone:axis:z:+', 'names', 'wisdom'), 'Stone was not seeded as structured M knowledge');
assert.ok(hasFact(m, 'onelogic:T10', 'claim', { principle: 'counterexample_defeats_categorical_bridge' }),
  'formal OneLogic theorem knowledge is absent from M');
assert.ok(hasFact(m, { ref: 'seed:onelogic:T10' }, 'kind', 'relation_schema'),
  'a seeded relation is not itself referencable inside M');

// OneLogic T10 is useful immediately as a leg-up: generic relational completion
// applies the schema because its premises are contacted, not because C recognizes
// the words "OneLogic" or "categorical_bridge" specially.
Mind.C(m, { relations: { facts: [
  ['bridge-a', 'kind', 'categorical_bridge'],
  ['bridge-a', 'counterexample', 'case-a'],
] } });
assert.ok(hasFact(m, 'bridge-a', 'status', 'defeated'), 'seeded T10 relation was inert');

// Relations are first-class terms. Here a direct relation has an explicit handle;
// another relation uses that handle as its subject, and an ordinary taught schema
// with a variable completes a further fact about the relation itself.
Mind.C(m, { relations: {
  facts: [
    { id: 'claim-edge', subject: 'alice', relation: 'claims', object: 'x' },
    [{ ref: 'claim-edge' }, 'provenance', 'book-A'],
  ],
  rules: [{
    id: 'taught:source-medium',
    premises: [[{ var: 'r' }, 'provenance', 'book-A']],
    conclusion: [{ var: 'r' }, 'medium', 'testimony'],
    categorical: true,
    provenance: { kind: 'teaching-example' },
  }],
} });
assert.ok(hasFact(m, { ref: 'claim-edge' }, 'medium', 'testimony'),
  'M could not form/use a relation about another relation');

// Corrigibility test. Reality supplies the premises of the seeded categorical
// schema together with an incompatible conclusion. The seed is allowed to lose
// authority; it is not protected machinery inside C.
const t10 = rule(m, 'seed:onelogic:T10');
assert.ok(t10 && t10.active !== false, 'T10 seed unexpectedly inactive before counterexample');
Mind.C(m, { relations: { facts: [
  ['bridge-b', 'kind', 'categorical_bridge'],
  ['bridge-b', 'counterexample', 'case-b'],
  ['bridge-b', 'status', 'valid'],
] } });
assert.strictEqual(t10.active, false, 'reality could not defeat seeded OneLogic knowledge');
assert.ok(hasFact(m, { ref: 'seed:onelogic:T10' }, 'active', false),
  'M did not represent the changed status of its own seeded relation');
Mind.C(m, { relations: { facts: [
  ['bridge-c', 'kind', 'categorical_bridge'],
  ['bridge-c', 'counterexample', 'case-c'],
] } });
assert.ok(!hasFact(m, 'bridge-c', 'status', 'defeated'),
  'a defeated seeded schema continued acting as immutable machinery');

// Stone receives the same treatment on a separate mind: usable from the start,
// yet not immunized against later reality.
const s = Mind.one(1, 1);
Mind.C(s, { relations: { facts: [
  ['judgment-a', 'horizontal_integration', 'full'],
  ['judgment-a', 'answerability', 'full'],
] } });
assert.ok(hasFact(s, 'judgment-a', 'stone_state', 'maturity'), 'structured Stone seed was inert');
const maturity = rule(s, 'seed:stone:maturity');
Mind.C(s, { relations: { facts: [
  ['judgment-b', 'horizontal_integration', 'full'],
  ['judgment-b', 'answerability', 'full'],
  ['judgment-b', 'stone_state', 'not_maturity'],
] } });
assert.strictEqual(maturity.active, false, 'reality could not defeat seeded Stone knowledge');

// A second formal OneLogic relation is represented as usable knowledge without a
// theorem-specific function in C.
const q = Mind.one(1, 1);
Mind.C(q, { relations: { facts: [
  ['model-a', 'actuality_relation', 'outside_model_class'],
] } });
assert.ok(hasFact(q, 'model-a', 'required_revision', 'expand_representation'),
  'seeded T7 relation could not be used by generic completion');

console.log('42ndMind first-class seeded knowledge: PASS');
console.log(JSON.stringify({
  seeded_facts: m.knowledge.facts.filter(f => String(f.id).startsWith('stone:') || String(f.id).startsWith('onelogic:')).length,
  seeded_rules: m.knowledge.rules.filter(r => String(r.id).startsWith('seed:')).length,
  relation_about_relation: true,
  onelogic_seed_used: true,
  onelogic_seed_corrigible: t10.active === false,
  stone_seed_used: true,
  stone_seed_corrigible: maturity.active === false,
  C_content_specific_branch: false,
}));
