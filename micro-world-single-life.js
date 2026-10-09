'use strict';

// Single-individual viability validation for the unified mind.
//
// Each fresh mind gets one continuous life. The protected developmental phase
// prevents irreversible bodily failure without removing pressure, analogous to a
// dependent organism being kept alive while it develops. There is no reset,
// cross-life learning, semantic teaching, reward table, planner, or external
// action selector. The world executes the motor continuation already present in
// M after each application of C.

const assert = require('assert');
const World = require('./micro-world.js');
const Mind = require('./one-mind.js');

function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}

const DEVELOPMENT_STEPS=Math.max(1,Number(process.env.DEVELOPMENT_STEPS||500));
const AUTONOMOUS_STEPS=Math.max(1,Number(process.env.AUTONOMOUS_STEPS||1200));
const TOTAL_STEPS=DEVELOPMENT_STEPS+AUTONOMOUS_STEPS;

function runMind(seed){
  const world=World.create(seed,{developmentalProtectionUntil:DEVELOPMENT_STEPS});
  const mind=Mind.one(World.ACTIONS,World.PRESSURE_CHANNELS);
  let frame=World.sense(world),steps=0,frictionSum=0,maxFriction=World.bodyFriction(world);
  const actions=Array(World.ACTIONS).fill(0);
  Mind.C(mind,frame);

  while(steps<TOTAL_STEPS&&world.agent.alive){
    const action=mind.motor;
    assert.ok(Number.isInteger(action)&&action>=0&&action<World.ACTIONS);
    actions[action]++;
    const after=World.act(world,action);
    Mind.C(mind,after);
    frame=after;steps++;
    const friction=World.bodyFriction(world);frictionSum+=friction;maxFriction=Math.max(maxFriction,friction);
  }

  assert.strictEqual(mind.whole,1);
  assert.strictEqual(mind.experiences.length,steps);
  return{
    seed,steps,
    autonomous_steps_survived:Math.max(0,steps-DEVELOPMENT_STEPS),
    survived:world.agent.alive&&steps===TOTAL_STEPS,
    terminal_friction:World.bodyFriction(world),terminal_pressures:World.bodyPressures(world),
    avg_friction:Number((frictionSum/Math.max(1,steps)).toFixed(2)),max_friction:maxFriction,
    action_kinds:actions.filter(Boolean).length,action_counts:actions,
    experiences:mind.experiences.length,
    learned_patterns:mind.structure.patterns.length,
    learned_symbols:mind.structure.symbols.length,
    ordered_rules:mind.structure.order_rules.length,
    ordered_max_depth:mind.structure.order_rules.reduce((n,r)=>Math.max(n,r.depth||0),0),
    fixed_point_passes:mind.structure.fixed_point_passes||0,
  };
}

function runBabble(seed){
  const world=World.create(seed,{developmentalProtectionUntil:DEVELOPMENT_STEPS});
  const random=rng(seed^0x6a09e667);let steps=0,frictionSum=0,maxFriction=World.bodyFriction(world);
  while(steps<TOTAL_STEPS&&world.agent.alive){
    World.act(world,Math.floor(random()*World.ACTIONS));steps++;
    const friction=World.bodyFriction(world);frictionSum+=friction;maxFriction=Math.max(maxFriction,friction);
  }
  return{
    seed,steps,autonomous_steps_survived:Math.max(0,steps-DEVELOPMENT_STEPS),
    survived:world.agent.alive&&steps===TOTAL_STEPS,
    terminal_friction:World.bodyFriction(world),terminal_pressures:World.bodyPressures(world),
    avg_friction:Number((frictionSum/Math.max(1,steps)).toFixed(2)),max_friction:maxFriction,
  };
}

const defaultSeeds=[420070,420071,420072,420073,420074,420075];
const seeds=process.env.SEEDS
  ? process.env.SEEDS.split(',').map(x=>Number(x.trim())).filter(Number.isFinite)
  : defaultSeeds;
if(!seeds.length) throw new Error('at least one seed required');

const unified=seeds.map(runMind),babble=seeds.map(runBabble);
const summary={
  worlds:seeds.length,development_steps:DEVELOPMENT_STEPS,autonomous_horizon:AUTONOMOUS_STEPS,
  unified_survivors:unified.filter(x=>x.survived).length,babble_survivors:babble.filter(x=>x.survived).length,
  unified_mean_autonomous_life:Number(mean(unified.map(x=>x.autonomous_steps_survived)).toFixed(1)),
  babble_mean_autonomous_life:Number(mean(babble.map(x=>x.autonomous_steps_survived)).toFixed(1)),
  unified_mean_friction:Number(mean(unified.map(x=>x.avg_friction)).toFixed(2)),
  babble_mean_friction:Number(mean(babble.map(x=>x.avg_friction)).toFixed(2)),
};

console.log('42ndMind one-mind single-life run: COMPLETE');
console.log('M(t+1)=C(M(t)⊕R(t+1)); one self-contained C recursively redescribes exact lived contact');
console.log('no planner, reward policy, scene labels, pressure bands, runway bands, success/failure labels, or fixed consequence horizon');
console.log(`developmental protection=${DEVELOPMENT_STEPS} then autonomous survival=${AUTONOMOUS_STEPS}`);
console.log('UNIFIED '+JSON.stringify(unified));
console.log('BABBLE '+JSON.stringify(babble));
console.log('SUMMARY '+JSON.stringify(summary));
console.log('whole=1 lives_are_independent=true');
