'use strict';

const assert = require('assert');
const Mind = require('../one-mind.js');
const Field = require('./affected-relational-field.js');

function hasTriple(facts, subject, relation, object) {
  return (facts || []).some(f =>
    JSON.stringify(f.subject) === JSON.stringify(subject) &&
    JSON.stringify(f.relation) === JSON.stringify(relation) &&
    JSON.stringify(f.object) === JSON.stringify(object));
}

const M = Mind.one(1, 1);

// Old M contains one fact that will become materially required later, one
// unrelated fact, and an already-derived conclusion that shares the old support.
// The shared support must not make that older unrelated conclusion current when
// a new contact affects a different rule.
Mind.C(M, { relations: {
  facts: [
    ['old', 'link', 'mid'],
    ['junk', 'noise', 'x'],
  ],
  rules: [
    {
      id: 'field:r1',
      premises: [
        ['old', 'link', 'mid'],
        ['now', 'trigger', 'yes'],
      ],
      conclusion: ['result', 'state', 'settled'],
      categorical: true,
    },
    {
      id: 'field:r2',
      premises: [['old', 'link', 'mid']],
      conclusion: ['unrelated-result', 'state', 'exists'],
      categorical: true,
    },
    {
      id: 'field:r3',
      premises: [['result', 'state', 'settled']],
      conclusion: ['higher', 'state', 'settled'],
      categorical: true,
    },
  ],
} });

assert(hasTriple(M.knowledge.current.facts, 'unrelated-result', 'state', 'exists'));
assert(!hasTriple(M.knowledge.current.facts, 'result', 'state', 'settled'));

const episodeStart = M.knowledge.episodes.length;
Mind.C(M, { relations: { facts: [['now', 'trigger', 'yes']] } });
const episodeEnd = M.knowledge.episodes.length;

assert(hasTriple(M.knowledge.current.facts, 'result', 'state', 'settled'));
assert(hasTriple(M.knowledge.current.facts, 'higher', 'state', 'settled'));

const serializedBefore = JSON.stringify(M);
const field = Field.derive(M, { episodeStart, episodeEnd });
const serializedAfter = JSON.stringify(M);

// Inspecting the field cannot create, remove, activate, or otherwise mutate M.
assert.strictEqual(serializedAfter, serializedBefore, 'derived field mutated canonical M');
assert.strictEqual(field.authority, 'derived_zero_state');
assert.strictEqual(field.persistent, false);

// Current reality is the forward root.
assert(hasTriple(field.contact_facts, 'now', 'trigger', 'yes'));
assert(hasTriple(field.affected_facts, 'now', 'trigger', 'yes'));

// Its actual dependency consequences propagate forward.
assert(hasTriple(field.affected_facts, 'result', 'state', 'settled'));
assert(hasTriple(field.affected_facts, 'higher', 'state', 'settled'));

// Older M material required to warrant the affected conclusion is visible.
assert(hasTriple(field.supporting_facts, 'old', 'link', 'mid'));
assert(hasTriple(field.participating_facts, 'old', 'link', 'mid'));

// But that old support is NOT promoted to a new forward root. Therefore an older
// conclusion that merely shares it stays outside the present affected wave.
assert(!hasTriple(field.affected_facts, 'unrelated-result', 'state', 'exists'),
  'backward support fanned outward into a workspace-like connected component');
assert(!hasTriple(field.participating_facts, 'junk', 'noise', 'x'),
  'unrelated M leaked into the current field');

// A learned/open relational cue can make an already-current derived judgment the
// thing at issue without asserting it anew. Its actual derivational support is
// then exposed backward even with no new contact episode.
const noContact = M.knowledge.episodes.length;
const queryField = Field.derive(M, {
  episodeStart: noContact,
  episodeEnd: noContact,
  query: { subject: 'unrelated-result', relation: 'state' },
});
assert(hasTriple(queryField.query_matches, 'unrelated-result', 'state', 'exists'));
assert(hasTriple(queryField.affected_facts, 'unrelated-result', 'state', 'exists'));
assert(hasTriple(queryField.supporting_facts, 'old', 'link', 'mid'));
assert(!hasTriple(queryField.participating_facts, 'junk', 'noise', 'x'));
assert.strictEqual(JSON.stringify(M), serializedBefore, 'query-relative field mutated canonical M');

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  field_persistent: field.persistent,
  current_root: hasTriple(field.affected_facts, 'now', 'trigger', 'yes'),
  forward_dependency: hasTriple(field.affected_facts, 'higher', 'state', 'settled'),
  backward_support: hasTriple(field.supporting_facts, 'old', 'link', 'mid'),
  no_support_fanout: !hasTriple(field.affected_facts, 'unrelated-result', 'state', 'exists'),
  unrelated_excluded: !hasTriple(field.participating_facts, 'junk', 'noise', 'x'),
  query_backward_support: hasTriple(queryField.supporting_facts, 'old', 'link', 'mid'),
  state_unchanged_by_projection: JSON.stringify(M) === serializedBefore,
}, null, 2));
console.log('AFFECTED RELATIONAL FIELD: PASS');
