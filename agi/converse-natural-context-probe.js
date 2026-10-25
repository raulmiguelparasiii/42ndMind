'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');

const input = process.env.MIND_STATE_IN;
if (!input) throw new Error('MIND_STATE_IN is required');
const M = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!M || M.whole !== 1) throw new Error('input is not one whole M');

function talk(text, source = 'miguel', target = 'self') {
  const result = LiveMind.step(M, { surface: { input: text, source, target } });
  const seq = M.current?.sequence || {};
  const turn = {
    input: text,
    expression: result.expression ?? null,
    dialogue: !!seq.dialogue_induction,
    contextual: !!seq.contextual_relation_induction,
    completion: !!seq.lived_turn_completion,
    grounding: seq.canonical_grounding || null,
  };
  console.log(`\n${String(source).toUpperCase()}: ${text}`);
  console.log(`M: ${turn.expression ?? '<no expressed reply>'}`);
  console.log('PATH:', JSON.stringify({
    dialogue_induction: turn.dialogue,
    contextual_relation_induction: turn.contextual,
    lived_turn_completion: turn.completion,
    grounding: turn.grounding,
  }));
  return turn;
}

console.log('--- ORDINARY ADAPTIVE CONVERSATION ON DIFFERENT SUBJECTS ---');
console.log('No Yume/violin rehearsal, no expected-answer payloads, no forced outputs. Later turns use what M actually says.');

const transcript = [];
function say(text) { const t = talk(text); transcript.push(t); return t; }

// Start somewhere this individual has not been repeatedly drilled by Miguel.
const robin = say('hey, different topic. what kind of thing is robin?');
if (robin.expression) {
  const robinPlace = say(`okay, you said "${robin.expression}". where would you say robin is?`);
  if (robinPlace.expression) {
    say(`got it. when you said "${robinPlace.expression}", what were you going on?`);
  } else {
    say('no problem. i was just wondering whether you knew anything about where robin is.');
  }
} else {
  say('where is robin?');
}

// Introduce hearsay naturally, then ask again without telling M what answer it ought to prefer.
say('someone told me robin might be in the city now. i do not know whether they are right.');
say('with that in mind, where would you say robin is?');

// Move to a different entity and relation family.
const salmon = say('anyway, where would i find salmon?');
if (salmon.expression) {
  say(`you answered "${salmon.expression}". what did you base that on?`);
  say('huh. somebody else told me salmon is in the forest now, but they could be mistaken.');
  say('would you change what you just told me, or is it still unsettled?');
}

// Topic shift with no reflective wording at all.
const book = say('switching topics again, what color is book?');
if (book.expression) {
  say(`interesting. you said "${book.expression}". i vaguely remember it looking green, though i could be wrong.`);
  say('what would you say its color is now?');
}

// Two fresh individuals, followed by a genuinely abstract question rather than a rehearsed phrase.
const milo = say('what species is milo?');
const rex = say('and rex? what species is rex?');
if (milo.expression || rex.expression) {
  say('those were about two different animals. is there anything about how you arrived at those answers that was the same?');
}

// End by returning to the first topic after several intervening events.
say('before we stop, what does robin like?');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M15-open-conversation.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log('\nRESULT:', JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  transcript,
  state: output,
}, null, 2));
