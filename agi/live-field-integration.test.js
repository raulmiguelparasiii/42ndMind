'use strict';

const assert = require('assert');
const LiveMind = require('./live-mind.js');

function hasTriple(facts, subject, relation, object) {
  return (facts || []).some(f =>
    JSON.stringify(f.subject) === JSON.stringify(subject) &&
    JSON.stringify(f.relation) === JSON.stringify(relation) &&
    JSON.stringify(f.object) === JSON.stringify(object));
}

const M = LiveMind.one(1, 1);
const result = LiveMind.step(M, { relations: { facts: [['present-entity', 'present-relation', 'present-value']] } });

assert.strictEqual(result.state, M);
assert.strictEqual(result.query, null);
assert.strictEqual(result.field.authority, 'derived_zero_state');
assert.strictEqual(result.field.persistent, false);
assert(hasTriple(result.field.contact_facts, 'present-entity', 'present-relation', 'present-value'));
assert(hasTriple(result.field.affected_facts, 'present-entity', 'present-relation', 'present-value'));

// The field is returned across the inspection/transduction boundary only. No
// corresponding state property may appear in the continuing individual.
assert.strictEqual(Object.prototype.hasOwnProperty.call(M, 'field'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(M, 'affected_relational_field'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(M.current || {}, 'field'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(M.knowledge || {}, 'field'), false);
assert(!JSON.stringify(M).includes('affected_relational_field'));

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  live_step_returns_disposable_field: true,
  current_contact_is_in_field: true,
  field_persisted_in_M: false,
  expression_required_for_field: false,
}, null, 2));
console.log('LIVE FIELD INTEGRATION: PASS');
