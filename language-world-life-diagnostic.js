'use strict';

const fs = require('fs');
const vm = require('vm');

let source = fs.readFileSync(require.resolve('./language-world-life.test.js'), 'utf8');

source = source.replace(
  'function readingProbe(m, sceneValue, speaker) {',
  `function matchingTargetDiagnostics(m, values, target) {
  const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return (m.structure.patterns || [])
    .filter(p => p.active !== false && p.target === target && p.conditions.every(c =>
      Object.prototype.hasOwnProperty.call(values, c.feature) && sameValue(values[c.feature], c.value)))
    .sort((a, b) =>
      a.predictive_code_bits - b.predictive_code_bits ||
      b.bits_saved - a.bits_saved ||
      b.covered - a.covered ||
      a.id.localeCompare(b.id))
    .slice(0, 40)
    .map(p => ({
      id: p.id,
      expected: p.expected,
      conditions: p.conditions,
      support: p.support,
      covered: p.covered,
      reliability: p.reliability,
      predictive_code_bits: p.predictive_code_bits,
      dependency_count: p.dependency_count,
      bits_saved: p.bits_saved,
    }));
}

function readingProbe(m, sceneValue, speaker) {`
);

source = source.replace(
  `  const actual = [10, 11, 12, 13, 14].map(i => q.current.completed[\`p\${i}\`]);
  assert.deepStrictEqual(actual, worldValues(sceneValue),
    \`variable-length reading failed for: \${words.filter(x => x !== EOS).join(' ')}\`);`,
  `  const actual = [10, 11, 12, 13, 14].map(i => q.current.completed[\`p\${i}\`]);
  const expected = worldValues(sceneValue);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.log('READING_FAILURE_DIAGNOSTIC ' + JSON.stringify({
      speaker,
      words,
      actual,
      expected,
      unresolved: q.current.unresolved,
      completed: q.current.completed,
      p13_matching_candidates: matchingTargetDiagnostics(q, q.current.completed, 'p13'),
    }));
  }
  assert.deepStrictEqual(actual, expected,
    \`variable-length reading failed for: \${words.filter(x => x !== EOS).join(' ')}\`);`
);

source = source.replace(
  `  star: directRouteDiagnostics(learner, 'star', 'p11', SHAPES.star),
  helps: directRouteDiagnostics(learner, 'helps', 'p14', VERBS.helps.code),`,
  `  star: directRouteDiagnostics(learner, 'star', 'p11', SHAPES.star),
  helps: directRouteDiagnostics(learner, 'helps', 'p14', VERBS.helps.code),
  square_patient: directRouteDiagnostics(learner, 'square', 'p13', SHAPES.square),`
);

vm.runInThisContext(source, { filename: 'language-world-life.test.js' });
