'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// A microphone-like raw stream is one changing numerical receptor through time.
// This test supplies no audio label, spectrum, phoneme, feature extractor, or
// second channel. C must discover temporal self-relations in the same generic M.

const CONCERN = 19;
const FIRST = [0.17, -0.83, 0.41, 0.96];       // exact recurrence at lag 4
const SECOND = [0.21, -0.74, 0.93];            // exact recurrence at lag 3
const BLOCK = 96;                               // > 64-sample evidence window

function frame(value) { return [value, CONCERN]; }
function currentDeps(M) {
  return (M.knowledge?.current?.facts || []).filter(f =>
    f.subject === 'receptor:p0' && f.relation === 'ρ:continuous_dependence' &&
    f.object && f.object.target === 'receptor:p0');
}
function hasLag(M, lag) {
  return currentDeps(M).some(f => f.object.lag === lag && f.object.orientation === 'same');
}

const M = Mind.one(1, 1);
for (let t = 0; t < BLOCK; t++) Mind.C(M, { frame: frame(FIRST[t % FIRST.length]) });

assert.strictEqual(M.whole, 1);
assert.strictEqual(Object.keys(Mind).sort().join(','), 'C,one');
assert.strictEqual(M.contacts.length, BLOCK);
assert(hasLag(M, 4), 'single raw receptor did not discover its lag-4 recurrence');
assert(M.knowledge.facts.some(f => f.subject === 'continuous-relation:0:0:4:same' && f.relation === 'ρ:kind' && f.object === 'relation_term'),
  'single-channel temporal relation was not first-class M content');

const oldContact = M.contacts.slice(0, BLOCK).map(x => x.slice());
for (let t = 0; t < BLOCK; t++) Mind.C(M, { frame: frame(SECOND[t % SECOND.length]) });

assert(!hasLag(M, 4), 'old lag-4 waveform relation remained current after reality changed');
assert(hasLag(M, 3), 'new lag-3 recurrence was not discovered after waveform change');
assert(M.knowledge.facts.some(f => f.subject === 'continuous-relation:0:0:3:same' && f.relation === 'ρ:kind' && f.object === 'relation_term'),
  'corrected single-channel temporal relation was not first-class M content');
assert(M.knowledge.facts.some(f => f.subject === 'continuous-relation:0:0:4:same' && f.relation === 'ρ:kind'),
  'historical lag-4 relation identity was erased rather than corrected');

for (let i = 0; i < BLOCK; i++) assert.deepStrictEqual(M.contacts[i], oldContact[i], 'old waveform contact was mutated');
assert.strictEqual(M.contacts.length, BLOCK * 2);
for (const forbidden of ['audio_state', 'waveform_state', 'spectrum_state', 'temporal_mind', 'memory_state'])
  assert.strictEqual(M[forbidden], undefined, `modality-specific cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  one_raw_numeric_receptor: true,
  first_self_lag: 4,
  corrected_self_lag: 3,
  exact_waveform_history_retained: true,
  relations_first_class_in_M: true,
  audio_specific_cognitive_authority: false,
}, null, 2));
console.log('SINGLE-CHANNEL RAW WAVEFORM RELATION DISCOVERY: PASS');
