'use strict';

const fs=require('node:fs');
const LiveMind=require('./live-mind.js');
const input=process.env.MIND_STATE_IN;
if(!input) throw new Error('MIND_STATE_IN is required');
const M=JSON.parse(fs.readFileSync(input,'utf8'));
if(!M||M.whole!==1) throw new Error('input is not one whole M');
function talk(text){
  const started=performance.now();
  const contact={surface:{input:text,source:'miguel',target:'self'}};
  LiveMind.C(M,contact);
  const reply=M.current?.sequence?.expression??null;
  console.log(`MIGUEL: ${text}`);
  console.log(`M: ${reply??'<no expressed reply>'}`);
  console.log(`elapsed_ms: ${Math.round((performance.now()-started)*10)/10}`);
  return reply;
}
console.log('--- CONTINUING THE LATEST SAVED INDIVIDUAL ---');
talk('can you tell me my name?');
talk('do you remember where violin is?');
talk('what species would you say yume is?');
talk('what broad class does yume belong to?');
talk('hello.');
talk('what have you learned about me?');
talk('what have we been talking about?');
talk('why do you say yume belongs to the animal class?');
const output=process.env.MIND_STATE_OUT||'/tmp/continued-M4.json';
fs.writeFileSync(output,JSON.stringify(M));
console.log(JSON.stringify({one_persistent_M:M.whole===1,facts:M.knowledge?.facts?.length||0,rules:M.knowledge?.rules?.length||0,state:output},null,2));
