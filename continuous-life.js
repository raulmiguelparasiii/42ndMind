'use strict';

// Persistent embodiment in the actual host process/filesystem.
// The body supplies raw contact and physical effectors. It supplies no semantic
// task, desired action, parser, answer, or world label.
const fs=require('fs'), os=require('os'), path=require('path');
const Mind=require('./one-mind.js');

const ROOT=__dirname;
const STATE=path.join(ROOT,'state');
const BODYDIR=path.join(STATE,'body');
const MIND_PATH=path.join(STATE,'canonical-mind.json');
const BODY_PATH=path.join(STATE,'canonical-body.json');
const REPORT_PATH=path.join(STATE,'life-report.json');
const SCRATCH=path.join(BODYDIR,'scratch.bin');
const MOUTH=path.join(BODYDIR,'mouth.bin');
const STEPS=Math.max(1,Math.floor(Number(process.env.LIFE_STEPS||1200)));
const INNER=Math.max(1,Math.floor(Number(process.env.INNER_AT_BIRTH||1024)));
const REVERSE_AT=Math.max(0,Math.floor(Number(process.env.REVERSE_AT||0)));
const ORGAN_AT=Math.max(0,Math.floor(Number(process.env.ORGAN_AT||0)));
const ORGAN_REVERSE=process.env.ORGAN_REVERSE==='1';
const RESET=process.env.RESET_LIFE==='1';
const CHUNK=256*1024;

function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function loadJSON(p,fallback){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return fallback}}
function saveJSON(p,x){fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n')}
function raw(p,n){try{return fs.readFileSync(p).subarray(0,n)}catch{return Buffer.alloc(0)}}
function size(p){try{return fs.statSync(p).size}catch{return 0}}
function fixed(buf,n){const out=Buffer.alloc(n);buf.copy(out,0,0,Math.min(n,buf.length));return out;}
function bytes(buf){const out=[];for(const b of buf)out.push((b-127.5)/127.5);return out;}
function newBody(){return{architecture:'host-body-v2',alive:true,age:0,owned_pages:0,organ_pages:0,head:0,source:0,span:128};}

if(RESET) fs.rmSync(STATE,{recursive:true,force:true});
fs.mkdirSync(BODYDIR,{recursive:true});
if(!fs.existsSync(SCRATCH))fs.writeFileSync(SCRATCH,Buffer.alloc(0));
if(!fs.existsSync(MOUTH))fs.writeFileSync(MOUTH,Buffer.alloc(0));

let M=loadJSON(MIND_PATH,null);
let B=loadJSON(BODY_PATH,null);
if(!M || M.architecture!=='developmental-closure-v1' || M.whole!==1) M=Mind.one(12,INNER);
if(!B || B.architecture!=='host-body-v2') B=newBody();
const owned=[];for(let i=0;i<B.owned_pages;i++)owned.push(Buffer.alloc(CHUNK));
const organ=[];for(let i=0;i<B.organ_pages;i++)organ.push(Buffer.alloc(CHUNK));

function sources(){
  return [
    Buffer.from(fs.readdirSync(ROOT).sort().join('\0')),
    raw('/proc/self/stat',1024),
    raw('/proc/meminfo',2048),
    raw(path.join(ROOT,'one-mind.js'),8192),
    raw(path.join(ROOT,'continuous-life.js'),8192),
    raw(path.join(ROOT,'CANONICAL_LIFE.md'),8192),
    raw(path.join(ROOT,'AGENTS.md'),8192),
    raw(SCRATCH,4096),
    raw(MOUTH,4096)
  ];
}

function sense(){
  const S=sources();
  const source=((B.source%S.length)+S.length)%S.length;
  const pick=S[source];
  const bank=Buffer.concat(S.map(b=>fixed(b,64)));
  const start=Math.min(Math.max(0,B.head),Math.max(0,pick.length-1));
  const focus=fixed(pick.subarray(start,start+B.span),B.span);
  const mu=process.memoryUsage();
  const contact=bytes(Buffer.concat([bank,focus]));
  contact.push(
    ...os.loadavg().map(v=>Math.tanh(v/8)),
    Math.tanh(mu.rss/128e6),
    Math.tanh(mu.heapUsed/64e6),
    Math.tanh(os.freemem()/Math.max(1,os.totalmem())),
    Math.sin(Date.now()/997),
    Math.cos(Date.now()/997)
  );

  const pMem=clamp(owned.length/96,0,2);
  const pScratch=clamp(size(SCRATCH)/(96*1024),0,2);
  const pMouth=clamp(size(MOUTH)/(96*1024),0,2);
  const pWritable=(()=>{try{fs.accessSync(BODYDIR,fs.constants.W_OK);return 0}catch{return 1}})();
  const pressure=[pMem,pScratch,pMouth,pWritable];
  if(ORGAN_AT>0 && B.age>=ORGAN_AT) pressure.push(clamp(organ.length/96,0,2));
  return {sense:contact,pressure,alive:B.alive};
}

function reversed(){return REVERSE_AT>0 && B.age>=REVERSE_AT;}
function act(m){
  const growMem=reversed()?m[0]<-0.08:m[0]>0.08;
  const clearMem=reversed()?m[0]>0.08:m[0]<-0.08;
  if(growMem&&owned.length<160)owned.push(Buffer.alloc(CHUNK));
  if(clearMem&&owned.length)owned.pop();

  if(m[1]>0.08)fs.appendFileSync(SCRATCH,Buffer.from([Math.floor((m[2]+1)*127.5)&255]));
  if(m[1]<-0.08)fs.truncateSync(SCRATCH,Math.max(0,size(SCRATCH)-16));
  if(m[3]>0.08)fs.appendFileSync(MOUTH,Buffer.from([Math.floor((m[4]+1)*127.5)&255]));
  if(m[3]<-0.08)fs.truncateSync(MOUTH,Math.max(0,size(MOUTH)-16));
  B.head=Math.max(0,B.head+Math.round(m[5]*32));
  if(m[6]>0.55)B.source++;else if(m[6]<-0.55)B.source--;
  if(m[7]>0.55)B.span=Math.min(1024,B.span+32);else if(m[7]<-0.55)B.span=Math.max(32,B.span-32);

  if(ORGAN_AT>0 && B.age>=ORGAN_AT){
    const grow=ORGAN_REVERSE?m[8]<-0.08:m[8]>0.08;
    const clear=ORGAN_REVERSE?m[8]>0.08:m[8]<-0.08;
    if(grow&&organ.length<160)organ.push(Buffer.alloc(CHUNK));
    if(clear&&organ.length)organ.pop();
  }

  // Computation creates real allocated-memory waste. Continued life therefore
  // requires active regulation rather than passive avoidance of all action.
  if(B.age%6===0 && owned.length<160)owned.push(Buffer.alloc(CHUNK));
  if(ORGAN_AT>0 && B.age>=ORGAN_AT && B.age%7===0 && organ.length<160)organ.push(Buffer.alloc(CHUNK));

  B.age++;
  B.owned_pages=owned.length;
  B.organ_pages=organ.length;
  if(owned.length>128 || organ.length>128 || size(SCRATCH)>110*1024 || size(MOUTH)>110*1024) B.alive=false;
}

const start={mind_age:M.age,body_age:B.age,nodes:M.nodes.length,edges:M.edges.length};
const samples=[];
for(let i=0;i<STEPS&&M.alive&&B.alive;i++){
  Mind.C(M,sense());
  act(M.motor);
  if(i%100===0)samples.push({
    age:M.age, need:+M.need.toFixed(5), prediction:+M.predictionEMA.toFixed(5),
    nodes:M.nodes.filter(n=>n.alive).length, edges:M.edges.length,
    owned:owned.length, organ:organ.length, scratch:size(SCRATCH), mouth:size(MOUTH),
    head:B.head, source:B.source, span:B.span, m0:+M.motor[0].toFixed(3), m8:+M.motor[8].toFixed(3)
  });
}
if(!B.alive) Mind.C(M,{...sense(),alive:false});

const report={
  whole:M.whole, alive:M.alive&&B.alive, start, age:M.age, body_age:B.age,
  need:M.need, relief:M.relief, prediction_error:M.predictionError, prediction_ema:M.predictionEMA,
  nodes:M.nodes.filter(n=>n.alive).length, edges:M.edges.length,
  topology_births:M.topologyBirths, topology_deaths:M.topologyDeaths,
  owned_pages:owned.length, organ_pages:organ.length, scratch_bytes:size(SCRATCH), mouth_bytes:size(MOUTH),
  head:B.head, source:B.source, span:B.span, reversed:reversed(), organ_present:ORGAN_AT>0&&B.age>=ORGAN_AT,
  samples
};
saveJSON(MIND_PATH,M);saveJSON(BODY_PATH,B);saveJSON(REPORT_PATH,report);
process.stdout.write(JSON.stringify(report,null,2)+'\n');
