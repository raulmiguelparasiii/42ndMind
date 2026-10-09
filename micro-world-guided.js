'use strict';

// First endogenous-agency run with the intentionally innate Stone + OneLogic
// priors. The world still supplies no semantic labels to the agent. The final
// primitive sensor channel is embodied friction. Action choice comes from the
// agent's own accumulated action/consequence experience through innate-priors.js.

const assert = require('assert');
const World = require('./micro-world.js');
const Prior = require('./innate-priors.js');

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function runGuided(seed, steps = 1800) {
  const world = World.create(seed);
  const mind = Prior.one(World.ACTIONS);
  let frame = World.sense(world);
  let deaths = 0;
  let frictionSum = 0;
  let lateFrictionSum = 0;
  let lateCount = 0;
  let maxFriction = frame.at(-1);
  let life = 0;
  let longestLife = 0;
  const actionCounts = Array(World.ACTIONS).fill(0);
  const modes = {};
  let pressureDrops = 0;
  let pressureRises = 0;

  for (let step = 1; step <= steps; step++) {
    const before = frame;
    const decision = Prior.chooseAction(mind, before);
    const action = decision.action;
    assert.ok(Number.isInteger(action) && action >= 0 && action < World.ACTIONS);
    modes[decision.mode] = (modes[decision.mode] || 0) + 1;
    actionCounts[action]++;

    let after = World.act(world, action);
    Prior.observe(mind, before, action, after);

    if (after.at(-1) < before.at(-1)) pressureDrops++;
    if (after.at(-1) > before.at(-1)) pressureRises++;

    life++;
    if (!world.agent.alive) {
      deaths++;
      longestLife = Math.max(longestLife, life);
      life = 0;
      World.revive(world);
      after = World.sense(world);
    }

    frame = after;
    const friction = frame.at(-1);
    frictionSum += friction;
    maxFriction = Math.max(maxFriction, friction);
    if (step > steps - 300) {
      lateFrictionSum += friction;
      lateCount++;
    }
  }
  longestLife = Math.max(longestLife, life);

  assert.strictEqual(mind.whole, 1);
  assert.strictEqual(mind.transitions.length, steps);
  assert.strictEqual(actionCounts.reduce((a,b)=>a+b,0), steps);

  return {
    source: 'endogenous_stone_onelogic',
    steps,
    deaths,
    longest_life: longestLife,
    avg_friction: Number((frictionSum / steps).toFixed(2)),
    late_avg_friction: Number((lateFrictionSum / Math.max(1, lateCount)).toFixed(2)),
    max_friction: maxFriction,
    pressure_drops: pressureDrops,
    pressure_rises: pressureRises,
    action_counts: actionCounts,
    action_kinds: actionCounts.filter(Boolean).length,
    decision_modes: modes,
    prior_decisions: { ...mind.decisions },
  };
}

function runBabble(seed, steps = 1800, actionSeed = seed ^ 0x5a5a5a5a) {
  const world = World.create(seed);
  const random = rng(actionSeed);
  let frame = World.sense(world);
  let deaths = 0;
  let frictionSum = 0;
  let lateFrictionSum = 0;
  let lateCount = 0;
  let maxFriction = frame.at(-1);
  let life = 0;
  let longestLife = 0;
  const actionCounts = Array(World.ACTIONS).fill(0);
  let pressureDrops = 0;
  let pressureRises = 0;

  for (let step = 1; step <= steps; step++) {
    const before = frame;
    const action = Math.floor(random() * World.ACTIONS);
    actionCounts[action]++;
    let after = World.act(world, action);
    if (after.at(-1) < before.at(-1)) pressureDrops++;
    if (after.at(-1) > before.at(-1)) pressureRises++;
    life++;
    if (!world.agent.alive) {
      deaths++;
      longestLife = Math.max(longestLife, life);
      life = 0;
      World.revive(world);
      after = World.sense(world);
    }
    frame = after;
    const friction = frame.at(-1);
    frictionSum += friction;
    maxFriction = Math.max(maxFriction, friction);
    if (step > steps - 300) {
      lateFrictionSum += friction;
      lateCount++;
    }
  }
  longestLife = Math.max(longestLife, life);

  return {
    source: 'motor_babble',
    steps,
    deaths,
    longest_life: longestLife,
    avg_friction: Number((frictionSum / steps).toFixed(2)),
    late_avg_friction: Number((lateFrictionSum / Math.max(1, lateCount)).toFixed(2)),
    max_friction: maxFriction,
    pressure_drops: pressureDrops,
    pressure_rises: pressureRises,
    action_counts: actionCounts,
    action_kinds: actionCounts.filter(Boolean).length,
  };
}

const guided = runGuided(420060);
const babble = runBabble(420060);

console.log('42ndMind Stone+OneLogic endogenous agency run: COMPLETE');
console.log('innate prior: answerability over insulation + OneLogic reality tracking');
console.log('world semantics supplied to mind: none');
console.log('GUIDED ' + JSON.stringify(guided));
console.log('BABBLE ' + JSON.stringify(babble));
console.log('COMPARISON ' + JSON.stringify({
  deaths_delta: guided.deaths - babble.deaths,
  avg_friction_delta: Number((guided.avg_friction - babble.avg_friction).toFixed(2)),
  late_friction_delta: Number((guided.late_avg_friction - babble.late_avg_friction).toFixed(2)),
  longest_life_delta: guided.longest_life - babble.longest_life,
}));
console.log('whole=1 action_source=endogenous');
