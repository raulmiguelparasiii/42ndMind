'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

let seed = 0x42c0ffee;
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function word(prefix) { return `${prefix}_${rnd().toString(36)}`; }
const V = name => ({ var: String(name) });

const REL_A = word('relation_a');
const REL_B = word('relation_b');
const REL_KIND = word('relation_kind');
const DEF = word('definition_cue');
const JOIN = word('definition_join');
const concepts = Array.from({ length: 5 }, () => word('concept_train'));
const valuesA = Array.from({ length: 5 }, () => word('value_a'));
const valuesB = Array.from({ length: 5 }, () => word('value_b'));
const targetConcept = word('concept_target');
const targetA = word('value_a_target');
const targetB = word('value_b_target');
const targetEntity = word('entity_target');
const partialEntity = word('entity_partial');

for (const file of [
  'mind.js', 'mind-relational.js', 'one-live-blueprint.js', 'surface-template.js',
  'surface-structure-grounding.js', 'raw-proposal-expression-grounding.js', 'raw-concept-definition.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const secret of [REL_A, REL_B, REL_KIND, DEF, JOIN, targetConcept, targetA, targetB, targetEntity])
    assert(!source.includes(secret), `${file} contains runtime-generated concept fixture ${secret}`);
}

function definitionRule(id, concept, a, b) {
  return {
    id,
    premises: [
      [V('x'), REL_A, a],
      [V('x'), REL_B, b],
    ],
    conclusion: [V('x'), REL_KIND, concept],
    categorical: true,
  };
}
function has(M, s, r, o) {
  return (M.knowledge?.current?.facts || []).some(f => f.subject === s && f.relation === r && f.object === o);
}

const M = Mind.one(1, 1);

// School only the *surface form of defining a concept*. Each training definition
// is grounded by a structured rule, while all constants vary independently.
for (let i = 0; i < concepts.length; i++) {
  Mind.C(M, {
    surface: { input: `${concepts[i]} ${DEF} ${valuesA[i]} ${JOIN} ${valuesB[i]}.`, output: 'noted.' },
    relations: { rules: [definitionRule(`school-definition:${i + 1}`, concepts[i], valuesA[i], valuesB[i])] },
  });
}

assert(!has(M, targetEntity, REL_KIND, targetConcept), 'target concept existed before raw definition');
assert(!(M.knowledge?.rules || []).some(rule => JSON.stringify(rule).includes(targetConcept)),
  'target concept rule existed before raw definition');

// The new concept arrives through raw language only. No target rule, target fact,
// target semantic channel, or target triple is supplied with this contact.
Mind.C(M, {
  surface: { input: `${targetConcept} ${DEF} ${targetA} ${JOIN} ${targetB}.`, output: 'noted.' },
});

const learnedRule = (M.knowledge?.rules || []).find(rule =>
  rule.active !== false && Array.isArray(rule.premises) && rule.premises.length === 2 &&
  Array.isArray(rule.conclusion) && rule.conclusion[1] === REL_KIND && rule.conclusion[2] === targetConcept &&
  rule.premises.some(p => p[1] === REL_A && p[2] === targetA) &&
  rule.premises.some(p => p[1] === REL_B && p[2] === targetB));
if (!learnedRule) {
  const facts = M.knowledge?.facts || [];
  const contactRules = facts.filter(f => f.relation === 'ρ:contact_rule');
  const inputTokens = facts.filter(f => f.relation === 'ρ:input_tokens').map(f => ({ episode: f.subject, tokens: f.object }));
  const defines = facts.filter(f => f.relation === 'ρ:defines_rule');
  console.log('RAW CONCEPT DEFINITION DIAGNOSTIC', JSON.stringify({
    contact_rule_count: contactRules.length,
    contact_rules: contactRules.map(f => ({ episode: f.subject, rule: f.object?.rule })),
    input_tokens: inputTokens,
    defines_rule_facts: defines,
    knowledge_rules: (M.knowledge?.rules || []).map(r => ({ id: r.id, premises: r.premises, conclusion: r.conclusion, active: r.active, provenance: r.provenance })),
  }, null, 2));
}
assert(learnedRule, 'raw definition did not create the new concept rule in canonical M');

// The target entity is never mentioned in the definition. Its ordinary facts
// arrive later, and the newly learned concept must change what M can infer.
Mind.C(M, { relations: { facts: [
  [targetEntity, REL_A, targetA],
  [targetEntity, REL_B, targetB],
  [partialEntity, REL_A, targetA],
] } });

assert(has(M, targetEntity, REL_KIND, targetConcept),
  'new concept was not applied to a never-mentioned entity from its premises');
assert(!has(M, partialEntity, REL_KIND, targetConcept),
  'concept fired without satisfying the complete learned definition');

for (const forbidden of ['concept_store', 'dictionary', 'semantic_dictionary', 'grammar_state', 'parser_state', 'language_state', 'truth_ledger'])
  assert.strictEqual(M[forbidden], undefined, `parallel concept/language authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  seed: '0x42c0ffee',
  runtime_generated_concept: targetConcept,
  runtime_generated_definition_cue: DEF,
  target_structured_rule_supplied: false,
  target_semantic_triples_supplied: 0,
  new_definition_became_canonical_M_rule: true,
  never_mentioned_entity_classified: true,
  conjunction_preserved: true,
  one_persistent_M: M.whole === 1,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('RAW CONCEPT DEFINITION FALSIFICATION: PASS');
