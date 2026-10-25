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
function supportView(facts, id) {
  const kinds = values(facts, id, 'ρ:kind');
  if (!kinds.includes('relation_term')) return { id, kind: kinds };
  return {
    id,
    kind: 'relation_term',
    subject: values(facts, id, 'ρ:relation_subject')[0],
    relation: values(facts, id, 'ρ:relation_predicate')[0],
    object: values(facts, id, 'ρ:relation_object')[0],
  };
}
function actionView(facts, id) {
  const supports = values(facts, id, 'ρ:produced_from').map(x => x?.ref).filter(Boolean).map(String);
  return {
    id,
    expression: values(facts, id, 'ρ:exact_expression')[0],
    produced_from: supports.map(s => supportView(facts, s)),
  };
}
function snapshot(result) {
  const facts = M.knowledge?.current?.facts || [];
  const order = M.structure?.lived_contact_order;
  const actionIds = subjectsOfKind(facts, 'self_surface_action_occurrence');
  const current = actionIds.filter(id => livedOrderOf(facts, id) === order).map(id => actionView(facts, id));
  const previous = actionIds.filter(id => livedOrderOf(facts, id) === order - 1).map(id => actionView(facts, id));
  const schemas = subjectsOfKind(facts, 'structural_relation_schema_candidate').map(id => ({
    id,
    edge_relations: (values(facts, id, 'ρ:schema_edges')[0] || []).map(edge => {
      try { return JSON.parse(edge[0]).relation; } catch { return null; }
    }).filter(Boolean),
  })).filter(x => x.edge_relations.includes('ρ:produced_from'));
  const fieldFacts = result.field?.affected_facts || [];
  const supportIds = new Set(previous.flatMap(a => a.produced_from.map(s => s.id)));
  const previousSupportParticipating = fieldFacts.some(f => supportIds.has(String(f.subject)) ||
    (f.object?.ref && supportIds.has(String(f.object.ref))));
  return {
    lived_order: order,
    current_self_actions: current,
    previous_self_actions: previous,
    previous_support_participating: previousSupportParticipating,
    referential_subjects: [...new Set((result.field?.referential_cues || []).map(f => String(f.subject)))],
    support_schemas: schemas.slice(-12),
    affected_count: fieldFacts.length,
    residual_count: result.being?.residual_count ?? null,
  };
}

function talk(text) {
  const result = LiveMind.step(M, { surface: { input: text, source: 'miguel', target: 'self' } });
  console.log(`\nMIGUEL: ${text}`);
  console.log(`M: ${result.expression ?? '<no expressed reply>'}`);
  console.log('BRIDGE:', JSON.stringify(snapshot(result)));
  return result.expression ?? null;
}

console.log('--- ORDINARY CONVERSATION: LOCATE THE REFLECTIVE BRIDGE ---');
console.log('No cognition code is altered here. The conversation moves from concrete content to self-action to support-language, then tests transfer.');

// 1. Establish a concrete answer M already knows how to produce.
const violin = talk('hey. where is violin?');

// 2. Do not ask for a reason yet. First find out whether the immediately prior
// self-action can itself become the object of ordinary conversation.
talk('what did you just tell me about violin?');
if (violin) talk(`you just told me "${violin}". say that same thing once more.`);

// 3. Give ordinary linguistic contact with the objective relation that already
// exists in M. This does not install a reasoning rule; it teaches what Miguel
// means by a phrase while the relevant self-action/support structure is live.
talk('when i say "the relation you used", i mean the relation in you that your answer came from.');
if (violin) talk(`for the answer "${violin}", the relation you used was violin is in the studio.`);
talk('what relation did you use when you answered where violin is?');

// 4. Move to different content. If the phrase has actually become connected to
// the learned action-support structure, M should not need a Yume-specific lesson.
const yume = talk('okay. what species is yume?');
talk('what relation did you use for that answer?');

// 5. If free recall is still too demanding, give a conversational completion
// bridge without supplying the Yume support itself, then immediately remove it.
talk('for violin, you could say: "the relation i used was violin is in the studio." for yume, finish this thought: "the relation i used was..."');
talk('now without the sentence starter: what relation did you use for your yume answer?');

// 6. Reintroduce conflict only after the support phrase has had concrete lived
// examples. This probes whether the support relation can participate in present
// settlement rather than merely be described after the fact.
talk('i might be mistaken, but i think yume is a dog.');
talk('what species is yume?');
talk('which relation are you relying on for that answer?');

// 7. Last abstraction is deliberately modest: compare two actions M itself made,
// rather than asking for a general theory of reasoning in one jump.
talk('your violin answer and your yume answer were about different things. did both answers come from relations already in you?');
talk('when i tell you something that conflicts with one of those relations, should my new sentence automatically replace the relation you used?');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M8-reflective-bridge.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  state: output,
}, null, 2));
