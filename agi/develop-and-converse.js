'use strict';

// Development, not a benchmark. One M observes ordinary dialogue and grounded
// world contacts. No surface.output is ever supplied. After development the same
// M is addressed conversationally and its own expressions are printed.

const fs = require('node:fs');
const BaseMind = require('./mind.js');
const SurfaceDialogue = require('./surface-dialogue.js');

const M = BaseMind.one(2, 1);
const V = name => ({ var: String(name) });

// Opaque relation identities. English words do not name these relations in code.
const R_KIND = 'ρd:7f13';
const R_COLOR = 'ρd:c281';
const R_PLACE = 'ρd:09aa';
const R_LIKES = 'ρd:b337';
const R_CLASS = 'ρd:44e0';
const R_STAGE = 'ρd:e572';
const R_SPECIES = 'ρd:69ac';

function experience(text, source='speaker') {
  BaseMind.C(M, { surface: { input: text, source } });
}
function grounded(text, triple, source='teacher') {
  BaseMind.C(M, { surface: { input: text, source }, relations: { facts: [triple] } });
}
function dialogue(question, answerText, triple) {
  experience(question, 'learner');
  grounded(answerText, triple, 'teacher');
}
function converse(text, source='miguel') {
  const contact = { surface: { input: text, source } };
  BaseMind.C(M, contact);
  SurfaceDialogue.respond(M, contact);
  return M.current?.sequence?.expression ?? null;
}

const things = [
  ['robin','bird','red','forest','berries'],
  ['salmon','fish','silver','river','insects'],
  ['oak','tree','green','forest','sunlight'],
  ['rose','flower','red','garden','sunlight'],
  ['hammer','tool','gray','workshop','work'],
  ['spoon','utensil','silver','kitchen','soup'],
  ['cat','animal','black','home','fish'],
  ['dog','animal','brown','home','play'],
  ['whale','animal','blue','ocean','krill'],
  ['eagle','bird','brown','mountain','fish'],
  ['carrot','vegetable','orange','garden','water'],
  ['apple','fruit','red','orchard','sunlight'],
  ['moon','satellite','gray','space','orbit'],
  ['earth','planet','blue','space','sunlight'],
  ['book','object','blue','library','reading'],
  ['kettle','object','silver','kitchen','water'],
  ['violin','instrument','brown','studio','music'],
  ['piano','instrument','black','studio','music'],
];

for (const [s,kind,color,place,likes] of things) {
  dialogue(`what kind of thing is ${s}?`, `${s} is a ${kind}.`, [s,R_KIND,kind]);
  dialogue(`what color is ${s}?`, `${s} is ${color} in color.`, [s,R_COLOR,color]);
  dialogue(`where is ${s}?`, `${s} is in the ${place}.`, [s,R_PLACE,place]);
  dialogue(`what does ${s} like?`, `${s} likes ${likes}.`, [s,R_LIKES,likes]);
}

for (const [s,c] of [
  ['sparrow','animal'],['trout','animal'],['maple','plant'],['tulip','plant'],
  ['wrench','artifact'],['fork','artifact'],['guitar','artifact'],['mars','celestial'],
  ['venus','celestial'],['jupiter','celestial'],
]) dialogue(`what broad class is ${s}?`, `${s} belongs to the ${c} class.`, [s,R_CLASS,c]);

dialogue('what stage is yume?', 'yume is at the kitten stage.', ['yume',R_STAGE,'kitten']);
grounded('a kitten is a cat species stage.', ['kitten',R_SPECIES,'cat']);

BaseMind.C(M, { relations: { rules: [
  { id:'development-stage-species', premises:[[V('x'),R_STAGE,'kitten']], conclusion:[V('x'),R_SPECIES,'cat'], categorical:true },
  { id:'development-cat-class', premises:[[V('x'),R_SPECIES,'cat']], conclusion:[V('x'),R_CLASS,'animal'], categorical:true },
] } });

for (const [s,species] of [
  ['milo','cat'],['luna','cat'],['rex','dog'],['fido','dog'],['nemo','fish'],['dory','fish']
]) dialogue(`what species is ${s}?`, `${s} has species ${species}.`, [s,R_SPECIES,species]);

grounded('the book is green in color.', ['book',R_COLOR,'green']);
grounded('the book is green in color.', ['book',R_COLOR,'green']);

const prompts = [
  'what kind of thing is robin?',
  'where is violin?',
  'what does whale like?',
  'what color is book?',
  'what species is yume?',
  'what broad class is yume?',
  'what kind of thing is earth?',
  'what color is rose?',
];

console.log('--- ORDINARY CONVERSATION WITH THE GROWN M ---');
for (const prompt of prompts) {
  const started = performance.now();
  const reply = converse(prompt, 'miguel');
  const elapsed = Math.round((performance.now()-started)*10)/10;
  console.log(`MIGUEL: ${prompt}`);
  console.log(`M: ${reply ?? '<no expressed reply>'}`);
  console.log(`elapsed_ms: ${elapsed}`);
}

fs.writeFileSync(process.env.MIND_STATE_OUT || '/tmp/grown-M.json', JSON.stringify(M));
console.log(JSON.stringify({
  contacts: M.contacts?.length || 0,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  output_fixture_used: false,
  one_persistent_M: M.whole === 1,
  saved: process.env.MIND_STATE_OUT || '/tmp/grown-M.json',
}, null, 2));
