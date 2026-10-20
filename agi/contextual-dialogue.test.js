'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

const V = name => ({ var: String(name) });
const M = Mind.one(1, 1);

function paired(input, output, fact) {
  Mind.C(M, { surface: { input, output }, relations: { facts: [fact] } });
}

function dialogue(entity, color) {
  paired(`consider ${entity}.`, 'noted.', [entity, 'dialogue_topic', 'active']);
  paired('what color is it?', `it is ${color}.`, [entity, 'has_color', color]);
}

dialogue('beta', 'red');
dialogue('gamma', 'blue');
dialogue('delta', 'green');
dialogue('epsilon', 'red');

// Alpha's target color is never taught as a dialogue answer.
for (let i = 0; i < 3; i++) paired('alpha is ember.', 'alpha is ember.', ['alpha', 'kind', 'ember']);
Mind.C(M, { relations: { rules: [{
  id: 'world:context-color',
  premises: [[V('x'), 'kind', 'ember']],
  conclusion: [V('x'), 'has_color', 'red'],
  categorical: true,
}] } });
assert(M.knowledge.current.facts.some(f => f.subject === 'alpha' && f.relation === 'has_color' && f.object === 'red'));

// Establish alpha as the current discourse subject through ordinary paired
// experience, then omit alpha entirely from the follow-up question.
paired('consider alpha.', 'noted.', ['alpha', 'dialogue_topic', 'active']);
const probe = structuredClone(M);
Mind.C(probe, { surface: { input: 'what color is it?' } });

assert.strictEqual(probe.current.sequence.expression, 'it is red.');
assert.strictEqual(probe.current.sequence.canonical_grounding.subject, 'alpha');
assert.strictEqual(probe.current.sequence.canonical_grounding.relation, 'has_color');
assert.strictEqual(probe.current.sequence.canonical_grounding.authority, 'canonical_M');
assert.strictEqual(probe.current.sequence.contextual_subject_resolution, true);

console.log(JSON.stringify({
  multi_turn_context: true,
  explicit_subject_in_followup: false,
  contextual_subject: probe.current.sequence.canonical_grounding.subject,
  reply: probe.current.sequence.expression,
  canonical_M_authority: true,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('CONTEXTUAL DIALOGUE FALSIFICATION: PASS');
