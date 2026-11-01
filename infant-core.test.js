'use strict';
// Host-contact smoke test only. It does not construct a toy world.
const assert=require('assert'),fs=require('fs'),os=require('os');
const Mind=require('./one-mind.js');
const M=Mind.one(4);
assert.strictEqual(M.whole,1);assert.strictEqual(M.field.length,0);assert.strictEqual(M.age,0);
for(let i=0;i<64;i++){
 const proc=fs.readFileSync('/proc/self/stat');
 const sense=[];for(let j=0;j<Math.min(96,proc.length);j++)sense.push((proc[j]-127.5)/127.5);
 sense.push(...os.loadavg().map(v=>Math.tanh(v/8)),Math.sin(Date.now()/1000+i));
 Mind.C(M,{sense,pressure:[Math.min(1,process.memoryUsage().rss/128e6),0],alive:true});
}
assert(M.age===64);assert(M.field.length>0);assert(M.growth>0);assert(M.motor.every(Number.isFinite));
console.log(JSON.stringify({pass:true,whole:M.whole,age:M.age,field:M.field.length,growth:M.growth,need:M.need},null,2));
