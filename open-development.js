'use strict';

// Open developmental observation.
//
// The learner receives only a succession of raw binary contacts. It is not told
// about features, objects, categories, time steps, causes, outcomes, motifs, or
// phases. The same exact recompression law used by sequence-recompression.js is
// applied repeatedly as the history grows. This file intentionally asks no
// capability-specific question; it records what structures appear.

const assert = require('assert');
const Mind = require('./sequence-recompression.js');

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const random = rng(420042);

// Hidden environment regularities. These names exist only in the generator and
// are never passed to the learner. Its input is the resulting 0/1 stream.
const A = [0, 1, 1, 0, 1, 0];
const B = [1, 0, 0, 1, 1];
const C = [0, 0, 1, 0, 1, 1, 1];
const D = [1, 1, 0, 0, 1, 0];
const B2 = [1, 0, 1, 1, 0];

function noisy(bits, p) {
  return bits.map(bit => random() < p ? 1 - bit : bit);
}

function appendUntil(out, target, phase) {
  while (out.length < target) {
    let phrase;
    if (phase === 1) {
      const r = random();
      phrase = r < 0.50 ? [...A, ...B, ...A] : r < 0.82 ? [...C, ...A] : [...B, ...C];
      out.push(...noisy(phrase, 0.012));
    } else if (phase === 2) {
      const r = random();
      phrase = r < 0.48 ? [...A, ...B, ...A, ...D] : r < 0.80 ? [...C, ...A, ...B] : [...D, ...C, ...A];
      out.push(...noisy(phrase, 0.018));
    } else {
      const r = random();
      phrase = r < 0.50 ? [...A, ...B2, ...A, ...D] : r < 0.82 ? [...C, ...A, ...B2] : [...D, ...C, ...A];
      out.push(...noisy(phrase, 0.018));
    }
  }
  if (out.length > target) out.length = target;
}

const raw = [];
appendUntil(raw, 1800, 1);
appendUntil(raw, 3900, 2);
appendUntil(raw, 6000, 3);

const checkpoints = [300, 600, 1000, 1400, 1800, 2400, 3000, 3900, 4500, 5200, 6000];
const observations = [];
let mind = Mind.one();
let prior = 0;

for (const end of checkpoints) {
  mind = Mind.recompress(mind, raw.slice(prior, end), { maxRules: 128 });
  prior = end;
  const expansions = Mind.learnedExpansions(mind);
  const maxDepth = expansions.reduce((m, x) => Math.max(m, x.depth), 0);
  const maxSpan = expansions.reduce((m, x) => Math.max(m, x.expansion.length), 0);
  const ratio = mind.description_length / mind.raw_stream.length;

  assert.strictEqual(mind.whole, 1);
  assert.deepStrictEqual(Mind.decode(mind), raw.slice(0, end));
  assert.ok(mind.description_length <= mind.raw_stream.length,
    'recompression must never choose a description longer than raw history');

  observations.push({
    contacts: end,
    description: mind.description_length,
    ratio: Number(ratio.toFixed(4)),
    rules: mind.rules.length,
    max_depth: maxDepth,
    max_grounded_span: maxSpan,
  });
}

const finalExpansions = Mind.learnedExpansions(mind);
const ranked = finalExpansions
  .slice()
  .sort((a, b) =>
    b.expansion.length - a.expansion.length ||
    b.depth - a.depth ||
    b.occurrences_at_birth - a.occurrences_at_birth
  )
  .slice(0, 12)
  .map(x => ({
    symbol: x.symbol,
    depth: x.depth,
    span: x.expansion.length,
    born_occurrences: x.occurrences_at_birth,
    expansion: x.expansion.join(''),
  }));

// Track recurrent grounded structures without assigning them human semantic names.
const frequency = new Map();
for (const x of finalExpansions) {
  const key = x.expansion.join('');
  frequency.set(key, (frequency.get(key) || 0) + 1);
}

console.log('42ndMind open developmental run: COMPLETE');
console.log('input: raw binary succession only; no semantic or temporal labels');
console.log('seed=420042 raw_contacts=' + raw.length);
console.log('environment-change-points=1800,3900 (hidden from learner)');
console.log('CHECKPOINTS ' + JSON.stringify(observations));
console.log('FINAL_TOP_STRUCTURES ' + JSON.stringify(ranked));
console.log('FINAL whole=' + mind.whole +
  ' raw=' + mind.raw_stream.length +
  ' description=' + mind.description_length +
  ' ratio=' + (mind.description_length / mind.raw_stream.length).toFixed(4) +
  ' rules=' + mind.rules.length +
  ' maxDepth=' + observations.at(-1).max_depth +
  ' maxSpan=' + observations.at(-1).max_grounded_span);
console.log('exact-reconstruction=true');
