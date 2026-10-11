'use strict';

const fs = require('fs');
const file = 'one-mind.js';
let source = fs.readFileSync(file, 'utf8');

function once(oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one occurrence, found ${count}`);
  source = source.replace(oldText, newText);
}

// `C` already refreshes relational knowledge after a newly closed experience.
// Search/materialization consume that snapshot; do not recompute the same generic
// closure again merely to build an index.
once(
`function materializeConceptFacts(state, subjects = null) {
  ensureFirstClassGrowth(state);
  refreshRelationalKnowledge(state);
  const rows = contactRowsFromFacts(state.knowledge.current?.facts || state.knowledge.facts);`,
`function materializeConceptFacts(state, subjects = null) {
  ensureFirstClassGrowth(state);
  const rows = contactRowsFromFacts(state.knowledge.current?.facts || state.knowledge.facts);`,
'materialize refresh'
);
once(
`function conceptSearchRows(state) {
  refreshRelationalKnowledge(state);
  const rows = contactRowsFromFacts(state.knowledge.current?.facts || state.knowledge.facts);`,
`function conceptSearchRows(state) {
  const rows = contactRowsFromFacts(state.knowledge.current?.facts || state.knowledge.facts);`,
'search refresh'
);

// Existing concepts are evaluated incrementally whenever a new contact closes.
// A global pass is needed only when a newly discovered concept must be projected
// back over history for the first time.
once(
`  materializeConceptFacts(state);
  let remaining = 8;`,
`  refreshRelationalKnowledge(state);
  let remaining = 2;`,
'recompression start'
);

// Finite working-description budget only; it does not change the MDL warrant or
// make any relation semantically privileged. Further warranted relations remain
// discoverable on later recompressions of the continuing M.
const budgetNeedle = 'Math.min(4, remaining)';
const budgetCount = source.split(budgetNeedle).length - 1;
if (budgetCount !== 2) throw new Error(`working budget: expected two occurrences, found ${budgetCount}`);
source = source.split(budgetNeedle).join('Math.min(1, remaining)');

fs.writeFileSync(file, source);
console.log('Bounded redundant first-class search without changing relation warrant');
