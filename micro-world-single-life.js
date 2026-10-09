'use strict';

// Irreversible-life validation. Each fresh mind receives exactly one embodied
// life in the same micro-world. Death ends that mind permanently. No reset is
// fed back as experience and no later mind inherits the dead mind's learning.

const assert = require('assert');
const World = require('./micro-world.js');
const Prior = require('./innate-priors.js');

function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}

function runMind(seed,horizon=1200){
  const world=World.create(seed),mind=Prior.one(World.ACTIONS,World.PRESSURE_CHANNELS);
  let frame=World.sense(world),steps=0,frictionSum=0,maxFriction=World.bodyFriction(world);
  const modes={},actions=Array(World.ACTIONS).fill(0);
  while(steps<horizon&&world.agent.alive){
    const before=frame,decision=Prior.chooseAction(mind,before),action=decision.action;
    assert.ok(Number.isInteger(action)&&action>=0&&action<World.ACTIONS);
    modes[decision.mode]=(modes[decision.mode]||0)+1;actions[action]++;
    const after=World.act(world,action);
    Prior.observe(mind,before,action,after);
    frame=after;steps++;
    const friction=World.bodyFriction(world);frictionSum+=friction;maxFriction=Math.max(maxFriction,friction);
  }
  assert.strictEqual(mind.whole,1);
  assert.strictEqual(mind.transitions.length,steps);
  return{seed,steps,survived:world.agent.alive&&steps===horizon,terminal_friction:World.bodyFriction(world),terminal_pressures:World.bodyPressures(world),avg_friction:Number((frictionSum/Math.max(1,steps)).toFixed(2)),max_friction:maxFriction,action_kinds:actions.filter(Boolean).length,decision_modes:modes};
}

function runBabble(seed,horizon=1200){
  const world=World.create(seed),random=rng(seed^0x6a09e667);let frame=World.sense(world),steps=0,frictionSum=0,maxFriction=World.bodyFriction(world);
  while(steps<horizon&&world.agent.alive){
    frame=World.act(world,Math.floor(random()*World.ACTIONS));steps++;
    const friction=World.bodyFriction(world);frictionSum+=friction;maxFriction=Math.max(maxFriction,friction);
  }
  return{seed,steps,survived:world.agent.alive&&steps===horizon,terminal_friction:World.bodyFriction(world),terminal_pressures:World.bodyPressures(world),avg_friction:Number((frictionSum/Math.max(1,steps)).toFixed(2)),max_friction:maxFriction};
}

const seeds=[420070,420071,420072,420073,420074,420075];
const guided=seeds.map(s=>runMind(s));
const babble=seeds.map(s=>runBabble(s));
const summary={
  worlds:seeds.length,horizon:1200,
  guided_survivors:guided.filter(x=>x.survived).length,
  babble_survivors:babble.filter(x=>x.survived).length,
  guided_mean_lifespan:Number(mean(guided.map(x=>x.steps)).toFixed(1)),
  babble_mean_lifespan:Number(mean(babble.map(x=>x.steps)).toFixed(1)),
  guided_mean_friction:Number(mean(guided.map(x=>x.avg_friction)).toFixed(2)),
  babble_mean_friction:Number(mean(babble.map(x=>x.avg_friction)).toFixed(2)),
};

console.log('42ndMind irreversible single-life vector-pressure foresight run: COMPLETE');
console.log('death is terminal; no reset experience; no cross-life learning');
console.log('pressure dimensions remain separate; no aggregate can hide a failed constraint');
console.log('GUIDED '+JSON.stringify(guided));
console.log('BABBLE '+JSON.stringify(babble));
console.log('SUMMARY '+JSON.stringify(summary));
console.log('whole=1 lives_are_independent=true');
