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

console.log('--- FREER ORDINARY CONVERSATION AFTER CONTEXTUAL TEACHING ---');
console.log('No new teaching code and no relation payloads. This continues M13 and varies the wording naturally.');

const yume = talk('hey, what species is yume?');
const relying = talk('what were you relying on for that?');

const violin = talk('where is violin?');
const negativeQuestion = talk('is that surprising?');

const violinAgain = talk('where is violin?');
const cameFrom = talk('what did that answer come from?');

const statement = talk('that answer makes sense.');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M14-natural-context.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log('\nRESULT:', JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  yume,
  relying,
  violin,
  negative_question: negativeQuestion,
  violin_again: violinAgain,
  came_from: cameFrom,
  statement,
  state: output,
}, null, 2));
