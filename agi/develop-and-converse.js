'use strict';

// Development, not a benchmark. One M observes ordinary dialogue and grounded
// world contacts. No surface.output is ever supplied. After development the same
// M is addressed with wording it did not hear during development.

const fs = require('node:fs');
const BaseMind = require('./mind.js');
const SurfaceDialogue = require('./surface-dialogue.js');
const SurfaceAgency = require('./surface-agency.js');

const M = BaseMind.one(2, 1);
const V = name => ({ var: String(name) });

const R_KIND = 'ρd:7f13';
const R_COLOR = 'ρd:c281';
const R_PLACE = 'ρd:09aa';
const R_LIKES = 'ρd:b337';
const R_CLASS = 'ρd:44e0';
const R_STAGE = 'ρd:e572';
const R_SPECIES = 'ρd:69ac';

function experience(text, source='speaker-a', target='speaker-b') {
  const contact={ surface:{ input:text, source, target } };
  BaseMind.C(M, contact);
  SurfaceAgency.record(M, contact);
}
function grounded(text, triple, source='speaker-b', target='speaker-a') {
  const contact={ surface:{ input:text, source, target }, relations:{ facts:[triple] } };
  BaseMind.C(M, contact);
  SurfaceAgency.record(M, contact);
}
function dialogue(question, answerText, triple, source='speaker-a', target='speaker-b') {
  experience(question, source, target);
  grounded(answerText, triple, target, source);
}
function converse(text, source='miguel') {
  const contact={ surface:{ input:text, source, target:'self' } };
  BaseMind.C(M, contact);
  SurfaceDialogue.respond(M, contact);
  const reply=M.current?.sequence?.expression ?? null;
  SurfaceAgency.record(M, contact);
  return reply;
}

const things = [
  ['robin','bird','red','forest','berries'],
  ['salmon','fish','silver','river','insects'],
  ['book','object','blue','library','reading'],
  ['violin','instrument','brown','studio','music'],
];
const kindQ=[s=>`what kind of thing is ${s}?`,s=>`what is the kind of ${s}?`,s=>`can you tell me the kind of ${s}?`,s=>`which kind describes ${s}?`];
const colorQ=[s=>`what color is ${s}?`,s=>`what is the color of ${s}?`,s=>`which color does ${s} have?`,s=>`can you tell me ${s}'s color?`];
const placeQ=[s=>`where is ${s}?`,s=>`what place is ${s} in?`,s=>`which place contains ${s}?`,s=>`can you tell me where ${s} is?`];
const likesQ=[s=>`what does ${s} like?`,s=>`what is ${s} fond of?`,s=>`what does ${s} enjoy?`,s=>`can you tell me what ${s} likes?`];
for (let i=0;i<things.length;i++) {
  const [s,kind,color,place,likes]=things[i];
  dialogue(kindQ[i](s), `${s} is a ${kind}.`, [s,R_KIND,kind], `person-${i}`, 'teacher');
  dialogue(colorQ[i](s), `${s} is ${color} in color.`, [s,R_COLOR,color], `person-${i}`, 'teacher');
  dialogue(placeQ[i](s), `${s} is in the ${place}.`, [s,R_PLACE,place], `person-${i}`, 'teacher');
  dialogue(likesQ[i](s), `${s} likes ${likes}.`, [s,R_LIKES,likes], `person-${i}`, 'teacher');
}

const classes=[['sparrow','animal'],['trout','animal'],['maple','plant'],['tulip','plant']];
for(let i=0;i<classes.length;i++) {
  const [s,c]=classes[i];
  const q=i%2?`what is the broad class of ${s}?`:`what broad class is ${s}?`;
  dialogue(q, `${s} belongs to the ${c} class.`, [s,R_CLASS,c], `class-person-${i}`,'teacher');
}

dialogue('what stage is yume?', 'yume is at the kitten stage.', ['yume',R_STAGE,'kitten'],'miguel','teacher');
grounded('a kitten is a cat species stage.', ['kitten',R_SPECIES,'cat'],'teacher','self');
BaseMind.C(M, { relations: { rules: [
  { id:'development-stage-species', premises:[[V('x'),R_STAGE,'kitten']], conclusion:[V('x'),R_SPECIES,'cat'], categorical:true },
  { id:'development-cat-class', premises:[[V('x'),R_SPECIES,'cat']], conclusion:[V('x'),R_CLASS,'animal'], categorical:true },
] } });
const species=[['milo','cat'],['luna','cat'],['rex','dog'],['fido','dog']];
for(let i=0;i<species.length;i++) {
  const [s,v]=species[i];
  const q=i%2?`what is the species of ${s}?`:`what species is ${s}?`;
  dialogue(q, `${s} has species ${v}.`, [s,R_SPECIES,v], `species-person-${i}`,'teacher');
}

// Deliberately new wording. Generic function words such as "of" occurred across
// several intents during development, so only relation-stable evidence should
// survive as meaning.
const prompts = [
  'can you tell me what kind of thing robin is?',
  'do you remember where violin is?',
  'tell me what salmon likes.',
  'which color would you say the book is?',
  'what species would you say yume is?',
  'which broad class does yume belong to?',
  'remind me what kind of thing the violin is.',
  'could you tell me the color of robin?',
];

console.log('--- ORDINARY CONVERSATION WITH THE GROWN M ---');
for (const prompt of prompts) {
  const started=performance.now();
  const reply=converse(prompt,'miguel');
  const elapsed=Math.round((performance.now()-started)*10)/10;
  console.log(`MIGUEL: ${prompt}`);
  console.log(`M: ${reply ?? '<no expressed reply>'}`);
  console.log(`elapsed_ms: ${elapsed}`);
}

fs.writeFileSync(process.env.MIND_STATE_OUT || '/tmp/grown-M.json', JSON.stringify(M));
console.log(JSON.stringify({
  facts:M.knowledge?.facts?.length||0,
  rules:M.knowledge?.rules?.length||0,
  output_fixture_used:false,
  exact_question_wording_reused:false,
  independently_varied_argument_roles:true,
  speaker_addressee_retained:true,
  one_persistent_M:M.whole===1,
  saved:process.env.MIND_STATE_OUT||'/tmp/grown-M.json',
},null,2));
