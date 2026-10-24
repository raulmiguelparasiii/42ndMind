'use strict';

const assert = require('assert');
const fs = require('fs');
const Mind = require('./agi/mind.js');

let seed = 0x42b00c5;
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function word(prefix) { return `${prefix}_${rnd().toString(36)}`; }
const V = name => ({ var: String(name) });

const MATERIAL = word('relation_material');
const TRAIT = word('relation_trait');
const target = word('target');
const wood = word('wood');
const glass = word('glass');
const metal = word('metal');
const burnable = word('burnable');
const brittle = word('brittle');
const durable = word('durable');
const training = Array.from({ length: 6 }, () => word('entity'));

const runtime = [
  fs.readFileSync('./agi/mind.js', 'utf8'),
  fs.readFileSync('./agi/mind-relational.js', 'utf8'),
  fs.readFileSync('./agi/ordered-surface-contact.js', 'utf8'),
].join('\n');
for (const secret of [MATERIAL, TRAIT, target, wood, glass, metal, burnable, brittle, durable])
  assert(!runtime.includes(secret), `generated certification symbol leaked into cognition: ${secret}`);

function teach(M, input, output, facts) {
  Mind.C(M, { surface: { input, output }, relations: { facts } });
}
function has(M, s, r, o) {
  return (M.knowledge?.current?.facts || []).some(f => f.subject === s && f.relation === r && f.object === o);
}
function ask(M, input) {
  const q = structuredClone(M);
  Mind.C(q, { surface: { input } });
  return q.current?.sequence;
}

const M = Mind.one(1, 1);
const mats = [wood, glass, metal, wood, glass, metal];
const traits = [burnable, brittle, durable, burnable, brittle, durable];

// School language independently from the held-out target. Material and trait
// values recur across multiple entities so entity identity cannot stand in for a role.
for (let round = 0; round < 3; round++) {
  for (let i = 0; i < training.length; i++) {
    const e = training[i], material = mats[i], trait = traits[i];
    teach(M, `${e} is made of ${material}.`, 'noted.', [[e, MATERIAL, material]]);
    teach(M, `${e} consists of ${material}.`, 'noted.', [[e, MATERIAL, material]]);
    teach(M, `${material} is the material of ${e}.`, 'noted.', [[e, MATERIAL, material]]);
    teach(M, `what is ${e} made of?`, `it is made of ${material}.`, [[e, MATERIAL, material]]);
    teach(M, `${e} has trait ${trait}.`, 'noted.', [[e, TRAIT, trait]]);
    teach(M, `what trait does ${e} have?`, `its trait is ${trait}.`, [[e, TRAIT, trait]]);
  }
}

// General knowledge exists before the target is encountered. The held-out entity
// is never present in these rules. Reading supplies the missing premise later.
Mind.C(M, { relations: { rules: [
  { id: word('rule_wood'), premises: [[V('x'), MATERIAL, wood]], conclusion: [V('x'), TRAIT, burnable], categorical: true },
  { id: word('rule_glass'), premises: [[V('x'), MATERIAL, glass]], conclusion: [V('x'), TRAIT, brittle], categorical: true },
] } });

assert(!has(M, target, MATERIAL, wood));
assert(!has(M, target, TRAIT, burnable));

// The target premise is learned only from raw prose, with no target semantic triple.
for (const sentence of [
  `${target} consists of ${wood}.`,
  `${wood} is the material of ${target}.`,
  `${target} is made of ${wood}.`,
]) Mind.C(M, { surface: { input: sentence, output: 'noted.' } });

assert(has(M, target, MATERIAL, wood), 'raw prose did not supply the held-out premise');
assert(has(M, target, TRAIT, burnable), 'existing general rule did not derive new knowledge from the prose-learned premise');
const derived = ask(M, `what trait does ${target} have?`);
assert(derived?.expression?.includes(burnable), 'mind could not express the fact derived from what it read');
assert.strictEqual(derived?.canonical_grounding?.authority, 'canonical_M');

// New reading changes the premise. Canonical closure must withdraw the obsolete
// derived conclusion and produce the newly warranted one without target-specific code.
for (const sentence of [
  `${target} consists of ${glass}.`,
  `${glass} is the material of ${target}.`,
  `${target} is made of ${glass}.`,
]) Mind.C(M, { surface: { input: sentence, output: 'noted.' } });

assert(!has(M, target, MATERIAL, wood), 'old prose-learned premise stayed current after correction');
assert(has(M, target, MATERIAL, glass), 'corrected prose premise did not become current');
assert(!has(M, target, TRAIT, burnable), 'derived conclusion survived after its premise was defeated');
assert(has(M, target, TRAIT, brittle), 'new conclusion was not derived from corrected reading');
const corrected = ask(M, `what trait does ${target} have?`);
assert(corrected?.expression?.includes(brittle), 'mind could not express corrected derived knowledge');
assert.strictEqual(corrected?.canonical_grounding?.authority, 'canonical_M');

console.log(JSON.stringify({
  seed: '0x42b00c5',
  target_generated_at_runtime: target,
  target_semantic_triples_supplied: 0,
  raw_prose_supplied_new_premise: true,
  unstated_conclusion_derived_from_prior_general_knowledge: true,
  novel_query_answered_from_derived_canonical_M_fact: true,
  corrected_reading_changed_derived_conclusion: true,
  one_persistent_M: M.whole === 1,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('PROSE TO REASONING CERTIFICATION: PASS');
