'use strict';

// Open embodiment run. The world has rich hidden semantics, but the developing
// representation receives only primitive channel/value contacts plus primitive
// motor-command contacts. Actions are motor-babbled here deliberately: this run
// asks whether the current one-law learner grows action/consequence structure
// before we claim endogenous agency.

const assert = require('assert');
const World = require('./micro-world.js');
const Mind = require('./sequence-recompression.js');

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const random = rng(420045);
const world = World.create(420046);
let mind = Mind.one();
const rawEvents = [];
const ACTION_BASE = 8192;
const SENSOR_STRIDE = 256;
const checkpoints = new Set([100, 200, 350, 500, 650]);
const observations = [];
let deaths = 0;
let interactions = 0;
let signals = 0;
let moves = 0;

function frameEvents(frame) {
  return frame.map((value, channel) => channel * SENSOR_STRIDE + value);
}
function appendFrame(frame) { rawEvents.push(...frameEvents(frame)); }
function appendAction(action) { rawEvents.push(ACTION_BASE + action); }
function isActionToken(x) { return Number.isInteger(x) && x >= ACTION_BASE && x < ACTION_BASE + World.ACTIONS; }
function hasSensorToken(expansion) { return expansion.some(x => Number.isInteger(x) && x >= 0 && x < ACTION_BASE); }

appendFrame(World.sense(world));

for (let step = 1; step <= 650; step++) {
  // Pure primitive motor babble. Bias only ensures every motor is exercised
  // often enough to produce experience; it does not encode good/bad actions.
  const action = Math.floor(random() * World.ACTIONS);
  if (action === 3) moves++;
  if (action === 4) interactions++;
  if (action === 5 || action === 6) signals++;
  appendAction(action);
  const next = World.act(world, action);
  appendFrame(next);

  if (!world.agent.alive) {
    deaths++;
    World.revive(world);
    appendFrame(World.sense(world));
  }

  if (checkpoints.has(step)) {
    mind = Mind.recompress(Mind.one(), rawEvents, { maxRules: 96 });
    assert.strictEqual(mind.whole, 1);
    assert.deepStrictEqual(Mind.decode(mind), rawEvents);
    const learned = Mind.learnedExpansions(mind);
    const cross = learned.filter(x => x.expansion.some(isActionToken) && hasSensorToken(x.expansion));
    const actionKinds = new Set();
    for (const x of cross) for (const token of x.expansion) if (isActionToken(token)) actionKinds.add(token - ACTION_BASE);
    observations.push({
      steps: step,
      events: rawEvents.length,
      ratio: Number((mind.description_length / rawEvents.length).toFixed(4)),
      rules: mind.rules.length,
      max_depth: learned.reduce((m,x)=>Math.max(m,x.depth),0),
      action_consequence_structures: cross.length,
      primitive_actions_represented: actionKinds.size,
      max_cross_span: cross.reduce((m,x)=>Math.max(m,x.expansion.length),0),
      deaths,
    });
  }
}

const learned = Mind.learnedExpansions(mind);
const cross = learned
  .filter(x => x.expansion.some(isActionToken) && hasSensorToken(x.expansion))
  .sort((a,b) => b.expansion.length - a.expansion.length || b.depth - a.depth)
  .slice(0, 12)
  .map(x => ({ symbol:x.symbol, depth:x.depth, span:x.expansion.length, born_occurrences:x.occurrences_at_birth }));

console.log('42ndMind complete micro-world open run: COMPLETE');
console.log('mind input: primitive channel/value contacts + primitive motor contacts only');
console.log('world contains: space, objects/resources, body needs, injury, shelter, obstacle/gate/key, day/night, weather, another agent, signals, changing consequences');
console.log('action source: motor babble (not yet endogenous agency)');
console.log('CHECKPOINTS ' + JSON.stringify(observations));
console.log('TOP_ACTION_CONSEQUENCE_STRUCTURES ' + JSON.stringify(cross));
console.log('FINAL steps=650 events=' + rawEvents.length + ' deaths=' + deaths + ' moves=' + moves + ' interactions=' + interactions + ' signals=' + signals);
console.log('exact-reconstruction=true whole=' + mind.whole);
