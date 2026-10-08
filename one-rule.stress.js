const assert = require('assert');
const Mind = require('./one-rule.js');

const R = (vars, allowed) => ({ vars, allowed });
let seed = 420047;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
}

const trials = 500;
let derivedChecks = 0;
let recoveryChecks = 0;
let localityChecks = 0;

for (let trial = 0; trial < trials; trial++) {
  const n = 2 + Math.floor(random() * 7);
  const bit = random() < 0.5 ? 0 : 1;
  let m = Mind.one();

  m = Mind.integrate(m, {
    id: `t${trial}:v0`, domains: { v0: [0, 1] }, relation: R(['v0'], [[0], [1]]),
  });
  for (let i = 1; i < n; i++) {
    m = Mind.integrate(m, {
      id: `t${trial}:eq${i}`,
      domains: { [`v${i}`]: [0, 1] },
      relation: R([`v${i - 1}`, `v${i}`], [[0, 0], [1, 1]]),
    });
  }

  assert.strictEqual(m.whole, 1);
  assert.strictEqual(Mind.query(m, R(['v0', `v${n - 1}`], [[0, 0], [1, 1]])).status, 'resolved_true');
  assert.strictEqual(Mind.query(m, R([`v${n - 1}`], [[1]])).status, 'unresolved');
  derivedChecks++;

  m = Mind.integrate(m, {
    id: `t${trial}:resolve`, domains: {}, relation: R(['v0'], [[bit]]),
  });
  for (let i = 0; i < n; i++) {
    assert.strictEqual(Mind.query(m, R([`v${i}`], [[bit]])).status, 'resolved_true');
    derivedChecks++;
  }

  m = Mind.integrate(m, {
    id: `t${trial}:unrelated`, domains: { unrelated: ['a', 'b'] }, relation: R(['unrelated'], [['a'], ['b']]),
  });
  const local = Mind.query(m, R(['unrelated'], [['a']]));
  assert.strictEqual(local.status, 'unresolved');
  assert.strictEqual(local.expanded_variables, 1);
  localityChecks++;

  const badId = `t${trial}:bad`;
  m = Mind.integrate(m, {
    id: badId, domains: {}, relation: R(['v0'], [[1 - bit]]), raw: 'conflicting interpretation',
  });
  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.conflict, true);

  m = Mind.integrate(m, {
    id: `t${trial}:correction`, domains: {}, relation: null,
    supersedes: [badId], raw: 'correction retains defeated interpretation in history',
  });
  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.conflict, false);
  assert.strictEqual(Mind.query(m, R(['v0'], [[bit]])).status, 'resolved_true');
  assert.ok(m.ledger.some(x => x.id === badId));
  recoveryChecks++;
}

// Scaling test 1: 1,000 independent binary distinctions denote 2^1000
// complete states. The kernel stores 1,000 coarse chunks and opens one variable
// for a one-variable query; it never enumerates those 2^1000 worlds.
{
  const domains = {};
  for (let i = 0; i < 1000; i++) domains[`u${String(i).padStart(4, '0')}`] = [0, 1];
  let m = Mind.integrate(Mind.one(), { id: 'thousand-independent', domains, relation: null });
  assert.strictEqual(m.chunks.length, 1000);
  assert.strictEqual(m.simplex.worlds_materialized, false);
  assert.strictEqual(m.whole, 1);
  const q = Mind.query(m, R(['u0731'], [[1]]));
  assert.strictEqual(q.status, 'unresolved');
  assert.strictEqual(q.expanded_variables, 1);
  assert.strictEqual(q.expanded_chunks, 1);
  assert.throws(() => Mind.materialize(m, 32), /materialization limit exceeded/);
  localityChecks++;
}

// Scaling test 2: a 160-link learned chain would make the old implementation
// construct 2^160 raw assignments before filtering. The factored kernel stores
// the chain itself and can derive endpoint equality without an endpoint rule.
{
  const N = 160;
  const domains = {};
  for (let i = 0; i < N; i++) domains[`c${String(i).padStart(3, '0')}`] = [0, 1];
  let m = Mind.integrate(Mind.one(), { id: 'chain-domains', domains, relation: null });
  for (let i = 1; i < N; i++) {
    const a = `c${String(i - 1).padStart(3, '0')}`;
    const b = `c${String(i).padStart(3, '0')}`;
    m = Mind.integrate(m, { id: `chain-eq-${i}`, domains: {}, relation: R([a, b], [[0, 0], [1, 1]]) });
  }
  assert.strictEqual(m.chunks.length, 1);
  assert.strictEqual(m.compression.largest_chunk_variables, N);
  const endpoint = Mind.query(m, R(['c000', 'c159'], [[0, 0], [1, 1]]));
  assert.strictEqual(endpoint.status, 'resolved_true');
  assert.strictEqual(endpoint.expanded_variables, N);
  assert.ok(endpoint.search_nodes < 5000, `endpoint query expanded too much search: ${endpoint.search_nodes}`);
  derivedChecks++;

  m = Mind.integrate(m, { id: 'chain-reality', domains: {}, relation: R(['c000'], [[1]]) });
  assert.deepStrictEqual(m.reduced_domains.c159, [1]);
  assert.strictEqual(Mind.query(m, R(['c159'], [[1]])).status, 'resolved_true');
  derivedChecks++;
}

console.log('42ndMind throttled one-rule stress: PASS');
console.log(`seed=${seed}`);
console.log(`random trials=${trials}`);
console.log(`derived checks=${derivedChecks}`);
console.log(`locality checks=${localityChecks}`);
console.log(`conflict/recovery checks=${recoveryChecks}`);
console.log('implicit worlds avoided=2^1000 independent + 2^160 pre-filter chain');
