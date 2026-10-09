'use strict';

// Open developmental observation over richer primitive contact.
// The learner receives only integer readings 0..255 in succession. Hidden state
// names, source identities, category labels, motifs, change points, and noise
// parameters exist only in this generator and are never passed to the learner.

const assert = require('assert');
const Mind = require('./scalar-recompression.js');

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
const random = rng(420043);
function normalish() {
  // Irwin-Hall approximation, deterministic under the seeded RNG.
  let x = 0;
  for (let i = 0; i < 6; i++) x += random();
  return x - 3;
}
function clamp8(x) { return Math.max(0, Math.min(255, Math.round(x))); }

// Hidden environment only. These indices and centers are not observations.
const phases = [
  { centers: [34, 112, 211], motifs: [[0,1,0,2],[1,2,1],[2,0,1,0]], noise: 4.5 },
  { centers: [39, 128, 205], motifs: [[0,1,0,2],[2,1,2],[1,0,2,0]], noise: 6.0 },
  { centers: [41, 129, 174, 207], motifs: [[0,1,0,3],[2,1,2,3],[3,0,2,0]], noise: 5.5 },
];

function appendPhase(out, target, phase) {
  while (out.length < target) {
    const motif = phase.motifs[Math.floor(random() * phase.motifs.length)];
    for (const hidden of motif) {
      out.push(clamp8(phase.centers[hidden] + normalish() * phase.noise));
      if (out.length >= target) break;
    }
  }
}

const raw = [];
appendPhase(raw, 2200, phases[0]);
appendPhase(raw, 5000, phases[1]);
appendPhase(raw, 9000, phases[2]);

const checkpoints = [400, 800, 1400, 2200, 3000, 4000, 5000, 6200, 7600, 9000];
let mind = Mind.one();
let prior = 0;
const observations = [];

for (const end of checkpoints) {
  mind = Mind.recompress(mind, raw.slice(prior, end), { rawBits: 8, maxBases: 32 });
  prior = end;
  assert.strictEqual(mind.whole, 1);
  assert.deepStrictEqual(Mind.decode(mind), raw.slice(0, end));
  assert.ok(Number.isFinite(mind.description_bits));

  const desc = Mind.describe(mind);
  const reused = desc.filter(x => x.distinct_values > 1);
  const broad = desc.filter(x => x.distinct_values >= 5);
  const represented = desc.reduce((n, x) => n + x.support, 0);
  observations.push({
    contacts: end,
    ratio: Number((mind.description_bits / (end * 8)).toFixed(4)),
    bases: mind.bases.length,
    multi_value_bases: reused.length,
    broad_bases: broad.length,
    represented_fraction: Number((represented / end).toFixed(4)),
    bases_snapshot: mind.bases.slice().sort((a,b)=>a-b),
  });
}

const finalDescriptions = Mind.describe(mind)
  .slice()
  .sort((a,b) => b.support - a.support || b.distinct_values - a.distinct_values)
  .slice(0, 16);

console.log('42ndMind open scalar developmental run: COMPLETE');
console.log('input: raw integer succession only; no categories, identities, motifs, or change labels');
console.log('seed=420043 raw_contacts=' + raw.length);
console.log('environment-change-points=2200,5000 (hidden from learner)');
console.log('CHECKPOINTS ' + JSON.stringify(observations));
console.log('FINAL_REUSABLE_DESCRIPTIONS ' + JSON.stringify(finalDescriptions));
console.log('FINAL whole=' + mind.whole +
  ' raw=' + mind.raw_stream.length +
  ' ratio=' + (mind.description_bits / (mind.raw_stream.length * 8)).toFixed(4) +
  ' bases=' + mind.bases.length);
console.log('exact-reconstruction=true');
