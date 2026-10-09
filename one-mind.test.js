'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C','one']);
for (const name of ['chooseAction','plan','policy','reward','value']) assert.strictEqual(Mind[name], undefined);

const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');
assert.ok(!source.includes("require('./one-rule.js')"), 'active mind must not delegate cognition to one-rule.js');
assert.ok(!source.includes("require('./recursive-recompression.js')"), 'active mind must not delegate cognition to recursive-recompression.js');
assert.ok(!source.includes("require('./sequence-recompression.js')"), 'active mind must not delegate cognition to sequence-recompression.js');
for (const forbidden of [
  'sceneSignature', 'pressureBand', 'runwayBand', 'signedEffect',
  'open_relief', 'open_worse', 'open_mixed', 'purposive_completion',
  'findReliefPlan', 'prospectAction', 'leastGrounded(', 'dominates(',
  'action_counts', 'HORIZON',
]) assert.ok(!source.includes(forbidden), `forbidden authored scaffold returned: ${forbidden}`);

const m = Mind.one(4, 2);
let frame = [0, 0, 255, 32, 24];
Mind.C(m, frame);

function advance(preferred) {
  const action = m.motor;
  let p0 = frame.at(-2) + 2;
  let p1 = frame.at(-1) + 1;
  if (action === preferred) { p0 -= 11; p1 -= 7; }
  else { p0 += 2; p1 += 2; }
  p0 = Math.max(1, Math.min(220, p0));
  p1 = Math.max(1, Math.min(220, p1));
  const t = m.experiences.length;
  frame = [t % 5, (t * 7) % 11, 255, p0, p1];
  Mind.C(m, frame);
  return action;
}

const firstLate = [];
for (let i = 0; i < 44; i++) {
  const action = advance(2);
  if (i >= 28) firstLate.push(action);
}

assert.strictEqual(m.whole, 1);
assert.ok(m.structure.patterns.length > 0, 'no reusable relations formed');
assert.ok(m.structure.order_rules.length > 0, 'no reusable succession formed');
assert.ok(m.structure.samples.some(sample => sample.values.relation_kind === 'ordered'), 'successive structure never became a reusable present relation');
assert.ok(firstLate.includes(2), 'experienced concern-closing action never became available after learning');

// Reverse actuality without announcing the change. The old continuation must lose
// authority through counterevidence and a newly grounded relation must be usable.
const secondLate = [];
for (let i = 0; i < 48; i++) {
  const action = advance(1);
  if (i >= 32) secondLate.push(action);
}
assert.ok(secondLate.includes(1), 'mind failed to reorganize after reality reversed');

// Once the concern relation is actually closed, historical usefulness does not
// remain a compulsory goal or policy.
const zeroMotors = new Set();
for (let i = 0; i < 10; i++) {
  frame = [i % 3, (i * 2) % 5, 255, 0, 0];
  Mind.C(m, frame);
  zeroMotors.add(m.motor);
}
assert.ok(zeroMotors.size > 1, 'closed concerns incorrectly preserved a fixed purposive motor');

assert.strictEqual(m.contacts.length, m.experiences.length + 1);
assert.ok(m.experiences.every(x => Array.isArray(x.before) && Array.isArray(x.after) && Number.isInteger(x.action)));
assert.ok(m.structure.fixed_point_passes >= 1);

console.log('42ndMind one self-contained developmental authority: PASS');
console.log(JSON.stringify({
  experiences: m.experiences.length,
  patterns: m.structure.patterns.length,
  symbols: m.structure.symbols.length,
  order_rules: m.structure.order_rules.length,
  order_max_depth: m.structure.order_rules.reduce((n, r) => Math.max(n, r.depth), 0),
  corrected_action_seen: secondLate.includes(1),
  zero_motor_variants: zeroMotors.size,
}));
