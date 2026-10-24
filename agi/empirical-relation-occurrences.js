'use strict';

// Zero-state representation bridge for canonical embodied relations.
//
// The original one-mind learner remains the only authority that discovers and
// revises action/consequence patterns. This helper merely gives an active learned
// pattern the same generic relation_term / relation_occurrence anatomy used by
// other learned modalities. All durable representation is ordinary canonical-M
// content; this file owns no memory, warrant, or model state.

const crypto = require('crypto');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function ref(id) { return { ref: String(id) }; }
function semanticDescriptor(pattern) {
  return {
    conditions: (pattern.conditions || []).map(atom => ({ feature: String(atom.feature), value: atom.value }))
      .sort((a, b) => stable(a).localeCompare(stable(b))),
    target: String(pattern.target),
    expected: pattern.expected,
  };
}
function termId(pattern) {
  const digest = crypto.createHash('sha256').update(stable(semanticDescriptor(pattern))).digest('hex').slice(0, 24);
  return `empirical-relation-term:${digest}`;
}
function groundingKey(term, empirical) { return `${term}\u0000${stable(empirical)}`; }

// All lookup acceleration is rebuilt from M on every call. These indexes have
// zero semantic authority and replace repeated O(patterns × facts) scans only.
function indexes(state) {
  const facts = state.knowledge?.facts || [];
  const knownTerms = new Set();
  const knownGroundings = new Set();
  const occurrenceToTerm = new Map();
  const priorSupport = new Map();

  for (const fact of facts) {
    if (fact.relation === 'ρ:kind' && fact.object === 'relation_term') knownTerms.add(String(fact.subject));
    else if (fact.relation === 'ρ:grounded_by') knownGroundings.add(groundingKey(String(fact.subject), fact.object));
    else if (fact.relation === 'ρ:instantiates' && fact.object?.ref !== undefined)
      occurrenceToTerm.set(String(fact.subject), String(fact.object.ref));
  }
  for (const fact of facts) {
    if (fact.relation !== 'ρ:evidence' || !fact.object || !Number.isFinite(fact.object.support)) continue;
    const term = occurrenceToTerm.get(String(fact.subject));
    if (!term) continue;
    priorSupport.set(term, Math.max(priorSupport.get(term) || 0, fact.object.support));
  }
  return { knownTerms, knownGroundings, priorSupport };
}

function relationalUpdate(state) {
  if (!state?.structure || !Array.isArray(state.structure.patterns)) return null;
  const patterns = state.structure.patterns.filter(pattern => pattern && pattern.active !== false &&
    typeof pattern.id === 'string' && typeof pattern.target === 'string' && Number.isFinite(pattern.support));
  if (!patterns.length) return null;

  const { knownTerms, knownGroundings, priorSupport } = indexes(state);
  const order = state.contacts?.length || 0;
  const facts = [];

  for (const pattern of patterns) {
    const term = termId(pattern);
    const descriptor = semanticDescriptor(pattern);
    const empirical = ref(`empirical:${pattern.id}`);

    if (!knownTerms.has(term)) {
      facts.push(
        [term, 'ρ:kind', 'relation_term'],
        [term, 'ρ:relation_subject', { conditions: descriptor.conditions }],
        [term, 'ρ:relation_predicate', 'ρ:empirical_dependence'],
        [term, 'ρ:relation_object', { target: descriptor.target, expected: descriptor.expected }],
        [term, 'ρ:semantic_descriptor', descriptor],
      );
      knownTerms.add(term);
    }

    // Pattern ids can be re-numbered by later global recompression. Semantic
    // identity is content-addressed above; grounded_by retains each canonical
    // empirical descriptor that has instantiated that same meaning.
    const gKey = groundingKey(term, empirical);
    if (!knownGroundings.has(gKey)) {
      facts.push([term, 'ρ:grounded_by', empirical]);
      knownGroundings.add(gKey);
    }

    const support = Math.max(0, Number(pattern.support) || 0);
    if (support <= (priorSupport.get(term) || 0)) continue;

    const occurrence = `relation-occurrence:empirical:${order}:${term}:${support}`;
    facts.push(
      [occurrence, 'ρ:kind', 'relation_occurrence'],
      [occurrence, 'ρ:instantiates', ref(term)],
      [occurrence, 'ρ:order', order],
      [occurrence, 'ρ:grounded_by', empirical],
      [occurrence, 'ρ:evidence', {
        support,
        covered: Number(pattern.covered) || 0,
        exceptions: Number(pattern.exceptions) || 0,
        reliability: Number.isFinite(pattern.reliability) ? pattern.reliability : null,
        bits_saved: Number.isFinite(pattern.bits_saved) ? pattern.bits_saved : null,
        source: 'canonical_embodied_pattern',
        exact_contact_retained: true,
      }],
      ['self', 'ρ:experienced', occurrence],
    );
    priorSupport.set(term, support);
  }

  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
