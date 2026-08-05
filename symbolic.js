(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else factory(root.FortySecondMind, root.FortySecondMindExact, root.FortySecondMindSymbolicSolver, root.FortySecondMindLogicCompare);
})(typeof globalThis !== 'undefined' ? globalThis : this, function apply42ndMindSymbolicV2(M, Exact, Solver, Compare) {
  'use strict';
  if (!M || !M.Kernel) throw new Error('kernel.js must load before symbolic.js');
  if (!Exact || !Solver || !Compare) throw new Error('symbolic dependency files must load before symbolic.js');
  const Kernel = M.Kernel;
  if (Kernel.prototype.__symbolicV2) return M;
  const stableStringify = M.stableStringify;
  const { findTopLevelComparator, evaluateArithmeticStatement, formatNumber } = Exact;
  const { solveSymbolicData } = Solver;
  const { compareDeclaredLogics, solveOgtsData } = Compare;

  function tryJson(text) {
    if (!String(text).trim().startsWith('{')) return null;
    try { return JSON.parse(text); } catch (_) { return null; }
  }

  function numericComparisonInput(input) {
    return Boolean(findTopLevelComparator(input) && /^[\d\s.+\-*/%^()eE<>=!]+$/.test(input));
  }

  const originalSolve = Kernel.prototype.solve;
  const originalProject = Kernel.prototype.project;

  Kernel.prototype.solveArithmetic = function solveArithmeticV2(input, view) {
    try {
      const result = evaluateArithmeticStatement(input);
      const certificate = {
        schema: '42ndMind.proof-certificate.v0.2',
        role: 'exact_arithmetic_relation',
        scope: 'exact rational arithmetic with integer exponents',
        compiler: '42ndMind.exact-rational.v0.2',
        steps: [
          { expression: result.leftText, exact_value: result.left.toString(), display_value: formatNumber(result.left) },
          { expression: result.rightText, exact_value: result.right.toString(), display_value: formatNumber(result.right) },
          { comparator: result.operator, satisfied: Boolean(result.align) }
        ],
        unresolved: [],
        verdict: result.align ? 'proved' : 'disproved'
      };
      return {
        kind: 'arithmetic', view, align: result.align, status: result.align ? 'verified_true' : 'verified_false', input,
        canonical: result.normalized,
        why: result.align ? 'both sides satisfy the stated relation' : 'the evaluated sides do not satisfy the stated relation',
        proof: result.proof, certificate, correct_path: result.correctPath,
        counterexample: result.align ? null : { left: formatNumber(result.left), operator: result.operator, right: formatNumber(result.right) },
        dependencies: ['42ndMind.exact-rational.v0.2'], contradictions: [], gaps: []
      };
    } catch (error) {
      return {
        kind: 'arithmetic', view, align: 0, status: 'undefined_or_unsupported', input, canonical: input,
        why: error.message, proof: [], certificate: null,
        correct_path: 'supply a well-formed arithmetic comparison with its required domain conditions',
        counterexample: null, dependencies: ['42ndMind.exact-rational.v0.2'], contradictions: [], gaps: [error.message]
      };
    }
  };

  Kernel.prototype.solveSymbolicPackage = function solveSymbolicPackageV2(data, view) {
    try {
      const result = solveSymbolicData(data);
      return {
        kind: 'symbolic_relation', view, align: result.align, status: result.status,
        input: stableStringify(data), canonical: result.canonical, why: result.why,
        proof: result.proof, certificate: result.certificate, correct_path: result.correct_path,
        counterexample: result.counterexample, dependencies: [], contradictions: result.contradictions,
        gaps: result.gaps, variables: result.variables
      };
    } catch (error) {
      return {
        kind: 'symbolic_relation', view, align: 0, status: 'uncompiled', input: stableStringify(data), canonical: data.query || '',
        why: error.message, proof: [], certificate: null,
        correct_path: 'supply a well-formed symbolic package with explicit symbols, assumptions, scope, and query',
        counterexample: null, dependencies: [], contradictions: [], gaps: [error.message], variables: []
      };
    }
  };

  Kernel.prototype.solveLogicComparison = function solveLogicComparisonV2(data, view) {
    try {
      const result = compareDeclaredLogics(data);
      return {
        kind: 'logic_comparison', view, align: result.align, status: result.status,
        input: stableStringify(data), canonical: result.canonical, why: result.why,
        proof: result.proof, certificate: result.certificate, correct_path: result.correct_path,
        counterexample: result.counterexample, dependencies: [], contradictions: result.contradictions,
        gaps: result.gaps
      };
    } catch (error) {
      return {
        kind: 'logic_comparison', view, align: 0, status: 'uncompiled', input: stableStringify(data), canonical: null,
        why: error.message, proof: [], certificate: null,
        correct_path: 'declare baseline, candidate, mappings where needed, and a finite comparison case class',
        counterexample: null, dependencies: [], contradictions: [], gaps: [error.message]
      };
    }
  };

  Kernel.prototype.solveOgts = function solveOgtsV2(data, view) {
    try {
      const result = solveOgtsData(data);
      return {
        kind: 'ogts', view, align: result.align, status: result.status,
        input: stableStringify(data), canonical: result.canonical, why: result.why,
        proof: result.proof, certificate: result.certificate, correct_path: result.correct_path,
        counterexample: result.counterexample, dependencies: [], contradictions: result.contradictions,
        gaps: result.gaps
      };
    } catch (error) {
      return {
        kind: 'ogts', view, align: 0, status: 'uncompiled', input: stableStringify(data), canonical: 'OGTS = min{G,E,P,K,W,S+}',
        why: error.message, proof: [], certificate: null,
        correct_path: 'provide each known OGTS component in [0,1] and use null or ? for suspended components',
        counterexample: null, dependencies: [], contradictions: [], gaps: [error.message]
      };
    }
  };

  Kernel.prototype.solve = function solveV2(rawInput, view) {
    const input = String(rawInput == null ? '' : rawInput).trim();
    if (!input) return originalSolve.call(this, rawInput, view);
    const json = tryJson(input);
    if (json) {
      if (json.schema === '42ndMind.symbolic-package.v0.1' || json.kind === 'symbolic_math') return this.solveSymbolicPackage(json, view);
      if (json.schema === '42ndMind.logic-comparison.v0.1') return this.solveLogicComparison(json, view);
      if (json.schema === '42ndMind.ogts.v0.1') return this.solveOgts(json, view);
      return originalSolve.call(this, rawInput, view);
    }
    if (input.includes('⊢') || input.includes('|-')) return originalSolve.call(this, rawInput, view);
    const comparator = findTopLevelComparator(input);
    if (comparator && numericComparisonInput(input)) return this.solveArithmetic(input, view);
    if (comparator) return this.solveSymbolicPackage({
      schema: '42ndMind.symbolic-package.v0.1', scope: 'bare symbolic query', symbols: {}, assumptions: [], query: input
    }, view);
    return originalSolve.call(this, rawInput, view);
  };

  Kernel.prototype.project = function projectV2(solution, name) {
    const filter = String(name || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (filter === 'certificate' || filter === 'cert') return solution.certificate || null;
    if (filter === 'variables' || filter === 'unknowns' || filter === 'suspended') {
      return solution.variables || (solution.certificate && solution.certificate.unresolved) || [];
    }
    return originalProject.call(this, solution, name);
  };

  Kernel.prototype.equations = function equationsV2() {
    return [
      '𝕂 + x = Align(S𝕂(x)) ∈ {0,1}',
      '𝕂 + x + φ = πφ(S𝕂(x))',
      'S𝕂(x) = Admit(Cert(Canon(Close(Compile(x)))))',
      'Unknown(v) ⇒ Suspend(v), not Guess(v)',
      'L₂ ≻C L₁ ⇔ PreserveC(L₁,L₂) ∧ ExtendC(L₂,L₁) ∧ ConsistentC(L₂)',
      'OGTS(r) = min{Gᵣ,Eᵣ,Pᵣ,Kᵣ,Wᵣ,Sᵣ⁺}'
    ];
  };

  Object.defineProperty(Kernel.prototype, '__symbolicV2', { value: true, enumerable: false });
  return M;
});
