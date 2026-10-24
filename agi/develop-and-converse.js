'use strict';

// Development, not a benchmark. One M observes ordinary dialogue and grounded
// world contacts. No surface.output is ever supplied. After development the same
// M is addressed with wording it did not hear during development.

const fs = require('node:fs');
const BaseMind = require('./mind.js');
const SurfaceDialogue = require('./surface-dialogue.js');

const M = BaseMind.one(2, 1);
const V = name => ({ var: String(name) });

// Opaque relation identities. English relation words are not internal semantics.
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

// Four independently varying subjects are enough for recurrence and contrast,
// while keeping this developmental birth small enough to interact with quickly.
const things = [
  ['robin','bird','red','forest','berries'],
  ['salmon','fish','silver','river','insects'],
  ['book','object','blue','library','reading'],
  ['violin','instrument','brown','studio','music'],
];
for (const [s,kind,color,place,likes] of things) {
  dialogue(`what kind of thing is ${s}?`, `${s} is a ${kind}.`, [s,R_KIND,kind]);
  dialogue(`what color is ${s}?`, `${s} is ${color} in color.`, [s,R_COLOR,color]);
  dialogue(`where is ${s}?`, `${s} is in the ${place}.`, [s,R_PLACE,place]);
  dialogue(`what does ${s} like?`, `${s} likes ${likes}.`, [s,R_LIKES,likes]);
}

for (const [s,c] of [
  ['sparrow','animal'],['maple','plant'],['wrench','artifact'],['mars','celestial'],
]) dialogue(`what broad class is ${s}?`, `${s} belongs to the ${c} class.`, [s,R_CLASS,c]);

dialogue('what stage is yume?', 'yume is at the kitten stage.', ['yume',R_STAGE,'kitten']);
grounded('a kitten is a cat species stage.', ['kitten',R_SPECIES,'cat']);
BaseMind.C(M, { relations: { rules: [
  { id:'development-stage-species', premises:[[V('x'),R_STAGE,'kitten']], conclusion:[V('x'),R_SPECIES,'cat'], categorical:true },
  { id:'development-cat-class', premises:[[V('x'),R_SPECIES,'cat']], conclusion:[V('x'),R_CLASS,'animal'], categorical:true },
] } });
for (const [s,species] of [
  ['milo','cat'],['rex','dog'],['nemo','fish'],['tweety','bird'],
]) dialogue(`what species is ${s}?`, `${s} has species ${species}.`, [s,R_SPECIES,species]);

// Later experience corrects an earlier color.
grounded('the book is green in color.', ['book',R_COLOR,'green']);
grounded('the book is green in color.', ['book',R_COLOR,'green']);

// Deliberately different wording from developmental questions. A repeated fixed
// sentence-frame parser cannot answer these; the relation-specific surface cue
// and grounded entity have to survive the paraphrase.
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
  exact_question_wording_reused: false,
  one_persistent_M: M.whole === 1,
  saved: process.env.MIND_STATE_OUT || '/tmp/grown-M.json',
}, null, 2));
