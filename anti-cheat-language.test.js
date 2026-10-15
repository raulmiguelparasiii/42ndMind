'use strict';

// Anti-cheat falsification for universal-language.js.
//
// This test deliberately removes human-readable semantic relation labels from
// training. Each grounded training contact receives a fresh opaque relation id.
// The live relational system must discover which opaque proposals describe the
// same reality relation from shared grounding, keep neighboring relations apart,
// and later resolve English-only holdouts through the stabilized field.
//
// The expected family names below exist only in this external test harness. They
// are never passed into F and therefore cannot become semantic hints.

const { one, F } = require('./universal-language');

const families = [
  {
    key: 'open',
    context: { domain: 'computer', kind: 'resource' },
    examples: [
      ['open the file', { before: { open: false }, after: { open: true }, action: 'open' }],
      ['launch the document', { before: { open: false }, after: { open: true }, action: 'launch' }],
      ['bring up this resource', { before: { open: false }, after: { open: true }, action: 'bring-up' }],
    ],
    holdout: 'please open this document',
  },
  {
    key: 'terminate',
    context: { domain: 'computer', kind: 'process' },
    examples: [
      ['close the program', { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'close' }],
      ['quit the application', { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'quit' }],
      ['exit this app', { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'exit' }],
    ],
    holdout: 'close this application',
  },
  {
    key: 'conceal',
    context: { domain: 'computer', kind: 'interface' },
    examples: [
      ['close the window', { before: { running: true, visible: true }, after: { running: true, visible: false }, action: 'close' }],
      ['hide the panel', { before: { running: true, visible: true }, after: { running: true, visible: false }, action: 'hide' }],
      ['minimize this interface', { before: { running: true, visible: true }, after: { running: true, visible: false }, action: 'minimize' }],
    ],
    holdout: 'close this window',
  },
  {
    key: 'delete',
    context: { domain: 'computer', kind: 'persisted' },
    examples: [
      ['delete the file', { before: { exists: true }, after: { exists: false }, action: 'delete' }],
      ['erase the record', { before: { exists: true }, after: { exists: false }, action: 'erase' }],
      ['remove this folder', { before: { exists: true }, after: { exists: false }, action: 'remove' }],
    ],
    holdout: 'delete this record',
  },
  {
    key: 'copy',
    context: { domain: 'computer', kind: 'persisted' },
    examples: [
      ['copy the file', { before: { source_exists: true, copies: 1 }, after: { source_exists: true, copies: 2 }, action: 'copy' }],
      ['duplicate the record', { before: { source_exists: true, copies: 1 }, after: { source_exists: true, copies: 2 }, action: 'duplicate' }],
      ['clone this folder', { before: { source_exists: true, copies: 1 }, after: { source_exists: true, copies: 2 }, action: 'clone' }],
    ],
    holdout: 'copy this record',
  },
  {
    key: 'move',
    context: { domain: 'computer', kind: 'persisted' },
    examples: [
      ['move the file', { before: { location: 'a' }, after: { location: 'b' }, action: 'move' }],
      ['relocate the record', { before: { location: 'a' }, after: { location: 'b' }, action: 'relocate' }],
      ['transfer this folder', { before: { location: 'a' }, after: { location: 'b' }, action: 'transfer' }],
    ],
    holdout: 'move this record',
  },
  {
    key: 'increase',
    context: { domain: 'magnitude', kind: 'level' },
    examples: [
      ['increase the volume', { before: { value: 1 }, after: { value: 2 }, action: 'increase' }],
      ['raise the level', { before: { value: 1 }, after: { value: 2 }, action: 'raise' }],
      ['turn this value up', { before: { value: 1 }, after: { value: 2 }, action: 'up' }],
    ],
    holdout: 'increase this level',
  },
  {
    key: 'decrease',
    context: { domain: 'magnitude', kind: 'level' },
    examples: [
      ['decrease the volume', { before: { value: 2 }, after: { value: 1 }, action: 'decrease' }],
      ['lower the level', { before: { value: 2 }, after: { value: 1 }, action: 'lower' }],
      ['turn this value down', { before: { value: 2 }, after: { value: 1 }, action: 'down' }],
    ],
    holdout: 'decrease this level',
  },
];

function opaqueId(familyIndex, exampleIndex) {
  // Intentionally meaningless. The engine never receives family.key.
  return `§${String(familyIndex + 1).padStart(2, '0')}.${String(exampleIndex + 1).padStart(2, '0')}`;
}

function top(U) {
  return U.current?.resolution?.components?.[0]?.relation || null;
}

async function main() {
  const U = one({ config: { min_equivalence_support: 1, history_limit: 4096 } });
  const idsByFamily = new Map();

  // One opaque proposal per grounded example. No semantic id, label, evidence,
  // equivalent_to, parent, child, or explicit contradiction is supplied.
  for (let fi = 0; fi < families.length; fi++) {
    const f = families[fi];
    const ids = [];
    for (let ei = 0; ei < f.examples.length; ei++) {
      const [utterance, execution] = f.examples[ei];
      const id = opaqueId(fi, ei);
      ids.push(id);
      await F(U, {
        utterance,
        context: f.context,
        execution,
        relations: [{ id }],
        source: 'opaque-grounded-contact',
      });
    }
    idsByFamily.set(f.key, ids);
  }

  // The three opaque handles inside each family should converge to one canonical
  // relation purely from their common reality-grounding pattern.
  const familyCanonical = new Map();
  let mergedFamilies = 0;
  for (const f of families) {
    const ids = idsByFamily.get(f.key);
    const canon = ids.map(id => U.canonical[id] || id);
    const unique = [...new Set(canon)];
    if (unique.length === 1) mergedFamilies++;
    familyCanonical.set(f.key, canon[0]);
  }

  // Neighboring relations must remain distinct even when English overlaps.
  const terminateCanon = familyCanonical.get('terminate');
  const concealCanon = familyCanonical.get('conceal');
  if (terminateCanon === concealCanon) {
    throw new Error('anti-cheat failure: process termination collapsed into interface concealment');
  }
  if (familyCanonical.get('increase') === familyCanonical.get('decrease')) {
    throw new Error('anti-cheat failure: increase collapsed into decrease');
  }
  if (familyCanonical.get('copy') === familyCanonical.get('move')) {
    throw new Error('anti-cheat failure: copy collapsed into move');
  }

  // Held-out contacts contain English + context only. No execution and no
  // relation proposal are supplied, so the already stabilized field must resolve
  // them. The external expected key is never visible to F.
  let hits = 0;
  const holdouts = [];
  for (const f of families) {
    await F(U, { utterance: f.holdout, context: f.context });
    const predicted = top(U);
    const expected = familyCanonical.get(f.key);
    const hit = predicted === expected;
    hits += hit ? 1 : 0;
    holdouts.push({ text: f.holdout, predicted, expected, hit });
  }

  const exactWhole = U.encounters.every(e => {
    const r = e.resolution;
    if (!r) return false;
    const sum = (r.components || []).reduce((s, c) => s + c.mass, 0) + (r.unknown_mass ?? 1);
    return Math.abs(sum - 1) < 1e-7;
  });

  const report = {
    training_contacts: families.length * 3,
    semantic_labels_given_to_F: 0,
    explicit_equivalences_given_to_F: 0,
    opaque_families_merged: mergedFamilies,
    total_families: families.length,
    held_out_hits: hits,
    held_out_total: families.length,
    held_out_accuracy: hits / families.length,
    exact_whole_equals_one: exactWhole,
    canonical_relations: U.metrics.canonical_relations,
    raw_relations: U.metrics.relations,
    progress: U.metrics.progress,
    mean_unknown_mass: U.metrics.unknown_mass,
    holdouts,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!exactWhole) throw new Error('anti-cheat failure: whole=1 closure broke');
  if (mergedFamilies < families.length - 1) {
    throw new Error(`anti-cheat failure: only ${mergedFamilies}/${families.length} opaque families stabilized`);
  }
  if (hits < 7) {
    throw new Error(`anti-cheat failure: only ${hits}/${families.length} English-only holdouts resolved`);
  }

  console.log('ANTI-CHEAT UNIVERSAL LANGUAGE TEST: PASS');
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
