'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

const ACTIVE = Object.freeze({ structural: 'active' });
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function hasFact(mind, subject, relation, object) {
  return mind.knowledge.current.facts.some(fact =>
    same(fact.subject, subject) && same(fact.relation, relation) && same(fact.object, object));
}
function rule(mind, id) { return mind.knowledge.rules.find(candidate => candidate.id === id); }

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');
for (const forbidden of [
  'applyOneLogic', 'applyStone', 'stoneEvaluator', 'oneLogicSolver',
  'rule.categorical && rule.exceptions',
]) assert.ok(!source.includes(forbidden), `content-specific C authority appeared: ${forbidden}`);

const m = Mind.one(1, 1);
assert.ok(m.knowledge && Array.isArray(m.knowledge.facts) && Array.isArray(m.knowledge.rules));
assert.ok(hasFact(m, 'stone:axis:z:+', 'names', 'wisdom'), 'Stone was not seeded as structured M knowledge');
assert.ok(hasFact(m, 'onelogic:T10', 'claim', { principle: 'counterexample_defeats_categorical_bridge' }),
  'formal OneLogic theorem knowledge is absent from M');
assert.ok(hasFact(m, { ref: 'seed:onelogic:T10' }, 'kind', 'categorical_bridge'),
  'the T10 schema is not itself a first-class relation in M');
assert.ok(hasFact(m, { ref: 'seed:onelogic:T10' }, ACTIVE, true),
  'the current authority-state of a relation is not representable in M');

// A relation may itself be the subject of another relation.
Mind.C(m, { relations: {
  facts: [
    { id: 'claim-edge', subject: 'alice', relation: 'claims', object: 'x' },
    [{ ref: 'claim-edge' }, 'provenance', 'book-A'],
  ],
  rules: [{
    id: 'taught:source-medium',
    premises: [[{ var: 'r' }, 'provenance', 'book-A']],
    conclusion: [{ var: 'r' }, 'medium', 'testimony'],
    provenance: { kind: 'teaching-example' },
  }],
} });
assert.ok(hasFact(m, { ref: 'claim-edge' }, 'medium', 'testimony'),
  'M could not form/use a relation about another relation');

// Give M an ordinary categorical bridge. It is immediately usable because generic
// C only matches the relation stored in M.
Mind.C(m, { relations: { rules: [{
  id: 'bridge:a',
  premises: [[{ var: 'thing' }, 'kind', 'cat']],
  conclusion: [{ var: 'thing' }, 'sound', 'meow'],
  categorical: true,
  provenance: { kind: 'teaching-example' },
}] } });
Mind.C(m, { relations: { facts: [['cat-a', 'kind', 'cat']] } });
assert.ok(hasFact(m, 'cat-a', 'sound', 'meow'), 'ordinary seeded/taught bridge was inert');

// T10 itself, not C, is now what deactivates a categorical bridge. C only knows
// the generic structural ACTIVE slot used by any relation about another relation.
Mind.C(m, { relations: { facts: [[{ ref: 'bridge:a' }, 'counterexample', 'case-a']] } });
assert.strictEqual(rule(m,'bridge:a').active, false, 'seeded T10 did not defeat the counterexampled bridge');
assert.ok(hasFact(m, { ref: 'bridge:a' }, ACTIVE, false), 'M did not retain the changed bridge authority');
Mind.C(m, { relations: { facts: [['cat-b', 'kind', 'cat']] } });
assert.ok(!hasFact(m, 'cat-b', 'sound', 'meow'), 'defeated bridge continued to supply conclusions');

// Crucial anti-cheat test: because T10 is itself just corrigible M-content, its own
// categorical claim can be presented with a counterexample. T10 then applies its
// relation to itself and becomes inactive. If C secretly hard-coded T10, the next
// bridge would still be defeated; it must not be.
const t10 = rule(m, 'seed:onelogic:T10');
assert.ok(t10 && t10.active === true, 'T10 unexpectedly inactive before self-correction test');
Mind.C(m, { relations: { facts: [[{ ref: 'seed:onelogic:T10' }, 'counterexample', 'case-t10']] } });
assert.strictEqual(t10.active, false, 'seeded T10 could not be corrected by reality-contact');
assert.ok(hasFact(m, { ref: 'seed:onelogic:T10' }, ACTIVE, false),
  'M did not represent the changed authority of its own OneLogic seed');

Mind.C(m, { relations: { rules: [{
  id: 'bridge:b',
  premises: [[{ var: 'thing' }, 'kind', 'dog']],
  conclusion: [{ var: 'thing' }, 'sound', 'bark'],
  categorical: true,
  provenance: { kind: 'teaching-example' },
}] } });
Mind.C(m, { relations: { facts: [[{ ref: 'bridge:b' }, 'counterexample', 'case-b']] } });
assert.strictEqual(rule(m,'bridge:b').active, true,
  'C still enforced counterexample defeat after the T10 knowledge in M was disabled');
Mind.C(m, { relations: { facts: [['dog-a', 'kind', 'dog']] } });
assert.ok(hasFact(m, 'dog-a', 'sound', 'bark'),
  'bridge behavior shows hidden T10 authority remained outside M');

// Stone is likewise usable as seeded M-content and corrigible through the seeded
// epistemic relation rather than a Stone evaluator in C.
const s = Mind.one(1, 1);
Mind.C(s, { relations: { facts: [
  ['judgment-a', 'horizontal_integration', 'full'],
  ['judgment-a', 'answerability', 'full'],
] } });
assert.ok(hasFact(s, 'judgment-a', 'stone_state', 'maturity'), 'structured Stone seed was inert');
const maturity = rule(s, 'seed:stone:maturity');
Mind.C(s, { relations: { facts: [[{ ref: 'seed:stone:maturity' }, 'counterexample', 'case-stone']] } });
assert.strictEqual(maturity.active, false, 'Stone seed could not be corrected through relational knowledge');
Mind.C(s, { relations: { facts: [
  ['judgment-b', 'horizontal_integration', 'full'],
  ['judgment-b', 'answerability', 'full'],
] } });
assert.ok(!hasFact(s, 'judgment-b', 'stone_state', 'maturity'),
  'defeated Stone relation continued acting as immutable machinery');

// A second OneLogic relation is usable without a theorem-specific function in C.
const q = Mind.one(1, 1);
Mind.C(q, { relations: { facts: [['model-a', 'actuality_relation', 'outside_model_class']] } });
assert.ok(hasFact(q, 'model-a', 'required_revision', 'expand_representation'),
  'seeded T7 relation could not be used by generic completion');

console.log('42ndMind first-class seeded knowledge: PASS');
console.log(JSON.stringify({
  seeded_facts: m.knowledge.facts.filter(f => String(f.id).startsWith('stone:') || String(f.id).startsWith('onelogic:')).length,
  seeded_rules: m.knowledge.rules.filter(r => String(r.id).startsWith('seed:')).length,
  relation_about_relation: true,
  onelogic_T10_in_M_not_C: true,
  T10_self_corrigible: t10.active === false,
  post_T10_counterexample_bridge_remains_active: rule(m,'bridge:b').active === true,
  stone_seed_used: true,
  stone_seed_corrigible: maturity.active === false,
  C_content_specific_branch: false,
}));
