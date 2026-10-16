'use strict';

const assert=require('assert');
const {stoneRelation,realize,sameEntityAcrossRealization,l1}=require('./stone-referent-frame');

const q={id:'q-opaque'};
const r={id:'r-local'};

const nullRel=stoneRelation(q,r,{x:0,y:0,z:0});
assert.equal(nullRel.state,'null');
assert.equal(nullRel.development,0);
assert.equal(nullRel.formed,false);

const developing=stoneRelation(q,r,{x:0.2,y:0.3,z:-0.1});
assert(Math.abs(developing.development-0.6)<1e-12);
assert.equal(developing.state,'developing');
assert.equal(developing.formed,false);
assert(Math.abs(developing.development-l1(developing.orientation))<1e-12);

const stance=stoneRelation(q,r,{x:0.2,y:0.6,z:-0.2});
assert(Math.abs(stance.development-1)<1e-12);
assert.equal(stance.state,'stance');
assert.equal(stance.formed,true);

assert.throws(()=>stoneRelation(q,r,{x:0.6,y:0.6,z:0}),/outside the closed L1 referent/);

// Realization revises the referent. The entity remains q, while Φ must be
// supplied again relative to r'. Development may decrease because the same
// prior development can occupy a smaller fraction of a broadened scope.
const broader={id:'r-broader'};
const before=stoneRelation(q,r,{x:0.4,y:0.3,z:0.1}); // L1=.8
const step=realize(before,broader,{x:0.1,y:0.15,z:0.05}); // L1=.3
assert.equal(step.before.referent,r);
assert.equal(step.after.referent,broader);
assert.equal(step.before.entity,q);
assert.equal(step.after.entity,q);
assert.equal(sameEntityAcrossRealization(step),true);
assert(Math.abs(step.before.development-0.8)<1e-12);
assert(Math.abs(step.after.development-0.3)<1e-12);
assert(step.development_change<0);

// Realization may also reorganize direction rather than merely rescale it.
const reorganized=realize(step.after,{id:'r-revised'},{x:-0.2,y:0.5,z:0.1});
assert.equal(reorganized.after.state,'developing');
assert(reorganized.after.orientation.x<0);
assert(reorganized.after.orientation.y>0);

// No silent carry-over of the old orientation is allowed.
assert.throws(()=>realize(before,broader),/newly warranted Phi/);

const report={
  q_is_entity:true,
  r_is_referent_not_radial_scalar:true,
  orientation_is_relative_to_q_r:true,
  development_is_l1_of_phi:true,
  null_development_zero:true,
  interior_development_between_zero_and_one:true,
  stance_development_one:true,
  realization_changes_referent:true,
  realization_preserves_entity:true,
  realization_requires_new_relative_orientation:true,
  broadened_scope_can_reduce_relative_development:true,
  realization_can_reorganize_direction:true
};
console.log(JSON.stringify(report,null,2));
console.log('STONE REFERENT FRAME TEST: PASS');
