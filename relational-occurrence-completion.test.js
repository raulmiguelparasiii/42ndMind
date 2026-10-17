'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

function contact(mind, facts) {
  Mind.C(mind, { relations: { facts } });
  return mind.knowledge.current?.occurrence_frontier || null;
}

function factExists(facts, subject, relation, object) {
  return (facts || []).some(f =>
    JSON.stringify(f.subject) === JSON.stringify(subject) &&
    JSON.stringify(f.relation) === JSON.stringify(relation) &&
    JSON.stringify(f.object) === JSON.stringify(object));
}

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');
for (const forbidden of [
  'memoryStore', 'memoryModule', 'remember(', 'recollect(', 'attentionController',
]) assert.ok(!source.includes(forbidden), `capability-specific faculty appeared in C: ${forbidden}`);

const m = Mind.one(1, 1);

// Two different retained occurrences share one present partial relation but carry
// incompatible episode-specific continuations. The current relation must reopen
// both occurrences rather than silently choosing one by recency/familiarity.
contact(m, [
  ['item-1', 'kind', 'folder'],
  ['item-1', 'location', 'west-shelf'],
]);
contact(m, [
  ['item-1', 'kind', 'folder'],
  ['item-1', 'location', 'east-shelf'],
]);
let frontier = contact(m, [
  ['item-1', 'kind', 'folder'],
]);

assert.ok(frontier, 'present relational contact does not expose an occurrence-aware completion frontier');
assert.strictEqual(frontier.candidate_count, 2,
  'a partial present relation did not reopen both compatible retained occurrences');
assert.strictEqual(frontier.unique_occurrence, false,
  'competing retained occurrences were collapsed into one');
assert.deepStrictEqual(frontier.candidates.map(x => x.episode_index), [0, 1],
  'occurrence order/identity was not preserved');
assert.ok(frontier.candidates.some(x => factExists(x.completion_facts, 'item-1', 'location', 'west-shelf')),
  'west-shelf occurrence-specific continuation was lost');
assert.ok(frontier.candidates.some(x => factExists(x.completion_facts, 'item-1', 'location', 'east-shelf')),
  'east-shelf occurrence-specific continuation was lost');

// A more specific current relation narrows the frontier structurally rather than
// by a separate retrieval policy.
frontier = contact(m, [
  ['item-1', 'kind', 'folder'],
  ['item-1', 'location', 'west-shelf'],
]);
assert.strictEqual(frontier.candidate_count, 1,
  'additional present structure did not narrow the compatible occurrence frontier');
assert.strictEqual(frontier.unique_occurrence, true);
assert.strictEqual(frontier.candidates[0].episode_index, 0,
  'the structurally matching retained occurrence was not recovered');

// Repeating the same complete occurrence does not collapse occurrence identity.
frontier = contact(m, [
  ['item-1', 'kind', 'folder'],
  ['item-1', 'location', 'west-shelf'],
]);
assert.strictEqual(frontier.candidate_count, 2,
  'two identical relational occurrences collapsed into one historical identity');
assert.deepStrictEqual(frontier.candidates.map(x => x.episode_index), [0, 3]);
assert.notStrictEqual(frontier.candidates[0].episode_id, frontier.candidates[1].episode_id,
  'same abstract relation was mistaken for same occurrence');

// Historical reaccess is a read/completion consequence only. It must not insert
// a new rule, change an old rule's authority, or turn recurrence into truth.
const rulesBefore = m.knowledge.rules.map(r => ({ id: r.id, active: r.active }));
const factsBefore = m.knowledge.facts.length;
frontier = contact(m, [['item-1', 'kind', 'folder']]);
assert.deepStrictEqual(m.knowledge.rules.map(r => ({ id: r.id, active: r.active })), rulesBefore,
  'occurrence completion created or changed relational authority');
assert.strictEqual(m.knowledge.facts.length, factsBefore,
  'reaccess of already-known cue structure manufactured new factual knowledge');
assert.strictEqual(frontier.candidate_count, 4,
  'all prior compatible occurrences were not preserved after recurrence');

console.log('42ndMind occurrence-aware relational completion: PASS');
console.log(JSON.stringify({
  one_C_only: Object.keys(Mind).sort().join(',') === 'C,one',
  competing_occurrences_preserved: true,
  specificity_narrows_frontier: true,
  same_relation_distinct_occurrences: true,
  recurrence_adds_truth_authority: false,
  capability_specific_memory_faculty: false,
}));
