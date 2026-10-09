'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C','one']);
assert.strictEqual(Mind.chooseAction, undefined);
assert.strictEqual(Mind.plan, undefined);
assert.strictEqual(Mind.policy, undefined);

// Regression against the authored psychology that was previously mistaken for
// the mind. These concepts must not return under renamed helper functions.
const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');
for (const forbidden of [
  'sceneSignature',
  'pressureBand',
  'runwayBand',
  'signedEffect',
  'open_relief',
  'open_worse',
  'open_mixed',
  'purposive_completion',
  'HORIZON',
]) assert.ok(!source.includes(forbidden), `forbidden embodied scaffold returned: ${forbidden}`);

const m = Mind.one(4, 2);
let frame = [0, 0, 255, 24, 18];
Mind.C(m, frame);
assert.strictEqual(m.whole, 1);
assert.ok(Number.isInteger(m.motor));

const STEPS = 24;
let action2 = 0;
for (let t = 0; t < STEPS; t++) {
  const a = m.motor;
  if (a === 2) action2++;

  // Synthetic reality only. The mind is not told this rule: motor 2 repeatedly
  // produces a different bodily consequence from the other primitive motors.
  let p0 = frame.at(-2) + 2;
  let p1 = frame.at(-1) + 1;
  if (a === 2) { p0 -= 10; p1 -= 5; }
  p0 = Math.max(0, Math.min(255, p0));
  p1 = Math.max(0, Math.min(255, p1));
  frame = [t % 4, (t * 3) % 7, 255, p0, p1];
  Mind.C(m, frame);

  assert.strictEqual(m.whole, 1);
  assert.ok(Number.isInteger(m.motor) && m.motor >= 0 && m.motor < 4);
}

assert.strictEqual(m.experiences.length, STEPS);
assert.strictEqual(m.contacts.length, STEPS + 1);
assert.strictEqual(m.kernel.whole, 1);
assert.strictEqual(m.mode, undefined);
assert.strictEqual(m.outcome_counts, undefined);
assert.strictEqual(m.context_uses, undefined);
assert.ok(m.kernel.learned_patterns.length > 0);
assert.ok(action2 > 0);

console.log('42ndMind scaffold-free embodied relation: PASS');
console.log(`experiences=${m.experiences.length} patterns=${m.kernel.learned_patterns.length} motor=${m.motor}`);
