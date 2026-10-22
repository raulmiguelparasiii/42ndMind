'use strict';

// Zero-state cross-modal grounding over canonical M.
//
// A surface expression may acquire meaning when it repeatedly occurs in the same
// lived contacts as a first-class learned relation occurrence. This helper owns
// no lexicon or semantic memory: exact co-occurrence evidence, support routes, and
// the resulting expression relation all live in M. Surface-only recall is a
// disposable current view over those canonical facts.

const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function ref(id) { return { ref: String(id) }; }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function episodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : -1;
}
function lexicalAtom(token) {
  const text = String(token);
  return /[\p{L}\p{N}]/u.test(text) ? text : null;
}
function surfaceTerm(expression) { return `surface:${String(expression)}`; }

// Surface anatomy is not fixed to one token. Search contiguous lexical spans,
// with the maximum span growing slowly from the amount of structure present in
// the current utterance. Length-1 spans preserve ordinary word grounding.
function expressionCandidates(tokens, options = {}) {
  const compact = Surface.compactTokens(tokens || []);
  const evidenceMax = Math.max(1, Math.floor(Math.log2(Math.max(2, compact.length + 1))) + 1);
  const maxSpan = Math.min(options.maxSpan ?? evidenceMax, evidenceMax);
  const out = [];
  for (let start = 0; start < compact.length; start++) {
    if (!lexicalAtom(compact[start])) continue;
    for (let length = 1; length <= maxSpan && start + length <= compact.length; length++) {
      const span = compact.slice(start, start + length);
      if (span.some(token => !lexicalAtom(token))) break;
      const expression = Surface.renderTokens(span);
      if (!expression) continue;
      out.push({
        expression,
        surface: surfaceTerm(expression),
        tokens: span,
        start,
        length,
        context_signature: stable({
          before: compact.slice(0, start),
          after: compact.slice(start + length),
        }),
      });
    }
  }
  return unique(out);
}

function latestSurfaceEpisode(state) {
  let best = null;
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:input_tokens' || !Array.isArray(fact.object) ||
        typeof fact.subject !== 'string' || !fact.subject.startsWith('sequence-contact:')) continue;
    if (!best || episodeNumber(fact.subject) > episodeNumber(best.id))
      best = { id: fact.subject, tokens: fact.object.slice() };
  }
  return best;
}

function freshContinuousRelationTerms(state) {
  const order = state.contacts?.length || 0;
  const occurrenceIds = new Set((state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:order' && f.object === order &&
      typeof f.subject === 'string' && f.subject.startsWith('relation-occurrence:continuous:'))
    .map(f => f.subject));
  const out = [];
  for (const occurrence of occurrenceIds) {
    const instantiated = (state.knowledge?.facts || []).find(f =>
      f.subject === occurrence && f.relation === 'ρ:instantiates' && f.object?.ref !== undefined);
    if (!instantiated) continue;
    const term = String(instantiated.object.ref);
    if (!(state.knowledge?.current?.facts || []).some(f => f.subject === term && f.relation === 'ρ:kind' && f.object === 'relation_term') &&
        !(state.knowledge?.facts || []).some(f => f.subject === term && f.relation === 'ρ:kind' && f.object === 'relation_term')) continue;
    out.push({ occurrence, relation_term: term, order });
  }
  return unique(out);
}

function groundingEvidence(state) {
  return (state.knowledge?.facts || []).filter(f =>
    f.relation === 'ρ:surface_relation_cooccurrence' && f.object &&
    typeof f.object.surface === 'string' && typeof f.object.relation_term === 'string');
}
function evidenceFor(state, surface, relationTerm) {
  return groundingEvidence(state).filter(f =>
    f.object.surface === surface && f.object.relation_term === relationTerm);
}
function activeGroundingRoute(state, surface, relationTerm) {
  return (state.knowledge?.rules || []).find(rule => rule.active !== false &&
    rule.provenance?.kind === 'surface_relation_grounding' &&
    rule.provenance?.surface === surface && rule.provenance?.relation_term === relationTerm);
}
function nextRouteId(state, pending = []) {
  let max = 0;
  for (const rule of [...(state.knowledge?.rules || []), ...pending]) {
    const match = /^surface-relation-grounding:(\d+)$/.exec(String(rule.id));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `surface-relation-grounding:${max + 1}`;
}

function relationalUpdate(state, originalContact, options = {}) {
  if (!originalContact || typeof originalContact !== 'object' || !originalContact.surface ||
      !Array.isArray(originalContact.frame)) return null;
  const episode = latestSurfaceEpisode(state);
  const relationTerms = freshContinuousRelationTerms(state);
  if (!episode || !relationTerms.length) return null;

  const expressions = expressionCandidates(episode.tokens, options);
  if (!expressions.length) return null;
  const minSupport = options.minSupport ?? 3;
  const facts = [], rules = [];

  for (const candidate of expressions) for (const relation of relationTerms) {
    const evidence = {
      expression: candidate.expression,
      token: candidate.length === 1 ? candidate.expression : undefined,
      span_tokens: candidate.tokens,
      surface: candidate.surface,
      relation_term: relation.relation_term,
      relation_occurrence: relation.occurrence,
      contact_order: relation.order,
      context_signature: candidate.context_signature,
      exact_contact: true,
    };
    facts.push([episode.id, 'ρ:surface_relation_cooccurrence', evidence]);

    if (activeGroundingRoute(state, candidate.surface, relation.relation_term)) continue;
    const prior = evidenceFor(state, candidate.surface, relation.relation_term);
    const episodes = new Set(prior.map(f => String(f.subject)));
    episodes.add(episode.id);
    if (episodes.size < minSupport) continue;

    const contexts = new Set(prior.map(f => f.object.context_signature));
    contexts.add(evidence.context_signature);
    if (contexts.size < Math.min(minSupport, 2)) continue;

    const support = {
      support: episodes.size,
      context_diversity: contexts.size,
      retained_contact: true,
      span_length: candidate.length,
    };
    const routeId = nextRouteId(state, rules);
    facts.push(
      [ref(routeId), 'ρ:surface_relation_support', support],
      [episode.id, 'ρ:supports', ref(routeId)],
    );
    rules.push({
      id: routeId,
      premises: [[ref(routeId), 'ρ:surface_relation_support', support]],
      conclusion: [candidate.surface, 'ρ:expresses', ref(relation.relation_term)],
      categorical: true,
      provenance: {
        kind: 'surface_relation_grounding',
        surface: candidate.surface,
        relation_term: relation.relation_term,
        span_length: candidate.length,
        authority: 'M_retained_crossmodal_contact',
      },
    });
  }
  return facts.length || rules.length ? { relations: { facts, rules } } : null;
}

function groundCurrent(state, originalContact, options = {}) {
  if (!originalContact || typeof originalContact !== 'object' || !originalContact.surface || !state.current?.sequence) return state;
  const episode = latestSurfaceEpisode(state);
  if (!episode) return state;
  const expressions = expressionCandidates(episode.tokens, options);
  const grounded = [];
  for (const candidate of expressions) {
    const meanings = unique((state.knowledge?.current?.facts || [])
      .filter(f => f.subject === candidate.surface && f.relation === 'ρ:expresses' && f.object?.ref !== undefined)
      .map(f => String(f.object.ref)));
    for (const relationTerm of meanings) grounded.push({
      token: candidate.length === 1 ? candidate.expression : undefined,
      expression: candidate.expression,
      span_tokens: candidate.tokens,
      surface: candidate.surface,
      relation_term: relationTerm,
      authority: 'canonical_M',
    });
  }
  state.current.sequence.lexical_grounding = grounded;
  return state;
}

module.exports = { relationalUpdate, groundCurrent };
