'use strict';

const fs = require('fs');

let source = fs.readFileSync(require.resolve('./language-world-life.test.js'), 'utf8');

source = source.replace(
  "for (const feature of ['p12', 'p13', 'p14']) {",
  `if (Object.prototype.hasOwnProperty.call(partial.current.completed, 'p12')) {
  const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const candidates = (partial.structure.patterns || [])
    .filter(p => p.active !== false && p.target === 'p12' && p.conditions.every(c =>
      Object.prototype.hasOwnProperty.call(partial.current.completed, c.feature) &&
      sameValue(partial.current.completed[c.feature], c.value)))
    .sort((a, b) =>
      a.predictive_code_bits - b.predictive_code_bits ||
      b.bits_saved - a.bits_saved || b.covered - a.covered || a.id.localeCompare(b.id))
    .slice(0, 40)
    .map(p => ({
      id: p.id, expected: p.expected, conditions: p.conditions,
      support: p.support, exceptions: p.exceptions, covered: p.covered,
      reliability: p.reliability, predictive_code_bits: p.predictive_code_bits,
      dependency_count: p.dependency_count, bits_saved: p.bits_saved,
    }));
  const trueSymbolsContainingP12 = (partial.structure.symbols || [])
    .filter(s => partial.current.completed[s.feature] === true &&
      s.definition.some(a => a.feature === 'p12'))
    .map(s => ({ feature: s.feature, definition: s.definition, source: s.source }));
  console.log('PARTIAL_OVERREACH_DIAGNOSTIC ' + JSON.stringify({
    observed: partial.current.observed,
    completed: partial.current.completed,
    inferred: partial.current.inferred,
    unresolved: partial.current.unresolved,
    p12_candidates: candidates,
    true_symbols_containing_p12: trueSymbolsContainingP12,
  }));
}
for (const feature of ['p12', 'p13', 'p14']) {`
);

const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', source);
execute(require, module, module.exports, require.resolve('./language-world-life.test.js'), __dirname);
