'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');

const input = process.env.MIND_STATE_IN;
if (!input) throw new Error('MIND_STATE_IN is required');
const M = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!M || M.whole !== 1) throw new Error('input is not one whole M');

function compactFact(fact) {
  return {
    subject: fact.subject,
    relation: fact.relation,
    object: fact.object,
    derived_from: fact.derived_from,
  };
}
function values(facts, subject, relation) {
  return facts.filter(f => String(f.subject) === String(subject) && f.relation === relation).map(f => f.object);
}
function subjectsOfKind(facts, kind) {
  return [...new Set(facts.filter(f => f.relation === 'ρ:kind' && f.object === kind).map(f => String(f.subject)))];
}

function situatedSnapshot(result) {
  const field = result.field || {};
  const order = M.structure?.lived_contact_order;
  const contactId = `lived-contact:${order}`;
  const facts = M.knowledge?.current?.facts || [];
  const occurrence = facts.find(f => String(f.subject).startsWith('reality-contact-occurrence:') &&
    f.relation === 'ρ:lived_order' && f.object === order)?.subject;
  const eventRelations = facts.filter(f => String(f.subject) === contactId || (occurrence && String(f.subject) === String(occurrence)))
    .filter(f => ['ρ:kind','ρ:lived_order','ρ:contact_channel','ρ:previous_lived_contact','ρ:source','ρ:target','ρ:about','ρ:contains_occurrence','ρ:experienced_by'].includes(f.relation));
  const cues = [...new Set((field.referential_cues || []).map(f => String(f.subject)))];
  const yume = (field.affected_facts || []).filter(f => String(f.subject) === 'yume').map(compactFact);
  const violin = (field.affected_facts || []).filter(f => String(f.subject) === 'violin').map(compactFact);

  const schemaIds = subjectsOfKind(facts, 'structural_relation_schema_candidate');
  const proposalIds = subjectsOfKind(facts, 'structural_relation_proposal');
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
      term,
      relation: relationObject?.relation,
      known_side: relationObject?.known_side,
      known_endpoint: relationObject?.known_endpoint,
      unbound_role: relationObject?.unbound_role,
      based_on_contact: relationObject?.based_on_contact,
      live_now: (field.continuing_subjects || []).includes(id),
    };
  });

  return {
    lived_order: order,
    contact: contactId,
    occurrence,
    event_relations: eventRelations.map(compactFact),
    referential_subjects: cues,
    yume_live: yume,
    violin_live: violin,
    participating_rules: (field.rules || []).map(r => String(r.id)),
    affected_count: (field.affected_facts || []).length,
    residual_count: result.being?.residual_count ?? null,
    structural_schemas: schemas,
    open_structural_proposals: proposalIds.length,
    structural_open_relations: openRelations,
  };
}

function talk(text, source) {
  // Ordinary calls in this script are Miguel. Passing null means the transport
  // genuinely does not provide source identity; it is not converted to a name.
  if (arguments.length < 2) source = 'miguel';
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

console.log('--- ORDINARY SITUATED CONTACT WITH THE SAME PERSISTED INDIVIDUAL ---');
talk('hey. yume crossed my mind again.');
talk('violin.');
talk('yume.');
// This reality contact is directed at the individual, but its transport supplies
// no source identity. The missing role therefore remains reality-grounded rather
// than fabricated by the harness.
talk('violin.', null);

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M6.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  lived_order: M.structure?.lived_contact_order,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  state: output,
}, null, 2));
