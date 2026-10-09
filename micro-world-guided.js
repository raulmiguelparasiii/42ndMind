'use strict';

// Compact legacy regression for endogenous agency. This file still revives the
// world only to exercise the controller across repeated conditions; it is NOT a
// model of an individual mind learning across death. Single-life viability is
// tested in micro-world-single-life.js, where death is terminal.

const assert=require('assert');
const World=require('./micro-world.js');
const Prior=require('./innate-priors.js');

function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};}
function mean(xs){return xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length);}
function runGuided(seed,steps=700){
  const world=World.create(seed),mind=Prior.one(World.ACTIONS);let frame=World.sense(world),deaths=0,friction=0;
  for(let step=0;step<steps;step++){
    const before=frame,d=Prior.chooseAction(mind,before);assert.ok(d.action>=0&&d.action<World.ACTIONS);
    let after=World.act(world,d.action);Prior.observe(mind,before,d.action,after);
    if(!world.agent.alive){deaths++;World.revive(world);after=World.sense(world);} frame=after;friction+=frame.at(-1);
  }
  assert.strictEqual(mind.whole,1);return{seed,deaths,avg_friction:Number((friction/steps).toFixed(2))};
}
function runBabble(seed,steps=700){
  const world=World.create(seed),random=rng(seed^0x5a5a5a5a);let frame=World.sense(world),deaths=0,friction=0;
  for(let step=0;step<steps;step++){
    frame=World.act(world,Math.floor(random()*World.ACTIONS));
    if(!world.agent.alive){deaths++;World.revive(world);frame=World.sense(world);} friction+=frame.at(-1);
  }
  return{seed,deaths,avg_friction:Number((friction/steps).toFixed(2))};
}
const seeds=[420060,420061];
const guided=seeds.map(s=>runGuided(s)),babble=seeds.map(s=>runBabble(s));
console.log('42ndMind compact reset-harness regression: COMPLETE');
console.log('RESET_HARNESS_ONLY=true individual_death_is_not_learning=true');
console.log('GUIDED '+JSON.stringify(guided));
console.log('BABBLE '+JSON.stringify(babble));
console.log('SUMMARY '+JSON.stringify({guided_mean_deaths:Number(mean(guided.map(x=>x.deaths)).toFixed(2)),babble_mean_deaths:Number(mean(babble.map(x=>x.deaths)).toFixed(2)),guided_mean_friction:Number(mean(guided.map(x=>x.avg_friction)).toFixed(2)),babble_mean_friction:Number(mean(babble.map(x=>x.avg_friction)).toFixed(2))}));
