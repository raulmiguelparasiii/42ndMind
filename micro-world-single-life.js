'use strict';

// Single-individual viability validation.
//
// Each fresh mind gets one continuous life. The first DEVELOPMENT_STEPS are a
// protected developmental phase: real pressures and consequences are experienced,
// but irreversible bodily failure is prevented. There is no reset, no memory
// transfer, no semantic teaching, and no pressure relief supplied by protection.
// Protection then disappears permanently and the SAME mind must survive the full
// autonomous horizon. Death after protection ends is terminal.

const assert = require('assert');
const World = require('./micro-world.js');
const Prior = require('./innate-priors.js');

function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}

const DEVELOPMENT_STEPS=500;
const AUTONOMOUS_STEPS=1200;
const TOTAL_STEPS=DEVELOPMENT_STEPS+AUTONOMOUS_STEPS;

function runMind(seed){
  const world=World.create(seed,{developmentalProtectionUntil:DEVELOPMENT_STEPS});
  const mind=Prior.one(World.ACTIONS,World.PRESSURE_CHANNELS);
  let frame=World.sense(world),steps=0,frictionSum=0,maxFriction=World.bodyFriction(world);
  const modes={},actions=Array(World.ACTIONS).fill(0);
  while(steps<TOTAL_STEPS&&world.agent.alive){
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
  return{
    seed,steps,
    autonomous_steps_survived:Math.max(0,steps-DEVELOPMENT_STEPS),
    survived:world.agent.alive&&steps===TOTAL_STEPS,
    terminal_friction:World.bodyFriction(world),terminal_pressures:World.bodyPressures(world),
    avg_friction:Number((frictionSum/Math.max(1,steps)).toFixed(2)),max_friction:maxFriction,
    action_kinds:actions.filter(Boolean).length,decision_modes:modes,
  };
}

function runBabble(seed){
  const world=World.create(seed,{developmentalProtectionUntil:DEVELOPMENT_STEPS});
  const random=rng(seed^0x6a09e667);let frame=World.sense(world),steps=0,frictionSum=0,maxFriction=World.bodyFriction(world);
  while(steps<TOTAL_STEPS&&world.agent.alive){
    frame=World.act(world,Math.floor(random()*World.ACTIONS));steps++;
    const friction=World.bodyFriction(world);frictionSum+=friction;maxFriction=Math.max(maxFriction,friction);
  }
  return{
    seed,steps,autonomous_steps_survived:Math.max(0,steps-DEVELOPMENT_STEPS),
    survived:world.agent.alive&&steps===TOTAL_STEPS,
    terminal_friction:World.bodyFriction(world),terminal_pressures:World.bodyPressures(world),
    avg_friction:Number((frictionSum/Math.max(1,steps)).toFixed(2)),max_friction:maxFriction,
  };
}

const seeds=[420070,420071,420072,420073,420074,420075];
const guided=seeds.map(runMind),babble=seeds.map(runBabble);
const summary={
  worlds:seeds.length,development_steps:DEVELOPMENT_STEPS,autonomous_horizon:AUTONOMOUS_STEPS,
  guided_survivors:guided.filter(x=>x.survived).length,babble_survivors:babble.filter(x=>x.survived).length,
  guided_mean_autonomous_life:Number(mean(guided.map(x=>x.autonomous_steps_survived)).toFixed(1)),
  babble_mean_autonomous_life:Number(mean(babble.map(x=>x.autonomous_steps_survived)).toFixed(1)),
  guided_mean_friction:Number(mean(guided.map(x=>x.avg_friction)).toFixed(2)),
  babble_mean_friction:Number(mean(babble.map(x=>x.avg_friction)).toFixed(2)),
};

console.log('42ndMind protected-development single-life run: COMPLETE');
console.log('one continuous individual; no reset; no cross-life learning');
console.log(`developmental protection=${DEVELOPMENT_STEPS} then autonomous survival=${AUTONOMOUS_STEPS}`);
console.log('protection prevents irreversible failure but does not remove pressure');
console.log('GUIDED '+JSON.stringify(guided));
console.log('BABBLE '+JSON.stringify(babble));
console.log('SUMMARY '+JSON.stringify(summary));
console.log('whole=1 lives_are_independent=true');
