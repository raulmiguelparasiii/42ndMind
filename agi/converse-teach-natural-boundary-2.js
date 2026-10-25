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

console.log('--- TALK / TEACH / LEARN: NARROW THE REFLECTIVE FOLLOW-UP BY LIVED CONTRAST ---');
console.log('No cognition code, forced output, relation payload, or hidden answer is supplied. This continues M14.');

// Correct the exact overgeneralization conversationally.
talk('when i asked "is that surprising?" and you repeated "violin is in the studio," that was not what i meant. i was asking whether it surprised you. repeating the relation answered a different question. if you do not know whether something surprised you, you can leave that unsettled.');

// Positive case: ordinary answer followed by a question about what supported it.
const violin = talk('where is violin?');
const violinSupport = talk('what did that answer come from?');

// Negative contrast: same prior answer, but the follow-up is about surprise rather than support.
const violinSurprise = talk('is that surprising?');
if (violinSurprise && violinSupport && violinSurprise === violinSupport) {
  talk('you repeated the relation again. this question is not asking what the answer came from; it is asking about whether you were surprised by it.');
}

// Transfer to a different relation family.
const yume = talk('what species is yume?');
const yumeSupport = talk('what were you relying on for that?');
const yumeSurprise = talk('do you find that surprising?');
if (yumeSurprise && yumeSupport && yumeSurprise === yumeSupport) {
  talk('same correction here: that question is about surprise, not about the relation your answer came from.');
}

// Return to the positive reflective relation after the negative contrasts.
const yumeSupportAgain = talk('what did that answer come from?');

// Declarative reference should not request reproduction of support.
const statement = talk('that answer makes sense to me.');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M15-taught-natural-boundary.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log('\nRESULT:', JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  violin,
  violin_support: violinSupport,
  violin_surprise: violinSurprise,
  yume,
  yume_support: yumeSupport,
  yume_surprise: yumeSurprise,
  yume_support_again: yumeSupportAgain,
  statement,
  state: output,
}, null, 2));
