'use strict';

// Formal entity–referent frame for the Stone.
//
// q = entity, r = materially relevant referent/scope.
// Φ(q,r) is the orientation. Development is ||Φ(q,r)||_1; it is not an
// independent radial variable. Realization changes/revises r and therefore
// requires the same entity to be situated again through a newly warranted
// Φ(q,r'). This file does not estimate Φ from semantics or raw reality; it
// enforces the exact frame once an orientation is supplied.

const EPS=1e-12;

function finite(x){return Number.isFinite(Number(x));}
function l1(phi){return Math.abs(phi.x)+Math.abs(phi.y)+Math.abs(phi.z);}
function l2(phi){return Math.sqrt(phi.x*phi.x+phi.y*phi.y+phi.z*phi.z);}

function normalizePhi(phi){
  if(!phi || !finite(phi.x) || !finite(phi.y) || !finite(phi.z)) throw new Error('Phi(q,r) requires finite x,y,z');
  const p={x:Number(phi.x),y:Number(phi.y),z:Number(phi.z)};
  const d=l1(p);
  if(d>1+EPS) throw new Error('Phi(q,r) lies outside the closed L1 referent');
  // Avoid tiny floating overshoot at the boundary without changing genuine
  // interior magnitude.
  if(d>1 && d<=1+EPS){p.x/=d;p.y/=d;p.z/=d;}
  return p;
}

function stoneRelation(q,r,phi){
  if(q===undefined || q===null) throw new Error('Stone relation requires entity q');
  if(r===undefined || r===null) throw new Error('Stone relation requires referent r');
  const orientation=normalizePhi(phi);
  const development=l1(orientation);
  const experience=l2(orientation);
  const state=development<=EPS?'null':Math.abs(development-1)<=EPS?'stance':'developing';
  return Object.freeze({
    entity:q,
    referent:r,
    orientation:Object.freeze(orientation),
    development,
    experience,
    state,
    formed:state==='stance'
  });
}

// Realization is deliberately non-inferential here. r -> r' can shrink,
// preserve, enlarge, or reorganize the coordinates because the same entity is
// now relative to a revised materially relevant reality. The caller must
// supply a newly warranted Φ(q,r'); silently reusing Φ(q,r) would erase the
// very relativity that realization introduces.
function realize(previous,rPrime,phiPrime){
  if(!previous || !Object.prototype.hasOwnProperty.call(previous,'entity') || !Object.prototype.hasOwnProperty.call(previous,'referent')) {
    throw new Error('realize requires a prior Stone entity–referent relation');
  }
  if(arguments.length<3) throw new Error("realization requires newly warranted Phi(q,r')");
  const next=stoneRelation(previous.entity,rPrime,phiPrime);
  return Object.freeze({
    entity:previous.entity,
    from_referent:previous.referent,
    to_referent:rPrime,
    before:previous,
    after:next,
    development_change:next.development-previous.development,
    experience_change:next.experience-previous.experience
  });
}

function sameEntityAcrossRealization(step){
  return !!step && step.before?.entity===step.after?.entity && step.entity===step.before.entity;
}

module.exports={EPS,l1,l2,normalizePhi,stoneRelation,realize,sameEntityAcrossRealization};
