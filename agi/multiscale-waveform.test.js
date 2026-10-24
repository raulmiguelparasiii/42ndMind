'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Temporal-scale falsification. One raw receptor repeats an exact 13-sample shape.
// No audio label, feature extractor, frequency transform, or second channel is
// supplied. Lags 1..4 are deliberately not close to the recurrence threshold, so
// a pass requires generic temporal search beyond the old hard lag-4 horizon.

const CONCERN = 23;
const CYCLE = [0.73, -0.21, 0.94, -0.67, 0.08, 0.51, -0.88, 0.36, -0.14, 0.82, -0.49, 0.19, -0.96];
const PERIOD = CYCLE.length;
const TOTAL = 96;

const M = Mind.one(1, 1);
for (let t = 0; t < TOTAL; t++) Mind.C(M, { frame: [CYCLE[t % PERIOD], CONCERN] });

assert.strictEqual(M.whole, 1);
assert.strictEqual(Object.keys(Mind).sort().join(','), 'C,one');
assert.strictEqual(M.contacts.length, TOTAL);

const deps = (M.knowledge?.current?.facts || []).filter(f =>
  f.subject === 'receptor:p0' && f.relation === 'ρ:continuous_dependence' &&
  f.object && f.object.target === 'receptor:p0');
assert(deps.some(f => f.object.lag === PERIOD && f.object.orientation === 'same'),
  'raw period-13 recurrence was not discovered beyond the old lag-4 horizon');
assert(!deps.some(f => f.object.lag > 0 && f.object.lag < PERIOD),
  'shorter non-equivalent lag displaced the exact recurrence');
assert(M.knowledge.facts.some(f =>
  f.subject === `continuous-relation:0:0:${PERIOD}:same` &&
  f.relation === 'ρ:kind' && f.object === 'relation_term'),
  'period-13 self-relation did not become first-class M content');

for (let t = 0; t < TOTAL; t++) assert.strictEqual(M.contacts[t][0], CYCLE[t % PERIOD], 'raw waveform history changed');
for (const forbidden of ['audio_state', 'fft_state', 'frequency_state', 'waveform_state', 'temporal_mind'])
  assert.strictEqual(M[forbidden], undefined, `modality-specific cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  raw_single_channel: true,
  discovered_recurrence_lag: PERIOD,
  exact_contact_retained: true,
  relation_first_class_in_M: true,
  modality_specific_transform: false,
}, null, 2));
console.log('MULTISCALE RAW WAVEFORM RECURRENCE: PASS');
