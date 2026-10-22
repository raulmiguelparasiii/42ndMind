'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Modality-unification falsification. The original canonical embodied learner
// discovers an action/consequence relation. That relation must then have the same
// first-class relation_term / relation_occurrence anatomy as relations learned
// from continuous numerical contact. A novel surface expression must be groundable
// to it from lived frame+surface co-occurrence alone, then refer to it surface-only.

const WORD = 'mavin_embodied_raw';
const SURFACE = `surface:${WORD}`;
const CONCERN0 = 34;
const CONCERN1 = 26;
const PREFERRED_ACTION = 2;

for (const file of ['mind.js', 'surface-relation-grounding.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  assert(!source.includes(WORD), `${file} contains test-specific embodied grounding fixture`);
}

const stable = value => {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
};
const same = (a, b) => stable(a) === stable(b);
const ref = id => ({ ref: String(id) });

const M = Mind.one(4, 2);
let frame = [0, 0, 255, null, CONCERN0, CONCERN1];
Mind.C(M, { frame });

function nextFrame() {
  const action = M.motor;
  let c0 = frame.at(-2) + 2;
  let c1 = frame.at(-1) + 1;
  if (action === PREFERRED_ACTION) { c0 -= 11; c1 -= 7; }
  else { c0 += 2; c1 += 2; }
  c0 = Math.max(1, Math.min(220, c0));
  c1 = Math.max(1, Math.min(220, c1));
  const t = M.experiences.length;
  frame = [t % 3, (t * 2) % 5, 255, null, c0, c1];
  return { action, frame: frame.slice() };
}

const lateActions = [];
for (let i = 0; i < 28; i++) {
  const step = nextFrame();
  Mind.C(M, { frame: step.frame });
  if (i >= 18) lateActions.push(step.action);
}
assert(lateActions.includes(PREFERRED_ACTION), 'embodied development never made the reality-closing action available');

const learned = M.structure.patterns.find(pattern =>
  pattern.active !== false &&
  (pattern.conditions || []).some(atom => atom.feature === 'action' && atom.value === PREFERRED_ACTION) &&
  (pattern.target === 'relation_c0_order' || pattern.target === 'immediate_c0_order') &&
  pattern.expected === 'less');
assert(learned, 'canonical embodied learner did not discover the action/consequence relation');
const empiricalRef = ref(`empirical:${learned.id}`);
assert((M.knowledge?.current?.facts || []).some(fact =>
  same(fact.subject, empiricalRef) && fact.relation === 'kind' && fact.object === 'empirical_relation'),
  'learned embodied relation is not exposed to canonical relational closure');

// The new requirement: learned embodied relations must use the same generic
// relation-term anatomy as other learned modalities. The test does not prescribe
// a term identifier; it discovers the M-owned term through its grounding link.
function currentRelationTermForEmpirical() {
  const facts = M.knowledge?.current?.facts || [];
  const candidate = facts.find(fact => fact.relation === 'ρ:grounded_by' && same(fact.object, empiricalRef));
  if (!candidate) return null;
  return facts.some(fact => fact.subject === candidate.subject && fact.relation === 'ρ:kind' && fact.object === 'relation_term')
    ? candidate.subject : null;
}
const relationTerm = currentRelationTermForEmpirical();
assert(relationTerm, 'embodied empirical relation has no generic first-class relation term');

const occurrencesBefore = (M.knowledge?.facts || []).filter(fact =>
  fact.relation === 'ρ:kind' && fact.object === 'relation_occurrence' &&
  (M.knowledge?.facts || []).some(link => link.subject === fact.subject && link.relation === 'ρ:instantiates' && link.object?.ref === String(relationTerm))).length;

let labels = 0;
for (let i = 0; i < 72; i++) {
  const step = nextFrame();
  const contexts = [
    `${WORD} trial_${i}`,
    `mark_${i} ${WORD}`,
    `observe ${WORD} case_${i}`,
    `during sample_${i} note ${WORD}`,
  ];
  Mind.C(M, {
    frame: step.frame,
    surface: { input: contexts[i % contexts.length], output: 'noted.' },
  });
  labels++;
}
assert(labels === 72);

const currentFacts = M.knowledge?.current?.facts || [];
const currentTerm = currentRelationTermForEmpirical() || relationTerm;
assert(currentFacts.some(fact =>
  fact.subject === SURFACE && fact.relation === 'ρ:expresses' && fact.object?.ref === String(currentTerm)),
  'raw surface co-occurrence did not ground the novel word to the embodied learned relation');

const occurrencesAfter = (M.knowledge?.facts || []).filter(fact =>
  fact.relation === 'ρ:kind' && fact.object === 'relation_occurrence' &&
  (M.knowledge?.facts || []).some(link => link.subject === fact.subject && link.relation === 'ρ:instantiates' && link.object?.ref === String(currentTerm))).length;
assert(occurrencesAfter > occurrencesBefore,
  'fresh supporting embodied experience produced no generic relation occurrence');

const contactsBeforeProbe = M.contacts.length;
Mind.C(M, { surface: { input: WORD } });
assert.strictEqual(M.contacts.length, contactsBeforeProbe, 'surface-only embodied reference fabricated sensor contact');

const mention = (M.knowledge?.current?.facts || []).find(kindFact => {
  if (kindFact.relation !== 'ρ:kind' || kindFact.object !== 'surface_expression_occurrence') return false;
  const id = kindFact.subject;
  return (M.knowledge?.current?.facts || []).some(fact =>
    fact.subject === id && fact.relation === 'ρ:surface' && fact.object === SURFACE) &&
    (M.knowledge?.current?.facts || []).some(fact =>
      fact.subject === id && fact.relation === 'ρ:refers_to' && fact.object?.ref === String(currentTerm));
});
assert(mention, 'surface-only word did not refer to the embodied learned relation term');

// Exact embodied and surface experience remains below the generic abstraction.
assert(M.experiences.length > 0);
assert((M.knowledge?.facts || []).some(fact => fact.relation === 'ρ:input_raw' && String(fact.object).includes(WORD)));

for (const forbidden of ['embodied_relation_state', 'empirical_lexicon', 'semantic_dictionary', 'language_state', 'world_model', 'planner'])
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: true,
  one_C_entrypoint: true,
  canonical_embodied_relation_learned: true,
  embodied_relation_became_generic_relation_term: true,
  supporting_embodied_contact_became_generic_relation_occurrence: true,
  no_structured_semantic_teaching: true,
  raw_surface_grounded_to_embodied_relation: true,
  surface_only_reference_recovered_embodied_relation: true,
  exact_embodied_and_surface_history_retained: true,
  modality_specific_language_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('EMBODIED CROSS-MODAL GROUNDING: PASS');
