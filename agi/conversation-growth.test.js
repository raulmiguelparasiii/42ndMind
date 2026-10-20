'use strict';

const assert = require('assert');
const Mind = require('./one-live-blueprint.js');

const M = Mind.one(1, 1);
const world = [
  ['alpha', 101, 'red', 201, 'round', 301],
  ['beta', 102, 'blue', 202, 'square', 302],
  ['gamma', 103, 'green', 203, 'triangle', 303],
  ['delta', 104, 'orange', 204, 'star', 304],
  ['epsilon', 105, 'purple', 205, 'oval', 305],
  ['zeta', 106, 'yellow', 206, 'diamond', 306],
];

function live(input, output, channels) {
  Mind.C(M, { surface: { input, output, channels } });
}

// Same individuals possess two independent relations. All channels are present
// together, so a correct learner must discover which relational role a question
// selects; merely retrieving an entity bundle is insufficient.
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

// Now reality changes. Old contact must remain in M, but the current relation
// should move after repeated independent new contact. No reset and no deletion.
for (let r = 0; r < 4; r++) {
  live('alpha has color teal.', 'alpha is teal.', [101, 211, 301]);
}
const corrected = ask('what color is alpha?');
assert.strictEqual(corrected.expression, 'it is teal.', `current relation did not correct through retained history: ${corrected.expression}`);
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_raw' && f.object === 'alpha has color red.'), 'old exact contact was erased');
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_raw' && f.object === 'alpha has color teal.'), 'new exact contact was not retained');

// Multi-turn persistence: the SAME M takes a new ordinary-language contact and
// later answers from it. No clone/reset during the lived turns.
live('eta has color silver.', 'eta is silver.', [107, 212, 307]);
live('eta has shape crescent.', 'eta is crescent.', [107, 212, 307]);
live('what color is eta?', 'it is silver.', [107, 212, 307]);
live('what shape is eta?', 'it is crescent.', [107, 212, 307]);
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
