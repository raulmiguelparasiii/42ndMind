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
  console.log(`\n${String(source).toUpperCase()}: ${text}`);
  console.log(`M: ${result.expression ?? '<no expressed reply>'}`);
  console.log('PATH:', JSON.stringify({
    dialogue_induction: !!seq.dialogue_induction,
    contextual_relation_induction: !!seq.contextual_relation_induction,
    lived_turn_completion: !!seq.lived_turn_completion,
    grounding: seq.canonical_grounding || null,
    contextual_evidence: seq.contextual_relation_evidence || [],
  }));
  return { expression: result.expression ?? null, contextual: !!seq.contextual_relation_induction };
}

console.log('--- TALK / TEACH / LEARN: CONTINUE M13 THROUGH NATURAL TRANSFER AND CORRECTION ---');
console.log('No cognition changes, forced outputs, or relation payloads. Everything below is ordinary conversation.');

// Reproduce the already-observed freer M14 continuation.
const yume = talk('hey, what species is yume?');
const relying = talk('what were you relying on for that?');
const violin = talk('where is violin?');
const negativeQuestion = talk('is that surprising?');
const violinAgain = talk('where is violin?');
const cameFrom = talk('what did that answer come from?');
const statement = talk('that answer makes sense.');

// Teach against the observed overgeneralization by ordinary contrast.
talk('when i asked "is that surprising?" and you repeated "violin is in the studio," that answered a different question. i was asking whether it surprised you. if you do not know whether it surprised you, leave that unsettled instead of repeating the relation.');

// Positive support question, then the negative contrast on the same content.
const violin2 = talk('where is violin?');
const violinSupport2 = talk('what did that answer come from?');
const violinSurprise2 = talk('is that surprising?');
if (violinSurprise2.expression && violinSupport2.expression && violinSurprise2.expression === violinSupport2.expression) {
  talk('that repeated the relation again. "what did that answer come from?" asks about the relation. "is that surprising?" asks something different.');
}

// Transfer the same distinction to Yume.
const yume2 = talk('what species is yume?');
const yumeSupport2 = talk('what were you relying on for that?');
const yumeSurprise2 = talk('do you find that surprising?');
if (yumeSurprise2.expression && yumeSupport2.expression && yumeSurprise2.expression === yumeSupport2.expression) {
  talk('same correction: this is about whether you find it surprising, not about which relation supported the answer.');
}

// Return to the positive higher-order use after correction.
const yumeSupportAgain = talk('what did that answer come from?');
const finalStatement = talk('that answer makes sense to me.');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M15-natural-boundary.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log('\nRESULT:', JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  before_correction: { yume, relying, violin, negative_question: negativeQuestion, came_from: cameFrom, statement },
  after_correction: {
    violin: violin2,
    violin_support: violinSupport2,
    violin_surprise: violinSurprise2,
    yume: yume2,
    yume_support: yumeSupport2,
    yume_surprise: yumeSurprise2,
    yume_support_again: yumeSupportAgain,
    statement: finalStatement,
  },
  state: output,
}, null, 2));
