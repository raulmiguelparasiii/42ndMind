(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FortySecondMindOneRule = api;
})(globalThis, function () {
  'use strict';

  const VERSION = '0.3.1';

  // ONE DEVELOPMENT LAW
  //
  //   M(t+1) = C(M(t) ∪ {R(t+1)})
  //
  // C is reality-preserving recompression: retain every undefeated experience
  // and represent the accumulated history with the shortest reusable relational
  // descriptions found within the finite search budget. Residual cases are not
  // deleted. Learned descriptions are therefore heuristics, never truth-makers.
  // Exact truth remains:
  //
  //   W(t) = { w : every undefeated reality-relation in L(t) holds in w }
  //   M(t) denotes Δ(W(t)), represented in factored form with total unit 1.
  //
  // Repetition, chunking, refinement and defeasibility are consequences of the
  // same recompression after reality-contact, not separate cognitive modules.

  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  function same(a, b) { return stable(a) === stable(b); }

  function unique(values) {
    const seen = new Map();
    for (const value of values || []) seen.set(stable(value), value);
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, value]) => value);
  }

  function normalizeRelation(input) {
    if (!input) return null;
    const vars = [...(input.vars || [])].map(String);
    if (new Set(vars).size !== vars.length) throw new Error('relation variables must be unique');
    const allowed = (input.allowed || []).map(tuple => {
      if (!Array.isArray(tuple) || tuple.length !== vars.length) throw new Error('relation tuple arity mismatch');
      return tuple.slice();
    });
    return { vars, allowed };
  }

  function normalizeSample(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const out = {};
    for (const key of Object.keys(input).sort()) {
      const value = input[key];
      if (value !== undefined) out[String(key)] = value;
    }
    return Object.keys(out).length ? out : null;
  }

  function normalizeExperience(input, index) {
    const id = String(input.id || `r${index + 1}`);
    let domains = {};
    for (const [name, values] of Object.entries(input.domains || {})) {
      const domain = unique(values);
      if (!domain.length) throw new Error(`empty domain: ${name}`);
      domains[String(name)] = domain;
    }
    let relation = normalizeRelation(input.relation);
    const sample = normalizeSample(input.sample);

    // A sample is simply a bounded historical referent. It is translated into
    // the same relation language using namespaced variables, so learning from
    // cases does not require a second storage or update mechanism.
    if (sample) {
      if (relation || Object.keys(domains).length) throw new Error('sample experience cannot also declare relation/domains');
      const roles = Object.keys(sample).sort();
      const vars = roles.map(role => `@${id}:${role}`);
      domains = Object.fromEntries(vars.map((name, i) => [name, [sample[roles[i]]]]));
      relation = { vars, allowed: [roles.map(role => sample[role])] };
    }

    return {
      id,
      domains,
      relation,
      sample,
      supersedes: [...new Set((input.supersedes || []).map(String))].sort(),
      provenance: input.provenance == null ? null : input.provenance,
      raw: input.raw == null ? null : input.raw,
    };
  }

  function defeatedIds(ledger) {
    const defeated = new Set();
    for (const entry of ledger) for (const id of entry.supersedes) defeated.add(id);
    return defeated;
  }

  function activeRelations(ledger) {
    const defeated = defeatedIds(ledger);
    return ledger.filter(entry => entry.relation && !defeated.has(entry.id));
  }

  function activeSamples(ledger) {
    const defeated = defeatedIds(ledger);
    return ledger.filter(entry => entry.sample && !defeated.has(entry.id));
  }

  function collectDomains(ledger) {
    const domains = {};
    for (const entry of ledger) {
      for (const [name, values] of Object.entries(entry.domains)) {
        domains[name] = unique([...(domains[name] || []), ...values]);
      }
    }
    return domains;
  }

  function tupleSupported(tuple, relation, domains, fixedIndex, fixedValue) {
    if (fixedIndex != null && !same(tuple[fixedIndex], fixedValue)) return false;
    for (let i = 0; i < relation.vars.length; i++) {
      const domain = domains[relation.vars[i]] || [];
      if (!domain.some(v => same(v, tuple[i]))) return false;
    }
    return true;
  }

  function reduceDomains(domainsInput, active) {
    const domains = Object.fromEntries(Object.entries(domainsInput).map(([k, v]) => [k, v.slice()]));
    let changed = true, pruned = 0, passes = 0;
    while (changed) {
      changed = false;
      passes++;
      for (const entry of active) {
        const relation = entry.relation;
        if (!relation.vars.length) continue;
        for (let i = 0; i < relation.vars.length; i++) {
          const name = relation.vars[i];
          const before = domains[name];
          const after = before.filter(value => relation.allowed.some(tuple => tupleSupported(tuple, relation, domains, i, value)));
          if (after.length !== before.length) {
            pruned += before.length - after.length;
            domains[name] = after;
            changed = true;
          }
        }
      }
    }
    return { domains, pruned, passes };
  }

  function relationPossible(relation, assignment) {
    if (!relation) return true;
    outer: for (const tuple of relation.allowed) {
      for (let i = 0; i < relation.vars.length; i++) {
        const name = relation.vars[i];
        if (Object.prototype.hasOwnProperty.call(assignment, name) && !same(assignment[name], tuple[i])) continue outer;
      }
      return true;
    }
    return false;
  }

  function relationHolds(assignment, relation) {
    if (!relation) return true;
    for (const name of relation.vars) if (!Object.prototype.hasOwnProperty.call(assignment, name)) return false;
    return relationPossible(relation, assignment);
  }

  function buildChunks(domains, active) {
    const names = Object.keys(domains).sort();
    const parent = Object.fromEntries(names.map(name => [name, name]));
    const find = x => {
      let r = x;
      while (parent[r] !== r) r = parent[r];
      while (parent[x] !== x) { const p = parent[x]; parent[x] = r; x = p; }
      return r;
    };
    const union = (a, b) => {
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent[rb] = ra < rb ? ra : rb;
    };
    for (const entry of active) {
      const vars = entry.relation.vars;
      for (let i = 1; i < vars.length; i++) union(vars[0], vars[i]);
    }
    const groups = new Map();
    for (const name of names) {
      const root = find(name);
      if (!groups.has(root)) groups.set(root, { variables: [], relation_ids: [] });
      groups.get(root).variables.push(name);
    }
    for (const entry of active) {
      if (!entry.relation.vars.length) continue;
      groups.get(find(entry.relation.vars[0])).relation_ids.push(entry.id);
    }
    return [...groups.values()]
      .map(chunk => ({
        variables: chunk.variables.sort(),
        relation_ids: chunk.relation_ids.sort(),
        domain_cells: chunk.variables.reduce((n, v) => n + domains[v].length, 0),
      }))
      .sort((a, b) => a.variables[0].localeCompare(b.variables[0]))
      .map((chunk, i) => Object.assign({ id: `c${i + 1}` }, chunk));
  }

  function constraintsForIds(active, ids) {
    const wanted = new Set(ids);
    return active.filter(entry => wanted.has(entry.id));
  }

  function findModel(domainsInput, constraints, options = {}) {
    const domains = Object.fromEntries(Object.entries(domainsInput).map(([k, v]) => [k, v.slice()]));
    const preferred = new Set((options.preferred || []).map(String));
    const fixed = Object.assign({}, options.fixed || {});
    const target = options.target || null;
    const targetTruth = options.targetTruth;
    const variables = [...new Set([
      ...Object.keys(domains),
      ...constraints.flatMap(entry => entry.relation.vars),
      ...(target ? target.vars : []),
    ])].sort();

    for (const name of variables) if (!(name in domains)) throw new Error(`unknown variable: ${name}`);
    for (const [name, value] of Object.entries(fixed)) {
      if (!(name in domains) || !domains[name].some(v => same(v, value))) return null;
    }

    const degree = Object.fromEntries(variables.map(v => [v, 0]));
    for (const entry of constraints) for (const v of entry.relation.vars) degree[v]++;
    if (target) for (const v of target.vars) degree[v]++;

    const assignment = Object.assign({}, fixed);
    let nodes = 0;

    function feasible() {
      for (const entry of constraints) if (!relationPossible(entry.relation, assignment)) return false;
      if (target && targetTruth === true && !relationPossible(target, assignment)) return false;
      if (target && targetTruth === false && target.vars.every(v => Object.prototype.hasOwnProperty.call(assignment, v)) && relationHolds(assignment, target)) return false;
      return true;
    }

    function viableValues(name) {
      const out = [];
      for (const value of domains[name]) {
        assignment[name] = value;
        if (feasible()) out.push(value);
      }
      delete assignment[name];
      return out;
    }

    function chooseVariable() {
      const remaining = variables.filter(v => !Object.prototype.hasOwnProperty.call(assignment, v));
      if (!remaining.length) return null;
      const preferredRemaining = remaining.filter(v => preferred.has(v));
      const pool = preferredRemaining.length ? preferredRemaining : remaining;
      let best = null;
      for (const name of pool) {
        const values = viableValues(name);
        let touching = 0;
        for (const entry of constraints) {
          if (entry.relation.vars.includes(name) && entry.relation.vars.some(v => v !== name && Object.prototype.hasOwnProperty.call(assignment, v))) touching++;
        }
        if (target && target.vars.includes(name) && target.vars.some(v => v !== name && Object.prototype.hasOwnProperty.call(assignment, v))) touching++;
        const candidate = { name, values, touching };
        if (!best ||
            candidate.values.length < best.values.length ||
            (candidate.values.length === best.values.length && candidate.touching > best.touching) ||
            (candidate.values.length === best.values.length && candidate.touching === best.touching && degree[name] > degree[best.name]) ||
            (candidate.values.length === best.values.length && candidate.touching === best.touching && degree[name] === degree[best.name] && name < best.name)) best = candidate;
      }
      return best;
    }

    function visit() {
      nodes++;
      if (!feasible()) return null;
      const choice = chooseVariable();
      if (!choice) {
        if (target && targetTruth === true && !relationHolds(assignment, target)) return null;
        if (target && targetTruth === false && relationHolds(assignment, target)) return null;
        return Object.assign({}, assignment);
      }
      if (!choice.values.length) return null;
      for (const value of choice.values) {
        assignment[choice.name] = value;
        const out = visit();
        if (out) return out;
      }
      delete assignment[choice.name];
      return null;
    }

    const witness = visit();
    return witness ? { witness, nodes } : null;
  }

  function entropyBinary(successes, total) {
    if (!total || successes <= 0 || successes >= total) return 0;
    const p = successes / total, q = 1 - p;
    return -p * Math.log2(p) - q * Math.log2(q);
  }

  function atomKey(atom) { return `${atom.feature}=${stable(atom.value)}`; }

  function conditionKey(conditions) {
    return conditions.slice().sort((a, b) => atomKey(a).localeCompare(atomKey(b))).map(atomKey).join('&');
  }

  function combinations(items, maxSize) {
    const out = [];
    function visit(start, chosen) {
      if (chosen.length) out.push(chosen.slice());
      if (chosen.length >= maxSize) return;
      for (let i = start; i < items.length; i++) {
        chosen.push(items[i]);
        visit(i + 1, chosen);
        chosen.pop();
      }
    }
    visit(0, []);
    return out;
  }

  function sampleHas(sample, atom) {
    return Object.prototype.hasOwnProperty.call(sample, atom.feature) && same(sample[atom.feature], atom.value);
  }

  // Finite MDL search. The objective itself is generic: prefer a reusable
  // conditional description only when it shortens the coding of observed cases
  // after paying for the description. Exceptions remain as residual code.
  function learnPatterns(ledger) {
    const samples = activeSamples(ledger).map(entry => ({ id: entry.id, values: entry.sample }));
    const featureValues = {};
    for (const { values } of samples) {
      for (const [feature, value] of Object.entries(values)) {
        featureValues[feature] = unique([...(featureValues[feature] || []), value]);
      }
    }
    const features = Object.keys(featureValues).sort();
    if (samples.length < 4 || features.length < 2) {
      return { samples: samples.length, features, patterns: [], search: { max_conditions: 0, candidates: 0 } };
    }

    const maxConditions = Math.min(features.length - 1, features.length <= 8 ? features.length - 1 : 3);
    const atomCount = features.reduce((n, f) => n + featureValues[f].length, 0);
    const modelUnit = Math.log2(Math.max(2, atomCount + features.length));
    const candidates = new Map();

    for (const target of features) {
      const targetValues = featureValues[target];
      for (const expected of targetValues) {
        for (const { values } of samples) {
          if (!Object.prototype.hasOwnProperty.call(values, target)) continue;
          const atoms = Object.keys(values)
            .filter(feature => feature !== target)
            .sort()
            .map(feature => ({ feature, value: values[feature] }));
          for (const conditions of combinations(atoms, maxConditions)) {
            const key = `${target}=>${stable(expected)}|${conditionKey(conditions)}`;
            if (!candidates.has(key)) candidates.set(key, { target, expected, conditions });
          }
        }
      }
    }

    const patterns = [];
    for (const candidate of candidates.values()) {
      const conditionFeatures = candidate.conditions.map(x => x.feature);
      const eligible = samples.filter(({ values }) =>
        Object.prototype.hasOwnProperty.call(values, candidate.target) &&
        conditionFeatures.every(feature => Object.prototype.hasOwnProperty.call(values, feature))
      );
      if (eligible.length < 4) continue;
      const matched = eligible.filter(({ values }) => candidate.conditions.every(atom => sampleHas(values, atom)));
      const unmatched = eligible.filter(({ values }) => !candidate.conditions.every(atom => sampleHas(values, atom)));
      if (matched.length < 2 || unmatched.length < 2) continue;

      const totalExpected = eligible.filter(({ values }) => same(values[candidate.target], candidate.expected)).length;
      const matchedExpected = matched.filter(({ values }) => same(values[candidate.target], candidate.expected)).length;
      const unmatchedExpected = unmatched.filter(({ values }) => same(values[candidate.target], candidate.expected)).length;
      const baseRate = totalExpected / eligible.length;
      const matchedRate = matchedExpected / matched.length;
      if (matchedRate <= baseRate) continue;

      const baseBits = eligible.length * entropyBinary(totalExpected, eligible.length);
      const residualBits =
        matched.length * entropyBinary(matchedExpected, matched.length) +
        unmatched.length * entropyBinary(unmatchedExpected, unmatched.length);
      const modelBits = (candidate.conditions.length + 1) * modelUnit;
      const savings = baseBits - residualBits - modelBits;
      if (!(savings > 0)) continue;

      // Current-case use is itself referent-relative compression. A broad rule
      // may save more bits globally merely because it covers more history, while
      // a narrower rule can encode the present case more efficiently. Laplace
      // smoothing prevents a tiny perfect sample from becoming certainty.
      const smoothed = (matchedExpected + 1) / (matched.length + 2);
      const predictiveCodeBits = -Math.log2(smoothed) + modelBits / eligible.length;

      patterns.push({
        id: '',
        conditions: candidate.conditions.slice().sort((a, b) => atomKey(a).localeCompare(atomKey(b))),
        target: candidate.target,
        expected: candidate.expected,
        support: matchedExpected,
        exceptions: matched.length - matchedExpected,
        covered: matched.length,
        eligible: eligible.length,
        reliability: matchedRate,
        smoothed_reliability: smoothed,
        base_rate: baseRate,
        bits_saved: savings,
        predictive_code_bits: predictiveCodeBits,
        model_bits: modelBits,
        residual_bits: residualBits,
        status: 'defeasible',
      });
    }

    patterns.sort((a, b) =>
      b.bits_saved - a.bits_saved ||
      a.predictive_code_bits - b.predictive_code_bits ||
      a.conditions.length - b.conditions.length ||
      conditionKey(a.conditions).localeCompare(conditionKey(b.conditions)) ||
      a.target.localeCompare(b.target)
    );

    const kept = patterns.slice(0, 64).map((pattern, i) => Object.assign({}, pattern, { id: `h${i + 1}` }));
    return {
      samples: samples.length,
      features,
      patterns: kept,
      search: { max_conditions: maxConditions, candidates: candidates.size },
    };
  }

  function compile(ledger) {
    const domains = collectDomains(ledger);
    const active = activeRelations(ledger);
    for (const entry of active) {
      for (const name of entry.relation.vars) if (!(name in domains)) throw new Error(`relation ${entry.id} uses unknown variable ${name}`);
    }

    const reduced = reduceDomains(domains, active);
    const chunks = buildChunks(reduced.domains, active);
    let conflict = Object.values(reduced.domains).some(domain => domain.length === 0);
    if (active.some(entry => !entry.relation.vars.length && entry.relation.allowed.length === 0)) conflict = true;

    if (!conflict) {
      for (const chunk of chunks) {
        const chunkDomains = Object.fromEntries(chunk.variables.map(v => [v, reduced.domains[v]]));
        const constraints = constraintsForIds(active, chunk.relation_ids);
        if (!findModel(chunkDomains, constraints)) { conflict = true; break; }
      }
    }

    const learning = learnPatterns(ledger);
    return {
      version: VERSION,
      whole: 1,
      ledger,
      domains,
      reduced_domains: reduced.domains,
      active_relation_ids: active.map(x => x.id),
      chunks,
      conflict,
      learned_patterns: learning.patterns,
      learning: {
        samples: learning.samples,
        features: learning.features,
        search: learning.search,
        best_bits_saved: learning.patterns.length ? learning.patterns[0].bits_saved : 0,
      },
      simplex: {
        normalization: 1,
        representation: 'exact_factored_self_compressing',
        worlds_materialized: false,
        selected_distribution: null,
      },
      compression: {
        variables: Object.keys(domains).length,
        active_relations: active.length,
        chunks: chunks.length,
        largest_chunk_variables: chunks.reduce((m, c) => Math.max(m, c.variables.length), 0),
        domain_values_pruned: reduced.pruned,
        propagation_passes: reduced.passes,
        learned_patterns: learning.patterns.length,
      },
    };
  }

  function one() { return compile([]); }

  function integrate(state, experience) {
    const prior = state || one();
    const entry = normalizeExperience(experience || {}, prior.ledger.length);
    if (prior.ledger.some(x => x.id === entry.id)) throw new Error(`duplicate relation id: ${entry.id}`);
    return compile([...prior.ledger, entry]);
  }

  function relevantSlice(state, vars) {
    const wanted = new Set(vars.map(String));
    for (const name of wanted) if (!(name in state.reduced_domains)) throw new Error(`unknown variable: ${name}`);
    const chunks = state.chunks.filter(chunk => chunk.variables.some(v => wanted.has(v)));
    const variables = [...new Set(chunks.flatMap(c => c.variables))].sort();
    const relationIds = [...new Set(chunks.flatMap(c => c.relation_ids))];
    const active = activeRelations(state.ledger);
    return {
      chunks,
      variables,
      domains: Object.fromEntries(variables.map(v => [v, state.reduced_domains[v]])),
      constraints: constraintsForIds(active, relationIds),
    };
  }

  function query(state, relationInput) {
    const relation = normalizeRelation(relationInput);
    if (!relation) throw new Error('query relation required');
    if (state.conflict) return {
      status: 'conflict', probability_range: null,
      true_witness: null, false_witness: null,
      expanded_variables: 0, expanded_chunks: 0, search_nodes: 0,
    };
    const slice = relevantSlice(state, relation.vars);
    const yes = findModel(slice.domains, slice.constraints, { preferred: relation.vars, target: relation, targetTruth: true });
    const no = findModel(slice.domains, slice.constraints, { preferred: relation.vars, target: relation, targetTruth: false });
    const status = yes && no ? 'unresolved' : yes ? 'resolved_true' : no ? 'resolved_false' : 'conflict';
    return {
      status,
      probability_range: status === 'resolved_true' ? [1, 1] : status === 'resolved_false' ? [0, 0] : status === 'unresolved' ? [0, 1] : null,
      true_witness: yes ? yes.witness : null,
      false_witness: no ? no.witness : null,
      expanded_variables: slice.variables.length,
      expanded_chunks: slice.chunks.length,
      search_nodes: (yes ? yes.nodes : 0) + (no ? no.nodes : 0),
    };
  }

  function predict(state, partialSample) {
    const values = normalizeSample(partialSample) || {};
    const active = state.learned_patterns.filter(pattern =>
      !Object.prototype.hasOwnProperty.call(values, pattern.target) &&
      pattern.conditions.every(atom => sampleHas(values, atom))
    );

    // Same compression law, now relative to the current bounded referent: use
    // the applicable description with the shortest predictive code, rather than
    // blindly favoring the historically broadest shortcut.
    active.sort((a, b) =>
      a.predictive_code_bits - b.predictive_code_bits ||
      b.bits_saved - a.bits_saved ||
      b.covered - a.covered ||
      a.id.localeCompare(b.id)
    );
    const best = {};
    for (const pattern of active) if (!(pattern.target in best)) best[pattern.target] = pattern;
    return {
      active_heuristics: active,
      best_by_target: best,
      authority: 'defeasible_attention_only',
    };
  }

  function product(values) { return values.reduce((n, x) => n * x, 1); }

  function project(state, vars, maxAssignments = 65536) {
    const names = [...new Set(vars.map(String))];
    if (!names.length) return [{}];
    for (const name of names) if (!(name in state.reduced_domains)) throw new Error(`unknown variable: ${name}`);
    const total = product(names.map(name => state.reduced_domains[name].length));
    if (total > maxAssignments) throw new Error(`projection expansion limit exceeded (${total} > ${maxAssignments}); request a narrower projection`);
    const out = [], tuple = [];
    function visit(i) {
      if (i === names.length) {
        const q = query(state, { vars: names, allowed: [tuple.slice()] });
        if (q.true_witness) out.push(Object.fromEntries(names.map((name, j) => [name, tuple[j]])));
        return;
      }
      for (const value of state.reduced_domains[names[i]]) { tuple[i] = value; visit(i + 1); }
    }
    visit(0);
    return out;
  }

  function materialize(state, maxWorlds = 4096) {
    if (state.conflict) return [];
    const active = activeRelations(state.ledger);
    const domains = state.reduced_domains;
    const names = Object.keys(domains).sort();
    const worlds = [], assignment = {};
    function feasible() { return active.every(entry => relationPossible(entry.relation, assignment)); }
    function visit(i) {
      if (worlds.length > maxWorlds || !feasible()) return;
      if (i === names.length) { worlds.push(Object.assign({}, assignment)); return; }
      const name = names[i];
      for (const value of domains[name]) {
        assignment[name] = value;
        visit(i + 1);
        if (worlds.length > maxWorlds) break;
      }
      delete assignment[name];
    }
    visit(0);
    if (worlds.length > maxWorlds) throw new Error(`materialization limit exceeded (${maxWorlds}); use factored queries instead`);
    return worlds;
  }

  function simplexVertices(state, maxWorlds = 256) {
    const worlds = materialize(state, maxWorlds), n = worlds.length;
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  }

  function sum(vector) { return vector.reduce((a, b) => a + b, 0); }

  return { VERSION, one, integrate, query, predict, project, materialize, relationHolds, simplexVertices, sum };
});