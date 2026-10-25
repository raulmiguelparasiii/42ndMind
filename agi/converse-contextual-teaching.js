'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');
const Dialogue = require('./surface-dialogue.js');
const TurnCompletion = require('./surface-turn-completion.js');

const input = process.env.MIND_STATE_IN;
if (!input) throw new Error('MIND_STATE_IN is required');
const M = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!M || M.whole !== 1) throw new Error('input is not one whole M');

function talk(text, source = 'miguel', target = 'self') {
  const result = LiveMind.step(M, { surface: { input: text, source, target } });
  console.log(`\n${String(source).toUpperCase()}: ${text}`);
  console.log(`M: ${result.expression ?? '<no expressed reply>'}`);
  if (result.expression) {
    const seq = M.current?.sequence || {};
    console.log('ACTION:', JSON.stringify({
      dialogue_induction: !!seq.dialogue_induction,
      contextual_relation_induction: !!seq.contextual_relation_induction,
      lived_turn_completion: !!seq.lived_turn_completion,
      grounding: seq.canonical_grounding || null,
      contextual_evidence: seq.contextual_relation_evidence || [],
    }));
  }
  return result.expression ?? null;
}
function learnedContextualCues() {
  const es = Dialogue.episodes(M);
  return TurnCompletion.contextualRelationCues(es).map(c => ({
    surface: require('./surface-template.js').renderTokens(c.tokens),
    support: c.support,
    predicate_diversity: c.predicate_diversity,
    triple_diversity: c.triple_diversity,
  }));
}

console.log('--- SCAFFOLDED ORDINARY TEACHING: LEARN A CONTEXTUAL RELATION QUESTION ---');
console.log('No relation payloads or forced outputs are supplied. Each scaffold keeps an already-learned concrete question in the same utterance so M can answer while experiencing the new wording.');

// First relation family: let the individual act, then put the unfamiliar wording
// beside a concrete question it already knows how to answer. The produced answer
// remains M's own action and its grounding is recorded by the normal live path.
talk('what species is yume?');
talk('what relation did you use for that answer? what species is yume?');

// Second relation family. The repeated wording is now present across two different
// predicates and two different support triples, so only a contextual description
// can explain the recurrence without pretending the phrase names one predicate.
talk('where is violin?');
talk('what relation did you use for that answer? where is violin?');

console.log('\nLEARNED_CONTEXTUAL_CUES:', JSON.stringify(learnedContextualCues()));

// Remove the scaffolding. Success here requires the learned contextual role to use
// the immediately previous self-action's actual grounding rather than a fixed
// Yume/violin phrase mapping.
const bareViolin = talk('what relation did you use for that answer?');

talk('what species is yume?');
const bareYume = talk('what relation did you use for that answer?');

// Give a conflicting claim after the contextual question has been learned. The
// relation reported should still be the one that actually grounds M's answer, not
// merely the most recent sentence Miguel supplied.
talk('i might be mistaken, but i think yume is a dog.');
const yumeAfterConflict = talk('what species is yume?');
const supportAfterConflict = talk('what relation did you use for that answer?');

// A small wording transfer probe. No special success criterion is imposed here;
// it simply shows how narrow or broad the learned surface cue currently is.
const paraphrase = talk('which relation did that answer come from?');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M11-contextual-teaching.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log('\nRESULT:', JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  learned_contextual_cues: learnedContextualCues(),
  bare_violin_support: bareViolin,
  bare_yume_support: bareYume,
  yume_after_conflict: yumeAfterConflict,
  support_after_conflict: supportAfterConflict,
  paraphrase,
  state: output,
}, null, 2));
