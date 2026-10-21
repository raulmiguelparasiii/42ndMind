'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');
const Mind = require('./mind.js');

const ROOT = path.resolve(__dirname, '..');
const PINNED = {
  'one-mind.js': '922347a5ed55eeaa1340bcdbe9524825db79642a',
  'agi/one-live-blueprint.js': 'bb8a89b9b604608acc4549bc07698f30209d527e',
  'agi/mind-relational.js': '0cc07dc63b485acc9798b5a65a1b9829e61d6c4f',
  'agi/continuous-relational-contact.js': '2cd8d49d0a91cdb020b185542e8a59f1db362532',
  'agi/mind.js': '4f2087fc2d83c25965339d0c603e71b5c58bc878',
  'agi/surface-template.js': 'c9f2ed689301759f7ad65e53e92088446795eacd',
  'agi/BLUEPRINT.tex': '0087c891493123de7186ce80e78eff503115e7f4',
};
for (const [file, expected] of Object.entries(PINNED)) {
  const actual = execFileSync('git', ['hash-object', file], { cwd: ROOT, encoding: 'utf8' }).trim();
  assert.strictEqual(actual, expected, `frozen cognition changed before certification: ${file}`);
}

// This topology was authored only after the cognition freeze. The frozen AGI sees
// only direct numeric contact, never these construction variables or labels.
let seed = 0xc0711a9e;
function u32() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed >>> 0;
}
function rnd() { return u32() / 0x100000000; }
function int(lo, hi) { return lo + (u32() % (hi - lo + 1)); }
function signedMagnitude(min = 1.25, max = 4.75) {
  const mag = min + rnd() * (max - min);
  return (u32() & 1 ? 1 : -1) * mag;
}
function shuffle(xs) {
  xs = xs.slice();
  for (let i = xs.length - 1; i > 0; i--) {
    const j = u32() % (i + 1); [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

const N = int(28, 42);
const channels = shuffle(Array.from({ length: N }, (_, i) => i));
// For lag-0 dependence the frozen detector stores the lower-index direction.
function orderedPair(a, b) { return a < b ? [a, b] : [b, a]; }
const [S1, T1] = orderedPair(channels[0], channels[1]);
const [S2, T2] = orderedPair(channels[2], channels[3]);
const [S3, T3] = orderedPair(channels[4], channels[5]);
const LAG2 = int(1, 4);
const LAG3 = int(1, 4);
const A1 = signedMagnitude(), A2 = signedMagnitude(), A3 = signedMagnitude();
const B1 = (rnd() * 4 - 2), B2 = (rnd() * 4 - 2), B3 = (rnd() * 4 - 2);
const ORIENT1 = A1 >= 0 ? 'same' : 'opposed';
const ORIENT2 = A2 >= 0 ? 'same' : 'opposed';
const ORIENT3 = A3 >= 0 ? 'same' : 'opposed';
const LATE = N;
const LATE_SOURCE = channels[6];
const ALATE = signedMagnitude(), BLATE = rnd() * 3 - 1.5;
const ORIENT_LATE = ALATE >= 0 ? 'same' : 'opposed';
const CONCERN = 37;
const STABLE = 176;
const REVERSED = 88;
const TOTAL = STABLE + REVERSED;
const LATE_START = int(56, 88);

const latent1 = Array.from({ length: TOTAL }, () => rnd() * 2 - 1 + rnd() * 1e-9);
const latent2 = Array.from({ length: TOTAL }, () => rnd() * 2 - 1 + rnd() * 1e-9);
const latent3 = Array.from({ length: TOTAL }, () => rnd() * 2 - 1 + rnd() * 1e-9);
const noise = Array.from({ length: TOTAL }, () => Array.from({ length: N }, () => rnd() * 2 - 1 + rnd() * 1e-9));

function frame(t, phase) {
  const x = noise[t].slice();
  x[S1] = latent1[t];
  x[S2] = latent2[t];
  x[S3] = latent3[t];

  // One same-time route will be broken later; two unrelated delayed routes persist.
  x[T1] = phase === 'reversed' ? noise[t][T1] * 1.731 + 0.113 : A1 * latent1[t] + B1;
  x[T2] = t >= LAG2 ? A2 * latent2[t - LAG2] + B2 : noise[t][T2];
  x[T3] = t >= LAG3 ? A3 * latent3[t - LAG3] + B3 : noise[t][T3];

  // The receptor does not exist physically until this individual's life is underway.
  if (t >= LATE_START) x.push(ALATE * x[LATE_SOURCE] + BLATE);
  return [...x, CONCERN];
}

function deps(state) {
  return (state.knowledge?.current?.facts || []).filter(f =>
    f.relation === 'ρ:continuous_dependence' && f.object && typeof f.object === 'object');
}
function has(state, source, target, lag, orientation) {
  return deps(state).some(f => f.subject === `receptor:p${source}` &&
    f.object.target === `receptor:p${target}` && f.object.lag === lag && f.object.orientation === orientation);
}

const M = Mind.one(3, 1);
for (let t = 0; t < STABLE; t++) Mind.C(M, { frame: frame(t, 'stable') });

assert.strictEqual(M.whole, 1);
assert.strictEqual(Object.keys(Mind).sort().join(','), 'C,one');
assert(M.knowledge.current.facts.some(f => f.subject === 'self' && f.relation === 'ρ:has_receptor' && f.object && f.object.index === LATE),
  'late receptor failed to become part of the same individual');

const uniqueSource = M.contacts.slice(16, STABLE - 8).map(f => f[S1]);
assert.strictEqual(new Set(uniqueSource).size, uniqueSource.length, 'source values accidentally repeated');
assert(has(M, S1, T1, 0, ORIENT1), 'randomized same-time dependence was not discovered');
assert(has(M, S2, T2, LAG2, ORIENT2), 'first randomized delayed dependence was not discovered');
assert(has(M, S3, T3, LAG3, ORIENT3), 'second randomized delayed dependence was not discovered');

// Same-time late route is canonicalized to the lower-index old receptor -> new receptor.
assert(has(M, LATE_SOURCE, LATE, 0, ORIENT_LATE), 'post-development receptor did not enter the same relation discovery');
const stableSnapshot = structuredClone(M);

for (let t = STABLE; t < TOTAL; t++) Mind.C(M, { frame: frame(t, 'reversed') });

assert(!has(M, S1, T1, 0, ORIENT1), 'broken relation remained current after later reality contradicted it');
assert(has(M, S2, T2, LAG2, ORIENT2), 'unrelated delayed relation 1 was lost');
assert(has(M, S3, T3, LAG3, ORIENT3), 'unrelated delayed relation 2 was lost');
assert(has(M, LATE_SOURCE, LATE, 0, ORIENT_LATE), 'late-receptor relation was lost during unrelated correction');
assert(has(stableSnapshot, S1, T1, 0, ORIENT1), 'pre-correction snapshot did not contain broken route');

// Exact old contact remains pristine beneath the changed current relation set.
const historicalT = 32;
assert.strictEqual(M.contacts[historicalT][T1], A1 * M.contacts[historicalT][S1] + B1);
assert(M.contacts.length >= TOTAL, 'exact continuous history was not retained');
for (const forbidden of ['vision_state', 'audio_state', 'sensor_model', 'memory_state', 'planner', 'truth_ledger'])
  assert.strictEqual(M[forbidden], undefined, `parallel/modality authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  freeze_verified: true,
  frozen_commit: '40cdaeceb32c78c01a1cd324405e7f156c9bf3b7',
  receptor_count_generated_post_freeze: N,
  randomized_same_time_route: { source: S1, target: T1, orientation: ORIENT1 },
  randomized_delayed_routes: [
    { source: S2, target: T2, lag: LAG2, orientation: ORIENT2 },
    { source: S3, target: T3, lag: LAG3, orientation: ORIENT3 },
  ],
  late_receptor: { index: LATE, introduced_at: LATE_START, source: LATE_SOURCE, orientation: ORIENT_LATE },
  exact_values_nonrepeating: true,
  broken_relation_removed_only_after_later_contact: true,
  unrelated_relations_survived: true,
  exact_old_contact_retained: true,
  modality_specific_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('POST-FREEZE RANDOMIZED CONTINUOUS CERTIFICATION: PASS');
