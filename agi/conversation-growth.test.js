'use strict';

const assert = require('assert');
const Mind = require('./one-live-blueprint.js');

const M = Mind.one(1, 1);
// Deliberately crossed attributes: repeated colors occur with different shapes
// and repeated shapes occur with different colors. This gives reality enough
// variation to identify the relational role instead of making every attribute a
// one-to-one alias of the entity.
const world = [
  ['alpha',   101, 'red',   201, 'round',    301],
  ['beta',    102, 'red',   201, 'square',   302],
  ['gamma',   103, 'blue',  202, 'round',    301],
  ['delta',   104, 'blue',  202, 'square',   302],
  ['epsilon', 105, 'green', 203, 'triangle', 303],
  ['zeta',    106, 'green', 203, 'round',    301],
];

function live(input, output, channels) {
  Mind.C(M, { surface: { input, output, channels } });
}

for (let r = 0; r < 4; r++) {
  for (const [name, entity, color, colorV, shape, shapeV] of world) {
    live(`${name} has color ${color}.`, `${name} is ${color}.`, [entity, colorV, shapeV]);
    live(`${name} has shape ${shape}.`, `${name} is ${shape}.`, [entity, colorV, shapeV]);
  }
}

// Question/answer forms are taught only on beta..zeta. Alpha's question pairs
// are never experienced.
for (let r = 0; r < 4; r++) {
  for (const [name, entity, color, colorV, shape, shapeV] of world.slice(1)) {
    live(`what color is ${name}?`, `it is ${color}.`, [entity, colorV, shapeV]);
    live(`what shape is ${name}?`, `it is ${shape}.`, [entity, colorV, shapeV]);
  }
}

function ask(text) {
  const q = structuredClone(M);
  Mind.C(q, { surface: { input: text } });
  return q.current.sequence;
}

const color = ask('what color is alpha?');
const shape = ask('what shape is alpha?');
assert.strictEqual(color.expression, 'it is red.', `relation-role confusion on color: ${color.expression}`);
assert.strictEqual(shape.expression, 'it is round.', `relation-role confusion on shape: ${shape.expression}`);
assert(color.output_roles?.some(x => x.position === 2 && x.channel === 1), 'color relation role was not structurally identified');
assert(shape.output_roles?.some(x => x.position === 2 && x.channel === 2), 'shape relation role was not structurally identified');

// Reality changes. Historical red contact must remain, while the current color
// relation moves to teal after repeated independent new contact.
for (let r = 0; r < 4; r++) {
  live('alpha has color teal.', 'alpha is teal.', [101, 211, 301]);
}
const corrected = ask('what color is alpha?');
assert.strictEqual(corrected.expression, 'it is teal.', `current relation did not correct through retained history: ${corrected.expression}`);
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_raw' && f.object === 'alpha has color red.'), 'old exact contact was erased');
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_raw' && f.object === 'alpha has color teal.'), 'new exact contact was not retained');

// A later individual is learned in the SAME life, then tested with unseen order.
for (let r = 0; r < 3; r++) {
  live('eta has color silver.', 'eta is silver.', [107, 212, 307]);
  live('eta has shape crescent.', 'eta is crescent.', [107, 212, 307]);
  live('what color is eta?', 'it is silver.', [107, 212, 307]);
  live('what shape is eta?', 'it is crescent.', [107, 212, 307]);
}
const eta = ask('eta is what shape?');
assert.strictEqual(eta.expression, 'it is crescent.');

console.log(JSON.stringify({
  one_continuing_M: M.whole === 1,
  two_relational_roles_disambiguated: true,
  heldout_alpha_color: color.expression,
  heldout_alpha_shape: shape.expression,
  correction_without_reset: corrected.expression,
  historical_contact_preserved: true,
  later_individual_learned_in_same_life: eta.expression,
  response_table: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('CONVERSATION GROWTH FALSIFICATION: PASS');
