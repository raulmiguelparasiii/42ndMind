(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./exact.js'), require('./symbolic-algebra.js'));
  else root.FortySecondMindSymbolicSolver = factory(root.FortySecondMindExact, root.FortySecondMindAlgebra);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Exact, Algebra) {
  'use strict';
  if (!Exact || !Algebra) throw new Error('exact.js and symbolic-algebra.js must load before symbolic-solver.js');
  const { Rational } = Exact;
  const { numberNode, parseSymbolicRelation, expressionText, expressionKey, expressionSymbols, relationText, relationKey, reversedRelationKey, reverseOperator, negateRelationOperator, simplifyExpr } = Algebra;
  function unique(values) { return Array.from(new Set((values || []).map((x) => String(x).trim()).filter(Boolean))).sort(); }

  const ALL_SIGNS = Object.freeze(['negative', 'zero', 'positive']);
  function signSet(values) { return new Set(values); }
  function intersectSigns(a, b) { return new Set(Array.from(a).filter((x) => b.has(x))); }

  function signsFromType(type) {
    const text = String(type || '').toLowerCase().replace(/[\s-]+/g, '_');
    if (text.includes('positive') && !text.includes('nonpositive')) return signSet(['positive']);
    if (text.includes('negative') && !text.includes('nonnegative')) return signSet(['negative']);
    if (text.includes('nonnegative')) return signSet(['zero', 'positive']);
    if (text.includes('nonpositive')) return signSet(['negative', 'zero']);
    if (text.includes('nonzero')) return signSet(['negative', 'positive']);
    if (text.includes('zero')) return signSet(['zero']);
    return signSet(ALL_SIGNS);
  }

  function relationSigns(operator) {
    if (operator === '>') return signSet(['positive']);
    if (operator === '>=') return signSet(['zero', 'positive']);
    if (operator === '<') return signSet(['negative']);
    if (operator === '<=') return signSet(['negative', 'zero']);
    if (operator === '!=') return signSet(['negative', 'positive']);
    return signSet(['zero']);
  }

  function buildSymbolicEnvironment(data) {
    const knownSymbols = Object.keys(data.symbols || {});
    const domains = {};
    Object.entries(data.symbols || {}).forEach(([name, type]) => { domains[name] = signsFromType(type); });
    const definitions = {};
    const assumptions = [];
    const assumptionKeys = new Set();
    const contradictions = [];

    (data.assumptions || []).forEach((source) => {
      const relation = parseSymbolicRelation(source, knownSymbols);
      assumptions.push(relation);
      assumptionKeys.add(relationKey(relation));
      assumptionKeys.add(reversedRelationKey(relation));
      if (relation.operator === '=' && relation.left.type === 'symbol' && !expressionSymbols(relation.right).has(relation.left.name)) definitions[relation.left.name] = relation.right;
      else if (relation.operator === '=' && relation.right.type === 'symbol' && !expressionSymbols(relation.left).has(relation.right.name)) definitions[relation.right.name] = relation.left;

      let symbol = null;
      let operator = relation.operator;
      let numeric = null;
      if (relation.left.type === 'symbol' && relation.right.type === 'number') { symbol = relation.left.name; numeric = relation.right.value; }
      else if (relation.right.type === 'symbol' && relation.left.type === 'number') { symbol = relation.right.name; numeric = relation.left.value; operator = reverseOperator(operator); }
      if (symbol && numeric && numeric.isZero()) {
        const current = domains[symbol] || signSet(ALL_SIGNS);
        const next = intersectSigns(current, relationSigns(operator));
        domains[symbol] = next;
        if (next.size === 0) contradictions.push(`incompatible sign constraints for ${symbol}`);
      }
    });

    assumptions.forEach((relation) => {
      const negated = `${expressionKey(relation.left)}${negateRelationOperator(relation.operator)}${expressionKey(relation.right)}`;
      if (assumptionKeys.has(negated)) contradictions.push(`assumption conflict: ${relationText(relation)}`);
    });
    return { domains, definitions, assumptions, assumptionKeys, contradictions: unique(contradictions) };
  }

  function substituteExpression(node, definitions, stack) {
    const seen = stack || new Set();
    if (node.type === 'symbol' && definitions[node.name] && !seen.has(node.name)) {
      const next = new Set(seen);
      next.add(node.name);
      return substituteExpression(definitions[node.name], definitions, next);
    }
    if (node.type === 'add') return simplifyExpr({ type: 'add', terms: node.terms.map((x) => substituteExpression(x, definitions, seen)) });
    if (node.type === 'mul') return simplifyExpr({ type: 'mul', factors: node.factors.map((x) => substituteExpression(x, definitions, seen)) });
    if (node.type === 'pow') return simplifyExpr({ type: 'pow', base: substituteExpression(node.base, definitions, seen), exponent: node.exponent });
    return node;
  }

  function multiplySign(a, b) {
    if (a === 'zero' || b === 'zero') return 'zero';
    return a === b ? 'positive' : 'negative';
  }

  function possibleSigns(node, domains) {
    if (node.type === 'number') return node.value.compare(0) < 0 ? signSet(['negative']) : node.value.isZero() ? signSet(['zero']) : signSet(['positive']);
    if (node.type === 'symbol') return domains[node.name] || signSet(ALL_SIGNS);
    if (node.type === 'mul') {
      let result = signSet(['positive']);
      node.factors.forEach((factor) => {
        const next = new Set();
        result.forEach((a) => possibleSigns(factor, domains).forEach((b) => next.add(multiplySign(a, b))));
        result = next;
      });
      return result;
    }
    if (node.type === 'pow') {
      const base = possibleSigns(node.base, domains);
      const result = new Set();
      base.forEach((sign) => {
        if (node.exponent === 0) result.add('positive');
        else if (sign === 'zero') { if (node.exponent > 0) result.add('zero'); }
        else if (node.exponent % 2 === 0) result.add('positive');
        else result.add(sign);
      });
      return result;
    }
    if (node.type === 'add') {
      let result = signSet(['zero']);
      node.terms.forEach((term) => {
        const next = new Set();
        result.forEach((a) => possibleSigns(term, domains).forEach((b) => {
          if (a === 'zero') next.add(b);
          else if (b === 'zero') next.add(a);
          else if (a === b) next.add(a);
          else ALL_SIGNS.forEach((x) => next.add(x));
        }));
        result = next;
      });
      return result;
    }
    return signSet(ALL_SIGNS);
  }

  function relationVerdictFromSigns(operator, signs) {
    const has = (value) => signs.has(value);
    if (operator === '=') return signs.size === 1 && has('zero') ? 'proved' : !has('zero') ? 'disproved' : 'underdetermined';
    if (operator === '!=') return !has('zero') ? 'proved' : signs.size === 1 && has('zero') ? 'disproved' : 'underdetermined';
    if (operator === '>') return signs.size === 1 && has('positive') ? 'proved' : !has('positive') ? 'disproved' : 'underdetermined';
    if (operator === '>=') return !has('negative') ? 'proved' : signs.size === 1 && has('negative') ? 'disproved' : 'underdetermined';
    if (operator === '<') return signs.size === 1 && has('negative') ? 'proved' : !has('negative') ? 'disproved' : 'underdetermined';
    if (operator === '<=') return !has('positive') ? 'proved' : signs.size === 1 && has('positive') ? 'disproved' : 'underdetermined';
    return 'underdetermined';
  }

  function collectNonzeroRequirements(node, out) {
    const list = out || [];
    if (!node) return list;
    if (node.type === 'pow') {
      if (node.exponent < 0) list.push(node.base);
      collectNonzeroRequirements(node.base, list);
    }
    if (node.type === 'add') node.terms.forEach((x) => collectNonzeroRequirements(x, list));
    if (node.type === 'mul') node.factors.forEach((x) => collectNonzeroRequirements(x, list));
    return list;
  }

  function solveSymbolicData(data) {
    const querySource = String(data.query || '').trim();
    if (!querySource) throw new Error('symbolic query missing');
    const knownSymbols = Object.keys(data.symbols || {});
    const environment = buildSymbolicEnvironment(data);
    const query = parseSymbolicRelation(querySource, knownSymbols);
    const direct = environment.assumptionKeys.has(relationKey(query)) || environment.assumptionKeys.has(reversedRelationKey(query));
    const domainRequirements = [...collectNonzeroRequirements(query.left), ...collectNonzeroRequirements(query.right)]
      .map((expr) => substituteExpression(expr, environment.definitions));
    const domainGaps = unique(domainRequirements
      .filter((expr) => possibleSigns(expr, environment.domains).has('zero'))
      .map((expr) => `requires_nonzero:${expressionText(expr)}`));
    const substitutedLeft = substituteExpression(query.left, environment.definitions);
    const substitutedRight = substituteExpression(query.right, environment.definitions);
    const difference = simplifyExpr({ type: 'add', terms: [substitutedLeft, { type: 'mul', factors: [numberNode(-1), substitutedRight] }] });
    const signs = possibleSigns(difference, environment.domains);
    let verdict = direct ? 'proved' : relationVerdictFromSigns(query.operator, signs);
    if (domainGaps.length && verdict === 'proved') verdict = 'underdetermined';
    if (environment.contradictions.length) verdict = 'inconsistent_assumptions';
    const unresolved = Array.from(expressionSymbols(difference)).sort();
    const steps = [
      { operation: 'compile_relation', result: relationText(query) },
      { operation: 'apply_definitions', left: expressionText(substitutedLeft), right: expressionText(substitutedRight) },
      { operation: 'canonical_difference', result: expressionText(difference) },
      { operation: 'sign_domain', result: Array.from(signs).sort() }
    ];
    if (direct) steps.splice(1, 0, { operation: 'match_assumption', result: relationText(query) });
    return {
      align: verdict === 'proved' ? 1 : 0,
      status: verdict,
      canonical: relationText({ left: substitutedLeft, right: substitutedRight, operator: query.operator }),
      why: verdict === 'proved' ? 'the query follows from the declared symbolic assumptions and domain constraints'
        : verdict === 'disproved' ? 'the declared assumptions force the negation of the query'
          : verdict === 'inconsistent_assumptions' ? 'the assumption set is formally inconsistent'
            : 'the known relations do not decide the query; unresolved variables remain suspended',
      certificate: {
        schema: '42ndMind.proof-certificate.v0.2',
        role: 'symbolic_relation',
        scope: data.scope || 'declared symbolic package',
        assumptions: (data.assumptions || []).slice(),
        symbol_domains: Object.fromEntries(Object.entries(environment.domains).map(([name, domain]) => [name, Array.from(domain).sort()])),
        definitions: Object.fromEntries(Object.entries(environment.definitions).map(([name, expr]) => [name, expressionText(expr)])),
        steps,
        unresolved,
        contradictions: environment.contradictions,
        domain_requirements: domainRequirements.map(expressionText),
        domain_gaps: domainGaps
      },
      proof: steps,
      correct_path: verdict === 'underdetermined' ? { supply: unresolved, preserve: 'all presently unresolved variables' } : relationText(query),
      counterexample: verdict === 'disproved' ? { canonical_difference: expressionText(difference), possible_signs: Array.from(signs).sort() } : null,
      contradictions: environment.contradictions,
      gaps: verdict === 'underdetermined' ? unique(domainGaps.concat(unresolved.map((name) => `unresolved:${name}`))) : environment.contradictions,
      variables: Array.from(new Set([...expressionSymbols(query.left), ...expressionSymbols(query.right), ...expressionSymbols(substitutedLeft), ...expressionSymbols(substitutedRight)])).sort()
    };
  }

  return Object.freeze({ solveSymbolicData });
});
