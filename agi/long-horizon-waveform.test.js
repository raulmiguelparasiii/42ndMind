'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Long-horizon temporal falsification. One raw numeric receptor repeats an exact
// 71-sample shape. The relation spans farther back than the detector's 64-contact
// recent target-evidence window. A correct generic detector may still use older
// retained source contact while testing the most recent target observations.
// No audio label, transform, feature extractor, or second channel is supplied.

const CONCERN = 17;
const PERIOD = 71;
const TOTAL = 176;
let seed = 0x71c0ffee;
function rnd() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}
const CYCLE = Array.from({ length: PERIOD }, () => rnd() * 2 - 1);

const M = Mind.one(1, 1);
for (let t = 0; t < TOTAL; t++) Mind.C(M, { frame: [CYCLE[t % PERIOD], CONCERN] });

assert.strictEqual(M.whole, 1);
assert.strictEqual(Object.keys(Mind).sort().join(','), 'C,one');
assert.strictEqual(M.contacts.length, TOTAL);

const deps = (M.knowledge?.current?.facts || []).filter(f =>
  f.subject === 'receptor:p0' && f.relation === 'ρ:continuous_dependence' &&
  f.object && f.object.target === 'receptor:p0');
assert(deps.some(f => f.object.lag === PERIOD && f.object.orientation === 'same'),
  'raw period-71 recurrence was not discovered across retained history beyond the recent evidence window');
assert(!deps.some(f => f.object.lag > 0 && f.object.lag < PERIOD),
  'a shorter non-equivalent lag displaced the exact long-horizon recurrence');
assert(M.knowledge.facts.some(f =>
  f.subject === `continuous-relation:0:0:${PERIOD}:same` &&
  f.relation === 'ρ:kind' && f.object === 'relation_term'),
  'period-71 self-relation did not become first-class M content');

for (let t = 0; t < TOTAL; t++) assert.strictEqual(M.contacts[t][0], CYCLE[t % PERIOD], 'raw waveform history changed');
for (const forbidden of ['audio_state', 'fft_state', 'frequency_state', 'waveform_state', 'temporal_mind'])
  assert.strictEqual(M[forbidden], undefined, `modality-specific cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  raw_single_channel: true,
  recent_target_evidence_window: 64,
  discovered_recurrence_lag: PERIOD,
  exact_contact_retained: true,
  relation_first_class_in_M: true,
  modality_specific_transform: false,
}, null, 2));
console.log('LONG-HORIZON RAW WAVEFORM RECURRENCE: PASS');
