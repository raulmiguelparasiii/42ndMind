'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

const source = fs.readFileSync(path.join(__dirname, 'mind.js'), 'utf8').toLowerCase();
for (const fixture of ['rel_tone_raw', 'entity_alpha_raw', 'value_crimson_raw']) {
  assert(!source.includes(fixture), `raw-language fixture leaked into cognition: ${fixture}`);
}

const M = Mind.one(1, 1);
const REL = 'rel_tone_raw';
const alpha = 'entity_alpha_raw';
const examples = [
  ['entity_beta_raw', 'value_crimson_raw'],
  ['entity_gamma_raw', 'value_azure_raw'],
  ['entity_delta_raw', 'value_olive_raw'],
  ['entity_epsilon_raw', 'value_crimson_raw'],
];

function paired(input, output, fact) {
  Mind.C(M, { surface: { input, output }, relations: { facts: [fact] } });
}

// Crossed schooling teaches only surface↔generic triple topology. The target
// alpha/tone relation itself is never supplied as structured contact.
for (let round = 0; round < 3; round++) {
  for (const [entity, value] of examples) {
    paired(`${entity} has tone ${value}.`, 'noted.', [entity, REL, value]);
    paired(`what tone is ${entity}?`, `it is ${value}.`, [entity, REL, value]);
  }
  paired(`${alpha} is specimen.`, 'noted.', [alpha, 'rel_kind_raw', 'kind_specimen_raw']);
}

assert(!M.knowledge.facts.some(f => f.subject === alpha && f.relation === REL),
  'target semantic relation leaked into canonical M before raw-language teaching');

// These teaching turns are surface-only. No relations/channels/semantic object
// accompany them. First contact is a proposal; recurrence must provide support.
Mind.C(M, { surface: { input: `${alpha} has tone value_crimson_raw.`, output: 'noted.' } });
assert(!M.knowledge.current.facts.some(f => f.subject === alpha && f.relation === REL && f.object === 'value_crimson_raw'),
  'one raw utterance was incorrectly promoted to current canonical fact');

Mind.C(M, { surface: { input: `${alpha} has tone value_crimson_raw.`, output: 'noted.' } });
Mind.C(M, { surface: { input: `${alpha} has tone value_crimson_raw.`, output: 'noted.' } });

assert(M.knowledge.facts.some(f => f.relation === 'ρ:proposes_relation' &&
  f.object && f.object.subject === alpha && f.object.relation === REL && f.object.object === 'value_crimson_raw'),
  'raw surface contact did not become an M-owned relation proposal');
assert(M.knowledge.current.facts.some(f => f.subject === alpha && f.relation === REL && f.object === 'value_crimson_raw'),
  'recurrent raw-language evidence did not become usable through canonical M');

const probe = structuredClone(M);
Mind.C(probe, { surface: { input: `what tone is ${alpha}?` } });
assert.strictEqual(probe.current.sequence.expression, 'it is value_crimson_raw.');
assert.strictEqual(probe.current.sequence.canonical_grounding.authority, 'canonical_M');
assert.strictEqual(probe.current.sequence.canonical_grounding.object, 'value_crimson_raw');

// Later recurrent raw correction must defeat the old induced route, retain old
// occurrences, and establish the new current relation without reset.
for (let i = 0; i < 3; i++) {
  Mind.C(M, { surface: { input: `${alpha} has tone value_violet_raw.`, output: 'noted.' } });
}
// The novel value first needs ordinary expression grounding elsewhere; that is
// surface realization schooling, not alpha/tone semantic teaching.
for (let i = 0; i < 3; i++) paired('entity_theta_raw has shade value_violet_raw.', 'it is value_violet_raw.', ['entity_theta_raw', 'rel_shade_raw', 'value_violet_raw']);

assert(!M.knowledge.current.facts.some(f => f.subject === alpha && f.relation === REL && f.object === 'value_crimson_raw'),
  'old raw-language route remained current after stable correction');
assert(M.knowledge.current.facts.some(f => f.subject === alpha && f.relation === REL && f.object === 'value_violet_raw'),
  'corrected raw-language relation did not become current');

const corrected = structuredClone(M);
Mind.C(corrected, { surface: { input: `what tone is ${alpha}?` } });
assert.strictEqual(corrected.current.sequence.expression, 'it is value_violet_raw.');
assert.strictEqual(corrected.current.sequence.canonical_grounding.object, 'value_violet_raw');

for (const forbidden of ['language_state', 'semantic_dictionary', 'truth_ledger', 'response_table', 'planner']) {
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  surface_only_semantic_teaching: true,
  first_utterance_only_proposed: true,
  recurrence_supplied_support: true,
  canonical_M_owned_learned_relation: true,
  heldout_query_reply: probe.current.sequence.expression,
  raw_correction_reply: corrected.current.sequence.expression,
  historical_contact_retained: true,
  parallel_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('RAW LANGUAGE ACQUISITION FALSIFICATION: PASS');
