'use strict';

// Host-native falsification. No scripted task world.
const assert=require('assert');
const fs=require('fs'), os=require('os'), path=require('path');
const Mind=require('./one-mind.js');
const ROOT=__dirname;
const M=Mind.one(12,256);
const owned=[];
const CHUNK=256*1024;
function fixed(buf,n){const out=Buffer.alloc(n);buf.copy(out,0,0,Math.min(n,buf.length));return out;}
function raw(p,n){try{return fs.readFileSync(p).subarray(0,n)}catch{return Buffer.alloc(0)}}
function bytes(buf){const out=[];for(const b of buf)out.push((b-127.5)/127.5);return out;}
function contact(){
  const S=[Buffer.from(fs.readdirSync(ROOT).sort().join('\0')),raw('/proc/self/stat',1024),raw('/proc/meminfo',2048),raw(path.join(ROOT,'one-mind.js'),8192)];
  const bank=Buffer.concat(S.map(b=>fixed(b,128)));
  const mu=process.memoryUsage();
  const s=bytes(bank);
  s.push(...os.loadavg().map(v=>Math.tanh(v/8)),Math.tanh(mu.rss/128e6),Math.tanh(mu.heapUsed/64e6),Math.sin(Date.now()/997));
  return s;
}
let early=null;
for(let t=0;t<1600&&M.alive;t++){
  Mind.C(M,{sense:contact(),pressure:[Math.min(2,owned.length/96),0,0,0],alive:true});
  if(early===null&&M.age>=50)early=M.predictionEMA;
  if(M.motor[0]>0.08&&owned.length<160)owned.push(Buffer.alloc(CHUNK));
  if(M.motor[0]<-0.08&&owned.length)owned.pop();
  if(t%6===0&&owned.length<160)owned.push(Buffer.alloc(CHUNK));
  if(owned.length>128)M.alive=false;
}
assert.strictEqual(M.whole,1);
assert(M.alive,'organism died under host-native metabolic pressure');
assert(M.predictionEMA<early*0.7,`prediction failed to improve: ${early} -> ${M.predictionEMA}`);
assert(M.nodes.length>256+12,'body contact did not recruit receptor/developmental structure');
assert(M.topologyBirths>0,'topology never formed new connections');
assert(owned.length<32,`body regulation failed: ${owned.length} chunks remain`);
console.log(JSON.stringify({pass:true,whole:M.whole,age:M.age,early_prediction:early,prediction_ema:M.predictionEMA,nodes:M.nodes.length,edges:M.edges.length,topology_births:M.topologyBirths,topology_deaths:M.topologyDeaths,owned_pages:owned.length},null,2));
