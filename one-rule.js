(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FortySecondMindOneRule = api;
})(globalThis, function () {
  'use strict';

  const VERSION = '0.1.0';

  // The sole state-transition law implemented here is:
  //
  //   L(t+1) = L(t) ∪ {R(t+1)}
  //   W(t+1) = { w in Π_v D_v(L(t+1)) : every undefeated relation in L(t+1) holds in w }
  //   M(t+1) = Δ(W(t+1))
  //
  // Δ(W) is the full simplex over surviving worlds, not a chosen probability
  // distribution. Therefore every admissible numerical realization sums to 1,
  // while unexperienced alternatives remain genuinely unresolved rather than
  // receiving invented weights.

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
    const relation = normalizeRelation(input.relation);
    if (relation) {
      for (const name of relation.vars) {
        if (!(name in domains) && !(input.uses_existing || []).includes(name)) {
          // Existing variables do not need their domain repeated. A brand-new
          // variable must arrive with a domain so no values are invented.
        }
      }
    }
    return {
      id,
      domains,
      relation,
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

  function allWorlds(domains) {
    const names = Object.keys(domains).sort();
    let worlds = [{}];
    for (const name of names) {
      const next = [];
      for (const world of worlds) {
        for (const value of domains[name]) next.push(Object.assign({}, world, { [name]: value }));
      }
      worlds = next;
    }
    return worlds;
  }

  function relationHolds(world, relation) {
    if (!relation) return true;
    outer: for (const tuple of relation.allowed) {
      for (let i = 0; i < relation.vars.length; i++) {
        const name = relation.vars[i];
        if (!(name in world) || !same(world[name], tuple[i])) continue outer;
      }
      return true;
    }
    return false;
  }

  function model(ledger) {
    const domains = collectDomains(ledger);
    const active = activeRelations(ledger);
    for (const entry of active) {
      for (const name of entry.relation.vars) {
        if (!(name in domains)) throw new Error(`relation ${entry.id} uses unknown variable ${name}`);
      }
    }
    const worlds = allWorlds(domains).filter(world => active.every(entry => relationHolds(world, entry.relation)));
    return {
      version: VERSION,
      whole: 1,
      ledger,
      domains,
      active_relation_ids: active.map(x => x.id),
      worlds,
      conflict: worlds.length === 0,
      simplex: {
        normalization: 1,
        vertices: worlds.length,
        // No single point is selected inside this simplex. The whole admissible
        // simplex is the state of unresolved quantitative commitment.
        selected_distribution: null,
      },
    };
  }

  function one() {
    return model([]);
  }

  // integrate() is the only state mutation law. Everything else below is a
  // read-only projection of the state produced by this operation.
  function integrate(state, experience) {
    const prior = state || one();
    const entry = normalizeExperience(experience || {}, prior.ledger.length);
    if (prior.ledger.some(x => x.id === entry.id)) throw new Error(`duplicate relation id: ${entry.id}`);
    return model([...prior.ledger, entry]);
  }

  function query(state, relationInput) {
    const relation = normalizeRelation(relationInput);
    if (state.conflict) return { status: 'conflict', probability_range: null, support: 0, opposition: 0 };
    let support = 0;
    for (const world of state.worlds) if (relationHolds(world, relation)) support++;
    const opposition = state.worlds.length - support;
    if (support === state.worlds.length) return { status: 'resolved_true', probability_range: [1, 1], support, opposition };
    if (support === 0) return { status: 'resolved_false', probability_range: [0, 0], support, opposition };
    return { status: 'unresolved', probability_range: [0, 1], support, opposition };
  }

  function project(state, vars) {
    const names = [...vars].map(String);
    const seen = new Map();
    for (const world of state.worlds) {
      const row = Object.fromEntries(names.map(name => [name, world[name]]));
      seen.set(stable(row), row);
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, row]) => row);
  }

  function simplexVertices(state) {
    const n = state.worlds.length;
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
    relationHolds,
    simplexVertices,
    sum,
  };
});
