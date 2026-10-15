'use strict';

// Stronger falsification for the universal-language track.
// The live system receives no human semantic family names. It must first
// stabilize opaque relations from English + reality contact. We then require
// the stabilized relation to expose an inspectable mathematical predicate over
// the grounded transition itself, not merely an opaque class id or vector.

const { one, F, mathematicalEquivalent, deriveAnatomy } = require('./universal-language');

const families = [
  {
    key: 'terminate', context: { domain: 'computer', kind: 'process' },
    train: [
      ['close the program', { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'close' }],
      ['quit the application', { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'quit' }],
      ['exit this app', { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'exit' }],
    ], holdout: 'close this application',
  },
  {
    key: 'conceal', context: { domain: 'computer', kind: 'interface' },
    train: [
      ['close the window', { before: { running: true, visible: true }, after: { running: true, visible: false }, action: 'close' }],
      ['hide the panel', { before: { running: true, visible: true }, after: { running: true, visible: false }, action: 'hide' }],
      ['minimize this interface', { before: { running: true, visible: true }, after: { running: true, visible: false }, action: 'minimize' }],
    ], holdout: 'close this window',
  },
  {
    key: 'delete', context: { domain: 'computer', kind: 'persisted' },
    train: [
      ['delete the file', { before: { exists: true }, after: { exists: false }, action: 'delete' }],
      ['erase the record', { before: { exists: true }, after: { exists: false }, action: 'erase' }],
      ['remove this folder', { before: { exists: true }, after: { exists: false }, action: 'remove' }],
    ], holdout: 'delete this record',
  },
  {
    key: 'copy', context: { domain: 'computer', kind: 'persisted' },
    train: [
      ['copy the file', { before: { source_exists: true, copies: 1 }, after: { source_exists: true, copies: 2 }, action: 'copy' }],
      ['duplicate the record', { before: { source_exists: true, copies: 1 }, after: { source_exists: true, copies: 2 }, action: 'duplicate' }],
      ['clone this folder', { before: { source_exists: true, copies: 1 }, after: { source_exists: true, copies: 2 }, action: 'clone' }],
    ], holdout: 'copy this record',
  },
  {
    key: 'move', context: { domain: 'computer', kind: 'persisted' },
    train: [
      ['move the file', { before: { location: 'a' }, after: { location: 'b' }, action: 'move' }],
      ['relocate the record', { before: { location: 'a' }, after: { location: 'b' }, action: 'relocate' }],
      ['transfer this folder', { before: { location: 'a' }, after: { location: 'b' }, action: 'transfer' }],
    ], holdout: 'move this record',
  },
  {
    key: 'increase', context: { domain: 'magnitude', kind: 'level' },
    train: [
      ['increase the volume', { before: { value: 1 }, after: { value: 2 }, action: 'increase' }],
      ['raise the level', { before: { value: 1 }, after: { value: 2 }, action: 'raise' }],
      ['turn this value up', { before: { value: 1 }, after: { value: 2 }, action: 'up' }],
    ], holdout: 'increase this level',
  },
  {
    key: 'decrease', context: { domain: 'magnitude', kind: 'level' },
    train: [
      ['decrease the volume', { before: { value: 2 }, after: { value: 1 }, action: 'decrease' }],
      ['lower the level', { before: { value: 2 }, after: { value: 1 }, action: 'lower' }],
      ['turn this value down', { before: { value: 2 }, after: { value: 1 }, action: 'down' }],
    ], holdout: 'decrease this level',
  },
];

function opaque(fi, ei) { return `§μ${String(fi + 1).padStart(2, '0')}.${ei + 1}`; }
function top(U) { return U.current?.resolution?.components?.[0] || null; }
function exactWhole(U) {
  return U.encounters.every(e => {
    const r = e.resolution;
    if (!r) return false;
    const s = (r.components || []).reduce((a, x) => a + x.mass, 0) + (r.unknown_mass ?? 1);
    return Math.abs(s - 1) < 1e-7;
  });
}

async function train(reverse = false) {
  const U = one({ config: { min_equivalence_support: 1, history_limit: 4096 } });
  const canonical = new Map();
  for (let fi = 0; fi < families.length; fi++) {
    const f = families[fi];
    const xs = reverse ? [...f.train].reverse() : f.train;
    const ids = [];
    for (let ei = 0; ei < xs.length; ei++) {
      const [utterance, execution] = xs[ei];
      const id = opaque(fi, ei); ids.push(id);
      await F(U, { utterance, context: f.context, execution, relations: [{ id }], source: 'intent-math-opaque' });
    }
    canonical.set(f.key, U.canonical[ids[0]] || ids[0]);
  }
  return { U, canonical };
}

async function main() {
  const a = await train(false);
  const b = await train(true);
  const formulas = {};
  let orderInvariant = true;

  for (const f of families) {
    const x = mathematicalEquivalent(a.U, a.canonical.get(f.key));
    const y = mathematicalEquivalent(b.U, b.canonical.get(f.key));
    if (!x || x.status !== 'grounded-mathematical-equivalent') throw new Error(`${f.key}: no stabilized mathematical equivalent`);
    if (x.whole !== 1) throw new Error(`${f.key}: mathematical whole != 1`);
    if (x.signature !== y?.signature) orderInvariant = false;
    formulas[f.key] = { signature: x.signature, formula: x.formula, coordinates: x.coordinates, scope: x.scope };
  }
  if (!orderInvariant) throw new Error('mathematical anatomy changed under non-temporal insertion order');

  const neighborPairs = [['terminate','conceal'],['delete','terminate'],['copy','move'],['increase','decrease']];
  const collisions = neighborPairs.filter(([x,y]) => formulas[x].signature === formulas[y].signature);
  if (collisions.length) throw new Error(`neighboring intents share mathematical anatomy: ${JSON.stringify(collisions)}`);

  // English-only contact now has to resolve not just to an opaque relation but
  // to that relation's already-grounded mathematical predicate.
  let heldOutHits = 0;
  const heldOut = [];
  for (const f of families) {
    await F(a.U, { utterance: f.holdout, context: f.context });
    const t = top(a.U);
    const expected = a.canonical.get(f.key);
    const hit = t?.relation === expected && t?.anatomy?.signature === formulas[f.key].signature;
    heldOutHits += hit ? 1 : 0;
    heldOut.push({ text: f.holdout, expected, predicted: t?.relation || null, math: t?.anatomy?.formula || null, hit });
  }
  if (heldOutHits !== families.length) throw new Error(`only ${heldOutHits}/${families.length} English holdouts reached their mathematical anatomy`);

  // The predicate must not simply contain the training verbs as its answer.
  const surfaceWords = ['close','quit','exit','hide','minimize','delete','erase','remove','copy','duplicate','clone','move','relocate','transfer','increase','raise','decrease','lower'];
  const formulaText = Object.values(formulas).map(x => x.formula.toLowerCase()).join('\n');
  const leaked = surfaceWords.filter(w => formulaText.includes(w));
  if (leaked.length) throw new Error(`surface English leaked into mathematical predicate: ${leaked.join(', ')}`);

  // Counterevidence must reopen the mathematics rather than preserve a defeated
  // postcondition because it was once learned.
  const term = families[0];
  const beforeCorrection = deriveAnatomy(term.train.slice(0,2).map(([,execution]) => ({ context: term.context, execution })));
  const afterCorrection = deriveAnatomy([
    ...term.train.slice(0,2).map(([,execution]) => ({ context: term.context, execution })),
    { context: term.context, execution: { before: { running: true, visible: true, file_exists: true }, after: { running: true, visible: false, file_exists: true } } },
  ]);
  const defeatedSurvived = afterCorrection.constraints.some(c => c.source === 'running' && c.kind === 'transition' && c.after === false);
  if (beforeCorrection.signature === afterCorrection.signature || defeatedSurvived) throw new Error('counterevidence did not reopen mathematical anatomy');

  const report = {
    opaque_training_contacts: families.length * 3,
    semantic_family_labels_given_to_F: 0,
    mathematical_equivalents_verified: families.length,
    held_out_english_to_math_hits: heldOutHits,
    held_out_total: families.length,
    insertion_order_invariant: orderInvariant,
    neighboring_intents_mathematically_distinct: collisions.length === 0,
    surface_english_absent_from_predicates: leaked.length === 0,
    counterevidence_reopened_anatomy: true,
    exact_resolution_whole_equals_one: exactWhole(a.U),
    example: { english: 'close this application', ...formulas.terminate },
    held_out: heldOut,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.exact_resolution_whole_equals_one) throw new Error('resolution whole=1 broke');
  console.log('MATHEMATICAL INTENT EQUIVALENCE TEST: PASS');
}

main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
