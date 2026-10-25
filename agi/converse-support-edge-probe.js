'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');

const input = process.env.MIND_STATE_IN;
if (!input) throw new Error('MIND_STATE_IN is required');
const M = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!M || M.whole !== 1) throw new Error('input is not one whole M');

function values(facts, subject, relation) {
  return facts.filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function subjectsOfKind(facts, kind) {
  return [...new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === kind).map(f => String(f.subject)))];
}
function livedOrderOf(facts, subject) {
  return values(facts, subject, 'ρ:lived_order').find(Number.isFinite);
}
function references(f, ids) {
  if (ids.has(String(f.subject))) return true;
  if (f.object?.ref !== undefined && ids.has(String(f.object.ref))) return true;
  if (Array.isArray(f.object) && f.object.some(x => x?.ref !== undefined && ids.has(String(x.ref)))) return true;
  return false;
}
function compact(f) { return { subject: f.subject, relation: f.relation, object: f.object, derived_from: f.derived_from }; }

function talk(text) {
  const result = LiveMind.step(M, { surface: { input: text, source: 'miguel', target: 'self' } });
  console.log(`\nMIGUEL: ${text}`);
  console.log(`M: ${result.expression ?? '<no expressed reply>'}`);
  return result;
}

console.log('--- REFLECTIVE SUPPORT EDGE PROBE ---');

const answer = talk('what species is yume?');
const factsAfterAnswer = M.knowledge?.current?.facts || [];
const answerOrder = M.structure?.lived_contact_order;
const action = subjectsOfKind(factsAfterAnswer, 'self_surface_action_occurrence')
  .find(id => livedOrderOf(factsAfterAnswer, id) === answerOrder);
const supports = action ? values(factsAfterAnswer, action, 'ρ:produced_from').map(x => x?.ref).filter(Boolean).map(String) : [];
console.log('ANSWER_ACTION:', JSON.stringify({ order: answerOrder, expression: answer.expression ?? null, action, supports }));

const reflection = talk('what relation did you use for that answer?');
const field = reflection.field || {};
const ids = new Set([action, ...supports].filter(Boolean).map(String));
const neighborhood = name => (field[name] || []).filter(f => references(f, ids)).map(compact);
console.log('REFLECTIVE_NEIGHBORHOOD:', JSON.stringify({
  order: M.structure?.lived_contact_order,
  expression: reflection.expression ?? null,
  action,
  supports,
  referential_cues: neighborhood('referential_cues'),
  affected_facts: neighborhood('affected_facts'),
  supporting_facts: neighborhood('supporting_facts'),
  participating_facts: neighborhood('participating_facts'),
}, null, 2));

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M9-support-edge-probe.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  state: output,
}, null, 2));
