const assert = require('assert');
const M = require('./kernel.js');
const Exact = require('./exact.js');
require('./symbolic-algebra.js');
const Solver = require('./symbolic-solver.js');
const Compare = require('./logic-compare.js');
require('./symbolic.js')(M, Exact, Solver, Compare);
const K = new M.Kernel({ storage: false });

function eq(actual, expected, label) { assert.deepStrictEqual(actual, expected, label); }
function ok(value, label) { assert.ok(value, label); }

// Identity and exact arithmetic.
eq(K.evaluate('', '', 'kernel').align, 1, 'blank');
eq(K.evaluate('2+2=4', '', 'kernel').align, 1, 'arithmetic true');
eq(K.evaluate('2+1=4', '', 'kernel').align, 0, 'arithmetic false');
eq(K.evaluate('0.1+0.2=0.3', '', 'kernel').align, 1, 'decimal arithmetic is exact');
eq(K.evaluate('0.1+0.2!=0.3', '', 'kernel').align, 0, 'exact inequality is consistent');
eq(K.evaluate('1/3+1/3+1/3=1', '', 'kernel').align, 1, 'rational arithmetic');
ok(K.evaluate('2+1=4', 'certificate', 'kernel').projections[0].value, 'arithmetic certificate');

// Propositional and entailment calculi.
eq(K.evaluate('(A ∧ (A → B)) → B', '', 'kernel').align, 1, 'modus ponens tautology');
eq(K.evaluate('A ∨ ¬A', '', 'kernel').align, 1, 'excluded middle');
eq(K.evaluate('A', '', 'kernel').align, 0, 'atom not tautology');
eq(K.evaluate('A, A -> B ⊢ B', '', 'kernel').align, 1, 'entailment');
eq(K.evaluate('A ⊢ B', 'counterexample', 'kernel').align, 0, 'invalid entailment');

// Symbolic variables remain suspended unless the relation decides the query.
const bare = K.evaluate('E=m*c^2', 'variables,gaps', 'kernel');
eq(bare.align, 0, 'bare symbolic claim is not assumed true');
eq(bare.solution.status, 'underdetermined', 'bare symbolic status');
ok(bare.solution.variables.includes('E') && bare.solution.variables.includes('m') && bare.solution.variables.includes('c'), 'bare variables preserved');

const energy = {
  schema: '42ndMind.symbolic-package.v0.1',
  scope: 'mass-energy relation over reals',
  symbols: { E: 'real', m: 'positive_real', c: 'nonzero_real' },
  assumptions: ['E=m*c^2', 'm>0', 'c!=0'],
  query: 'E>0'
};
const energyResult = K.evaluate(JSON.stringify(energy), 'certificate', 'kernel');
eq(energyResult.align, 1, 'symbolic sign consequence');
eq(energyResult.solution.status, 'proved', 'symbolic proof status');
ok(energyResult.solution.certificate.unresolved.includes('m'), 'unknown magnitude remains suspended');
ok(energyResult.solution.certificate.unresolved.includes('c'), 'unknown constant value remains suspended');

const rearranged = Object.assign({}, energy, { query: 'm=E/c^2' });
eq(K.evaluate(JSON.stringify(rearranged), '', 'kernel').align, 1, 'symbolic rearrangement');

const unsafeRearrangement = Object.assign({}, energy, {
  symbols: { E: 'real', m: 'real', c: 'real' },
  assumptions: ['E=m*c^2'],
  query: 'm=E/c^2'
});
const unsafe = K.evaluate(JSON.stringify(unsafeRearrangement), 'gaps', 'kernel');
eq(unsafe.align, 0, 'division does not cancel without nonzero domain');
ok(unsafe.solution.gaps.includes('requires_nonzero:c'), 'nonzero obligation exposed');

const unresolvedEnergy = Object.assign({}, energy, { query: 'E=18' });
const unresolvedEnergyResult = K.evaluate(JSON.stringify(unresolvedEnergy), 'gaps', 'kernel');
eq(unresolvedEnergyResult.align, 0, 'unknown numeric value remains unresolved');
eq(unresolvedEnergyResult.solution.status, 'underdetermined', 'unknown numeric status');
ok(unresolvedEnergyResult.solution.gaps.includes('unresolved:m'), 'mass remains unresolved');
ok(unresolvedEnergyResult.solution.gaps.includes('unresolved:c'), 'c magnitude remains unresolved');

const inconsistent = Object.assign({}, energy, { assumptions: ['m>0', 'm<=0'], query: 'm>0' });
eq(K.evaluate(JSON.stringify(inconsistent), '', 'kernel').solution.status, 'inconsistent_assumptions', 'inconsistent domains detected');

// OGTS computes known components while preserving unknown components.
const ogtsPartial = {
  schema: '42ndMind.ogts.v0.1',
  components: { G: 1, E: 0.8, P: null, K: 0.9, W: 0.85, S: 0.75 }
};
const ogtsPartialResult = K.evaluate(JSON.stringify(ogtsPartial), 'certificate,gaps', 'kernel');
eq(ogtsPartialResult.align, 0, 'partial OGTS is not admitted as ideal');
eq(ogtsPartialResult.solution.status, 'ogts_partially_resolved', 'partial OGTS status');
eq(ogtsPartialResult.solution.certificate.known_upper_bound, '0.75', 'partial OGTS bound');
eq(ogtsPartialResult.solution.certificate.unresolved, ['P'], 'partial OGTS suspended component');

const ogtsIdeal = {
  schema: '42ndMind.ogts.v0.1',
  components: { G: 1, E: 1, P: 1, K: 1, W: 1, S: 1 }
};
eq(K.evaluate(JSON.stringify(ogtsIdeal), '', 'kernel').align, 1, 'exact OGTS ideal');

// Finite declared-case structural comparison.
const comparison = {
  schema: '42ndMind.logic-comparison.v0.1',
  scope: 'verification burden in the declared cases',
  correction_open: true,
  baseline: {
    id: 'fixed-burden',
    rules: [{ if: ['disputed'], then: 'verify' }]
  },
  candidate: {
    id: 'proportional-burden',
    rules: [
      { if: ['disputed'], then: 'verify' },
      { if: ['disputed', 'high_magnitude', 'weak_evidence'], then: 'high_verification' },
      { if: ['disputed', 'low_magnitude', 'reversible'], then: 'proportionate_verification' }
    ]
  },
  cases: [
    { id: 'high-stakes', facts: ['disputed', 'high_magnitude', 'weak_evidence'] },
    { id: 'low-stakes', facts: ['disputed', 'low_magnitude', 'reversible'] }
  ]
};
const comparisonResult = K.evaluate(JSON.stringify(comparison), 'certificate', 'kernel');
eq(comparisonResult.align, 1, 'candidate strict extension on declared cases');
eq(comparisonResult.solution.status, 'candidate_strictly_extends_baseline_on_declared_cases', 'comparison status');
eq(comparisonResult.solution.certificate.preservation, true, 'baseline preserved');
eq(comparisonResult.solution.certificate.strict_extension, true, 'strict extension established');
ok(comparisonResult.solution.certificate.limitation.includes('does not establish unrestricted superiority'), 'scope limitation explicit');

const closedComparison = Object.assign({}, comparison, { correction_open: false });
eq(K.evaluate(JSON.stringify(closedComparison), '', 'kernel').align, 0, 'correction-closed candidate not admitted');

// Capsule lifecycle remains intact.
const capsule = {
  schema: '42ndMind.logic-capsule.v0.3', id: 'burden', title: 'Burden proportionality', version: '1', scope: 'claims', symbols: {},
  assumptions: [], facts: ['large_claim'], rules: [{ if: ['large_claim'], then: 'scaled_burden' }], provenance: ['IEL'], evidence: [],
  falsifiers: ['fixed burden remains mature'], dependencies: ['IEL'],
  admission_obligations: ['formal_coherence', 'scope_defined', 'provenance_preserved', 'empirical_or_case_grounding', 'eo_compatibility', 'correction_open'],
  correction_open: true, eo_requirements: ['RPC']
};
const mounted = K.evaluate(JSON.stringify(capsule), 'gaps', 'kernel');
eq(mounted.align, 0, 'mounted provisional');
eq(K.state.capsules.burden.status, 'provisional', 'provisional status');

const pkg = { id: 'p', facts: [], rules: [], query: 'scaled_burden' };
eq(K.evaluate(JSON.stringify(pkg), '', 'kernel').align, 0, 'provisional excluded canonically');
eq(K.evaluate(JSON.stringify(pkg), '', 'capsule:burden').align, 1, 'capsule lens derives');

for (const obligation of ['empirical_or_case_grounding', 'eo_compatibility']) {
  K.pressure('burden', { kind: 'discharge', obligation, description: 'local certificate' });
}
eq(K.state.capsules.burden.status, 'accepted', 'accepted after obligations');
eq(K.evaluate(JSON.stringify(pkg), '', 'kernel').align, 1, 'accepted capsule canonical');

K.pressure('burden', { id: 'd1', kind: 'eo_failure', decisive: true, material: true, description: 'decisive defeat' });
eq(K.state.capsules.burden.status, 'rejected', 'rejected after decisive defeat');
eq(K.evaluate(JSON.stringify(pkg), '', 'kernel').align, 0, 'defeat removed from canonical');

console.log('42ndMind Pages engine v0.2: all tests passed');
