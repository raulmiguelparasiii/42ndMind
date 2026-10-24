'use strict';

// Continue one previously grown individual. This is developmental interaction,
// not a fresh test mind. The input state is loaded, enriched through lived social
// experience, then addressed normally. No surface.output is supplied anywhere.

const fs=require('node:fs');
const LiveMind=require('./live-mind.js');

const input=process.env.MIND_STATE_IN;
if(!input) throw new Error('MIND_STATE_IN is required');
const M=JSON.parse(fs.readFileSync(input,'utf8'));
if(!M||M.whole!==1) throw new Error('input is not one whole M');

const R_NAME='ρsocial:name:13a7';

function contact(surface,relations){
  const r={surface}; if(relations) r.relations=relations;
  LiveMind.C(M,r); return M.current?.sequence?.expression??null;
}
function grounded(text,triple,source,target){
  return contact({input:text,source,target},{facts:[triple]});
}
function hear(text,source,target){ return contact({input:text,source,target}); }
function nameLife(person,name,teacher,variant){
  // The introduction is reality-grounded during development. Its hidden subject
  // is the actual speaker; the visible name varies independently.
  grounded(variant===0?`I'm ${name}.`:variant===1?`I am ${name}.`:variant===2?`My name is ${name}.`:`People call me ${name}.`,[person,R_NAME,name],person,teacher);
  hear(variant%2===0?'what is my name?':'can you tell me my name?',person,teacher);
  grounded(variant%2===0?`your name is ${name}.`:`I know you as ${name}.`,[person,R_NAME,name],teacher,person);
}

nameLife('person-alfa','alice','teacher-a',0);
nameLife('person-bravo','ben','teacher-b',1);
nameLife('person-charlie','carla','teacher-c',2);
nameLife('person-delta','daniel','teacher-d',3);
nameLife('person-echo','elena','teacher-e',0);
nameLife('person-foxtrot','farid','teacher-f',2);

// Procedural social exchange is also lived rather than coded. Different people
// greet one another; no relation label or target response is supplied to C.
for(const [a,b] of [['g1','h1'],['g2','h2'],['g3','h3'],['g4','h4']]){
  hear('hello.',a,b);
  hear('hello.',b,a);
}

console.log('--- CONTINUING THE SAME INDIVIDUAL ---');
function talk(text){
  const t=performance.now(); const reply=hear(text,'miguel','self');
  console.log(`MIGUEL: ${text}`);
  console.log(`M: ${reply??'<no expressed reply>'}`);
  console.log(`elapsed_ms: ${Math.round((performance.now()-t)*10)/10}`);
  return reply;
}

talk('hello.');
talk("I'm Miguel.");
talk('can you tell me my name?');
talk('what species would you say yume is?');
talk('what broad class does yume belong to?');
talk('could you tell me the color of robin?');
talk('what have you learned about me?');
talk('what have we been talking about?');

const output=process.env.MIND_STATE_OUT||'/tmp/continued-M.json';
fs.writeFileSync(output,JSON.stringify(M));
console.log(JSON.stringify({one_persistent_M:M.whole===1,facts:M.knowledge?.facts?.length||0,rules:M.knowledge?.rules?.length||0,state:output},null,2));
