(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./exact.js'));
  else root.FortySecondMindLogicCompare = factory(root.FortySecondMindExact);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Exact) {
  'use strict';
  if (!Exact) throw new Error('exact.js must load before logic-compare.js');
  const { Rational, formatNumber } = Exact;
  function canonicalize(value) { if (Array.isArray(value)) return value.map(canonicalize); if (value && typeof value === 'object') { const out = {}; Object.keys(value).sort().forEach((key) => { out[key] = canonicalize(value[key]); }); return out; } return value; }
  function stableStringify(value) { return JSON.stringify(canonicalize(value)); }
  function hash(value) { const text = typeof value === 'string' ? value : stableStringify(value); let h1 = 0x811c9dc5; let h2 = 0x9e3779b9; for (let i = 0; i < text.length; i += 1) { const c = text.charCodeAt(i); h1 ^= c; h1 = Math.imul(h1, 0x01000193) >>> 0; h2 ^= (c + i) >>> 0; h2 = Math.imul(h2, 0x85ebca6b) >>> 0; } return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0'); }
  function unique(values) { return Array.from(new Set((values || []).map((x) => String(x).trim()).filter(Boolean))).sort(); }
  function normalizeAtom(value) { return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').replace(/^not\s+/i, '¬').replace(/^!\s*/, '¬'); }
  function normalizeRule(row, index) { const premises = unique((row && (row.if || row.premises)) || []).map(normalizeAtom); const conclusion = normalizeAtom(row && (row.then || row.conclusion)); return { id: String((row && row.id) || hash({ premises, conclusion, index })).slice(0, 16), if: premises, then: conclusion }; }
  function complement(atom) { const a = normalizeAtom(atom); return a.startsWith('¬') ? a.slice(1) : '¬' + a; }
  function forwardChain(initialFacts, rules) { const facts = new Set(unique(initialFacts).map(normalizeAtom)); const derivation = []; const dependencies = new Set(); let changed = true; let rounds = 0; while (changed && rounds < 1000) { changed = false; rounds += 1; for (const row of rules) { const rule = row.rule || row; const premises = (rule.if || []).map(normalizeAtom); const conclusion = normalizeAtom(rule.then); if (!conclusion || facts.has(conclusion)) continue; if (premises.every((p) => facts.has(p))) { facts.add(conclusion); derivation.push({ conclusion, premises, rule_id: rule.id || hash(rule).slice(0, 12), capsule_id: row.capsuleId || null, conditional: Boolean(row.conditional) }); if (row.capsuleId) dependencies.add(row.capsuleId); changed = true; } } } const contradictions = []; for (const fact of facts) if (facts.has(complement(fact))) contradictions.push([fact, complement(fact)].sort()); return { facts: Array.from(facts).sort(), derivation, dependencies: Array.from(dependencies).sort(), contradictions: Array.from(new Map(contradictions.map((x) => [x.join('|'), x])).values()) }; }

  function logicOutputSet(logic, closure) {
    if (Array.isArray(logic.outputs) && logic.outputs.length) return unique(logic.outputs).filter((x) => closure.facts.includes(normalizeAtom(x)));
    return unique(closure.derivation.map((step) => step.conclusion));
  }

  function evaluateDeclaredLogic(logic, caseData) {
    const facts = unique([].concat(logic.facts || [], logic.assumptions || [], caseData.facts || [])).map(normalizeAtom);
    const rules = (logic.rules || []).map((row, index) => ({ rule: normalizeRule(row, index), capsuleId: logic.id || null, conditional: false }));
    const closure = forwardChain(facts, rules);
    return { facts: closure.facts, outputs: logicOutputSet(logic, closure), derivation: closure.derivation, contradictions: closure.contradictions };
  }

  function mapOutput(output, mapping) { return normalizeAtom((mapping && mapping[output]) || output); }

  function compareDeclaredLogics(data) {
    const baseline = data.baseline || data.logic_a;
    const candidate = data.candidate || data.logic_b;
    if (!baseline || !candidate) throw new Error('logic comparison requires baseline and candidate');
    const cases = Array.isArray(data.cases) && data.cases.length ? data.cases : [{ id: 'default', facts: data.facts || [] }];
    const mapping = data.mapping || {};
    const rows = [];
    let preserves = true;
    let strict = false;
    let candidateContradiction = false;
    cases.forEach((caseData, index) => {
      const a = evaluateDeclaredLogic(baseline, caseData);
      const b = evaluateDeclaredLogic(candidate, caseData);
      const expected = a.outputs.map((output) => mapOutput(output, mapping));
      const missing = expected.filter((output) => !b.outputs.includes(output));
      const mappedBaseline = new Set(expected);
      const additions = b.outputs.filter((output) => !mappedBaseline.has(output));
      if (missing.length) preserves = false;
      if (additions.length) strict = true;
      if (b.contradictions.length) candidateContradiction = true;
      rows.push({
        case_id: caseData.id || `case-${index + 1}`,
        facts: unique(caseData.facts || []),
        baseline_outputs: a.outputs,
        candidate_outputs: b.outputs,
        missing_preservation: missing,
        candidate_additions: additions,
        baseline_derivation: a.derivation,
        candidate_derivation: b.derivation,
        candidate_contradictions: b.contradictions
      });
    });
    const correctionOpen = data.correction_open !== false;
    const verdict = candidateContradiction ? 'candidate_contradictory'
      : !correctionOpen ? 'candidate_not_correction_open'
        : preserves && strict ? 'candidate_strictly_extends_baseline_on_declared_cases'
          : preserves ? 'equivalent_or_nonstrict_on_declared_cases'
            : 'candidate_fails_preservation';
    return {
      align: verdict === 'candidate_strictly_extends_baseline_on_declared_cases' ? 1 : 0,
      status: verdict,
      canonical: {
        schema: '42ndMind.logic-comparison.v0.1',
        scope: data.scope || 'declared finite comparison class',
        baseline: baseline.id || 'baseline',
        candidate: candidate.id || 'candidate',
        cases: cases.map((row, index) => row.id || `case-${index + 1}`)
      },
      why: verdict === 'candidate_strictly_extends_baseline_on_declared_cases'
        ? 'the candidate preserves every derived baseline output and adds at least one noncontradictory output in the declared cases'
        : verdict === 'candidate_fails_preservation' ? 'the candidate loses at least one baseline result in the declared cases'
          : verdict === 'candidate_contradictory' ? 'the candidate derives a contradiction in at least one declared case'
            : verdict === 'candidate_not_correction_open' ? 'the candidate was declared closed to correction and therefore cannot receive a dominance certificate'
              : 'no strict extension was established in the declared cases',
      certificate: {
        schema: '42ndMind.dominance-certificate.v0.1',
        scope: data.scope || 'declared finite comparison class',
        preservation: preserves,
        strict_extension: strict,
        correction_open: correctionOpen,
        rows,
        limitation: 'This certificate proves only the encoded finite comparison. It does not establish unrestricted superiority over every possible case or formalization.'
      },
      proof: rows,
      correct_path: verdict === 'candidate_fails_preservation' ? rows.flatMap((row) => row.missing_preservation.map((output) => ({ case_id: row.case_id, preserve: output }))) : rows,
      counterexample: rows.find((row) => row.missing_preservation.length || row.candidate_contradictions.length) || null,
      contradictions: rows.flatMap((row) => row.candidate_contradictions),
      gaps: data.cases && data.cases.length ? [] : ['comparison_case_class_not_explicit']
    };
  }

  function solveOgtsData(data) {
    const names = ['G', 'E', 'P', 'K', 'W', 'S'];
    const components = data.components || {};
    const known = [];
    const unresolved = [];
    names.forEach((name) => {
      const value = components[name] != null ? components[name] : components[name === 'S' ? 'S+' : name];
      if (value == null || value === '?') unresolved.push(name);
      else {
        const rational = Rational.from(value);
        if (rational.compare(0) < 0 || rational.compare(1) > 0) throw new Error(`OGTS component ${name} must be in [0,1]`);
        known.push({ name, value: rational });
      }
    });
    let minimum = known.length ? known[0].value : Rational.one();
    known.forEach((row) => { if (row.value.compare(minimum) < 0) minimum = row.value; });
    const exact = unresolved.length === 0;
    return {
      align: exact && minimum.compare(1) === 0 ? 1 : 0,
      status: exact ? 'ogts_exact' : 'ogts_partially_resolved',
      canonical: `OGTS = min{${names.join(',')}}`,
      why: exact ? `all components are known; OGTS = ${formatNumber(minimum)}` : `known components bound OGTS at or below ${formatNumber(minimum)} while ${unresolved.join(', ')} remain suspended`,
      certificate: {
        schema: '42ndMind.ogts-certificate.v0.1',
        components: Object.fromEntries(known.map((row) => [row.name, formatNumber(row.value)])),
        unresolved,
        exact_value: exact ? formatNumber(minimum) : null,
        known_upper_bound: formatNumber(minimum)
      },
      proof: known.map((row) => `${row.name} = ${formatNumber(row.value)}`),
      correct_path: exact ? `OGTS = ${formatNumber(minimum)}` : { supply: unresolved },
      counterexample: null,
      contradictions: [],
      gaps: unresolved.map((name) => `unresolved:${name}`)
    };
  }

  return Object.freeze({ compareDeclaredLogics, solveOgtsData });
});
