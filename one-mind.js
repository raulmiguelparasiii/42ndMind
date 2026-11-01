'use strict';

// 42ndMind experimental newborn: one continuing M, one local plasticity law.
// No parser, symbols, planner, ontology, task vocabulary, reward table, or adult knowledge.
const EPS=1e-12, GROW=0.22, ETA=0.08, MAX_FIELD=96;
function clamp(x,a=-1,b=1){return Math.max(a,Math.min(b,x));}
function dot(a,b){let s=0,n=Math.min(a.length,b.length);for(let i=0;i<n;i++)s+=a[i]*b[i];return s;}
function norm(a){return Math.sqrt(dot(a,a));}
function unit(a){const n=norm(a);return n<EPS?a.map(()=>0):a.map(v=>v/n);}
function pad(a,n){while(a.length<n)a.push(0);}
function one(motorWidth=8){return{whole:1,alive:true,age:0,need:0,contact:[],motor:Array(motorWidth).fill(0),field:[],growth:0,residual:1,variation:.3141592653589793,previous:null,previous_perturb:Array(motorWidth).fill(0),relief:0};}
function pressure(p){if(!Array.isArray(p)||!p.length||!p.every(Number.isFinite))throw Error('pressure');let s=0;for(const v of p){const z=Math.max(0,v);s+=z*z;}return Math.sqrt(s/p.length);}
function width(M,n){for(const c of M.field)pad(c.w,n);pad(M.contact,n);if(M.previous)pad(M.previous.contact,n);}
function activities(M,x){return M.field.map(c=>Math.tanh(dot(c.w,x)));}
function residual(M,x){const r=x.slice();for(const c of M.field){const a=dot(c.w,r);for(let j=0;j<r.length;j++)r[j]-=a*c.w[j];}return r;}
function grow(M,x){
  let r=residual(M,x), ratio=norm(r)/Math.max(EPS,norm(x));
  if((!M.field.length || ratio>GROW) && M.field.length<Math.min(MAX_FIELD,x.length)){
    M.field.push({w:unit(r),motor:M.motor.map(()=>0),born:M.age});M.growth++;
    r=residual(M,x);ratio=norm(r)/Math.max(EPS,norm(x));
  }
  M.residual=ratio;
}
function learnConsequence(M,newNeed){
  if(!M.previous)return;
  const relief=M.previous.need-newNeed; M.relief=relief;
  const a=activities(M,M.previous.contact);
  // Same local consequence law on every anonymous degree of freedom:
  // perturbations followed by bodily relief become easier to express in the
  // same lived context; perturbations followed by injury become harder.
  for(let i=0;i<M.field.length;i++)for(let k=0;k<M.motor.length;k++)
    M.field[i].motor[k]=clamp(M.field[i].motor[k]+ETA*relief*a[i]*M.previous_perturb[k]);
}
function express(M,x){
  const a=activities(M,x), out=Array(M.motor.length).fill(0), perturb=Array(M.motor.length).fill(0);
  for(let i=0;i<M.field.length;i++)for(let k=0;k<out.length;k++)out[k]+=a[i]*M.field[i].motor[k];
  M.variation=Math.sin(M.variation*91.733+M.age*0.137+0.12345);
  const amp=0.08+0.42*Math.min(1,M.need);
  for(let k=0;k<out.length;k++){
    perturb[k]=amp*Math.sin(M.variation*17.17+k*2.3999632297+M.age*0.31);
    out[k]=clamp(Math.tanh(out[k])+perturb[k]);
  }
  M.previous_perturb=perturb; return out;
}
function C(M,R){
  if(!M||M.whole!==1||!M.alive)return M;
  if(!R||!Array.isArray(R.sense)||!R.sense.every(Number.isFinite))throw Error('sense');
  if(R.alive===false){M.alive=false;M.motor.fill(0);return M;}
  const n=pressure(R.pressure), x=R.sense.concat(R.pressure.map(v=>Math.max(0,v)));
  width(M,x.length); learnConsequence(M,n); M.age++;M.need=n;M.contact=x.slice();grow(M,x);M.motor=express(M,x);M.previous={contact:x.slice(),need:n};return M;
}
module.exports={one,C};
