'use strict';

// Zero-state bridge from M-owned lived occurrences to the repository's existing
// generic ordered recompression law. This file owns no temporal memory, policy,
// or truth state. Anything carrying the same minimal occurrence anatomy can
// participate:
//
//   occurrence --instantiates--> term
//   occurrence --lived_order-->  whole-life order
//
// Learned order can also constrain the present. A suffix of exact lived
// occurrences may match the prefix of an M-owned learned ordered relation. The
// bridge then returns an explicit expectation, never an invented occurrence.

const crypto = require('crypto');
const Sequence = require('../sequence-recompression.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function ref(id) { return { ref: String(id) }; }
function normalizedTerms(xs) { return unique((xs || []).map(String)).sort(); }
function sameEvent(a, b) { return stable(normalizedTerms(a)) === stable(normalizedTerms(b)); }

function orderedLivedOccurrences(state) {
  const groups = new Map();
  for (const f of state.knowledge?.facts || []) {
    const subject = String(f.subject);
    if (!groups.has(subject)) groups.set(subject, {});
    const o = groups.get(subject);
    if (f.relation === 'ρ:kind' && f.object === 'lived_occurrence') o.lived = true;
    else if (f.relation === 'ρ:kind' && f.object === 'relation_occurrence') o.legacyRelation = true;
    else if (f.relation === 'ρ:instantiates' && f.object && f.object.ref !== undefined) o.term = String(f.object.ref);
    else if (f.relation === 'ρ:lived_order' && Number.isFinite(f.object)) o.livedOrder = f.object;
    else if (f.relation === 'ρ:order' && Number.isFinite(f.object)) o.localOrder = f.object;
  }

  const occurrences = [...groups.entries()].flatMap(([id, o]) => {
    if (!o.term) return [];
    if (o.lived && Number.isFinite(o.livedOrder)) return [{ id, term: o.term, order: o.livedOrder }];
    // Backward compatibility only: new cognition uses lived_occurrence/lived_order.
    if (o.legacyRelation && Number.isFinite(o.localOrder)) return [{ id, term: o.term, order: o.localOrder }];
    return [];
  }).sort((a, b) => a.order - b.order || a.term.localeCompare(b.term) || a.id.localeCompare(b.id));

  // Simultaneous lived occurrences are one ordered event. No internal ordering is
  // invented among a sound, word, action, learned relation, or any future term
  // that happened at the same whole-life coordinate.
  const byOrder = new Map();
  for (const o of occurrences) {
    if (!byOrder.has(o.order)) byOrder.set(o.order, { terms: [], occurrences: [] });
    byOrder.get(o.order).terms.push(o.term);
    byOrder.get(o.order).occurrences.push(o.id);
  }
  return [...byOrder.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([order, event]) => ({
      order,
      relations: normalizedTerms(event.terms),
      occurrences: unique(event.occurrences.map(String)).sort(),
    }));
}

function digest(value) {
  // Hash is only a stable address. Complete expansion/evidence remains ordinary
  // M content, so semantic identity never depends on hash authority.
  return crypto.createHash('sha256').update(stable(value)).digest('hex').slice(0, 24);
}
function parseBaseToken(token) {
  if (!String(token).startsWith('e:')) return null;
  return JSON.parse(String(token).slice(2));
}
function temporalId(depth, expansion) {
  return `ordered-relation:${depth}:${digest(expansion)}`;
}

function existingTemporalIds(state) {
  return new Set((state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:kind' && f.object === 'learned_ordered_relation')
    .map(f => String(f.subject)));
}
function evidenceRoute(view) {
  const route = { kind: view.kind };
  if (Array.isArray(view.basis)) route.basis = view.basis.map(String).sort();
  if (view.orders) route.orders = { ...view.orders };
  return route;
}
function existingEvidenceRouteKeys(state) {
  return new Set((state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:ordered_evidence_route' && f.object && typeof f.object === 'object')
    .map(f => stable([String(f.subject), f.object])));
}

// Full lived order is retained. Search also gets two zero-authority views:
// 1) a bounded *contiguous suffix* that preserves literal adjacency and prevents
//    new regularity from being starved by a large older life history; and
// 2) recurrence-relative invariant simultaneous cores, used only to discover
//    structure that remains stable while unrelated events are interleaved.
// Neither view deletes or rewrites M. Only the second removes intervening events.
function orderedViews(observations, minimumOccurrences, options = {}) {
  const views = [{ kind: 'full', basis: null, stream: observations.map(o => o.relations) }];

  const recentWindow = Math.max(32, options.recentWindow || minimumOccurrences * 8);
  if (observations.length > recentWindow) {
    const recent = observations.slice(-recentWindow);
    views.push({
      kind: 'contiguous_suffix_projection',
      basis: null,
      orders: { from: recent[0].order, to: recent.at(-1).order },
      stream: recent.map(o => o.relations),
    });
  }

  const anchors = new Map();
  for (const event of observations) {
    const eventSet = new Set(event.relations);
    for (const term of event.relations) {
      if (!anchors.has(term)) anchors.set(term, { count: 0, core: new Set(event.relations) });
      const record = anchors.get(term);
      record.count++;
      if (record.count > 1) for (const candidate of [...record.core]) if (!eventSet.has(candidate)) record.core.delete(candidate);
    }
  }

  const seen = new Set();
  for (const [anchor, record] of [...anchors.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    // Singleton invariant projections add large search cost but cannot establish
    // the multi-relation simultaneous structure this gappy view exists to retain.
    // Exact singleton recurrence is already available to full/suffix order search.
    if (record.count < minimumOccurrences || record.core.size < 2) continue;
    const core = [...record.core].sort();
    const key = stable(core);
    if (seen.has(key)) continue;
    seen.add(key);
    views.push({
      kind: 'lived_occurrence_projection',
      basis: core,
      anchor,
      stream: Array.from({ length: record.count }, () => core),
    });
  }
  return views;
}

function appendCompressedFacts(compressed, view, existing, routeKeys, facts) {
  if (!compressed.rules.length) return;
  const symbolIds = new Map();
  for (const rule of compressed.rules) {
    const expansion = [];
    for (const token of rule.expansion) {
      if (symbolIds.has(token)) {
        expansion.push(ref(symbolIds.get(token)));
        continue;
      }
      const event = parseBaseToken(token);
      if (!Array.isArray(event)) throw new Error(`unknown ordered-recompression token: ${token}`);
      // Historical field name retained for compatibility. References are generic
      // first-class terms and may denote relations, expressions, actions, etc.
      expansion.push({ simultaneous_relations: event.map(id => ref(id)) });
    }

    const id = temporalId(rule.depth, expansion);
    symbolIds.set(rule.symbol, id);

    // Structural relation identity is independent of the search/evidence route.
    // A later stronger route therefore enriches the same relation instead of
    // creating a copied relation or leaving birth provenance permanently decisive.
    const route = evidenceRoute(view);
    const routeKey = stable([id, route]);
    if (!routeKeys.has(routeKey)) {
      routeKeys.add(routeKey);
      facts.push([id, 'ρ:ordered_evidence_route', route]);
    }

    if (existing.has(id)) continue;
    existing.add(id);
    facts.push(
      [id, 'ρ:kind', 'learned_ordered_relation'],
      [id, 'ρ:ordered_expansion', expansion],
      [id, 'ρ:depth', rule.depth],
      [id, 'ρ:occurrences_at_birth', rule.occurrences_at_birth],
      [id, 'ρ:compression_savings', rule.bits_saved_units],
      [id, 'ρ:authority', 'M_retained_lived_occurrences'],
      ['self', 'ρ:learned_relation', ref(id)],
    );
    // Retain old birth metadata for compatibility; live licensing below uses the
    // accumulated evidence routes when they exist.
    if (view.kind !== 'full') {
      facts.push([id, 'ρ:ordered_projection_kind', view.kind]);
      if (Array.isArray(view.basis))
        facts.push([id, 'ρ:ordered_projection_basis', view.basis.map(term => ref(term))]);
      if (view.orders)
        facts.push([id, 'ρ:ordered_projection_orders', { ...view.orders }]);
    }
  }
}

function relationalUpdate(state, options = {}) {
  const observations = orderedLivedOccurrences(state);
  const checkpoint = Math.max(4, options.checkpoint || 8);
  if (observations.length < checkpoint) return null;

  // Scheduling belongs to the public one-C boundary. Every exact occurrence is
  // already in M; this is only a disposable proposal search over that authority.
  const existing = existingTemporalIds(state);
  const routeKeys = existingEvidenceRouteKeys(state);
  const facts = [];
  for (const view of orderedViews(observations, checkpoint, options)) {
    const compressed = Sequence.recompress(null, view.stream, { maxRules: options.maxRules || 128 });
    appendCompressedFacts(compressed, view, existing, routeKeys, facts);
  }
  return facts.length ? { relations: { facts } } : null;
}

function learnedOrderedIndex(state) {
  const out = new Map();
  function node(id) {
    const key = String(id);
    if (!out.has(key)) out.set(key, { id: key, routes: [] });
    return out.get(key);
  }
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:kind' && fact.relation !== 'ρ:ordered_expansion' &&
        fact.relation !== 'ρ:ordered_projection_kind' && fact.relation !== 'ρ:ordered_evidence_route' &&
        fact.relation !== 'ρ:depth' && fact.relation !== 'ρ:occurrences_at_birth') continue;
    const x = node(fact.subject);
    if (fact.relation === 'ρ:kind' && fact.object === 'learned_ordered_relation') x.kind = true;
    else if (fact.relation === 'ρ:ordered_expansion' && Array.isArray(fact.object)) x.expansion = fact.object;
    else if (fact.relation === 'ρ:ordered_projection_kind') x.projection = fact.object;
    else if (fact.relation === 'ρ:ordered_evidence_route' && fact.object && typeof fact.object === 'object') x.routes.push(fact.object);
    else if (fact.relation === 'ρ:depth' && Number.isFinite(fact.object)) x.depth = fact.object;
    else if (fact.relation === 'ρ:occurrences_at_birth' && Number.isFinite(fact.object)) x.support = fact.object;
  }
  return out;
}

function expansionEvent(component) {
  if (!Array.isArray(component?.simultaneous_relations)) return null;
  return normalizedTerms(component.simultaneous_relations
    .filter(x => x && x.ref !== undefined)
    .map(x => String(x.ref)));
}

function flattenLearned(id, index, trail = new Set()) {
  const key = String(id);
  if (trail.has(key)) throw new Error(`cyclic learned ordered relation: ${key}`);
  const x = index.get(key);
  if (!x?.kind || !Array.isArray(x.expansion)) return [];
  const next = new Set(trail); next.add(key);
  const events = [];
  for (const component of x.expansion) {
    if (component && component.ref !== undefined) {
      events.push(...flattenLearned(String(component.ref), index, next));
      continue;
    }
    const event = expansionEvent(component);
    if (event?.length) events.push(event);
  }
  return events;
}

function matchedPrefixLength(observations, expansion) {
  const max = Math.min(observations.length, expansion.length - 1);
  for (let length = max; length >= 1; length--) {
    const start = observations.length - length;
    let same = true;
    for (let i = 0; i < length; i++) {
      if (!sameEvent(observations[start + i].relations, expansion[i])) { same = false; break; }
    }
    if (same) return length;
  }
  return 0;
}

function licensesImmediateSuccessor(node) {
  // New relations accumulate all search/evidence routes. Any literal-adjacency
  // route can license immediate succession even if the relation was born through
  // a gappy projection. Legacy relations without route facts retain old behavior.
  if (Array.isArray(node.routes) && node.routes.length) return node.routes.some(route =>
    route?.kind === 'full' || route?.kind === 'contiguous_suffix_projection');
  return node.projection === undefined || node.projection === 'contiguous_suffix_projection';
}

function commonExpectedTerms(candidates) {
  if (!candidates.length) return [];
  let common = new Set(candidates[0].nextTerms);
  for (const candidate of candidates.slice(1)) {
    const terms = new Set(candidate.nextTerms);
    common = new Set([...common].filter(term => terms.has(term)));
    if (!common.size) break;
  }
  return [...common].sort();
}

// Present completion is a derived constraint from M-owned order, not prediction
// state. Equal-specificity successors may disagree only partially: terms present
// in every strongest successor remain warranted as common expectations, while
// residual differences stay explicitly open. A true disjoint disagreement still
// yields only conflict. No helper order or arbitrary score resolves alternatives.
function completionUpdate(state) {
  const observations = orderedLivedOccurrences(state);
  if (!observations.length) return null;
  const index = learnedOrderedIndex(state);
  const candidates = [];

  for (const [id, x] of index) {
    if (!x.kind || !licensesImmediateSuccessor(x)) continue;
    const expansion = flattenLearned(id, index);
    if (expansion.length < 2) continue;
    const prefixLength = matchedPrefixLength(observations, expansion);
    if (!prefixLength) continue;
    const prefixEvents = observations.slice(-prefixLength);
    candidates.push({
      relation: id,
      prefixLength,
      nextTerms: normalizedTerms(expansion[prefixLength]),
      occurrences: unique(prefixEvents.flatMap(event => event.occurrences || []).map(String)).sort(),
    });
  }
  if (!candidates.length) return null;

  const maxPrefix = Math.max(...candidates.map(x => x.prefixLength));
  const strongest = candidates.filter(x => x.prefixLength === maxPrefix && x.nextTerms.length);
  if (!strongest.length) return null;

  const latestOrder = observations.at(-1).order;
  const facts = [];
  const candidateIds = [];
  for (const candidate of strongest) {
    const id = `temporal-expectation-candidate:${latestOrder}:${digest(candidate)}`;
    candidateIds.push(id);
    facts.push(
      [id, 'ρ:kind', 'temporal_expectation_candidate'],
      [id, 'ρ:after_lived_order', latestOrder],
      [id, 'ρ:expected_terms', candidate.nextTerms.map(ref)],
      [id, 'ρ:grounded_by_ordered_relation', ref(candidate.relation)],
      [id, 'ρ:matched_prefix_length', candidate.prefixLength],
      [id, 'ρ:based_on_occurrences', candidate.occurrences.map(ref)],
    );
  }

  const byExpectation = new Map();
  for (const candidate of strongest) {
    const key = stable(candidate.nextTerms);
    if (!byExpectation.has(key)) byExpectation.set(key, []);
    byExpectation.get(key).push(candidate);
  }

  const agreed = byExpectation.size === 1 ? strongest[0].nextTerms : commonExpectedTerms(strongest);
  if (agreed.length) {
    const id = `temporal-expectation:${latestOrder}:${digest(agreed)}`;
    const evidence = unique(strongest.flatMap(x => x.occurrences).map(String)).sort();
    facts.push(
      [id, 'ρ:kind', 'temporal_expectation'],
      [id, 'ρ:after_lived_order', latestOrder],
      [id, 'ρ:expected_terms', agreed.map(ref)],
      [id, 'ρ:matched_prefix_length', maxPrefix],
      [id, 'ρ:based_on_occurrences', evidence.map(ref)],
      [id, 'ρ:status', 'open'],
      ['self', 'ρ:expects', ref(id)],
    );
    if (byExpectation.size > 1) facts.push([id, 'ρ:consensus_scope', 'common_terms_across_open_alternatives']);
    for (const term of agreed) facts.push([id, 'ρ:expects_term', ref(term)]);
    for (const candidate of strongest)
      facts.push([id, 'ρ:grounded_by_ordered_relation', ref(candidate.relation)]);
  }

  if (byExpectation.size > 1) {
    const id = `temporal-expectation-conflict:${latestOrder}:${digest(candidateIds.sort())}`;
    facts.push(
      [id, 'ρ:kind', 'temporal_expectation_conflict'],
      [id, 'ρ:after_lived_order', latestOrder],
      [id, 'ρ:alternatives', candidateIds.sort().map(ref)],
      [id, 'ρ:consensus_terms', agreed.map(ref)],
      [id, 'ρ:status', 'open'],
      ['self', 'ρ:has_open_temporal_expectation', ref(id)],
    );
  }

  return { relations: { facts } };
}

module.exports = { relationalUpdate, completionUpdate };
