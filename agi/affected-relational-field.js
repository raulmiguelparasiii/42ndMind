'use strict';

// Disposable view of the part of canonical relational M that is materially
// participating in one present settlement.
//
// This module owns no cognition. It writes nothing to M, stores no activation,
// and has no truth/status authority. Current contact/query facts and canonical
// unfinished formation facts may be forward roots. Older facts may enter only as
// support for conclusions affected by those roots. Support-only facts never
// become new forward roots, which prevents the view from expanding into a
// connected-component workspace over the whole M.

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function clone(v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }
function factKey(f) { return stable([f.subject, f.relation, f.object]); }
function variableName(term) {
  return term && typeof term === 'object' && !Array.isArray(term) &&
    Object.keys(term).length === 1 && typeof term.var === 'string' ? term.var : null;
}
function bindTerm(pattern, value, binding) {
  const name = variableName(pattern);
  if (!name) return same(pattern, value);
  if (Object.prototype.hasOwnProperty.call(binding, name)) return same(binding[name], value);
  binding[name] = clone(value);
  return true;
}
function matchPattern(pattern, fact, binding = {}) {
  const next = { ...binding };
  if (!bindTerm(pattern.subject, fact.subject, next)) return null;
  if (!bindTerm(pattern.relation, fact.relation, next)) return null;
  if (!bindTerm(pattern.object, fact.object, next)) return null;
  return next;
}
function queryMatches(fact, query) {
  if (!query) return false;
  if (query.subject !== undefined && !same(query.subject, fact.subject)) return false;
  if (query.relation !== undefined && !same(query.relation, fact.relation)) return false;
  if (query.object !== undefined && !same(query.object, fact.object)) return false;
  return true;
}
function ruleRef(term) {
  return term && typeof term === 'object' && !Array.isArray(term) &&
    Object.keys(term).length === 1 && typeof term.ref === 'string' ? term.ref : null;
}

function factIndex(facts) {
  const byKey = new Map(), byRelation = new Map();
  for (const fact of facts) {
    const key = factKey(fact);
    if (!byKey.has(key)) byKey.set(key, fact);
    const r = stable(fact.relation);
    if (!byRelation.has(r)) byRelation.set(r, []);
    byRelation.get(r).push(fact);
  }
  return { byKey, byRelation };
}
function candidateFacts(index, premise, allFacts) {
  return variableName(premise.relation) ? allFacts : (index.byRelation.get(stable(premise.relation)) || []);
}

// Reconstruct the same support bindings the canonical relational closure can use.
// The target conclusion fixes any variables already determined by the derived
// fact; premises then backtrack against current canonical facts. A finite route
// cap bounds diagnostic output only. It never changes canonical M or warrant.
function supportRoutes(rule, targetFact, facts, index, maxRoutes = 256) {
  if (!rule || !targetFact || !rule.conclusion || !Array.isArray(rule.premises)) return [];
  const seed = matchPattern(rule.conclusion, targetFact, {});
  if (!seed) return [];
  const routes = [], chosen = [];
  function visit(i, binding) {
    if (routes.length >= maxRoutes) return;
    if (i === rule.premises.length) {
      routes.push(chosen.slice());
      return;
    }
    const premise = rule.premises[i];
    for (const fact of candidateFacts(index, premise, facts)) {
      const next = matchPattern(premise, fact, binding);
      if (!next) continue;
      chosen.push(fact);
      visit(i + 1, next);
      chosen.pop();
      if (routes.length >= maxRoutes) return;
    }
  }
  visit(0, seed);
  return routes;
}

function episodeSlice(state, start, end) {
  const episodes = state.knowledge?.episodes || [];
  const from = Math.max(0, Number.isInteger(start) ? start : Math.max(0, episodes.length - 1));
  const to = Math.min(episodes.length, Number.isInteger(end) ? end : episodes.length);
  return episodes.slice(from, Math.max(from, to));
}

// A continuing relation is not a stored focus state. It is recomputed from the
// canonical formation/resolution facts already in M. The current convention is
// intentionally structural and narrow: any formation explicitly still open and
// not yet linked to a resolving relation remains unfinished. This includes the
// repository's temporal expectations without naming their modality or type.
function continuingSubjects(facts) {
  const open = new Set(), resolved = new Set();
  for (const fact of facts) {
    const subject = String(fact.subject);
    if (fact.relation === 'ρ:formation_status' && fact.object === 'open') open.add(subject);
    else if (fact.relation === 'ρ:resolved_by' && fact.object?.ref !== undefined) resolved.add(subject);
  }
  return [...open].filter(subject => !resolved.has(subject)).sort();
}

function addOrigin(originByKey, key, origin) {
  if (!originByKey.has(key)) originByKey.set(key, new Set());
  const set = originByKey.get(key);
  const before = set.size;
  set.add(origin);
  return set.size !== before;
}
function originDescriptor(origin) {
  if (origin === 'contact') return { source: 'contact', id: 'current_contact' };
  if (origin === 'query') return { source: 'query', id: 'current_query' };
  if (origin.startsWith('continuing:')) return { source: 'continuing', id: origin.slice('continuing:'.length) };
  return { source: 'derived', id: origin };
}

function derive(state, options = {}) {
  if (!state || state.whole !== 1) throw new Error('affected field requires one whole M');
  const currentFacts = state.knowledge?.current?.facts || [];
  const rules = state.knowledge?.rules || [];
  const index = factIndex(currentFacts);
  const byRule = new Map(rules.map(rule => [String(rule.id), rule]));
  const episodes = episodeSlice(state, options.episodeStart, options.episodeEnd);
  const maxRoutes = Math.max(1, Number(options.maxRoutes) || 256);

  const rootKeys = new Set();
  const rootRuleIds = new Set();
  const contactFacts = [];
  const originByKey = new Map();
  const rootCountByOrigin = new Map();

  function root(fact, origin) {
    const key = factKey(fact);
    rootKeys.add(key);
    if (addOrigin(originByKey, key, origin))
      rootCountByOrigin.set(origin, (rootCountByOrigin.get(origin) || 0) + 1);
  }

  for (const episode of episodes) {
    for (const raw of episode.facts || []) {
      const key = factKey(raw);
      const canonical = index.byKey.get(key);
      if (canonical) {
        root(canonical, 'contact');
        contactFacts.push(canonical);
      }
      // A direct fact about a rule can change which closure is current. Treat the
      // referenced rule as changed without knowing the semantic name of the
      // control relation.
      const ref = ruleRef(raw.subject);
      if (ref && typeof raw.object === 'boolean' && byRule.has(ref)) rootRuleIds.add(ref);
    }
    for (const id of episode.rules || []) if (byRule.has(String(id))) rootRuleIds.add(String(id));
  }

  // Unfinished canonical formations re-enter the present calculation from M
  // itself. Nothing is copied into persistent current/focus state. If a formation
  // is resolved, it simply ceases to be a root on the next derivation.
  const continuing = continuingSubjects(currentFacts);
  const continuingSet = new Set(continuing);
  const continuingFacts = [];
  for (const fact of currentFacts) if (continuingSet.has(String(fact.subject))) {
    continuingFacts.push(fact);
    root(fact, `continuing:${String(fact.subject)}`);
  }

  const matchedQuery = [];
  if (options.query) for (const fact of currentFacts) if (queryMatches(fact, options.query)) {
    root(fact, 'query');
    matchedQuery.push(fact);
  }

  // Forward wave: only roots and conclusions whose actual support intersects the
  // wave can make further conclusions current. Support facts are participants,
  // but they do not themselves join the wave merely by supporting something.
  const wave = new Set(rootKeys);
  const participant = new Set(rootKeys);
  const participatingRules = new Set();
  const routesCache = new Map();
  const derivedFacts = currentFacts.filter(f => typeof f.derived_from === 'string' && byRule.has(f.derived_from));

  function routesFor(fact) {
    const key = factKey(fact);
    if (!routesCache.has(key)) routesCache.set(key, supportRoutes(byRule.get(fact.derived_from), fact, currentFacts, index, maxRoutes));
    return routesCache.get(key);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const fact of derivedFacts) {
      const key = factKey(fact);
      const ruleId = String(fact.derived_from);
      const routes = routesFor(fact);
      const affectedRoutes = rootRuleIds.has(ruleId)
        ? routes
        : routes.filter(route => route.some(support => wave.has(factKey(support))));
      if (!affectedRoutes.length) continue;

      if (!wave.has(key)) {
        wave.add(key);
        participant.add(key);
        participatingRules.add(ruleId);
        changed = true;
      }

      // Preserve exact causal provenance of the live wave. This is not a priority
      // score: it records which root source actually reaches each affected fact.
      // If another source later reaches the same fact, that new influence can then
      // propagate further on the next fixed-point pass.
      if (rootRuleIds.has(ruleId)) changed = addOrigin(originByKey, key, 'contact') || changed;
      for (const route of affectedRoutes) for (const support of route) {
        const supportKey = factKey(support);
        participant.add(supportKey);
        if (!wave.has(supportKey)) continue;
        for (const origin of originByKey.get(supportKey) || [])
          changed = addOrigin(originByKey, key, origin) || changed;
      }
    }
  }

  // Backward support: expose why each affected/current conclusion is warranted.
  // This walk is deliberately one-way. An old supporting fact added here cannot
  // trigger unrelated conclusions elsewhere in M.
  const supporting = new Set();
  const queue = [...wave].map(key => index.byKey.get(key)).filter(Boolean);
  const expanded = new Set();
  while (queue.length) {
    const fact = queue.shift();
    const key = factKey(fact);
    if (expanded.has(key)) continue;
    expanded.add(key);
    if (typeof fact.derived_from !== 'string' || !byRule.has(fact.derived_from)) continue;
    const ruleId = String(fact.derived_from);
    participatingRules.add(ruleId);
    for (const route of routesFor(fact)) for (const support of route) {
      const supportKey = factKey(support);
      participant.add(supportKey);
      if (!wave.has(supportKey)) supporting.add(supportKey);
      if (typeof support.derived_from === 'string') queue.push(support);
    }
  }

  const affectedFacts = [...wave].map(key => index.byKey.get(key)).filter(Boolean);
  const supportingFacts = [...supporting].map(key => index.byKey.get(key)).filter(Boolean);
  const participatingFacts = [...participant].map(key => index.byKey.get(key)).filter(Boolean);

  // This is the live math for differential influence: no externally assigned
  // scalar weight exists. Each source reports how many forward-affected facts in
  // this settlement actually depend on it. Unrelated contact may therefore be
  // present without displacing a continuing unfinished relational organization.
  const affectedCountByOrigin = new Map();
  for (const key of wave) for (const origin of originByKey.get(key) || [])
    affectedCountByOrigin.set(origin, (affectedCountByOrigin.get(origin) || 0) + 1);
  const sourceParticipation = [...affectedCountByOrigin.entries()]
    .map(([origin, affected]) => ({
      ...originDescriptor(origin),
      root_fact_count: rootCountByOrigin.get(origin) || 0,
      affected_fact_count: affected,
    }))
    .sort((a, b) => b.affected_fact_count - a.affected_fact_count || a.source.localeCompare(b.source) || String(a.id).localeCompare(String(b.id)));

  return {
    whole: 1,
    kind: 'affected_relational_field',
    authority: 'derived_zero_state',
    persistent: false,
    episode_ids: episodes.map(e => e.id),
    query: options.query ? clone(options.query) : null,
    contact_facts: contactFacts.map(clone),
    continuing_subjects: continuing.slice(),
    continuing_facts: continuingFacts.map(clone),
    query_matches: matchedQuery.map(clone),
    affected_facts: affectedFacts.map(clone),
    supporting_facts: supportingFacts.map(clone),
    participating_facts: participatingFacts.map(clone),
    source_participation: sourceParticipation.map(clone),
    rules: [...participatingRules].map(id => clone(byRule.get(id))).filter(Boolean),
    bounds: { support_routes_per_derivation: maxRoutes },
  };
}

module.exports = { derive, supportRoutes, factKey, continuingSubjects };
