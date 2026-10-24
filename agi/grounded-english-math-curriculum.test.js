'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');
const SurfaceStructure = require('./surface-structure-grounding.js');

// One end-to-end English-learning gate.
// During schooling, ordinary English is paired with mathematically checked
// relational contact. After schooling, semantic scaffolding is removed.

let seed = 0x42e1195;
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function id(prefix) { return `${prefix}_${rnd().toString(36)}`; }
const V = name => ({ var: String(name) });

const REL_GREATER = id('relation_greater');
const REL_LESS = id('relation_less');
const REL_CATEGORY = id('relation_category');
const REL_NUMBER_KIND = id('relation_number_kind');
const TARGET_CONCEPT = 'midrange';
const TARGET = 15;
const TARGET_LOW = 10;
const TARGET_HIGH = 20;

for (const file of [
  'mind.js', 'mind-relational.js', 'surface-template.js', 'surface-structure-grounding.js',
  'raw-proposal-expression-grounding.js', 'raw-concept-definition.js',
]) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const secret of [REL_GREATER, REL_LESS, REL_CATEGORY, REL_NUMBER_KIND, TARGET_CONCEPT])
    assert(!source.includes(secret), `${file} contains English-curriculum target knowledge: ${secret}`);
}

function paired(M, input, output, fact) {
  Mind.C(M, { surface: { input, output }, relations: { facts: [fact] } });
}
function categoryRule(ruleId, concept, low, high) {
  return {
    id: ruleId,
    premises: [[V('x'), REL_GREATER, low], [V('x'), REL_LESS, high]],
    conclusion: [V('x'), REL_CATEGORY, concept],
    categorical: true,
  };
}
function has(M, s, r, o) {
  return (M.knowledge?.current?.facts || []).some(f => f.subject === s && f.relation === r && f.object === o);
}
function tripleParts(triple) {
  if (Array.isArray(triple) && triple.length === 3) return { subject: triple[0], relation: triple[1], object: triple[2] };
  if (triple && typeof triple === 'object' &&
      Object.prototype.hasOwnProperty.call(triple, 'subject') &&
      Object.prototype.hasOwnProperty.call(triple, 'relation') &&
      Object.prototype.hasOwnProperty.call(triple, 'object')) return triple;
  return null;
}

const M = Mind.one(1, 1);

const greaterValues = [8, 13, 21, 34];
const lesserValues = [2, 4, 6];
const comparisonPairs = greaterValues.flatMap(greater => lesserValues.map(lesser => [greater, lesser]));
for (let round = 0; round < 2; round++) {
  for (const [greater, lesser] of comparisonPairs) {
    assert(greater > lesser);
    assert(lesser < greater);
    paired(M, `${greater} is greater than ${lesser}.`, 'noted.', [greater, REL_GREATER, lesser]);
    paired(M, `${lesser} is less than ${greater}.`, 'noted.', [lesser, REL_LESS, greater]);
  }
}

const definitions = [
  ['tiny', 0, 5, [1, 2, 3]],
  ['small', 5, 10, [6, 7, 8]],
  ['moderate', 20, 30, [21, 24, 29]],
  ['large', 30, 40, [31, 36, 39]],
  ['huge', 50, 60, [51, 57, 59]],
];
for (let i = 0; i < definitions.length; i++) {
  const [concept, low, high, examples] = definitions[i];
  Mind.C(M, {
    surface: { input: `${concept} means greater than ${low} and less than ${high}.`, output: 'noted.' },
    relations: { rules: [categoryRule(`english-school-definition:${i + 1}`, concept, low, high)] },
  });
  for (const example of examples) {
    assert(example > low && example < high);
    paired(M, `${example} is greater than ${low}.`, 'noted.', [example, REL_GREATER, low]);
    paired(M, `${example} is less than ${high}.`, 'noted.', [example, REL_LESS, high]);
    paired(M, `what category is ${example}?`, `it is ${concept}.`, [example, REL_CATEGORY, concept]);
  }
}

for (let round = 0; round < 3; round++) {
  for (const value of [TARGET, TARGET_LOW, TARGET_HIGH])
    paired(M, `${value} is a number.`, 'noted.', [value, REL_NUMBER_KIND, 'number']);
}

assert(!has(M, TARGET, REL_GREATER, TARGET_LOW));
assert(!has(M, TARGET, REL_LESS, TARGET_HIGH));
assert(!has(M, TARGET, REL_CATEGORY, TARGET_CONCEPT));
assert(!(M.knowledge?.rules || []).some(rule => JSON.stringify(rule).includes(TARGET_CONCEPT)));

Mind.C(M, { surface: { input: `${TARGET_CONCEPT} means greater than ${TARGET_LOW} and less than ${TARGET_HIGH}.`, output: 'noted.' } });
const learnedDefinition = (M.knowledge?.rules || []).find(rule => {
  if (rule.active === false || !Array.isArray(rule.premises) || rule.premises.length !== 2) return false;
  const conclusion = tripleParts(rule.conclusion);
  const premises = rule.premises.map(tripleParts);
  return conclusion && premises.every(Boolean) && conclusion.relation === REL_CATEGORY && conclusion.object === TARGET_CONCEPT &&
    premises.some(p => p.relation === REL_GREATER && p.object === TARGET_LOW) &&
    premises.some(p => p.relation === REL_LESS && p.object === TARGET_HIGH);
});
assert(learnedDefinition, 'raw English definition did not become a canonical M rule');
assert.strictEqual(learnedDefinition.provenance?.kind, 'surface_definition_induction');

const gtText = `${TARGET} is greater than ${TARGET_LOW}.`;
Mind.C(M, { surface: { input: gtText, output: 'noted.' } });
const gtEpisode = SurfaceStructure.latestSurfaceEpisode(M);
const firstGtProposals = (M.knowledge?.facts || []).filter(f =>
  String(f.subject) === String(gtEpisode?.id) && f.relation === 'ρ:proposes_relation').map(f => f.object);
console.log('FIRST RAW GREATER PROPOSALS', JSON.stringify({
  episode: gtEpisode?.id,
  proposals: firstGtProposals,
  current: (M.knowledge?.current?.facts || []).filter(f =>
    (f.subject === TARGET || f.subject === String(TARGET)) && f.relation === REL_GREATER),
}, null, 2));
Mind.C(M, { surface: { input: gtText, output: 'noted.' } });
Mind.C(M, { surface: { input: gtText, output: 'noted.' } });

const ltText = `${TARGET} is less than ${TARGET_HIGH}.`;
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: ltText, output: 'noted.' } });

assert(has(M, TARGET, REL_GREATER, TARGET_LOW), 'raw English did not recover the grounded meaning of greater than');
assert(has(M, TARGET, REL_LESS, TARGET_HIGH), 'raw English did not recover the grounded meaning of less than');
assert(has(M, TARGET, REL_CATEGORY, TARGET_CONCEPT), 'M did not derive the newly taught English concept');

const probe = structuredClone(M);
Mind.C(probe, { surface: { input: `what category is ${TARGET}?` } });
console.log('FINAL GROUNDED ENGLISH QUERY', JSON.stringify({
  sequence: probe.current?.sequence,
  concept_expressions: (probe.knowledge?.facts || []).filter(f =>
    f.subject === TARGET_CONCEPT && f.relation === 'ρ:surface_expression'),
  category_current: (probe.knowledge?.current?.facts || []).filter(f =>
    f.subject === TARGET && f.relation === REL_CATEGORY),
}, null, 2));
assert.strictEqual(probe.current?.sequence?.expression, `it is ${TARGET_CONCEPT}.`);
assert.strictEqual(probe.current?.sequence?.canonical_grounding?.authority, 'canonical_M');
assert.strictEqual(probe.current?.sequence?.canonical_grounding?.object, TARGET_CONCEPT);

for (const forbidden of ['english_parser','parser_state','grammar_state','language_state','semantic_dictionary','english_dictionary','response_table','truth_ledger','teacher_state'])
  assert.strictEqual(M[forbidden], undefined, `parallel English authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  teacher_grounding_source: 'mathematically_checked_relational_contact',
  ordinary_english_schooling: true,
  crossed_math_examples_remove_role_correlation: true,
  crossed_category_examples_remove_answer_role_correlation: true,
  recurrent_numeral_identity_grounding: true,
  target_definition_semantic_rules_supplied: 0,
  target_premise_semantic_triples_supplied: 0,
  target_question_semantic_channels_supplied: 0,
  raw_english_definition_became_M_rule: true,
  raw_english_comparisons_became_M_facts: true,
  learned_english_changed_reasoning: true,
  heldout_english_answer: probe.current.sequence.expression,
  answer_authority: probe.current.sequence.canonical_grounding.authority,
  one_persistent_M: M.whole === 1,
  english_parser_added: false,
}, null, 2));
console.log('GROUNDED ENGLISH FROM MATHEMATICS: PASS');
