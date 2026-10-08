const assert = require('assert');
const Mind = require('./one-rule.js');

const R = (vars, allowed) => ({ vars, allowed });
const step = (state, id, domains, relation, extra = {}) => Mind.integrate(state, {
  id,
  domains,
  relation,
  ...extra,
});

(function initialOneIsNumericallyOne() {
  const m = Mind.one();
  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.worlds.length, 1);
  assert.deepStrictEqual(m.worlds[0], {});
  assert.strictEqual(m.simplex.normalization, 1);
  assert.deepStrictEqual(Mind.simplexVertices(m), [[1]]);
  assert.strictEqual(Mind.sum(Mind.simplexVertices(m)[0]), 1);
})();

(function unexperiencedDistinctionRemainsUnresolvedWithoutInventedWeights() {
  let m = Mind.one();
  m = step(m, 'introduce-x', { x: [0, 1] }, R(['x'], [[0], [1]]));
  assert.strictEqual(m.worlds.length, 2);
  assert.deepStrictEqual(Mind.query(m, R(['x'], [[1]])), {
    status: 'unresolved', probability_range: [0, 1], support: 1, opposition: 1,
  });
  for (const vertex of Mind.simplexVertices(m)) assert.strictEqual(Mind.sum(vertex), 1);
  assert.strictEqual(m.simplex.selected_distribution, null);
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

  m = step(m, 'y-equals-z', { z: [0, 1] }, R(['y', 'z'], [[0, 0], [1, 1]]));
  assert.strictEqual(
    Mind.query(m, R(['x', 'z'], [[0, 0], [1, 1]])).status,
    'resolved_true',
    'x=z must emerge from the shared model even though no x=z rule was inserted'
  );
})();

(function newRealityCanResolveAnOldGapAndPropagateThroughTheSameState() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  m = step(m, 'x-equals-y', { y: [0, 1] }, R(['x', 'y'], [[0, 0], [1, 1]]));
  m = step(m, 'y-equals-z', { z: [0, 1] }, R(['y', 'z'], [[0, 0], [1, 1]]));
  m = step(m, 'reality-x-one', {}, R(['x'], [[1]]));

  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'resolved_true');
  assert.strictEqual(Mind.query(m, R(['y'], [[1]])).status, 'resolved_true');
  assert.strictEqual(Mind.query(m, R(['z'], [[1]])).status, 'resolved_true');
  assert.strictEqual(m.worlds.length, 1);
})();

(function unrelatedGrowthDoesNotCompeteWithExistingMeaning() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  m = step(m, 'reality-x-one', {}, R(['x'], [[1]]));
  m = step(m, 'color-domain', { color: ['blue', 'red'] }, R(['color'], [['blue'], ['red']]));

  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'resolved_true');
  assert.strictEqual(Mind.query(m, R(['color'], [['red']])).status, 'unresolved');
  assert.strictEqual(m.whole, 1);
  for (const vertex of Mind.simplexVertices(m)) assert.strictEqual(Mind.sum(vertex), 1);
})();

(function contradictionInjuresTheOneWithoutDeletingItsHistory() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  m = step(m, 'x-is-one', {}, R(['x'], [[1]]), { raw: 'first reality contact' });
  m = step(m, 'x-is-zero', {}, R(['x'], [[0]]), { raw: 'conflicting interpretation' });

  assert.strictEqual(m.whole, 1, 'identity remains one even while internally injured');
  assert.strictEqual(m.conflict, true);
  assert.strictEqual(m.worlds.length, 0);
  assert.strictEqual(m.ledger.length, 3);
  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'conflict');
})();

(function correctionHealsByRecomputingRatherThanForgetting() {
  let m = Mind.one();
  m = step(m, 'x-domain', { x: [0, 1] }, R(['x'], [[0], [1]]));
  m = step(m, 'x-is-one', {}, R(['x'], [[1]]), { raw: 'reality contact' });
  m = step(m, 'bad-reading', {}, R(['x'], [[0]]), { raw: 'misread evidence' });
  assert.strictEqual(m.conflict, true);

  m = step(m, 'realization', {}, null, {
    supersedes: ['bad-reading'],
    raw: 'the prior reading was identified as the error; the event remains in history',
  });

  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.conflict, false);
  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'resolved_true');
  assert.strictEqual(m.ledger.length, 4, 'nothing was erased from memory');
  assert.ok(m.ledger.some(x => x.id === 'bad-reading'));
  assert.ok(m.ledger.some(x => x.id === 'realization' && x.supersedes.includes('bad-reading')));
})();

(function overlappingRelationsCannotBeTreatedAsAUniversalNumericPartition() {
  let m = Mind.one();
  m = step(m, 'xy', { x: [0, 1], y: [0, 1] }, R(['x', 'y'], [[0, 0], [1, 1]]));

  // Both of these relations are true in one surviving world and overlap there.
  // Assigning each relation a global "share of mind" and requiring all such
  // shares to add to 1 would double-count the same world. The unit invariant
  // therefore belongs to each admissible distribution/partition, not to the
  // arithmetic sum of every heterogeneous relation in the mind.
  assert.strictEqual(Mind.query(m, R(['x'], [[1]])).status, 'unresolved');
  assert.strictEqual(Mind.query(m, R(['y'], [[1]])).status, 'unresolved');
  assert.deepStrictEqual(m.simplex.normalization, 1);
})();

console.log('42ndMind one-rule tests: PASS');
