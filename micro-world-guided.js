'use strict';

// Endogenous-agency validation with intentionally innate Stone + OneLogic priors.
// The world still supplies no semantic labels to the agent. The final primitive
// sensor channel is embodied friction. Action choice comes from the agent's own
// accumulated action/consequence experience through innate-priors.js.

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
function mean(xs) { return xs.reduce((a,b)=>a+b,0) / Math.max(1,xs.length); }

function runGuided(seed, steps = 1800) {
  const world = World.create(seed);
  const mind = Prior.one(World.ACTIONS);
  let frame = World.sense(world);
  let deaths = 0, frictionSum = 0, lateFrictionSum = 0, lateCount = 0;
  let maxFriction = frame.at(-1), life = 0, longestLife = 0;
  const actionCounts = Array(World.ACTIONS).fill(0);
  const modes = {};
  let pressureDrops = 0, pressureRises = 0;

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
    if (step > steps - 300) { lateFrictionSum += friction; lateCount++; }
  }
  longestLife = Math.max(longestLife, life);

  assert.strictEqual(mind.whole, 1);
  assert.strictEqual(mind.transitions.length, steps);
  assert.strictEqual(actionCounts.reduce((a,b)=>a+b,0), steps);

  return {
    source: 'endogenous_stone_onelogic', seed, steps, deaths,
    longest_life: longestLife,
    avg_friction: Number((frictionSum / steps).toFixed(2)),
    late_avg_friction: Number((lateFrictionSum / Math.max(1, lateCount)).toFixed(2)),
    max_friction: maxFriction,
    pressure_drops: pressureDrops,
    pressure_rises: pressureRises,
    action_counts: actionCounts,
    action_kinds: actionCounts.filter(Boolean).length,
    decision_modes: modes,
  };
}

function runBabble(seed, steps = 1800, actionSeed = seed ^ 0x5a5a5a5a) {
  const world = World.create(seed);
  const random = rng(actionSeed);
  let frame = World.sense(world);
  let deaths = 0, frictionSum = 0, lateFrictionSum = 0, lateCount = 0;
  let maxFriction = frame.at(-1), life = 0, longestLife = 0;
  const actionCounts = Array(World.ACTIONS).fill(0);
  let pressureDrops = 0, pressureRises = 0;

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
    if (step > steps - 300) { lateFrictionSum += friction; lateCount++; }
  }
  longestLife = Math.max(longestLife, life);

  return {
    source: 'motor_babble', seed, steps, deaths,
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

const seeds = [420060, 420061, 420062, 420063, 420064];
const guidedRuns = seeds.map(seed => runGuided(seed));
const babbleRuns = seeds.map(seed => runBabble(seed));
const pairs = seeds.map((seed, i) => ({
  seed,
  deaths_delta: guidedRuns[i].deaths - babbleRuns[i].deaths,
  avg_friction_delta: Number((guidedRuns[i].avg_friction - babbleRuns[i].avg_friction).toFixed(2)),
  late_friction_delta: Number((guidedRuns[i].late_avg_friction - babbleRuns[i].late_avg_friction).toFixed(2)),
  longest_life_delta: guidedRuns[i].longest_life - babbleRuns[i].longest_life,
}));
const aggregate = {
  worlds: seeds.length,
  guided_mean_deaths: Number(mean(guidedRuns.map(x=>x.deaths)).toFixed(2)),
  babble_mean_deaths: Number(mean(babbleRuns.map(x=>x.deaths)).toFixed(2)),
  guided_mean_friction: Number(mean(guidedRuns.map(x=>x.avg_friction)).toFixed(2)),
  babble_mean_friction: Number(mean(babbleRuns.map(x=>x.avg_friction)).toFixed(2)),
  guided_mean_late_friction: Number(mean(guidedRuns.map(x=>x.late_avg_friction)).toFixed(2)),
  babble_mean_late_friction: Number(mean(babbleRuns.map(x=>x.late_avg_friction)).toFixed(2)),
  guided_mean_longest_life: Number(mean(guidedRuns.map(x=>x.longest_life)).toFixed(1)),
  babble_mean_longest_life: Number(mean(babbleRuns.map(x=>x.longest_life)).toFixed(1)),
  guided_better_deaths_worlds: pairs.filter(x=>x.deaths_delta<0).length,
  guided_better_late_friction_worlds: pairs.filter(x=>x.late_friction_delta<0).length,
  guided_better_longest_life_worlds: pairs.filter(x=>x.longest_life_delta>0).length,
};

console.log('42ndMind Stone+OneLogic endogenous agency validation: COMPLETE');
console.log('innate prior: answerability over insulation + OneLogic reality tracking');
console.log('world semantics supplied to mind: none');
console.log('PAIRS ' + JSON.stringify(pairs));
console.log('AGGREGATE ' + JSON.stringify(aggregate));
console.log('EXAMPLE_GUIDED ' + JSON.stringify(guidedRuns[0]));
console.log('whole=1 action_source=endogenous worlds=' + seeds.length);
