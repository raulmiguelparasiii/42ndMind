'use strict';

const assert = require('assert');
const fs = require('fs');
const Mind = require('./agi/mind.js');

// Held-out-style randomized certification. Runtime-generated symbols ensure that
// no target entity, value, or relation can be embedded in cognition. The English
// constructions are learned during each life; target prose then arrives with no
// semantic channels or triples.

let seed = 0x42a71c9d;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed >>> 0;
}
function name(prefix) { return `${prefix}_${rnd().toString(36)}_${rnd().toString(36)}`; }
function currentHas(M, s, r, o) {
  return (M.knowledge?.current?.facts || []).some(f => f.subject === s && f.relation === r && f.object === o);
}
function teach(M, input, output, facts) {
  Mind.C(M, { surface: { input, output }, relations: { facts } });
}
function ask(M, input) {
  const q = structuredClone(M);
  Mind.C(q, { surface: { input } });
  return q.current?.sequence;
}

const runtimeSource = [
  fs.readFileSync('./agi/mind.js', 'utf8'),
  fs.readFileSync('./agi/mind-relational.js', 'utf8'),
  fs.readFileSync('./agi/ordered-surface-contact.js', 'utf8'),
  fs.readFileSync('./agi/raw-proposal-expression-grounding.js', 'utf8'),
].join('\n');

const results = [];
for (let trial = 0; trial < 2; trial++) {
  const M = Mind.one(1, 1);
  const R1 = name('relation_origin');
  const R2 = name('relation_material');
  const R3 = name('relation_use');
  const entities = Array.from({ length: 6 }, () => name('entity_train'));
  const origins = Array.from({ length: 3 }, () => name('origin'));
  const materials = Array.from({ length: 3 }, () => name('material'));
  const uses = Array.from({ length: 3 }, () => name('use'));
  const target = name('entity_target');
  const targetOrigin = name('origin_target');
  const targetMaterial = name('material_target');
  const targetUse = name('use_target');
  const correctedMaterial = name('material_corrected');

  for (const secret of [R1, R2, R3, target, targetOrigin, targetMaterial, targetUse, correctedMaterial])
    assert(!runtimeSource.includes(secret), `runtime unexpectedly contains generated held-out symbol ${secret}`);

  // Cross roles so no one attribute aliases another. School several paraphrases
  // and query/output forms in this individual's own experience.
  const ai = [0, 0, 1, 1, 2, 2];
  const bi = [0, 1, 0, 2, 1, 2];
  const ci = [0, 1, 1, 2, 2, 0];
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i], a = origins[ai[i]], b = materials[bi[i]], c = uses[ci[i]];
      teach(M, `${e} comes from ${a}.`, 'noted.', [[e, R1, a]]);
      teach(M, `${e} originates in ${a}.`, 'noted.', [[e, R1, a]]);
      teach(M, `${a} is where ${e} comes from.`, 'noted.', [[e, R1, a]]);
      teach(M, `${e} is made of ${b}.`, 'noted.', [[e, R2, b]]);
      teach(M, `${e} consists of ${b}.`, 'noted.', [[e, R2, b]]);
      teach(M, `${b} is the material of ${e}.`, 'noted.', [[e, R2, b]]);
      teach(M, `${e} is used for ${c}.`, 'noted.', [[e, R3, c]]);
      teach(M, `people use ${e} for ${c}.`, 'noted.', [[e, R3, c]]);
      teach(M, `${c} is what ${e} is used for.`, 'noted.', [[e, R3, c]]);
      teach(M, `where does ${e} come from?`, `it comes from ${a}.`, [[e, R1, a]]);
      teach(M, `what is ${e} made of?`, `it is made of ${b}.`, [[e, R2, b]]);
      teach(M, `what is ${e} used for?`, `it is used for ${c}.`, [[e, R3, c]]);
      teach(M, `tell me what you know about ${e}.`,
        `${e} comes from ${a}. it is made of ${b}, and it is used for ${c}.`,
        [[e, R1, a], [e, R2, b], [e, R3, c]]);
    }
  }

  assert(!currentHas(M, target, R1, targetOrigin));
  assert(!currentHas(M, target, R2, targetMaterial));
  assert(!currentHas(M, target, R3, targetUse));

  // Interleave irrelevant prose sentences so success cannot depend on three
  // adjacent target assertions being treated as one memorized frame.
  const distractors = Array.from({ length: 5 }, (_, i) => `${name('noise_entity')} carries ${name(`noise_${i}`)}.`);
  const passages = [
    `${target} originates in ${targetOrigin}. ${distractors[0]} ${target} consists of ${targetMaterial}. ${distractors[1]} people use ${target} for ${targetUse}.`,
    `${distractors[2]} ${targetOrigin} is where ${target} comes from. ${targetMaterial} is the material of ${target}. ${distractors[3]} ${targetUse} is what ${target} is used for.`,
    `${target} comes from ${targetOrigin}. ${distractors[4]} ${target} is made of ${targetMaterial}. ${target} is used for ${targetUse}.`,
  ];

  Mind.C(M, { surface: { input: passages[0], output: 'noted.' } });
  assert(!currentHas(M, target, R1, targetOrigin) && !currentHas(M, target, R2, targetMaterial) && !currentHas(M, target, R3, targetUse),
    'single held-out passage self-warranted');
  Mind.C(M, { surface: { input: passages[1], output: 'noted.' } });
  Mind.C(M, { surface: { input: passages[2], output: 'noted.' } });

  assert(currentHas(M, target, R1, targetOrigin), 'generated origin failed to enter M');
  assert(currentHas(M, target, R2, targetMaterial), 'generated material failed to enter M');
  assert(currentHas(M, target, R3, targetUse), 'generated use failed to enter M');

  const a = ask(M, `where does ${target} come from?`);
  const b = ask(M, `what is ${target} made of?`);
  const c = ask(M, `what is ${target} used for?`);
  assert(a?.expression?.includes(targetOrigin) && a.canonical_grounding?.authority === 'canonical_M');
  assert(b?.expression?.includes(targetMaterial) && b.canonical_grounding?.authority === 'canonical_M');
  assert(c?.expression?.includes(targetUse) && c.canonical_grounding?.authority === 'canonical_M');

  const broad = ask(M, `tell me what you know about ${target}.`);
  assert(broad?.expression?.includes(targetOrigin));
  assert(broad?.expression?.includes(targetMaterial));
  assert(broad?.expression?.includes(targetUse));
  assert.strictEqual(broad?.canonical_grounding?.authority, 'canonical_M');

  for (const sentence of [
    `${target} consists of ${correctedMaterial}.`,
    `${correctedMaterial} is the material of ${target}.`,
    `${target} is made of ${correctedMaterial}.`,
  ]) Mind.C(M, { surface: { input: sentence, output: 'noted.' } });
  assert(!currentHas(M, target, R2, targetMaterial));
  assert(currentHas(M, target, R2, correctedMaterial));
  assert(currentHas(M, target, R1, targetOrigin));
  assert(currentHas(M, target, R3, targetUse));

  for (const forbidden of ['book_state', 'prose_state', 'language_state', 'semantic_dictionary', 'response_table', 'truth_ledger', 'planner'])
    assert.strictEqual(M[forbidden], undefined);

  results.push({
    trial,
    generated_target: target,
    learned_three_relations: true,
    heldout_target_triples_supplied: 0,
    distractor_sentences: distractors.length,
    novel_queries_grounded_in_canonical_M: true,
    broad_discourse_grounded_in_canonical_M: true,
    selective_correction: true,
    one_M: M.whole === 1,
  });
}

console.log(JSON.stringify({ seed: '0x42a71c9d', trials: results, unrestricted_AGI_demonstrated: false }, null, 2));
console.log('RANDOMIZED RAW PROSE CERTIFICATION: PASS');
