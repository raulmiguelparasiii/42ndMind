'use strict';

const assert = require('assert');
const Mind = require('./one-live-blueprint.js');

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function hasFact(M, subject, relation, object) {
  return M.knowledge.current.facts.some(f => stable(f.subject) === stable(subject) && stable(f.relation) === stable(relation) && stable(f.object) === stable(object));
}

const M = Mind.one(2, 1);
assert(hasFact(M, 'self', 'ρ:kind', 'persistent_individual'));
assert(hasFact(M, 'self', 'ρ:continuity', 'same_M'));
assert.strictEqual(M.action_count, 2);

// One reality contact carries numeric sensing, ordered surface contact, ordinary
// relational contact, and a newly attached actuator at once. No mode switch.
const bookLike = Array(24).fill('naru veli soma keta').join(' ');
Mind.C(M, {
  frame: [13, 29, 40],
  surface: { input: bookLike },
  relations: { facts: [['world:external', 'ρ:contact', 991]] },
  actuators: ['novel:tool'],
});

assert.strictEqual(M.whole, 1);
assert.strictEqual(M.action_count, 3, 'new actuator did not enter the same action boundary');
assert(hasFact(M, 'world:external', 'ρ:contact', 991));
assert(M.knowledge.facts.some(f => f.subject === 'self' && f.relation === 'ρ:has_actuator' && f.object?.id === 'novel:tool'));
assert(M.knowledge.facts.some(f => f.subject === 'self' && f.relation === 'ρ:has_receptor' && f.object?.kind === 'numeric' && f.object?.index === 0));
assert(hasFact(M, 'self', 'ρ:has_receptor', 'ordered_sequence'));
assert(M.current.sequence, 'surface contact did not remain part of the same current M');
assert.strictEqual(M.current.sequence.expression, null, 'unanswered raw sequence was spuriously treated as dialogue completion');
assert(M.current.sequence.recurrence.learned_relations.length > 0, 'long sequence formed no reusable recurrence relation');
assert(Math.max(...M.current.sequence.recurrence.learned_relations.map(x => x.depth)) >= 2, 'repeated sequence did not recursively recompress into higher ordered relations');

// Exact raw contact remains present under the derived recurrence structure.
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_raw' && f.object === bookLike));
assert.strictEqual(M.contacts.at(-1)[0], 13);
assert.strictEqual(M.contacts.at(-1)[1], 29);

// Attach another actuator later. The developmental law is unchanged; only the
// physical possibility set expands.
Mind.C(M, { actuators: ['novel:second-tool'] });
assert.strictEqual(M.action_count, 4);
assert(M.knowledge.facts.some(f => f.subject === 'self' && f.relation === 'ρ:has_actuator' && f.object?.id === 'novel:second-tool'));

for (const forbidden of ['vision_state', 'audio_state', 'language_state', 'planner', 'memory_state', 'self_model']) {
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  self_first_class_in_M: true,
  simultaneous_numeric_surface_relational_contact: true,
  recursive_sequence_relations_found: M.current?.sequence?.recurrence?.learned_relations?.length > 0,
  exact_contact_retained: true,
  actuator_added_without_new_cognition: true,
  second_actuator_added_later: true,
  modality_specific_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('WHOLE-LIFE BLUEPRINT GATE: PASS');
