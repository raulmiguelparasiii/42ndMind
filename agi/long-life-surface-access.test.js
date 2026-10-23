'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

// Frontier falsification: surface cognition already works, but repeated language
// operations must not reconstruct every historical episode from all M facts.
// The acceleration may cache only a rebuildable episode projection; deleting or
// invalidating it must preserve behavior because canonical M remains authority.

const REL = 'ρ:longlife_mark_q7';
const A = 'entity_longlife_a7';
const B = 'entity_longlife_b4';
const VA = 'value_longlife_r2';
const VB = 'value_longlife_t9';
const BACKGROUND = 64;

for (const file of ['mind.js', 'mind-relational.js']) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const fixture of [REL, A, B, VA, VB])
    assert(!source.includes(fixture), `${file} contains long-life fixture knowledge: ${fixture}`);
}

function teach(entity, value) {
  Mind.C(M, {
    surface: { input: `${entity} bears ${value}.`, output: 'noted.', channels: [entity, REL, value] },
    relations: { facts: [[entity, REL, value]] },
  });
  Mind.C(M, {
    surface: { input: `what mark has ${entity}?`, output: `mark ${value}.`, channels: [entity, REL, value] },
    relations: { facts: [[entity, REL, value]] },
  });
}
function indexOf(state) { return state.structure?.surface_episode_index; }
function query(state, entity) {
  Mind.C(state, { surface: { input: `what mark has ${entity}?` } });
  return state.current?.sequence?.expression;
}

const M = Mind.one(1, 1);
for (let round = 0; round < 2; round++) {
  teach(A, VA);
  teach(B, VB);
}

const initial = indexOf(M);
assert(initial, 'rebuildable surface episode index is missing');
assert.strictEqual(initial.version, 1, 'surface episode index version is missing or unexpected');
assert.strictEqual(initial.authority, 'zero_authority_rebuildable', 'surface index claims semantic authority');
assert(Number.isInteger(initial.fact_count) && initial.fact_count > 0, 'surface index lacks M-fact watermark');
assert(Number.isInteger(initial.episode_count) && initial.episode_count >= 8, 'surface index lacks episode projection');
assert(Number.isInteger(initial.rebuilds) && initial.rebuilds >= 1, 'surface index does not record rebuild provenance');
assert(Number.isInteger(initial.incremental_syncs), 'surface index does not expose incremental synchronization');
const initialRebuilds = initial.rebuilds;
const initialSyncs = initial.incremental_syncs;
const initialEpisodes = initial.episode_count;

// Add unrelated lived surface history. This must extend the derived projection,
// not rebuild the entire earlier surface life on each contact.
for (let i = 0; i < BACKGROUND; i++) {
  Mind.C(M, { surface: {
    input: `background_${i} carries noise_${i % 11}.`,
    output: 'noted.',
    channels: [`background_${i}`, `ρ:noise_${i % 7}`, `noise_${i % 11}`],
  } });
}

const cachedProbe = structuredClone(M);
const cachedAnswer = query(cachedProbe, A);
assert.strictEqual(cachedAnswer, `mark ${VA}.`, 'unrelated long history changed the grounded answer');
const cached = indexOf(cachedProbe);
assert(cached && cached.episode_count >= initialEpisodes + BACKGROUND,
  'recent episodes did not enter the surface projection');
assert.strictEqual(cached.rebuilds, initialRebuilds,
  'ordinary later surface contacts rebuilt the entire surface index');
assert(cached.incremental_syncs > initialSyncs,
  'later surface contacts did not use incremental index synchronization');
assert.strictEqual(cached.fact_count, cachedProbe.knowledge.facts.length,
  'surface index watermark is stale after a normal query');

// The index is acceleration only. Delete it completely; the same query must
// rebuild from canonical M and produce the same result.
const rebuiltProbe = structuredClone(M);
delete rebuiltProbe.structure.surface_episode_index;
const rebuiltAnswer = query(rebuiltProbe, A);
assert.strictEqual(rebuiltAnswer, cachedAnswer, 'deleting the surface cache changed semantic behavior');
const rebuilt = indexOf(rebuiltProbe);
assert(rebuilt && rebuilt.version === 1 && rebuilt.authority === 'zero_authority_rebuildable',
  'surface cache did not rebuild from M after deletion');
assert(rebuilt.rebuilds >= 1, 'rebuild provenance missing after cache deletion');
assert.strictEqual(rebuilt.fact_count, rebuiltProbe.knowledge.facts.length,
  'rebuilt cache does not cover canonical M facts');

// A stale schema/version marker must also be rejected rather than trusted.
const staleProbe = structuredClone(M);
staleProbe.structure.surface_episode_index.version = -1;
const staleAnswer = query(staleProbe, A);
assert.strictEqual(staleAnswer, cachedAnswer, 'invalidating cache version changed semantic behavior');
assert.strictEqual(indexOf(staleProbe).version, 1, 'version-invalid surface cache was not rebuilt');

// Exact raw contact remains canonical beneath the disposable projection.
const relevantRaw = (M.knowledge?.facts || []).filter(f => f.relation === 'ρ:input_raw' &&
  (f.object === `${A} bears ${VA}.` || f.object === `what mark has ${A}?`));
assert(relevantRaw.length >= 4, 'exact raw surface history was lost beneath the index');
for (const forbidden of ['surface_memory', 'semantic_index', 'truth_cache', 'retrieval_policy', 'embedding_store'])
  assert.strictEqual(M[forbidden], undefined, `parallel surface authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  rebuildable_surface_projection: true,
  ordinary_updates_incremental: true,
  long_unrelated_history_preserved_answer: true,
  deletion_rebuilt_from_M: true,
  version_invalidation_rebuilt_from_M: true,
  exact_raw_history_retained: true,
  parallel_surface_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('LONG-LIFE SURFACE ACCESS FALSIFICATION: PASS');
