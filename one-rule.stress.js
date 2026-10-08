const assert = require('assert');
const Mind = require('./one-rule.js');

const R = (vars, allowed) => ({ vars, allowed });
let seed = 420046;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
}

const trials = 1000;
let derivedChecks = 0;
let recoveryChecks = 0;
let unitChecks = 0;

for (let trial = 0; trial < trials; trial++) {
  const n = 2 + Math.floor(random() * 7);
  const bit = random() < 0.5 ? 0 : 1;
  let m = Mind.one();

  m = Mind.integrate(m, {
    id: `t${trial}:v0`,
    domains: { v0: [0, 1] },
    relation: R(['v0'], [[0], [1]]),
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
    id: `t${trial}:resolve`,
    domains: {},
    relation: R(['v0'], [[bit]]),
  });

  for (let i = 0; i < n; i++) {
    assert.strictEqual(Mind.query(m, R([`v${i}`], [[bit]])).status, 'resolved_true');
    derivedChecks++;
  }

  m = Mind.integrate(m, {
    id: `t${trial}:unrelated`,
    domains: { unrelated: ['a', 'b'] },
    relation: R(['unrelated'], [['a'], ['b']]),
  });
  assert.strictEqual(Mind.query(m, R(['v0'], [[bit]])).status, 'resolved_true');
  assert.strictEqual(Mind.query(m, R(['unrelated'], [['a']])).status, 'unresolved');

  for (const vertex of Mind.simplexVertices(m)) {
    assert.strictEqual(Mind.sum(vertex), 1);
    unitChecks++;
  }

  const badId = `t${trial}:bad`;
  m = Mind.integrate(m, {
    id: badId,
    domains: {},
    relation: R(['v0'], [[1 - bit]]),
    raw: 'conflicting interpretation',
  });
  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.conflict, true);

  m = Mind.integrate(m, {
    id: `t${trial}:correction`,
    domains: {},
    relation: null,
    supersedes: [badId],
    raw: 'correction retains the defeated interpretation in the ledger',
  });
  assert.strictEqual(m.whole, 1);
  assert.strictEqual(m.conflict, false);
  assert.strictEqual(Mind.query(m, R(['v0'], [[bit]])).status, 'resolved_true');
  assert.ok(m.ledger.some(x => x.id === badId));
  recoveryChecks++;
}

console.log('42ndMind one-rule stress: PASS');
console.log(`seed=${seed}`);
console.log(`trials=${trials}`);
console.log(`derived checks=${derivedChecks}`);
console.log(`unit-sum checks=${unitChecks}`);
console.log(`conflict/recovery checks=${recoveryChecks}`);
