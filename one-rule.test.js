const assert = require('assert');
const Mind = require('./one-rule.js');

const R = (vars, allowed) => ({ vars, allowed });
const step = (state, id, domains, relation, extra = {}) => Mind.integrate(state, {
  id, domains, relation, ...extra,
});

(function initialOneIsNumericallyOne() {
  const m = Mind.one();
  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.simplex.normalization, 1);
  assert.strictEqual(m.simplex.representation, 'exact_factored_self_compressing');
  assert.strictEqual(m.simplex.worlds_materialized, false);
  assert.strictEqual(m.chunks.length, 0);
  assert.deepStrictEqual(Mind.materialize(m), [{}]);
  assert.deepStrictEqual(Mind.simplexVertices(m), [[1]]);
})();

(function unexperiencedDistinctionRemainsUnresolvedWithoutInventedWeights() {
  let m = Mind.one();
  m = step(m, 'introduce-x', { x: [0, 1] }, R(['x'], [[0], [1]]));
  const q = Mind.query(m, R(['x'], [[1]]));
  assert.strictEqual(q.status, 'unresolved');
  assert.deepStrictEqual(q.probability_range, [0, 1]);
  assert.strictEqual(q.expanded_variables, 1);
  assert.strictEqual(q.expanded_chunks, 1);
  assert.strictEqual(m.simplex.selected_distribution, null);
  assert.strictEqual(m.whole, 1);
})();

(function oneRuleBuildsRelationsAndDerivedComplexity() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  const coarseX = Mind.project(m, ['x']);

  m = step(m, 'x-equals-y', { y: [0, 1] }, R(['x', 'y'], [[0, 0], [1, 1]]));
  assert.deepStrictEqual(Mind.project(m, ['x']), coarseX, 'pure refinement must preserve the coarse projection');
  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'unresolved');
  assert.strictEqual(Mind.query(m, R(['y'], [[1]])).status, 'unresolved');
  assert.strictEqual(Mind.query(m, R(['x', 'y'], [[0, 0], [1, 1]])).status, 'resolved_true');
  assert.strictEqual(m.chunks.length, 1);

  m = step(m, 'y-equals-z', { z: [0, 1] }, R(['y', 'z'], [[0, 0], [1, 1]]));
  const derived = Mind.query(m, R(['x', 'z'], [[0, 0], [1, 1]]));
  assert.strictEqual(derived.status, 'resolved_true', 'x=z must emerge without inserting an x=z rule');
  assert.strictEqual(derived.expanded_variables, 3);
})();

(function newRealityResolvesAnOldGapAndPropagatesThroughTheSameChunk() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  m = step(m, 'x-equals-y', { y: [0, 1] }, R(['x', 'y'], [[0, 0], [1, 1]]));
  m = step(m, 'y-equals-z', { z: [0, 1] }, R(['y', 'z'], [[0, 0], [1, 1]]));
  m = step(m, 'reality-x-one', {}, R(['x'], [[1]]));

  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'resolved_true');
  assert.strictEqual(Mind.query(m, R(['y'], [[1]])).status, 'resolved_true');
  assert.strictEqual(Mind.query(m, R(['z'], [[1]])).status, 'resolved_true');
  assert.deepStrictEqual(m.reduced_domains.x, [1]);
  assert.deepStrictEqual(m.reduced_domains.y, [1]);
  assert.deepStrictEqual(m.reduced_domains.z, [1]);
})();

(function unrelatedGrowthStaysCoarseAndDoesNotCompeteForAttention() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  m = step(m, 'reality-x-one', {}, R(['x'], [[1]]));
  m = step(m, 'color-domain', { color: ['blue', 'red'] }, R(['color'], [['blue'], ['red']]));

  assert.strictEqual(m.chunks.length, 2);
  const xq = Mind.query(m, R(['x'], [[1]]));
  const cq = Mind.query(m, R(['color'], [['red']]));
  assert.strictEqual(xq.status, 'resolved_true');
  assert.strictEqual(cq.status, 'unresolved');
  assert.strictEqual(xq.expanded_variables, 1, 'query must not expand the unrelated color chunk');
  assert.strictEqual(xq.expanded_chunks, 1);
  assert.strictEqual(m.whole, 1);
})();

(function contradictionInjuresTheOneWithoutDeletingItsHistory() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  m = step(m, 'x-is-one', {}, R(['x'], [[1]]), { raw: 'first reality contact' });
  m = step(m, 'x-is-zero', {}, R(['x'], [[0]]), { raw: 'conflicting interpretation' });

  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.conflict, true);
  assert.strictEqual(m.ledger.length, 3);
  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'conflict');
})();

(function correctionHealsByRecompilingRatherThanForgetting() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  m = step(m, 'x-is-one', {}, R(['x'], [[1]]), { raw: 'reality contact' });
  m = step(m, 'bad-reading', {}, R(['x'], [[0]]), { raw: 'misread evidence' });
  assert.strictEqual(m.conflict, true);

  m = step(m, 'realization', {}, null, {
    supersedes: ['bad-reading'],
    raw: 'the prior reading was identified as error; the event remains in history',
  });

  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.conflict, false);
  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'resolved_true');
  assert.strictEqual(m.ledger.length, 4);
  assert.ok(m.ledger.some(x => x.id === 'bad-reading'));
  assert.ok(m.ledger.some(x => x.id === 'realization' && x.supersedes.includes('bad-reading')));
})();

(function manyIndependentRelationsRemainFactoredInsteadOfEnumerated() {
  let m = Mind.one();
  for (let i = 0; i < 20; i++) {
    m = step(m, `v${i}`, { [`v${i}`]: [0, 1] }, R([`v${i}`], [[0], [1]]));
  }
  assert.strictEqual(m.chunks.length, 20);
  assert.strictEqual(m.simplex.worlds_materialized, false);
  assert.strictEqual(m.whole, 1);
  const q = Mind.query(m, R(['v13'], [[1]]));
  assert.strictEqual(q.status, 'unresolved');
  assert.strictEqual(q.expanded_variables, 1);
  assert.throws(() => Mind.materialize(m, 1000), /materialization limit exceeded/);
})();

(function repeatedRealitySelfCompressesIntoAHeuristicWithoutBeingProgrammedAsOne() {
  let m = Mind.one();
  for (let i = 0; i < 20; i++) {
    m = Mind.integrate(m, { id: `early-positive-${i}`, sample: { attentive_early: true, controlling_later: true } });
  }
  for (let i = 0; i < 20; i++) {
    m = Mind.integrate(m, { id: `early-contrast-${i}`, sample: { attentive_early: false, controlling_later: false } });
  }

  const learned = m.learned_patterns.find(p =>
    p.target === 'controlling_later' && p.expected === true &&
    p.conditions.length === 1 && p.conditions[0].feature === 'attentive_early' && p.conditions[0].value === true
  );
  assert.ok(learned, 'repeated cases should induce the reusable relation automatically');
  assert.strictEqual(learned.reliability, 1);
  assert.ok(learned.bits_saved > 0);

  const prediction = Mind.predict(m, { attentive_early: true });
  assert.strictEqual(prediction.best_by_target.controlling_later.expected, true);
  assert.strictEqual(prediction.authority, 'defeasible_attention_only');
})();

(function counterCasesCauseAutomaticConditionalRefinementRatherThanDogmaticPersistence() {
  let m = Mind.one();
  for (let i = 0; i < 20; i++) {
    m = Mind.integrate(m, { id: `base-positive-${i}`, sample: { attentive_early: true, controlling_later: true } });
  }
  for (let i = 0; i < 20; i++) {
    m = Mind.integrate(m, { id: `base-contrast-${i}`, sample: { attentive_early: false, controlling_later: false } });
  }

  const before = Mind.predict(m, { attentive_early: true });
  assert.strictEqual(before.best_by_target.controlling_later.expected, true);

  for (let i = 0; i < 10; i++) {
    m = Mind.integrate(m, { id: `detail-risk-${i}`, sample: {
      attentive_early: true, respects_boundaries: false, controlling_later: true,
    }});
  }
  for (let i = 0; i < 10; i++) {
    m = Mind.integrate(m, { id: `detail-exception-${i}`, sample: {
      attentive_early: true, respects_boundaries: true, controlling_later: false,
    }});
  }
  for (let i = 0; i < 10; i++) {
    m = Mind.integrate(m, { id: `detail-outside-a-${i}`, sample: {
      attentive_early: false, respects_boundaries: false, controlling_later: false,
    }});
  }
  for (let i = 0; i < 10; i++) {
    m = Mind.integrate(m, { id: `detail-outside-b-${i}`, sample: {
      attentive_early: false, respects_boundaries: true, controlling_later: false,
    }});
  }

  const refined = m.learned_patterns.find(p =>
    p.target === 'controlling_later' && p.expected === true &&
    p.conditions.some(c => c.feature === 'attentive_early' && c.value === true) &&
    p.conditions.some(c => c.feature === 'respects_boundaries' && c.value === false)
  );
  assert.ok(refined, 'a deeper condition should emerge from the counter-cases');
  assert.strictEqual(refined.reliability, 1);
  assert.strictEqual(refined.exceptions, 0);

  const crude = m.learned_patterns.find(p =>
    p.target === 'controlling_later' && p.expected === true &&
    p.conditions.length === 1 && p.conditions[0].feature === 'attentive_early' && p.conditions[0].value === true
  );
  assert.ok(crude, 'the older coarse pattern remains reconstructible from history');
  assert.ok(crude.exceptions > 0, 'the new reality must register against the coarse pattern');
  assert.ok(refined.predictive_code_bits < crude.predictive_code_bits,
    'relative to a case where the deeper condition is known, the refined description should be cheaper than the crude shortcut');

  const risky = Mind.predict(m, { attentive_early: true, respects_boundaries: false });
  assert.strictEqual(risky.best_by_target.controlling_later.expected, true);
  const safer = Mind.predict(m, { attentive_early: true, respects_boundaries: true });
  assert.strictEqual(safer.best_by_target.controlling_later.expected, false);

  m = step(m, 'fresh-control', { fresh_control: [false, true] }, R(['fresh_control'], [[false], [true]]));
  assert.strictEqual(Mind.query(m, R(['fresh_control'], [[true]])).status, 'unresolved');
  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.ledger.length, 81, 'all cases and the fresh referent remain in one history');
})();

console.log('42ndMind one-rule tests: PASS');
