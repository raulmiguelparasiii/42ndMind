'use strict';
const assert = require('assert');
const Mind = require('./one-mind.js');

// The evaluator knows a hidden physical law. M does not.
let W = { situation: 0, viability: 0.55 };
const hidden = [1, 0];
function sense() { return { sense: [W.situation], viability: W.viability }; }
function act(a) {
  W.viability = Math.max(0, Math.min(0.9, W.viability - 0.04 + (a === hidden[W.situation] ? 0.12 : -0.03)));
  W.situation = 1 - W.situation;
}

const M = Mind.one(2);
assert.strictEqual(M.whole, 1);
assert.strictEqual(M.nodes.length, 1);
assert.strictEqual(M.nodes[0].depth, 0);

const growth = [{ step: 0, nodes: 1, depth: 0 }];
for (let step = 1; step <= 96 && M.alive; step++) {
  Mind.C(M, sense());
  if (M.action !== null) act(M.action);
  const depth = Math.max(...M.nodes.map(n => n.depth));
  const last = growth[growth.length - 1];
  if (M.nodes.length !== last.nodes || depth !== last.depth) growth.push({ step, nodes: M.nodes.length, depth });
  if (depth >= 3) break;
}

const depth = Math.max(...M.nodes.map(n => n.depth));
assert(M.nodes.length > 1, 'M remained one node');
assert(M.nodes.some(n => n.parts.length === 2), 'M stored contact but constructed no reusable structure');
assert(depth >= 3, 'M never used its own constructed structure to construct higher structure');

console.log(JSON.stringify({ pass: true, whole: M.whole, birth_nodes: 1, nodes_now: M.nodes.length, depth_now: depth, growth }, null, 2));
