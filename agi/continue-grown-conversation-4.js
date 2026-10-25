'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');

const input = process.env.MIND_STATE_IN;
if (!input) throw new Error('MIND_STATE_IN is required');
const M = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!M || M.whole !== 1) throw new Error('input is not one whole M');

function compactFact(fact) {
  return { subject: fact.subject, relation: fact.relation, object: fact.object, derived_from: fact.derived_from };
}
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
  if (kinds.includes('relation_term')) return {
    id,
    kind: 'relation_term',
    subject: values(facts, id, 'ρ:relation_subject')[0],
    relation: values(facts, id, 'ρ:relation_predicate')[0],
    object: values(facts, id, 'ρ:relation_object')[0],
  };
  if (kinds.includes('sourced_claim_occurrence')) return {
    id,
    kind: 'sourced_claim_occurrence',
    epistemic_status: values(facts, id, 'ρ:epistemic_status')[0],
    subject: values(facts, id, 'ρ:claim_subject')[0],
    relation: values(facts, id, 'ρ:claim_relation')[0],
    object: values(facts, id, 'ρ:claim_object')[0],
  };
  return { id, kind: kinds };
}

function situatedSnapshot(result) {
  const field = result.field || {};
  const order = M.structure?.lived_contact_order;
  const contactId = `lived-contact:${order}`;
  const facts = M.knowledge?.current?.facts || [];
  const occurrence = values(facts, contactId, 'ρ:situated_occurrence')[0]?.ref ||
    facts.find(f => String(f.subject).startsWith('reality-contact-occurrence:') && f.relation === 'ρ:lived_order' && f.object === order)?.subject;
  const previousContact = occurrence ? values(facts, occurrence, 'ρ:previous_lived_contact')[0]?.ref : null;
  const previousOccurrence = previousContact ? values(facts, previousContact, 'ρ:situated_occurrence')[0]?.ref : null;

  const selfActionIds = subjectsOfKind(facts, 'self_surface_action_occurrence');
  const currentSelfActions = selfActionIds.filter(id => livedOrderOf(facts, id) === order);
  const previousSelfActions = previousOccurrence ? values(facts, previousOccurrence, 'ρ:contains_occurrence')
    .map(x => x?.ref).filter(id => id && selfActionIds.includes(String(id))).map(String) : [];
  function actionView(id) {
    const supports = values(facts, id, 'ρ:produced_from').map(x => x?.ref).filter(Boolean).map(String);
    return {
      id,
      expression: values(facts, id, 'ρ:exact_expression')[0],
      surface: values(facts, id, 'ρ:surface_content')[0],
      after: values(facts, id, 'ρ:after_within_contact')[0],
      caused_by_self: facts.some(f => String(f.subject) === 'self' && f.relation === 'ρ:caused' && f.object?.ref === id),
      produced_from: supports.map(support => supportView(facts, support)),
    };
  }

  const eventRelations = facts.filter(f => String(f.subject) === contactId || (occurrence && String(f.subject) === String(occurrence)))
    .filter(f => ['ρ:kind','ρ:lived_order','ρ:contact_channel','ρ:previous_lived_contact','ρ:source','ρ:target','ρ:about','ρ:contains_occurrence','ρ:experienced_by','ρ:followed_within_contact_by'].includes(f.relation));
  const cues = [...new Set((field.referential_cues || []).map(f => String(f.subject)))];

  const schemaIds = subjectsOfKind(facts, 'structural_relation_schema_candidate');
  const openIds = subjectsOfKind(facts, 'structural_open_relation');
  const schemas = schemaIds.map(id => ({
    id,
    evidence_orders: [...new Set(values(facts, id, 'ρ:supported_by')
      .flatMap(x => x?.ref ? values(facts, x.ref, 'ρ:lived_order') : []))].sort((a, b) => a - b),
    edge_relations: (values(facts, id, 'ρ:schema_edges')[0] || []).map(edge => {
      try { return JSON.parse(edge[0]).relation; } catch { return null; }
    }).filter(Boolean),
  }));
  const openRelations = openIds.map(id => {
    const term = values(facts, id, 'ρ:unresolved_relation')[0]?.ref;
    const relationObject = term ? values(facts, term, 'ρ:relation_object')[0] : null;
    return {
      id,
      status: values(facts, id, 'ρ:resolved_by').length ? 'resolved' : 'open',
      relation: relationObject?.relation,
      known_endpoint: relationObject?.known_endpoint,
      based_on_contact: relationObject?.based_on_contact,
      live_now: (field.continuing_subjects || []).includes(id),
    };
  });

  return {
    lived_order: order,
    contact: contactId,
    occurrence,
    previous_contact: previousContact,
    previous_occurrence: previousOccurrence,
    event_relations: eventRelations.map(compactFact),
    current_self_actions: currentSelfActions.map(actionView),
    previous_self_actions: previousSelfActions.map(actionView),
    referential_subjects: cues,
    participating_rules: (field.rules || []).map(r => String(r.id)),
    affected_count: (field.affected_facts || []).length,
    residual_count: result.being?.residual_count ?? null,
    structural_schemas: schemas,
    structural_open_relations: openRelations,
  };
}

function talk(text, source = 'miguel') {
  const started = performance.now();
  const surface = { input: text, target: 'self' };
  if (source !== null && source !== undefined) surface.source = source;
  const result = LiveMind.step(M, { surface });
  const reply = result.expression ?? null;
  console.log(`\n${source === null || source === undefined ? 'UNKNOWN SOURCE' : String(source).toUpperCase()}: ${text}`);
  console.log(`M: ${reply ?? '<no expressed reply>'}`);
  console.log(`elapsed_ms: ${Math.round((performance.now() - started) * 10) / 10}`);
  console.log('LIVE:', JSON.stringify(situatedSnapshot(result)));
  return reply;
}

console.log('--- GUIDED ORDINARY CONVERSATION: CAN M LEARN HOW TO SETTLE CLAIMS BETTER? ---');

// Start from something this individual has previously been able to answer. No
// hidden support is disclosed to it; the diagnostic trace below is observer-only.
const first = talk('hey. do you remember where violin is?');

talk(first
  ? `okay. you answered "${first}". when i ask what led you to an answer, i mean what you were actually relying on, not just another sentence that sounds right. what were you relying on there?`
  : 'you went quiet. if you do not know what to say, it is okay to leave something unsettled instead of guessing.');

// Ordinary testimony now conflicts with the earlier remembered answer. The point
// is not to install a rule, but to let M experience provenance, conflict, and the
// later consequences of how it handles them.
talk('i might be wrong, but i think violin is in the kitchen now.');
talk('so where would you say violin is?');

talk('notice that i just told you something that may conflict with what you already had. being recent does not make my claim true. what matters is what actually supports each possibility and what later contact with reality shows.');
talk('with that in mind, what are you actually sure of about violin right now?');
talk('and what would help settle the part you are not sure about?');

// Give the same lesson a different referent. This is the important transfer probe:
// no violin-specific phrase should be enough to answer it.
talk('let us try the same kind of thing with something else. i might be mistaken, but i think yume is a dog.');
talk('what species would you say yume is?');
talk('what made you trust that answer more than the conflicting thing i just said?');

// Finally ask M to abstract the conversational experience itself. A genuine
// learning path need not produce polished language immediately, but transfer or a
// changed settlement should be visible somewhere in its own action/state.
talk('after this conversation, if two claims conflict, what should you do differently before settling on one?');
talk('now tell me one thing you are unsure about, and what could make it clearer.');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M7-guided.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  state: output,
}, null, 2));
