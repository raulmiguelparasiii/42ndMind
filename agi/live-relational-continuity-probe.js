'use strict';

const assert = require('assert');
const { performance } = require('node:perf_hooks');
const LiveMind = require('./live-mind.js');
const Canonical = require('../one-mind.js');

function ref(id) { return { ref: String(id) }; }
function hasFact(M, subject, relation, predicate = () => true) {
  return (M.knowledge?.facts || []).some(f => String(f.subject) === String(subject) &&
    f.relation === relation && predicate(f.object));
}

const EXP = 'probe:expression';
const ACT = 'probe:action';
const PENDING = 'probe:unfinished-expectation';
const M = LiveMind.one(1, 1);

// Seed only already-established canonical anatomy. The probe is about what the
// running public step does with an unfinished relation while unrelated reality
// arrives, not about retraining ordered recurrence here.
Canonical.C(M, { relations: { facts: [
  [EXP, 'ρ:kind', 'expression_term'],
  [EXP, 'ρ:instantiation_kind', 'surface_expression_occurrence'],
  [ACT, 'ρ:kind', 'action_term'],
  [ACT, 'ρ:instantiation_kind', 'action_occurrence'],
  ['lived-contact:0', 'ρ:kind', 'lived_contact'],
  ['lived-contact:0', 'ρ:lived_order', 0],
  [PENDING, 'ρ:kind', 'temporal_expectation'],
  [PENDING, 'ρ:after_lived_order', 0],
  [PENDING, 'ρ:expected_terms', [ref(ACT)]],
  [PENDING, 'ρ:expects_term', ref(ACT)],
  [PENDING, 'ρ:formation_status', 'open'],
  ['self', 'ρ:expects', ref(PENDING)],
] } });

function livedContact(term, kind) {
  const order = (M.structure?.lived_contact_order || 0) + 1;
  const occurrence = `probe:occurrence:${order}:${kind}`;
  return {
    order,
    contact: { relations: { facts: [
      [occurrence, 'ρ:kind', kind],
      [occurrence, 'ρ:kind', 'lived_occurrence'],
      [occurrence, 'ρ:instantiates', ref(term)],
      [occurrence, 'ρ:lived_order', order],
    ] } },
  };
}

const unrelated = livedContact(EXP, 'surface_expression_occurrence');
const t0 = performance.now();
const afterUnrelated = LiveMind.step(M, unrelated.contact);
const unrelatedMs = performance.now() - t0;

assert.strictEqual(hasFact(M, PENDING, 'ρ:resolved_by', x => x?.ref !== undefined), false,
  'unrelated lived contact extinguished unfinished relation');
assert(afterUnrelated.field.continuing_subjects.includes(PENDING),
  'unfinished relation was not live in the next public settlement');
assert(afterUnrelated.field.source_participation.some(x => x.source === 'continuing' && x.id === PENDING),
  'continuing relation had no measured forward participation');
assert(afterUnrelated.field.source_participation.some(x => x.source === 'contact'),
  'incoming unrelated reality disappeared instead of coexisting');

const bearing = livedContact(ACT, 'action_occurrence');
const t1 = performance.now();
const afterBearing = LiveMind.step(M, bearing.contact);
const bearingMs = performance.now() - t1;

assert(hasFact(M, PENDING, 'ρ:resolved_by', x => x?.ref !== undefined),
  'later bearing reality did not settle unfinished relation');
assert(!afterBearing.field.continuing_subjects.includes(PENDING),
  'settled relation kept reproducing live influence');
assert.strictEqual(Object.prototype.hasOwnProperty.call(M, 'affected_relational_field'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(M.current || {}, 'affected_relational_field'), false);

const trace = {
  equation: 'A_t = Support^-(Depend^+(E_t ∪ U(M_t)))',
  unrelated_contact_order: unrelated.order,
  unrelated_step_ms: Number(unrelatedMs.toFixed(3)),
  unfinished_relation_still_live: afterUnrelated.field.continuing_subjects.includes(PENDING),
  sources_after_unrelated: afterUnrelated.field.source_participation,
  bearing_contact_order: bearing.order,
  bearing_step_ms: Number(bearingMs.toFixed(3)),
  unfinished_relation_live_after_settlement: afterBearing.field.continuing_subjects.includes(PENDING),
  sources_after_bearing: afterBearing.field.source_participation,
  canonical_fact_count: M.knowledge?.facts?.length || 0,
  canonical_current_fact_count: M.knowledge?.current?.facts?.length || 0,
  field_persisted: false,
};

console.log(JSON.stringify(trace, null, 2));
console.log('LIVE RELATIONAL CONTINUITY PROBE: PASS');
