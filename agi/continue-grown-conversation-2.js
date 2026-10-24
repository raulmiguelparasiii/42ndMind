'use strict';

const fs=require('node:fs');
const LiveMind=require('./live-mind.js');
const input=process.env.MIND_STATE_IN;
if(!input) throw new Error('MIND_STATE_IN is required');
const M=JSON.parse(fs.readFileSync(input,'utf8'));
if(!M||M.whole!==1) throw new Error('input is not one whole M');
const R_NAME='ρsocial:name:13a7';
function C(surface,relations){const c={surface};if(relations)c.relations=relations;LiveMind.C(M,c);return M.current?.sequence?.expression??null;}
function grounded(text,triple,source,target){return C({input:text,source,target},{facts:[triple]});}
function talk(text){const t=performance.now();const r=C({input:text,source:'miguel',target:'self'});console.log(`MIGUEL: ${text}`);console.log(`M: ${r??'<no expressed reply>'}`);console.log(`elapsed_ms: ${Math.round((performance.now()-t)*10)/10}`);return r;}

// More independently sourced experience makes the already-retained "I'm Miguel"
// interpretable without asking Miguel to repeat it. The new examples are not about
// Miguel and occur after his original utterance.
grounded("I'm Grace.",['person-golf',R_NAME,'grace'],'person-golf','teacher-g');
grounded("I'm Hana.",['person-hotel',R_NAME,'hana'],'person-hotel','teacher-h');
grounded("I'm Ivan.",['person-india',R_NAME,'ivan'],'person-india','teacher-i');

console.log('--- SAME INDIVIDUAL AFTER LATER STABILIZATION ---');
talk('can you tell me my name?');
talk('what species would you say yume is?');
talk('what broad class does yume belong to?');
talk('could you tell me the color of robin?');
talk('do you remember where violin is?');
talk('hello.');
talk('what have you learned about me?');
talk('what have we been talking about?');

const output=process.env.MIND_STATE_OUT||'/tmp/continued-M2.json';
fs.writeFileSync(output,JSON.stringify(M));
console.log(JSON.stringify({one_persistent_M:M.whole===1,facts:M.knowledge?.facts?.length||0,rules:M.knowledge?.rules?.length||0,state:output},null,2));
