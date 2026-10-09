'use strict';

const assert = require('assert');
const Mind = require('./one-mind.js');

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C','one']);
assert.strictEqual(Mind.chooseAction, undefined);
assert.strictEqual(Mind.plan, undefined);
assert.strictEqual(Mind.policy, undefined);

const m = Mind.one(4, 2);
let frame = [0,0,0,0,255,24,18];
Mind.C(m, frame);
assert.strictEqual(m.whole, 1);
assert.ok(Number.isInteger(m.motor));

for (let t=0; t<80; t++) {
  const a = m.motor;
  // Synthetic reality only: primitive action 2 tends to relieve the largest
  // pressure after repeated contact; no semantic label is supplied to the mind.
  let p0 = frame.at(-2) + 2;
  let p1 = frame.at(-1) + 1;
  if (a === 2) { p0 -= 10; p1 -= 5; }
  frame = [t%4, (t>>1)%4, 0, a*16, 255, Math.max(0,Math.min(255,p0)), Math.max(0,Math.min(255,p1))];
  Mind.C(m, frame);
  assert.strictEqual(m.whole, 1);
  assert.ok(m.motor === null || (Number.isInteger(m.motor) && m.motor >= 0 && m.motor < 4));
}

assert.ok(m.samples_integrated > 0);
assert.strictEqual(m.kernel.whole, 1);
console.log('42ndMind unified one-mind: PASS');
console.log(`samples=${m.samples_integrated} mode=${m.mode} motor=${m.motor}`);
