'use strict';

// 42ndMind: developmental closure core.
// One continuing recurrent organism. No parser, planner, language faculty,
// ontology, task vocabulary, reward table, semantic seed, or adult knowledge.
//
// Physical boundary roles only:
//   receptor nodes are forced by reality contact,
//   motor nodes are exposed through the body,
//   every other node is anonymous recurrent substrate.
//
// Reality error shapes prediction/representation. Viability consequences shape
// action. Persistent unresolved reality changes topology. No capability is added
// after birth; new body channels attach to the same law.

const EPS = 1e-9;
const DEFAULT_INNER_AT_BIRTH = 1024;
const DEGREE_AT_BIRTH = 12;
const SETTLE = 2;
const ETA_PRED = 0.012;
const ETA_CAUSAL = 0.045;
const EDGE_DECAY = 0.000015;
const STRUCTURE_EVERY = 64;
const NOVELTY_FOR_BIRTH = 0.20;
const NODE_BIRTH_EVERY = 256;

function clamp(x, lo=-1, hi=1){ return Math.max(lo, Math.min(hi, x)); }
function tanh(x){ return Math.tanh(clamp(x, -12, 12)); }
function hashstep(x){
  x = (x ^ (x << 13)) | 0;
  x = (x ^ (x >>> 17)) | 0;
  x = (x ^ (x << 5)) | 0;
  return x | 0;
}
function rnd(M){
  M.rng = hashstep(M.rng || 0x31415926);
  return (M.rng >>> 0) / 4294967296;
}
function signed(M){ return rnd(M) * 2 - 1; }
function node(kind='inner', born=0){
  return { kind, s:0, prev:0, free:0, bias:0, novelty:0, activity:0, born, alive:true };
}
function edge(a, b, w, born=0){
  return { a, b, w, elig:0, use:0, born, alive:true };
}

function one(motorWidth=12, innerAtBirth=DEFAULT_INNER_AT_BIRTH){
  if(!Number.isInteger(motorWidth) || motorWidth < 1) throw Error('motorWidth');
  if(!Number.isInteger(innerAtBirth) || innerAtBirth < 1) throw Error('innerAtBirth');
  const M = {
    architecture:'developmental-closure-v1',
    whole:1,
    alive:true,
    age:0,
    need:0,
    relief:0,
    rng:0x31415926,
    nodes:[],
    edges:[],
    receptors:[],
    motors:[],
    motor:Array(motorWidth).fill(0),
    previousMotorPerturb:Array(motorWidth).fill(0),
    previousNeed:0,
    predictionError:1,
    predictionEMA:1,
    topologyBirths:0,
    topologyDeaths:0,
    sensorWidth:0,
    innerAtBirth
  };

  for(let i=0;i<innerAtBirth;i++) M.nodes.push(node('inner', 0));
  for(let k=0;k<motorWidth;k++){
    const id=M.nodes.length;
    M.nodes.push(node('motor', 0));
    M.motors.push(id);
  }

  // Content-free recurrent anatomy. Randomness supplies asymmetry, not meaning.
  const N=M.nodes.length;
  for(let b=0;b<N;b++){
    for(let q=0;q<DEGREE_AT_BIRTH;q++){
      let a=Math.floor(rnd(M)*N);
      if(a===b) a=(a+1)%N;
      M.edges.push(edge(a, b, signed(M)*0.18, 0));
    }
  }
  return M;
}

function ensureSensors(M, n){
  if(n<=M.sensorWidth) return;
  for(let i=M.sensorWidth;i<n;i++){
    const id=M.nodes.length;
    M.nodes.push(node('receptor', M.age));
    M.receptors.push(id);
    // New receptors join the same undifferentiated substrate. No channel label
    // or interpretation is transmitted with the wiring.
    for(let q=0;q<DEGREE_AT_BIRTH;q++){
      const j=Math.floor(rnd(M)*(M.nodes.length-1));
      M.edges.push(edge(id, j, signed(M)*0.14, M.age));
      M.edges.push(edge(j, id, signed(M)*0.14, M.age));
    }
  }
  M.sensorWidth=n;
}

function incoming(M){
  const inc=Array.from({length:M.nodes.length},()=>[]);
  for(let e=0;e<M.edges.length;e++){
    const E=M.edges[e];
    if(!E.alive) continue;
    if(E.a<M.nodes.length && E.b<M.nodes.length && M.nodes[E.a].alive && M.nodes[E.b].alive) inc[E.b].push(e);
  }
  return inc;
}

function predict(M, inc){
  const p=Array(M.nodes.length).fill(0);
  for(let i=0;i<M.nodes.length;i++){
    const n=M.nodes[i];
    if(!n.alive) continue;
    let z=n.bias||0;
    for(const ei of inc[i]){
      const E=M.edges[ei];
      z += E.w * M.nodes[E.a].prev;
    }
    p[i]=tanh(z);
  }
  return p;
}

function contactSettle(M, contact, inc, prediction){
  for(let i=0;i<M.nodes.length;i++){
    const n=M.nodes[i];
    n.free=prediction[i]||0;
    n.s=n.free;
  }
  for(let j=0;j<M.receptors.length;j++) M.nodes[M.receptors[j]].s=clamp(contact[j]||0);

  for(let pass=0;pass<SETTLE;pass++){
    const next=M.nodes.map(n=>n.s);
    for(let i=0;i<M.nodes.length;i++){
      const n=M.nodes[i];
      if(!n.alive || n.kind==='receptor') continue;
      let z=n.bias||0;
      for(const ei of inc[i]){
        const E=M.edges[ei];
        z += E.w * M.nodes[E.a].s;
      }
      next[i]=tanh(z);
    }
    for(let i=0;i<M.nodes.length;i++) if(M.nodes[i].kind!=='receptor') M.nodes[i].s=next[i];
    for(let j=0;j<M.receptors.length;j++) M.nodes[M.receptors[j]].s=clamp(contact[j]||0);
  }
}

function learnReality(M, prediction){
  let err2=0;
  for(let j=0;j<M.receptors.length;j++){
    const id=M.receptors[j];
    const n=M.nodes[id];
    const e=n.s-(prediction[id]||0);
    err2+=e*e;
    n.novelty=0.98*n.novelty+0.02*Math.abs(e);
  }
  M.predictionError=Math.sqrt(err2/Math.max(1,M.receptors.length));
  M.predictionEMA=0.995*M.predictionEMA+0.005*M.predictionError;

  // Local reality correction. The free state is what the prior whole predicted;
  // the contacted/settled state is what reality forced the organism to become.
  // Outgoing motor edges can therefore learn sensory consequences automatically.
  // Incoming motor edges are excluded here because action must be selected by
  // consequence, not by sensory co-occurrence.
  for(const E of M.edges){
    if(!E.alive) continue;
    const a=M.nodes[E.a], b=M.nodes[E.b];
    if(!a.alive || !b.alive) continue;
    const err=b.s-b.free;
    if(b.kind==='motor') E.w=clamp(E.w-EDGE_DECAY*E.w, -1.5, 1.5);
    else E.w=clamp(E.w + ETA_PRED*err*a.prev - EDGE_DECAY*E.w, -1.5, 1.5);
    E.use=0.995*E.use+0.005*Math.abs(err*a.prev);
  }
}

function pressure(P){
  if(!Array.isArray(P) || !P.length || !P.every(Number.isFinite)) throw Error('pressure');
  let s=0;
  for(const x of P){ const z=Math.max(0,x); s+=z*z; }
  return Math.sqrt(s/P.length);
}

function learnConsequence(M, newNeed){
  if(M.age===0){ M.previousNeed=newNeed; return; }
  const relief=M.previousNeed-newNeed;
  M.relief=relief;

  // The physical effector itself retains directions followed by bodily relief
  // and rejects directions followed by injury. This is stored in the same motor
  // neurons and synapses that produced the action, never in an action table.
  for(let k=0;k<M.motors.length;k++){
    const mn=M.nodes[M.motors[k]];
    mn.bias=clamp(
      0.999*(mn.bias||0)
      +8.0*relief*(M.motor[k]||0)
      +2.0*relief*(M.previousMotorPerturb[k]||0),
      -2, 2
    );
  }

  const motorSlot=new Map();
  for(let k=0;k<M.motors.length;k++) motorSlot.set(M.motors[k],k);
  for(const E of M.edges){
    if(!E.alive) continue;
    const k=motorSlot.get(E.b);
    if(k===undefined) continue;
    const pre=M.nodes[E.a].prev;
    E.elig=0.85*E.elig + pre*(M.previousMotorPerturb[k]||0);
    E.w=clamp(E.w + ETA_CAUSAL*relief*E.elig, -1.5, 1.5);
  }
  M.previousNeed=newNeed;
}

function express(M){
  const out=[], perturb=[];
  // Greater bodily pressure widens spontaneous variation so a failing habit can
  // be escaped. At low pressure the organism becomes comparatively stable.
  const amp=0.05+1.6*Math.min(1,M.need);
  for(let k=0;k<M.motors.length;k++){
    const base=M.nodes[M.motors[k]].s;
    const p=amp*signed(M);
    perturb.push(p);
    out.push(clamp(base+p));
  }
  M.previousMotorPerturb=perturb;
  M.motor=out;
}

function structuralPlasticity(M){
  if(M.age%STRUCTURE_EVERY!==0) return;
  const live=M.nodes.map((n,i)=>n.alive?i:-1).filter(i=>i>=0);
  const existing=new Set();
  for(const E of M.edges) if(E.alive) existing.add(E.a+','+E.b);

  // Co-active degrees of freedom can acquire direct contact.
  for(let q=0;q<64;q++){
    const a=live[Math.floor(rnd(M)*live.length)];
    const b=live[Math.floor(rnd(M)*live.length)];
    if(a===b || existing.has(a+','+b)) continue;
    const affinity=Math.abs(M.nodes[a].s*M.nodes[b].s);
    if(affinity>0.22){
      M.edges.push(edge(a,b,0.08*Math.sign(M.nodes[a].s*M.nodes[b].s||1),M.age));
      existing.add(a+','+b);
      M.topologyBirths++;
    }
  }

  // Structure that stops carrying reality disappears.
  let died=0;
  for(const E of M.edges){
    if(E.alive && M.age-E.born>512 && Math.abs(E.w)<0.012 && E.use<0.015){
      E.alive=false;
      died++;
    }
  }
  if(died){
    M.topologyDeaths+=died;
    M.edges=M.edges.filter(E=>E.alive);
  }

  // Persistent unresolved contact recruits another anonymous degree of freedom.
  // There is no fixed cognitive ceiling; recruitment stops when prediction error
  // itself falls rather than at a developer-chosen count.
  if(M.age%NODE_BIRTH_EVERY===0 && M.predictionEMA>NOVELTY_FOR_BIRTH){
    const id=M.nodes.length;
    M.nodes.push(node('inner',M.age));
    for(let q=0;q<DEGREE_AT_BIRTH*2;q++){
      const j=live[Math.floor(rnd(M)*live.length)];
      if(q&1) M.edges.push(edge(j,id,signed(M)*0.12,M.age));
      else M.edges.push(edge(id,j,signed(M)*0.12,M.age));
      M.topologyBirths++;
    }
  }
}

function C(M, R){
  if(!M || M.whole!==1 || !M.alive) return M;
  if(!R || !Array.isArray(R.sense) || !R.sense.every(Number.isFinite)) throw Error('sense');
  if(!Array.isArray(R.pressure) || !R.pressure.length || !R.pressure.every(Number.isFinite)) throw Error('pressure');
  if(R.alive===false){ M.alive=false; M.motor.fill(0); return M; }

  // Interoception is raw body contact too. Individual pressure channels remain
  // unlabeled; the scalar need below only measures how far the whole body is from
  // its viable basin.
  const contact=R.sense.concat(R.pressure.map(v=>Math.tanh(Math.max(0,v))));
  ensureSensors(M,contact.length);
  const newNeed=pressure(R.pressure);
  learnConsequence(M,newNeed);

  for(const n of M.nodes){
    n.prev=n.s;
    n.activity=0.995*n.activity+0.005*Math.abs(n.s);
  }
  M.need=newNeed;

  const inc=incoming(M);
  const p=predict(M,inc);
  contactSettle(M,contact,inc,p);
  learnReality(M,p);

  M.age++;
  structuralPlasticity(M);
  express(M);
  return M;
}

module.exports={one,C};
