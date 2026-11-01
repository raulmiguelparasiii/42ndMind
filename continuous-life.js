'use strict';

// Canonical host life: the environment is the running OS process and repository,
// not a scripted task world. M receives raw bytes/magnitudes and bodily pressure.
const fs=require('fs'), os=require('os'), path=require('path');
const Mind=require('./one-mind.js');
const ROOT=__dirname, STATE=path.join(ROOT,'state'), BODY=path.join(STATE,'body');
fs.mkdirSync(BODY,{recursive:true});
const MIND_PATH=path.join(STATE,'canonical-mind.json');
const BODY_PATH=path.join(STATE,'canonical-body.json');
const REPORT_PATH=path.join(STATE,'life-report.json');
const SCRATCH=path.join(BODY,'scratch.bin'), MOUTH=path.join(BODY,'mouth.bin');
if(!fs.existsSync(SCRATCH))fs.writeFileSync(SCRATCH,Buffer.alloc(0));
if(!fs.existsSync(MOUTH))fs.writeFileSync(MOUTH,Buffer.alloc(0));
const STEPS=Math.max(1,Math.floor(Number(process.env.LIFE_STEPS||1200)));
const REVERSE_BODY=process.env.REVERSE_BODY==='1';
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function loadJSON(p,fallback){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return fallback}}
function saveJSON(p,x){fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n')}
function raw(file,n){try{return fs.readFileSync(file).subarray(0,n)}catch{return Buffer.alloc(0)}}
function bytes(buf,n){const o=[];for(let i=0;i<n;i++)o.push(i<buf.length?(buf[i]-127.5)/127.5:0);return o;}
function size(p){try{return fs.statSync(p).size}catch{return 0}}
function newBody(){return{host_body:1,alive:true,age:0,owned_pages:0,head:0,sensor_span:192,source_index:0};}
let M=loadJSON(MIND_PATH,null), B=loadJSON(BODY_PATH,null);
if(!M||M.whole!==1||!Array.isArray(M.field))M=Mind.one(8);
if(!B||B.host_body!==1)B=newBody();
const owned=[];for(let i=0;i<B.owned_pages;i++)owned.push(Buffer.alloc(1024*1024));
function sources(){
 const entries=fs.readdirSync(ROOT).sort().map(x=>path.join(ROOT,x));
 return [Buffer.from(entries.join('\0')),raw('/proc/self/stat',256),raw('/proc/meminfo',512),raw(path.join(ROOT,'one-mind.js'),1024),raw(SCRATCH,512),raw(MOUTH,512)];
}
function sense(){
 const mu=process.memoryUsage(), src=sources(), chosen=src[((B.source_index%src.length)+src.length)%src.length];
 const stream=Buffer.concat(src.concat([chosen]));
 const span=clamp(B.sensor_span,64,1024), start=Math.min(B.head,Math.max(0,stream.length-1));
 const s=bytes(stream.subarray(start,start+span),span);
 s.push(...os.loadavg().map(v=>Math.tanh(v/8)),Math.tanh(mu.rss/128e6),Math.tanh(os.freemem()/Math.max(1,os.totalmem())),Math.sin(Date.now()/997),Math.cos(Date.now()/997));
 const memoryPressure=clamp((owned.length*1024*1024)/(24*1024*1024),0,1.5);
 const scratchPressure=clamp(size(SCRATCH)/(64*1024),0,1.5);
 const mouthPressure=clamp(size(MOUTH)/(64*1024),0,1.5);
 const writable=(()=>{try{fs.accessSync(BODY,fs.constants.W_OK);return 0}catch{return 1}})();
 return{sense:s,pressure:[memoryPressure,scratchPressure,mouthPressure,writable],alive:B.alive};
}
function act(m){
 const grow=REVERSE_BODY?m[0]<-0.06:m[0]>0.06, shrink=REVERSE_BODY?m[0]>0.06:m[0]<-0.06;
 if(grow&&owned.length<40)owned.push(Buffer.alloc(1024*1024));
 if(shrink&&owned.length){owned.pop();if(global.gc)global.gc();}
 if(m[1]>0.06)fs.appendFileSync(SCRATCH,Buffer.from([Math.floor((m[3]+1)*127.5)&255]));
 if(m[1]<-0.06)fs.truncateSync(SCRATCH,Math.max(0,size(SCRATCH)-16));
 if(m[4]>0.08)fs.appendFileSync(MOUTH,Buffer.from([Math.floor((m[5]+1)*127.5)&255]));
 if(m[4]<-0.08)fs.truncateSync(MOUTH,Math.max(0,size(MOUTH)-16));
 B.head=Math.max(0,B.head+Math.round(m[2]*24));
 if(m[6]>0.75)B.source_index++; else if(m[6]<-0.75)B.source_index--;
 if(m[7]>0.8)B.sensor_span=Math.min(1024,B.sensor_span+32); else if(m[7]<-0.8)B.sensor_span=Math.max(64,B.sensor_span-32);
 B.owned_pages=owned.length;B.age++;
 if(owned.length>26||size(SCRATCH)>70*1024||size(MOUTH)>70*1024)B.alive=false;
}
const start={age:M.age,field:M.field.length,body_age:B.age};
const samples=[];
for(let i=0;i<STEPS&&B.alive&&M.alive;i++){
 Mind.C(M,sense());act(M.motor);
 if(i%50===0)samples.push({age:M.age,need:+M.need.toFixed(5),field:M.field.length,ownedMB:owned.length,scratch:size(SCRATCH),mouth:size(MOUTH),sensor_span:B.sensor_span,m0:+M.motor[0].toFixed(3)});
}
if(!B.alive)Mind.C(M,{...sense(),alive:false});
const report={whole:M.whole,alive:M.alive&&B.alive,start,age:M.age,field:M.field.length,growth:M.growth,need:M.need,relief:M.relief,ownedMB:owned.length,scratch:size(SCRATCH),mouth:size(MOUTH),sensor_span:B.sensor_span,body_age:B.age,reversed_body:REVERSE_BODY,samples};
saveJSON(MIND_PATH,M);saveJSON(BODY_PATH,B);saveJSON(REPORT_PATH,report);process.stdout.write(JSON.stringify(report,null,2)+'\n');
