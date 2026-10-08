(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FortySecondMindOneRule = api;
})(globalThis, function () {
  'use strict';

  const VERSION = '0.2.0';

  // ONE RULE, unchanged in meaning:
  //
  //   L(t+1) = L(t) ∪ {R(t+1)}
  //   W(t+1) = {w : every undefeated relation in L(t+1) holds in w}
  //   M(t+1) = Δ(W(t+1))
  //
  // v0.2 changes representation, not semantics. W is no longer enumerated.
  // The same exact solution set is stored as a factored constraint structure.
  // Independent relation-components remain coarse chunks. A query opens only
  // the chunk(s) that contain variables material to that query.

  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  function same(a, b) {
    return stable(a) === stable(b);
  }

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

  function normalizeExperience(input, index) {
    const id = String(input.id || `r${index + 1}`);
    const domains = {};
    for (const [name, values] of Object.entries(input.domains || {})) {
      const domain = unique(values);
      if (!domain.length) throw new Error(`empty domain: ${name}`);
      domains[String(name)] = domain;
    }
    return {
      id,
      domains,
      relation: normalizeRelation(input.relation),
      supersedes: [...new Set((input.supersedes || []).map(String))].sort(),
      provenance: input.provenance == null ? null : input.provenance,
      raw: input.raw == null ? null : input.raw,
    };
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

  function activeRelations(ledger) {
    const defeated = new Set();
    for (const entry of ledger) for (const id of entry.supersedes) defeated.add(id);
    return ledger.filter(entry => entry.relation && !defeated.has(entry.id));
  }

  function tupleSupported(tuple, relation, domains, fixedIndex, fixedValue) {
    if (fixedIndex != null && !same(tuple[fixedIndex], fixedValue)) return false;
    for (let i = 0; i < relation.vars.length; i++) {
      const domain = domains[relation.vars[i]] || [];
      if (!domain.some(v => same(v, tuple[i]))) return false;
    }
    return true;
  }

  // Exact, conservative coarse compression: generalized arc consistency removes
  // values that cannot participate in even one tuple of an active relation.
  // It never invents a value and never deletes a value belonging to a real model.
  function reduceDomains(domainsInput, active) {
    const domains = Object.fromEntries(Object.entries(domainsInput).map(([k, v]) => [k, v.slice()]));
    let changed = true;
    let pruned = 0;
    let passes = 0;

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
      while (parent[x] !== x) {
        const p = parent[x];
        parent[x] = r;
        x = p;
      }
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
      const root = find(entry.relation.vars[0]);
      groups.get(root).relation_ids.push(entry.id);
    }

    return [...groups.values()]
      .map((chunk, i) => ({
        id: `c${i + 1}`,
        variables: chunk.variables.sort(),
        relation_ids: chunk.relation_ids.sort(),
        domain_cells: chunk.variables.reduce((n, v) => n + domains[v].length, 0),
      }))
      .sort((a, b) => a.variables[0].localeCompare(b.variables[0]));
  }

  function constraintsForIds(active, ids) {
    const wanted = new Set(ids);
    return active.filter(entry => wanted.has(entry.id));
  }

  function findModel(domains, constraints, options = {}) {
    const preferred = [...new Set((options.preferred || []).map(String))];
    const fixed = Object.assign({}, options.fixed || {});
    const target = options.target || null;
    const targetTruth = options.targetTruth;
    const variables = [...new Set([
      ...Object.keys(domains),
      ...constraints.flatMap(entry => entry.relation.vars),
      ...(target ? target.vars : []),
    ])];

    for (const name of variables) if (!(name in domains)) throw new Error(`unknown variable: ${name}`);
    for (const [name, value] of Object.entries(fixed)) {
      if (!(name in domains) || !domains[name].some(v => same(v, value))) return null;
    }

    const degree = Object.fromEntries(variables.map(v => [v, 0]));
    for (const entry of constraints) for (const v of entry.relation.vars) degree[v]++;
    const preferredSet = new Set(preferred);
    const order = variables.slice().sort((a, b) => {
      const pa = preferredSet.has(a) ? 0 : 1;
      const pb = preferredSet.has(b) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (domains[a].length !== domains[b].length) return domains[a].length - domains[b].length;
      if (degree[a] !== degree[b]) return degree[b] - degree[a];
      return a.localeCompare(b);
    });

    const assignment = Object.assign({}, fixed);
    let nodes = 0;

    function feasible() {
      for (const entry of constraints) if (!relationPossible(entry.relation, assignment)) return false;
      if (target && targetTruth === true && !relationPossible(target, assignment)) return false;
      if (target && targetTruth === false && target.vars.every(v => Object.prototype.hasOwnProperty.call(assignment, v)) && relationHolds(assignment, target)) return false;
      return true;
    }

    function visit(index) {
      nodes++;
      while (index < order.length && Object.prototype.hasOwnProperty.call(assignment, order[index])) index++;
      if (!feasible()) return null;
      if (index === order.length) {
        if (target && targetTruth === true && !relationHolds(assignment, target)) return null;
        if (target && targetTruth === false && relationHolds(assignment, target)) return null;
        return Object.assign({}, assignment);
      }
      const name = order[index];
      for (const value of domains[name]) {
        assignment[name] = value;
        const out = visit(index + 1);
        if (out) return out;
      }
      delete assignment[name];
      return null;
    }

    const witness = visit(0);
    return witness ? { witness, nodes } : null;
  }

  function compile(ledger) {
    const domains = collectDomains(ledger);
    const active = activeRelations(ledger);
    for (const entry of active) {
      for (const name of entry.relation.vars) {
        if (!(name in domains)) throw new Error(`relation ${entry.id} uses unknown variable ${name}`);
      }
    }

    const reduced = reduceDomains(domains, active);
    const chunks = buildChunks(reduced.domains, active);
    let conflict = Object.values(reduced.domains).some(domain => domain.length === 0);

    // A zero-variable relation is either tautological ([[]]) or impossible ([]).
    if (active.some(entry => !entry.relation.vars.length && entry.relation.allowed.length === 0)) conflict = true;

    if (!conflict) {
      for (const chunk of chunks) {
        const chunkDomains = Object.fromEntries(chunk.variables.map(v => [v, reduced.domains[v]]));
        const constraints = constraintsForIds(active, chunk.relation_ids);
        if (!findModel(chunkDomains, constraints)) {
          conflict = true;
          break;
        }
      }
    }

    return {
      version: VERSION,
      whole: 1,
      ledger,
      domains,
      reduced_domains: reduced.domains,
      active_relation_ids: active.map(x => x.id),
      chunks,
      conflict,
      simplex: {
        normalization: 1,
        representation: 'exact_factored',
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
      },
    };
  }

  function one() {
    return compile([]);
  }

  // The only mutation: experience enters the one ledger. Factoring, pruning,
  // chunking and querying are exact views of the state denoted by that ledger.
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

  function product(values) {
    return values.reduce((n, x) => n * x, 1);
  }

  function project(state, vars, maxAssignments = 65536) {
    const names = [...new Set(vars.map(String))];
    if (!names.length) return [{}];
    for (const name of names) if (!(name in state.reduced_domains)) throw new Error(`unknown variable: ${name}`);
    const total = product(names.map(name => state.reduced_domains[name].length));
    if (total > maxAssignments) throw new Error(`projection expansion limit exceeded (${total} > ${maxAssignments}); request a narrower projection`);

    const out = [];
    const tuple = [];
    function visit(i) {
      if (i === names.length) {
        const relation = { vars: names, allowed: [tuple.slice()] };
        if (query(state, relation).status === 'resolved_true' || query(state, relation).true_witness) {
          out.push(Object.fromEntries(names.map((name, j) => [name, tuple[j]])));
        }
        return;
      }
      for (const value of state.reduced_domains[names[i]]) {
        tuple[i] = value;
        visit(i + 1);
      }
    }
    visit(0);
    return out;
  }

  // Optional diagnostic enumeration. The kernel itself never calls this.
  function materialize(state, maxWorlds = 4096) {
    if (state.conflict) return [];
    const active = activeRelations(state.ledger);
    const domains = state.reduced_domains;
    const names = Object.keys(domains).sort();
    const worlds = [];
    const assignment = {};

    function feasible() {
      return active.every(entry => relationPossible(entry.relation, assignment));
    }
    function visit(i) {
      if (worlds.length > maxWorlds) return;
      if (!feasible()) return;
      if (i === names.length) {
        worlds.push(Object.assign({}, assignment));
        return;
      }
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
    const worlds = materialize(state, maxWorlds);
    const n = worlds.length;
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  }

  function sum(vector) {
    return vector.reduce((a, b) => a + b, 0);
  }

  return {
    VERSION,
    one,
    integrate,
    query,
    project,
    materialize,
    relationHolds,
    simplexVertices,
    sum,
  };
});
