'use strict';
const assert = require('assert');
const Mind = require('./one-mind.js');

const M = Mind.one();
assert.strictEqual(M.whole, 1);
assert.strictEqual(M.field.length, 1);
assert.strictEqual(M.field[0].direction, null);

const growth = [{ contact: 0, cells: 1 }];
let world = 0.173;
let viability = 0.82;
for (let t = 1; t <= 80; t++) {
  world = Math.sin(1.731 * world + 0.113 * t) + 0.37 * Math.cos(0.071 * t);
  const s = [
    Math.sin(world),
    Math.cos(0.7 * world + 0.09 * t),
    Math.tanh(world * world - 0.4),
    Math.sin(0.17 * t + Math.cos(world)),
  ];
  viability = Math.max(0.2, Math.min(0.98,
    viability - 0.004 + 0.003 * Math.cos(t / 5) - 0.001 * Math.abs(M.action)
  ));
  const before = M.field.length;
  Mind.C(M, { sense: s, viability });
  if (M.field.length !== before) growth.push({ contact: t, cells: M.field.length });
}

assert(M.field.length > 1, 'the one-cell mind never differentiated');
assert(M.growth > 0, 'no self-growth was recorded');
assert(M.field.every(c => Array.isArray(c.direction)), 'an undifferentiated cell remained');
assert(M.field.slice(1).every(c => c.born > 0), 'new cells were not born from lived contact');
assert(M.field.slice(1).some(c => c.direction.some(x => Math.abs(x) > 1e-6)), 'new cells carry no reality-derived structure');

console.log(JSON.stringify({
  pass: true,
  whole: M.whole,
  birth_cells: 1,
  cells_now: M.field.length,
  growth_events: M.growth,
  residual_now: M.residual,
  viability: M.viability,
  need: M.need,
  want: M.want,
  action: M.action,
  growth,
}, null, 2));
