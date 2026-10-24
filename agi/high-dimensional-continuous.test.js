'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// This test intentionally uses no audio/video/object semantics. C sees only
// direct numerical receptor contact. The relation names below are generic math.
const blueprint = fs.readFileSync(path.join(__dirname, 'BLUEPRINT.tex'), 'utf8');
assert(blueprint.includes('co-variation'));

const M = Mind.one(2, 1);
const INITIAL_SENSORS = 32;
const NEW_SENSOR = 32;
const SAME_TARGET = 17;
const LAG_TARGET = 23;
const CONCERN = 30;

let seed = 0x5eed1234;
function rnd() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
}

// Pre-generate a nonperiodic continuous latent stream and independent distractors.
const total = 210;
const latent = Array.from({ length: total }, () => (rnd() * 2 - 1) + rnd() * 1e-7);
const distractor = Array.from({ length: total }, () => Array.from({ length: INITIAL_SENSORS }, () => (rnd() * 2 - 1) + rnd() * 1e-7));

function frameAt(t, phase) {
  const sensors = new Array(INITIAL_SENSORS);
  for (let i = 0; i < INITIAL_SENSORS; i++) sensors[i] = distractor[t][i] + i * 0.000001;
  sensors[0] = latent[t];

  // Same-time continuous dependence during the first stable epoch. In the later
  // epoch this one relation is deliberately falsified by independent contact.
  sensors[SAME_TARGET] = phase === 'reversed'
    ? distractor[t][SAME_TARGET] * 1.713 + 0.037
    : 3.25 * latent[t] + 7.125;

  // Stable delayed dependence: p0(t-2) -> p23(t).
  sensors[LAG_TARGET] = t >= 2 ? -1.8 * latent[t - 2] + 0.44 : distractor[t][LAG_TARGET];

  // A receptor that does not physically exist until later in the same life.
  if (t >= 60) sensors.push(-2.4 * latent[t] + 1.75);

  return [...sensors, CONCERN];
}

function dependencies(state) {
  return (state.knowledge?.current?.facts || [])
    .filter(f => f.relation === 'ρ:continuous_dependence' && f.object && typeof f.object === 'object');
}
function hasDep(state, source, target, lag, orientation) {
  return dependencies(state).some(f =>
    f.subject === `receptor:p${source}` &&
    f.object.target === `receptor:p${target}` &&
    f.object.lag === lag &&
    f.object.orientation === orientation);
}

// One uninterrupted life. Exact values are effectively unique, so categorical
// equality matching cannot pass this gate by memorizing recurring numbers.
for (let t = 0; t < 140; t++) Mind.C(M, { frame: frameAt(t, 'stable') });

assert.strictEqual(M.whole, 1);
assert(M.contacts.length >= 140, 'exact numeric contact was not retained');
assert(M.knowledge.current.facts.some(f => f.subject === 'self' && f.relation === 'ρ:has_receptor' && f.object && f.object.index === NEW_SENSOR),
  'later-added receptor did not join the same individual');

// Values on p0 are nonrepeating; discovering these therefore requires variation
// structure rather than exact categorical recurrence.
const p0values = M.contacts.slice(10, 130).map(frame => frame[0]);
assert.strictEqual(new Set(p0values).size, p0values.length, 'continuous source accidentally repeated exact values');

assert(hasDep(M, 0, SAME_TARGET, 0, 'same'),
  'same-time continuous dependence was not discovered from raw numerical variation');
assert(hasDep(M, 0, LAG_TARGET, 2, 'opposed'),
  'two-step delayed continuous dependence was not discovered');
assert(hasDep(M, 0, NEW_SENSOR, 0, 'opposed'),
  'newly attached receptor did not enter continuous relation discovery');

const beforeCorrection = structuredClone(M);

// Reality reverses exactly one previously stable dependency. The same C must
// stop treating it as current while retaining the old life underneath it.
for (let t = 140; t < 210; t++) Mind.C(M, { frame: frameAt(t, 'reversed') });

assert(!hasDep(M, 0, SAME_TARGET, 0, 'same'),
  'defeated continuous dependency remained current after a stable later reversal');
assert(hasDep(M, 0, LAG_TARGET, 2, 'opposed'),
  'unrelated delayed dependency was lost during correction');
assert(hasDep(M, 0, NEW_SENSOR, 0, 'opposed'),
  'unrelated new-receptor dependency was lost during correction');

// Old exact sensor contact and the previously warranted relation remain historical
// evidence even though they no longer govern the current state.
assert.strictEqual(M.contacts[20][SAME_TARGET], 3.25 * M.contacts[20][0] + 7.125);
assert(hasDep(beforeCorrection, 0, SAME_TARGET, 0, 'same'));

for (const forbidden of ['vision_state', 'audio_state', 'sensor_model', 'memory_state', 'planner', 'truth_ledger']) {
  assert.strictEqual(M[forbidden], undefined, `parallel/modality authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  initial_numeric_receptors: INITIAL_SENSORS,
  exact_values_nonrepeating: true,
  same_time_continuous_dependence: true,
  delayed_continuous_dependence: true,
  receptor_added_mid_life: true,
  new_receptor_cross_relation: true,
  later_reality_reversal_recomputed_current_relation: true,
  unrelated_relations_survived: true,
  exact_old_contact_retained: true,
  modality_specific_cognitive_authority: false,
  certification_scope: 'modality-neutral high-dimensional continuous relation formation',
}, null, 2));
console.log('HIGH-DIMENSIONAL CONTINUOUS FALSIFICATION: PASS');
