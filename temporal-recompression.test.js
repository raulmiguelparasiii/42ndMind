const assert = require('assert');
const Mind = require('./recursive-recompression.js');

function stage1() {
  const out = []; let n = 0;
  const steps = ['request', 'ignore'];
  for (let r = 0; r < 10; r++) {
    for (const step1 of steps) for (const step2 of steps) {
      out.push({
        id: `s1-${++n}`,
        step1,
        step2,
        local_tension: step1 === 'request' && step2 === 'ignore',
      });
    }
  }
  return out;
}

function stage2() {
  const out = []; let n = 0;
  const steps = ['request', 'ignore'];
  const step3s = ['repair', 'repeat'];
  for (let r = 0; r < 8; r++) {
    for (const step1 of steps) for (const step2 of steps) for (const step3 of step3s) {
      out.push({
        id: `s2-${++n}`,
        step1,
        step2,
        step3,
        escalation: step1 === 'request' && step2 === 'ignore' && step3 === 'repeat',
      });
    }
  }
  return out;
}

function stage3() {
  const out = []; let n = 0;
  const steps = ['request', 'ignore'];
  const step3s = ['repair', 'repeat'];
  const contexts = ['low', 'high'];
  for (let r = 0; r < 6; r++) {
    for (const step1 of steps) for (const step2 of steps) for (const step3 of step3s) for (const context of contexts) {
      out.push({
        id: `s3-${++n}`,
        step1,
        step2,
        step3,
        context,
        withdrawal:
          step1 === 'request' && step2 === 'ignore' && step3 === 'repeat' && context === 'high',
      });
    }
  }
  return out;
}

function stage4() {
  const out = []; let n = 0;
  const steps = ['request', 'ignore'];
  const step3s = ['repair', 'repeat'];
  const contexts = ['low', 'high'];
  for (let r = 0; r < 5; r++) {
    for (const step1 of steps) for (const step2 of steps) for (const step3 of step3s) {
      for (const context of contexts) for (const repair_after of [false, true]) {
        out.push({
          id: `s4-${++n}`,
          step1,
          step2,
          step3,
          context,
          repair_after,
          withdrawal:
            step1 === 'request' && step2 === 'ignore' && step3 === 'repeat' &&
            context === 'high' && repair_after === false,
        });
      }
    }
  }
  return out;
}

function hasAtom(symbol, feature, value) {
  return symbol.definition.some(a => a.feature === feature && a.value === value);
}

let m = Mind.one();

// No temporal faculty is supplied. step1/step2 are merely ordered roles in
// experience; C must decide whether their particular ordering is worth reusing.
m = Mind.recompress(m, stage1(), { maxConditions: 2, maxPasses: 1, maxSymbolsPerPass: 12 });
const h1 = m.symbols.find(s =>
  s.definition.length === 2 &&
  hasAtom(s, 'step1', 'request') &&
  hasAtom(s, 'step2', 'ignore')
);
assert.ok(h1, 'C should compress the recurring ordered fragment request→ignore');
assert.strictEqual(h1.depth, 1);

const forward1 = Mind.predict(m, { step1: 'request', step2: 'ignore' });
const reverse1 = Mind.predict(m, { step1: 'ignore', step2: 'request' });
assert.strictEqual(forward1.expanded_experience[h1.feature], true);
assert.strictEqual(reverse1.expanded_experience[h1.feature], false,
  'the same events in reverse order must not instantiate the learned sequence');

// A three-step raw conjunction is outside a two-condition rule. Reuse of h1 is
// therefore necessary for the next regularity to fit inside the same budget.
m = Mind.recompress(m, stage2(), { maxConditions: 2, maxPasses: 1, maxSymbolsPerPass: 16 });
const p2 = m.patterns.find(p =>
  p.target === 'escalation' && p.expected === true &&
  p.conditions.some(a => a.feature === h1.feature && a.value === true) &&
  p.conditions.some(a => a.feature === 'step3' && a.value === 'repeat')
);
assert.ok(p2, 'the learned ordered fragment should become material for a longer trajectory');

const h2 = m.symbols.find(s =>
  s.depth >= 2 &&
  hasAtom(s, h1.feature, true) &&
  hasAtom(s, 'step3', 'repeat')
);
assert.ok(h2, 'the three-step trajectory should itself become reusable vocabulary');

// Four raw conditions are likewise unavailable to the two-condition learner.
m = Mind.recompress(m, stage3(), { maxConditions: 2, maxPasses: 1, maxSymbolsPerPass: 20 });
const p3 = m.patterns.find(p =>
  p.target === 'withdrawal' && p.expected === true &&
  p.conditions.some(a => a.feature === h2.feature && a.value === true) &&
  p.conditions.some(a => a.feature === 'context' && a.value === 'high')
);
assert.ok(p3, 'context should combine with the self-learned trajectory under the same C');

const h3 = m.symbols.find(s =>
  s.depth >= 3 &&
  hasAtom(s, h2.feature, true) &&
  hasAtom(s, 'context', 'high')
);
assert.ok(h3, 'the context-qualified trajectory should itself become reusable');

// Later experience reveals that a repair after the trajectory changes the
// outcome. The prior abstraction must remain available but become refinable.
m = Mind.recompress(m, stage4(), { maxConditions: 3, maxPasses: 1, maxSymbolsPerPass: 24 });
const refined = m.patterns.find(p =>
  p.target === 'withdrawal' && p.expected === true &&
  p.conditions.some(a => a.feature === h3.feature && a.value === true) &&
  p.conditions.some(a => a.feature === 'repair_after' && a.value === false)
);
assert.ok(refined, 'new corrective context should refine rather than erase the learned temporal abstraction');
assert.strictEqual(refined.exceptions, 0);

const risky = Mind.predict(m, {
  step1: 'request', step2: 'ignore', step3: 'repeat', context: 'high', repair_after: false,
});
assert.strictEqual(risky.expanded_experience[h1.feature], true);
assert.strictEqual(risky.expanded_experience[h2.feature], true);
assert.strictEqual(risky.expanded_experience[h3.feature], true);
assert.strictEqual(risky.best_by_target.withdrawal.expected, true);

const repaired = Mind.predict(m, {
  step1: 'request', step2: 'ignore', step3: 'repeat', context: 'high', repair_after: true,
});
assert.strictEqual(repaired.expanded_experience[h3.feature], true,
  'the older trajectory remains represented even when later information changes its implication');
assert.ok(repaired.best_by_target.withdrawal,
  'the later case should still be assessed rather than dropped from the model');
assert.strictEqual(repaired.best_by_target.withdrawal.expected, false,
  'the same compression law should learn that later repair changes the expected outcome');

const reversed = Mind.predict(m, {
  step1: 'ignore', step2: 'request', step3: 'repeat', context: 'high', repair_after: false,
});
assert.strictEqual(reversed.expanded_experience[h1.feature], false);
assert.strictEqual(reversed.expanded_experience[h2.feature], false);
assert.strictEqual(reversed.expanded_experience[h3.feature], false);

assert.strictEqual(m.whole, 1);
assert.strictEqual(m.formula, 'M(t+1)=C(M(t)∪R(t+1)); recursively reuse C output as C input');

console.log('42ndMind temporal recursive recompression: PASS');
console.log(`ordered-fragment=${h1.feature} depth=${h1.depth}`);
console.log(`trajectory=${h2.feature} depth=${h2.depth}`);
console.log(`context-trajectory=${h3.feature} depth=${h3.depth}`);
console.log('later repair refined the implication without deleting the prior trajectory');
