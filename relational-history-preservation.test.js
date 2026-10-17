'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-mind.js');

function contact(mind, facts) {
  Mind.C(mind, { relations: { facts } });
}

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
const source = fs.readFileSync(path.join(__dirname, 'one-mind.js'), 'utf8');

for (const forbidden of [
  'memoryStore', 'memoryModule', 'remember(', 'recollect(', 'attentionController',
  'relationalOccurrenceFrontier', 'occurrence_frontier',
]) {
  assert.ok(!source.includes(forbidden), `canonical C still materializes a capability-shaped history projection: ${forbidden}`);
}

const m = Mind.one(1, 1);

contact(m, [
  ['item-1', 'kind', 'folder'],
  ['item-1', 'location', 'west-shelf'],
]);
contact(m, [
  ['item-1', 'kind', 'folder'],
  ['item-1', 'location', 'east-shelf'],
]);
contact(m, [
  ['item-1', 'kind', 'folder'],
  ['item-1', 'location', 'west-shelf'],
]);

assert.strictEqual(m.knowledge.episodes.length, 3,
  'reality-distinct structured contacts were not retained as separate occurrences');
assert.deepStrictEqual(m.knowledge.episodes.map(e => e.id), [
  'relation-episode:1', 'relation-episode:2', 'relation-episode:3',
]);
assert.notStrictEqual(m.knowledge.episodes[0], m.knowledge.episodes[2],
  'repeated identical relational content collapsed occurrence identity');
assert.deepStrictEqual(
  m.knowledge.episodes[0].facts.map(f => [f.subject, f.relation, f.object]),
  m.knowledge.episodes[2].facts.map(f => [f.subject, f.relation, f.object]),
  'identical repeated contact was not preserved as identical content in a distinct occurrence');
assert.ok(!Object.prototype.hasOwnProperty.call(m.knowledge.current || {}, 'occurrence_frontier'),
  'C eagerly stored a memory-shaped occurrence frontier instead of retaining history in the one M');

// The canonical invariant is persistence, not a retrieval faculty. The full
// occurrence record remains inside M so later generic relational machinery may
// derive whatever query-relative projection a materially relevant relation needs.
const westEpisodes = m.knowledge.episodes.filter(episode =>
  episode.facts.some(f => f.subject === 'item-1' && f.relation === 'location' && f.object === 'west-shelf'));
assert.strictEqual(westEpisodes.length, 2,
  'the one mind no longer contains both west-shelf occurrences for later relational use');

console.log('42ndMind relational history preservation without eager memory projection: PASS');
console.log(JSON.stringify({
  one_C_only: Object.keys(Mind).sort().join(',') === 'C,one',
  exact_occurrences_retained: true,
  identical_content_distinct_occurrences: true,
  eager_memory_projection: false,
  capability_specific_memory_faculty: false,
}));
