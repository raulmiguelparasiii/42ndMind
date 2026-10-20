'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-live-blueprint.js');

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
const source = fs.readFileSync(path.join(__dirname, 'one-live-blueprint.js'), 'utf8');
for (const forbidden of ['alpha', 'beta', 'red', 'blue', 'what color', 'it is']) {
  assert.ok(!source.toLowerCase().includes(forbidden), `surface fixture leaked into developmental law: ${forbidden}`);
}

const M = Mind.one(1, 1);
const world = [
  ['alpha', 101, 'red', 201],
  ['beta', 102, 'blue', 202],
  ['gamma', 103, 'green', 203],
  ['delta', 104, 'orange', 204],
  ['epsilon', 105, 'purple', 205],
  ['zeta', 106, 'yellow', 206],
];

function teach(input, output, channels) {
  Mind.C(M, { surface: { input, output, channels } });
}

// Ground every name/color through several ordinary sequence contacts.
for (let round = 0; round < 4; round++) {
  for (const [name, entity, color, colorValue] of world) {
    teach(`the color of ${name} is ${color}.`, `${name} is ${color}.`, [entity, colorValue]);
  }
}

// Learn the response relation on five other individuals. The alpha question and
// answer pair is never experienced.
for (let round = 0; round < 5; round++) {
  for (const [name, entity, color, colorValue] of world.slice(1)) {
    teach(`what color is ${name}?`, `it is ${color}.`, [entity, colorValue]);
  }
}

function ask(input) {
  const q = structuredClone(M);
  Mind.C(q, { surface: { input } });
  return q.current.sequence;
}

const ordinary = ask('what color is alpha?');
assert.strictEqual(ordinary.expression, 'it is red.');
assert(ordinary.inferred_channels.some(x => x.index === 0 && x.value === 101));
assert(ordinary.inferred_channels.some(x => x.index === 1 && x.value === 201));

// Same semantic contact, unseen word order. No slot parser or grammar rule is
// supplied; sequence similarity and retained cross-contact relations must recover
// the same completion.
const reordered = ask('alpha is what color?');
assert.strictEqual(reordered.expression, 'it is red.', `position-dependent surface failed: ${reordered.expression}`);

// Another unseen surface arrangement using only already-contacted tokens. This
// remains a structural-generalization gate, not a claim of unrestricted English.
const reordered2 = ask('what is alpha color?');
assert.strictEqual(reordered2.expression, 'it is red.', `second unseen ordering failed: ${reordered2.expression}`);

// Exact raw expressions and ordered token sequences live in canonical M facts;
// the extension has no private surface memory object.
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_raw' && f.object === 'the color of alpha is red.'));
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_tokens' && Array.isArray(f.object)));
for (const forbidden of ['surface_memory', 'language_state', 'parser_state', 'semantic_dictionary', 'response_table']) {
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive state appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  one_M: M.whole === 1,
  one_C_entrypoint: true,
  exact_surface_contact_in_M: true,
  fixed_input_slots_required: false,
  heldout_pair_seen: false,
  ordinary_reply: ordinary.expression,
  unseen_order_reply_1: reordered.expression,
  unseen_order_reply_2: reordered2.expression,
  private_language_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('POSITION-FREE SURFACE FALSIFICATION: PASS');
