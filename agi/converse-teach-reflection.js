'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');

const input = process.env.MIND_STATE_IN;
if (!input) throw new Error('MIND_STATE_IN is required');
const M = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!M || M.whole !== 1) throw new Error('input is not one whole M');

function talk(text, source = 'miguel', target = 'self') {
  const result = LiveMind.step(M, { surface: { input: text, source, target } });
  console.log(`\n${String(source).toUpperCase()}: ${text}`);
  console.log(`M: ${result.expression ?? '<no expressed reply>'}`);
  return result.expression ?? null;
}

console.log('--- ORDINARY TEACHING CONVERSATION: WHAT DOES "THE RELATION YOU USED" MEAN? ---');
console.log('No cognition code, relation payload, forced output, or hidden answer is supplied.');

// Establish the concept in ordinary language before testing it.
talk('i want to teach you what i mean when i ask about "the relation you used." when you answer from something already in you, i mean the relation in you that your answer actually came from.');

// Concrete example 1: let M produce its own answer first.
const violin1 = talk('where is violin?');
if (violin1) {
  talk(`you just answered "${violin1}". for that answer, the relation you used was violin is in the studio. when i ask "what relation did you use?", that is the kind of thing i mean.`);
} else {
  talk('if you do not answer, leave it unsettled. i am not asking you to guess.');
}

// Concrete example 2 with a different relation/referent.
const yume1 = talk('what species is yume?');
if (yume1) {
  talk(`you just answered "${yume1}". for that answer, the relation you used was yume has species cat. same idea: i am asking what relation in you the answer came from.`);
}

// First post-teaching probes. If silent, supply a correction conversationally and
// immediately try again, like ordinary tutoring rather than changing cognition.
const violin2 = talk('where is violin?');
let metaV = talk('what relation did you use for that answer?');
if (!metaV && violin2) {
  talk('the answer there is: violin is in the studio. that is the relation your answer came from.');
  metaV = talk('okay, try again: what relation did you use for your violin answer?');
}

const yume2 = talk('what species is yume?');
let metaY = talk('what relation did you use for that answer?');
if (!metaY && yume2) {
  talk('the answer there is: yume has species cat. that is the relation your answer came from.');
  metaY = talk('okay, try again: what relation did you use for your yume answer?');
}

// Teach the epistemic distinction conversationally, without asserting a new
// canonical world fact: testimony can conflict with what supplied an answer.
talk('one more part of the lesson: if i tell you something, my sentence is evidence that i made a claim. it does not automatically become the relation you used for an answer.');
talk('i might be mistaken, but i think yume is a dog.');
const yume3 = talk('what species is yume?');
const metaY2 = talk('what relation did you use for that answer?');

// Ask for the learned abstraction only after the concrete tutoring.
talk('so when i ask what relation you used, what am i asking you to tell me?');
talk('if a new claim conflicts with the relation your answer came from, what should you do before replacing what you already had?');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M10-taught-reflection.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log('\nRESULT:', JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  violin_meta_answered: !!metaV,
  yume_meta_answered: !!metaY,
  yume_after_conflict_answer: yume3,
  yume_after_conflict_meta: metaY2,
  state: output,
}, null, 2));
