'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');
const Dialogue = require('./surface-dialogue.js');
const TurnCompletion = require('./surface-turn-completion.js');
const Surface = require('./surface-template.js');

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
function cues() {
  return TurnCompletion.contextualRelationCues(Dialogue.episodes(M)).map(c => ({
    surface: Surface.renderTokens(c.tokens),
    support: c.support,
    predicate_diversity: c.predicate_diversity,
    triple_diversity: c.triple_diversity,
    answered_exposures: c.answered_exposures,
  }));
}

console.log('--- CONTINUE THE SAME M11: CORRECT OVERGENERALIZATION THROUGH LIVED CONTRAST ---');
console.log('No forced outputs or relation payloads. This continues the individual that already learned the contextual question and made the broad "is" mistake.');
console.log('CUES_BEFORE:', JSON.stringify(cues()));

// Negative contrast for the accidental broad cue. This is ordinary testimony,
// not a request to reproduce the previous support relation.
const conflictStatement = talk('i might be mistaken, but i think yume is a dog.');

// Positive contextual use should survive the narrowing.
const yumeAnswer = talk('what species is yume?');
const yumeSupport = talk('what relation did you use for that answer?');

// Check whether the learned cue is merely phrase-triggering on a declarative use.
// Whatever happens is retained as further experience for the same individual.
const declarative = talk('that answer is interesting.');

// Return to another relation family, then use a wording transfer that shares only
// the learned contextual structure/cue fragments rather than the original full
// scaffold sentence.
const violinAnswer = talk('where is violin?');
const violinParaphrase = talk('which relation did that answer come from?');

console.log('\nCUES_AFTER:', JSON.stringify(cues()));

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M12-contextual-correction.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log('\nRESULT:', JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  conflict_statement: conflictStatement,
  yume_answer: yumeAnswer,
  yume_support: yumeSupport,
  declarative_that_answer: declarative,
  violin_answer: violinAnswer,
  violin_paraphrase: violinParaphrase,
  cues: cues(),
  state: output,
}, null, 2));
